# web_search_service.py
"""
Web Search Service for Retrieval Augmented Generation (RAG)

Integrates Google Custom Search API to augment legal knowledge base with
real-time web search results when Qdrant embeddings have low confidence.

Flow:
1. Check Qdrant embeddings confidence score
2. If confidence < threshold → Trigger Google Search
3. Extract and clean snippets from search results
4. Combine with Qdrant context for LLM generation

Industry Standards:
- Rate limiting and caching to minimize API costs
- Content extraction and cleaning
- Source attribution and URL tracking
- Error handling with graceful fallback
"""

import os
import logging
import requests
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from cachetools import TTLCache
import re
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Google Custom Search API Configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")  # Custom Search Engine ID

# Configuration
WEB_SEARCH_CONFIDENCE_THRESHOLD = 0.8  # Trigger web search if Qdrant score < 0.8
MAX_WEB_RESULTS = 5  # Number of web results to fetch
CACHE_TTL_SECONDS = 3600  # Cache results for 1 hour
MAX_SNIPPET_LENGTH = 300  # Maximum length of each snippet

# Cache for search results (TTL = 1 hour)
search_cache = TTLCache(maxsize=100, ttl=CACHE_TTL_SECONDS)


def extract_legal_keywords(query: str) -> List[str]:
    """
    Extract key legal terms and concepts from a user query
    
    Args:
        query: Original user question
    
    Returns:
        List of focused search keywords
    """
    query_lower = query.lower()
    
    # Common Filipino legal terms and their English equivalents
    legal_terms_map = {
        # Labor/Employment
        'kasambahay': ['kasambahay', 'domestic worker', 'household worker'],
        'trabaho': ['employment', 'work', 'labor'],
        'amo': ['employer', 'boss'],
        'sweldo': ['salary', 'wage', 'compensation'],
        'tanggal': ['termination', 'dismissal', 'fired'],
        'resign': ['resignation', 'quit'],
        
        # Family Law
        'asawa': ['spouse', 'husband', 'wife', 'marriage'],
        'diborsyo': ['divorce', 'annulment', 'separation'],
        'anak': ['child', 'children', 'custody'],
        'mana': ['inheritance', 'estate', 'heir'],
        
        # Criminal Law
        'kaso': ['case', 'lawsuit', 'complaint'],
        'demanda': ['sue', 'file case', 'legal action'],
        'krimen': ['crime', 'criminal', 'offense'],
        'pulis': ['police', 'law enforcement'],
        'huli': ['arrest', 'detained'],
        
        # Civil/Property
        'lupa': ['land', 'property', 'real estate'],
        'bahay': ['house', 'home', 'residence'],
        'utang': ['debt', 'loan', 'obligation'],
        'kontrata': ['contract', 'agreement'],
        
        # Rights and Protections
        'karapatan': ['rights', 'legal rights'],
        'proteksyon': ['protection', 'safeguards'],
        'abuso': ['abuse', 'violation', 'mistreatment'],
        'diskriminasyon': ['discrimination'],
    }
    
    # Action words that indicate intent
    action_words = {
        'pano': 'how to',
        'paano': 'how to',
        'saan': 'where to',
        'kailan': 'when to',
        'magkano': 'how much',
        'ano': 'what is',
        'pwede': 'can I',
        'maaari': 'can I',
        'kailangan': 'requirements',
        'dapat': 'must',
    }
    
    keywords = []
    
    # Extract main legal terms
    for term, expansions in legal_terms_map.items():
        if term in query_lower:
            keywords.extend(expansions[:2])  # Add top 2 expansions
    
    # Extract action intent
    for fil_word, eng_equiv in action_words.items():
        if fil_word in query_lower:
            keywords.append(eng_equiv)
            break
    
    # Add specific phrases based on context
    if any(word in query_lower for word in ['kaso', 'demanda', 'kasuhan']):
        keywords.extend(['file a case', 'legal complaint', 'how to sue'])
    
    if any(word in query_lower for word in ['karapatan', 'proteksyon']):
        keywords.extend(['legal rights', 'protections'])
    
    if any(word in query_lower for word in ['abuso', 'abusive', 'mali']):
        keywords.extend(['abuse', 'violation', 'illegal'])
    
    # Remove duplicates while preserving order
    seen = set()
    unique_keywords = []
    for kw in keywords:
        if kw not in seen:
            seen.add(kw)
            unique_keywords.append(kw)
    
    return unique_keywords[:5]  # Return top 5 keywords


class WebSearchService:
    """
    Service for performing web searches to augment legal knowledge base
    """
    
    def __init__(self):
        self.api_key = GOOGLE_API_KEY
        self.cse_id = GOOGLE_CSE_ID
        
        if not self.api_key or not self.cse_id:
            logger.warning("⚠️  Google Search API credentials not configured. Web search will be disabled.")
            self.enabled = False
        else:
            self.enabled = True
            logger.info("✅ Web Search Service initialized successfully")
    
    def is_enabled(self) -> bool:
        """Check if web search is enabled"""
        return self.enabled
    
    def should_trigger_web_search(self, qdrant_score: float, num_results: int) -> bool:
        """
        Determine if web search should be triggered based on Qdrant results
        
        Args:
            qdrant_score: Highest relevance score from Qdrant
            num_results: Number of results returned by Qdrant
        
        Returns:
            bool: True if web search should be triggered
        """
        # Trigger web search if:
        # 1. No results from Qdrant, OR
        # 2. Low confidence score (< threshold)
        if num_results == 0:
            logger.info("🌐 Triggering web search: No Qdrant results")
            return True
        
        if qdrant_score < WEB_SEARCH_CONFIDENCE_THRESHOLD:
            logger.info(f"🌐 Triggering web search: Low confidence score ({qdrant_score:.3f} < {WEB_SEARCH_CONFIDENCE_THRESHOLD})")
            return True
        
        return False
    
    def search(self, query: str, num_results: int = MAX_WEB_RESULTS) -> List[Dict]:
        """
        Perform Google Custom Search for legal information
        
        Args:
            query: Search query
            num_results: Number of results to return
        
        Returns:
            List of search results with snippets and URLs
        """
        if not self.enabled:
            logger.warning("Web search is disabled (missing API credentials)")
            return []
        
        # Check cache first
        cache_key = f"{query}:{num_results}"
        if cache_key in search_cache:
            logger.info(f"📦 Using cached web search results for: {query[:50]}...")
            return search_cache[cache_key]
        
        try:
            # Extract keywords from the query for focused search
            keywords = extract_legal_keywords(query)
            
            # If no keywords extracted, use a simplified version of the query
            if not keywords:
                # Remove common filler words and keep main terms
                keywords = [word for word in query.split() 
                           if len(word) > 3 and word.lower() not in 
                           ['ako', 'ang', 'mga', 'para', 'kung', 'that', 'this', 'with']][:5]
            
            # If still no keywords, use original query (fallback)
            if not keywords:
                keywords = [query]
            
            # Build focused search query with keywords
            keyword_query = ' '.join(keywords)
            
            # Enhance query with Philippine law context and authoritative sources
            enhanced_query = (
                f"{keyword_query} Philippine law "
                f"(official gazette OR lawphil OR supreme court of the philippines)"
            )
            
            logger.info(f"🔍 Web search keywords: {keyword_query}")
            logger.debug(f"   Original query: {query[:60]}...")
            logger.debug(f"   Enhanced query: {enhanced_query[:100]}...")
            
            # Google Custom Search API endpoint
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                "key": self.api_key,
                "cx": self.cse_id,
                "q": enhanced_query,
                "num": min(num_results, 10),  # Google API max is 10
                "safe": "active",  # Safe search
                "lr": "lang_en|lang_tl",  # English and Tagalog
            }
            
            # Make API request
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Extract search results
            results = []
            if "items" in data:
                for item in data["items"]:
                    result = {
                        "title": item.get("title", ""),
                        "snippet": item.get("snippet", ""),
                        "url": item.get("link", ""),
                        "source": self._extract_domain(item.get("link", "")),
                        "timestamp": datetime.now().isoformat()
                    }
                    results.append(result)
                
                logger.info(f"✅ Found {len(results)} web search results")
            else:
                logger.warning("No web search results found")
            
            # Cache results
            search_cache[cache_key] = results
            
            return results
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Web search API error: {e}")
            return []
        except Exception as e:
            logger.error(f"❌ Unexpected error in web search: {e}")
            return []
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain name from URL"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            domain = parsed.netloc
            # Remove 'www.' prefix
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain
        except:
            return "Unknown"
    
    def format_web_context(self, search_results: List[Dict]) -> Tuple[str, List[Dict]]:
        """
        Format web search results into context string and source citations
        
        Args:
            search_results: List of search results from Google
        
        Returns:
            Tuple of (context_text, source_citations)
        """
        if not search_results:
            return "", []
        
        context_parts = []
        sources = []
        
        for i, result in enumerate(search_results, 1):
            # Clean and truncate snippet
            snippet = self._clean_snippet(result.get("snippet", ""))
            if len(snippet) > MAX_SNIPPET_LENGTH:
                snippet = snippet[:MAX_SNIPPET_LENGTH] + "..."
            
            # Format context entry
            context_entry = f"""[Web Source {i}: {result.get('title', 'Untitled')}]
[URL: {result.get('url', '')}]
{snippet}
"""
            context_parts.append(context_entry)
            
            # Create source citation
            source = {
                "source": "Web Search",
                "law": result.get("source", "Web"),
                "article_number": f"Web Result {i}",
                "article_title": result.get("title", ""),
                "text_preview": snippet,
                "source_url": result.get("url", ""),
                "relevance_score": 0.0,  # Web results don't have vector scores
                "search_timestamp": result.get("timestamp", "")
            }
            sources.append(source)
        
        context_text = "\n\n".join(context_parts)
        
        logger.info(f"📝 Formatted {len(sources)} web sources into context")
        
        return context_text, sources
    
    def _clean_snippet(self, snippet: str) -> str:
        """Clean and normalize snippet text"""
        # Remove extra whitespace
        snippet = re.sub(r'\s+', ' ', snippet)
        # Remove special characters that might interfere
        snippet = snippet.strip()
        return snippet
    
    def scrape_webpage_content(self, url: str, max_length: int = 2000) -> str:
        """
        Scrape and extract main content from a webpage
        
        Args:
            url: URL to scrape
            max_length: Maximum length of extracted content
        
        Returns:
            Extracted text content from the webpage
        """
        try:
            logger.debug(f"   📄 Scraping content from: {url[:60]}...")
            
            # Make request with timeout
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            # Try to find main content area
            main_content = None
            
            # Look for common content containers
            for selector in ['article', 'main', '.content', '#content', '.post-content', '.entry-content']:
                main_content = soup.select_one(selector)
                if main_content:
                    break
            
            # If no main content found, use body
            if not main_content:
                main_content = soup.find('body')
            
            if not main_content:
                return ""
            
            # Extract text
            text = main_content.get_text(separator='\n', strip=True)
            
            # Clean up text
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            text = '\n'.join(lines)
            
            # Remove excessive newlines
            text = re.sub(r'\n{3,}', '\n\n', text)
            
            # Truncate if too long
            if len(text) > max_length:
                text = text[:max_length] + "..."
            
            logger.debug(f"   ✅ Scraped {len(text)} characters from {url[:40]}...")
            return text
            
        except requests.exceptions.Timeout:
            logger.warning(f"   ⏱️  Timeout scraping {url[:60]}...")
            return ""
        except requests.exceptions.RequestException as e:
            logger.warning(f"   ⚠️  Error scraping {url[:60]}: {str(e)[:50]}...")
            return ""
        except Exception as e:
            logger.warning(f"   ⚠️  Unexpected error scraping {url[:60]}: {str(e)[:50]}...")
            return ""
    
    def search_and_scrape(self, query: str, num_results: int = MAX_WEB_RESULTS) -> List[Dict]:
        """
        Perform web search and scrape content from results
        
        Args:
            query: Search query
            num_results: Number of results to return
        
        Returns:
            List of search results with scraped content
        """
        # First, get search results
        results = self.search(query, num_results)
        
        if not results:
            return []
        
        logger.info(f"📄 Scraping content from {len(results)} web pages...")
        
        # Scrape content from each result
        for result in results:
            url = result.get('url', '')
            if url:
                # Scrape the webpage content
                scraped_content = self.scrape_webpage_content(url)
                
                # Add scraped content to result
                if scraped_content:
                    result['scraped_content'] = scraped_content
                    logger.debug(f"   ✅ Added {len(scraped_content)} chars from {url[:40]}...")
                else:
                    result['scraped_content'] = result.get('snippet', '')  # Fallback to snippet
        
        logger.info(f"✅ Completed scraping {len(results)} web pages")
        
        return results


# Singleton instance
_web_search_service = None

def get_web_search_service() -> WebSearchService:
    """Get or create WebSearchService singleton instance"""
    global _web_search_service
    if _web_search_service is None:
        _web_search_service = WebSearchService()
    return _web_search_service