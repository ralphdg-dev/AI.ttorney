"""
AIRTIGHT LEGAL SCRAPER — REVISED PENAL CODE (Criminal Law Focus)
Source: Supreme Court E-Library
Target URL: https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/28/20426

Goal:
Scrape and structure all articles relevant to the Revised Penal Code (Book II — Crimes Against Property),
focusing on Articles 293–312 (Robbery & Theft), Article 315 (Estafa), and Article 11 (Self-Defense).
Ensure text integrity and dataset compatibility for AI chatbot training or retrieval.
"""

import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime
from typing import List, Dict, Optional
import time
from urllib.parse import urljoin
from pathlib import Path


class RevisedPenalCodeScraper:
    """
    Comprehensive scraper for Philippine Revised Penal Code articles
    with focus on criminal law provisions for AI training datasets.
    """
    
    def __init__(self, base_url: str = "https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/28/20426"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        # Scrape ALL articles (no filter)
        self.target_articles = None  # None means scrape all articles
        
        # Comprehensive penalty patterns
        self.penalty_patterns = [
            r'reclusion\s+perpetua',
            r'reclusion\s+temporal',
            r'prision\s+mayor',
            r'prision\s+correccional',
            r'arresto\s+mayor',
            r'arresto\s+menor',
            r'destierro',
            r'fine[s]?\s+of\s+(?:not\s+)?(?:less\s+than\s+|more\s+than\s+)?(?:P|₱)?\s*\d+(?:,\d{3})*(?:\.\d{2})?',
            r'fine[s]?\s+(?:ranging\s+)?from\s+(?:P|₱)?\s*\d+(?:,\d{3})*\s+to\s+(?:P|₱)?\s*\d+(?:,\d{3})*',
            r'imprisonment\s+(?:of\s+)?(?:not\s+)?(?:less\s+than\s+|more\s+than\s+)?\d+\s+(?:years?|months?|days?)',
            r'death',
            r'life\s+imprisonment'
        ]
        
        self.scraped_data = []
        
    def fetch_content(self, url: str, retries: int = 3) -> Optional[BeautifulSoup]:
        """
        Fetch webpage content with retry mechanism and error handling.
        
        Args:
            url: Target URL to scrape
            retries: Number of retry attempts
            
        Returns:
            BeautifulSoup object or None if failed
        """
        for attempt in range(retries):
            try:
                print(f"🔄 Fetching content (attempt {attempt + 1})...")
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                
                # Check if content is valid
                if len(response.text) < 1000:
                    print(f"⚠️  Warning: Short content ({len(response.text)} chars)")
                
                soup = BeautifulSoup(response.text, 'html.parser')
                print(f"✅ Successfully fetched content ({len(response.text)} chars)")
                return soup
                
            except requests.exceptions.RequestException as e:
                print(f"❌ Request failed (attempt {attempt + 1}): {e}")
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                    
        print(f"❌ Failed to fetch content after {retries} attempts")
        return None
    
    def extract_articles(self, soup: BeautifulSoup) -> List[Dict]:
        """
        Extract and parse articles from the webpage content.
        
        Args:
            soup: BeautifulSoup object containing the webpage
            
        Returns:
            List of dictionaries containing article data
        """
        if not soup:
            print("❌ No soup object provided")
            return []
        
        # Get all text content
        text_content = " ".join(soup.stripped_strings)
        text_content = re.sub(r'\s+', ' ', text_content)
        
        print(f"📄 Processing text content ({len(text_content)} characters)")
        
        # Split by articles using multiple patterns
        article_patterns = [
            r'(ART\.\s+\d+\.)',
            r'(Art\.\s+\d+\.)',
            r'(ARTICLE\s+\d+\.)',
            r'(Article\s+\d+\.)'
        ]
        
        articles_found = []
        
        for pattern in article_patterns:
            splits = re.split(pattern, text_content, flags=re.IGNORECASE)
            if len(splits) > 1:
                articles_found = splits
                print(f"✅ Found articles using pattern: {pattern}")
                break
        
        if not articles_found:
            print("❌ No articles found with any pattern")
            return []
        
        extracted_articles = []
        
        # Process article pairs (header + content)
        for i in range(1, len(articles_found), 2):
            if i + 1 >= len(articles_found):
                break
                
            article_header = articles_found[i].strip()
            article_content = articles_found[i + 1].strip()
            
            # Extract article number from header
            article_num_match = re.search(r'(\d+)', article_header)
            if not article_num_match:
                continue
                
            article_num = int(article_num_match.group(1))
            
            # Combine header and content to get the complete article text
            # This ensures we capture the exact structure from the source
            full_article_text = f"{article_header} {article_content}".strip()
            
            # Clean and structure the content - preserve original text accuracy
            cleaned_content = self._clean_article_content(full_article_text)
            
            # Ensure we have substantial content
            if not cleaned_content or len(cleaned_content) < 30:
                print(f"⚠️  Article {article_num} has insufficient content")
                continue
            
            # Extract penalties from the cleaned content
            penalties = self._extract_penalties(cleaned_content)
            
            # Extract title from the complete article text (including header)
            title = self._extract_article_title_from_full_text(cleaned_content, article_num)
            
            # Remove the article number and "ART." prefix from the main content
            # Keep only the actual article content without the header
            content_without_header = self._remove_article_header(cleaned_content, article_num)
            
            article_data = {
                'article_number': article_num,
                'article_title': title,
                'article_text': content_without_header,
                'penalties': penalties,
                'word_count': len(content_without_header.split()),
                'character_count': len(content_without_header),
                'source_url': self.base_url,
                'scraped_at': datetime.now().isoformat(),
                'category': self._categorize_article(article_num)
            }
            
            extracted_articles.append(article_data)
            print(f"📄 Extracted Article {article_num}: {title[:50]}...")
        
        print(f"✅ Successfully extracted {len(extracted_articles)} articles")
        return extracted_articles
    
    def _clean_article_content(self, content: str) -> str:
        """Clean and normalize article content while preserving accuracy."""
        # Remove excessive whitespace but preserve paragraph structure
        content = re.sub(r'\s+', ' ', content)
        
        # Remove common artifacts at start/end
        content = re.sub(r'^\s*[-–—]\s*', '', content)
        content = re.sub(r'\s*[-–—]\s*$', '', content)
        
        # Fix common encoding issues and remove problematic characters
        content = content.replace(''', "'").replace(''', "'")
        content = content.replace('"', '"').replace('"', '"')
        content = content.replace('–', '-').replace('—', '-')
        
        # Remove specific problematic characters from the source
        content = content.replace('â', '')
        content = content.replace('Â', '')
        content = content.replace('Ã', '')
        content = content.replace('¢', '')
        content = content.replace('€', '')
        content = content.replace('Â€', '')
        
        # Remove any remaining non-ASCII characters that might cause issues
        content = re.sub(r'[^\x00-\x7F]+', '', content)
        
        # Clean up any double spaces created by character removal
        content = re.sub(r'\s+', ' ', content)
        
        # Ensure proper sentence spacing
        content = re.sub(r'\.([A-Z])', r'. \1', content)
        
        # Remove any trailing periods that might have been duplicated
        content = re.sub(r'\.+$', '.', content)
        
        return content.strip()
    
    def _extract_penalties(self, content: str) -> str:
        """Extract penalty information from article content."""
        penalties_found = []
        
        for pattern in self.penalty_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            penalties_found.extend(matches)
        
        # Remove duplicates while preserving order
        unique_penalties = []
        for penalty in penalties_found:
            if penalty.lower() not in [p.lower() for p in unique_penalties]:
                unique_penalties.append(penalty)
        
        return "; ".join(unique_penalties) if unique_penalties else "No specific penalty mentioned"
    
    def _extract_article_title_from_full_text(self, content: str, article_num: int) -> str:
        """Extract proper article title from the complete article text including header."""
        # Look for the pattern: ART. [number]. [Title] circumstances. — [rest]
        # This matches the exact structure shown in the website
        
        # Pattern 1: ART. [num]. [Title] [description]. — [content]
        pattern1 = rf'ART\.\s*{article_num}\.\s*([^.—]+(?:\s+[^.—]+)*)\s*[.—]'
        match1 = re.search(pattern1, content, re.IGNORECASE)
        if match1:
            title = match1.group(1).strip()
            if len(title) >= 5 and len(title) <= 100:
                return title
        
        # Pattern 2: Look for title after article number but before em dash
        pattern2 = rf'ART\.\s*{article_num}\.\s*([^—]+)—'
        match2 = re.search(pattern2, content, re.IGNORECASE)
        if match2:
            title = match2.group(1).strip()
            # Clean up the title
            title = re.sub(r'\s+', ' ', title)
            if len(title) >= 5 and len(title) <= 100:
                return title
        
        # Pattern 3: First meaningful phrase after article number
        pattern3 = rf'ART\.\s*{article_num}\.\s*([^.]+\.)'
        match3 = re.search(pattern3, content, re.IGNORECASE)
        if match3:
            title = match3.group(1).strip()
            if 5 <= len(title) <= 150:
                return title
        
        # Fallback: extract from the beginning of content
        words = content.split()
        # Skip "ART." and number, get the meaningful title part
        title_start = 0
        for i, word in enumerate(words):
            if word.upper() == 'ART.' or word.isdigit():
                continue
            else:
                title_start = i
                break
        
        if title_start < len(words):
            title_words = []
            for i in range(title_start, min(title_start + 12, len(words))):
                title_words.append(words[i])
                if words[i].endswith('.') and len(title_words) >= 3:
                    break
            
            title = ' '.join(title_words)
            if not title.endswith('.'):
                title = title.rstrip('.,;:') + '.'
            return title
        
        return f"Article {article_num}"
    
    def _remove_article_header(self, content: str, article_num: int) -> str:
        """Remove the ART. [number] and title from content, keeping only the article body."""
        # Remove patterns like "ART. 11." and the title from the beginning
        patterns_to_remove = [
            rf'^ART\.\s*{article_num}\.\s*[^.—]*[.—]\s*',  # ART. [num]. [title]. — or ART. [num]. [title] —
            rf'^Art\.\s*{article_num}\.\s*[^.—]*[.—]\s*',   # Art. [num]. [title]. — or Art. [num]. [title] —
            rf'^ARTICLE\s*{article_num}\.\s*[^.—]*[.—]\s*'  # ARTICLE [num]. [title]. — or ARTICLE [num]. [title] —
        ]
        
        for pattern in patterns_to_remove:
            content = re.sub(pattern, '', content, flags=re.IGNORECASE)
        
        # Also remove just the title if it appears at the beginning (fallback)
        # Look for the title pattern and remove it
        title_patterns = [
            r'^[A-Z][^.]*\.\s*',  # Capitalized sentence ending with period
            r'^[^.]{5,100}\.\s*'  # Any reasonable title ending with period
        ]
        
        for pattern in title_patterns:
            # Only remove if it looks like a title (not the main content)
            match = re.match(pattern, content)
            if match and len(match.group(0).strip()) < 150:  # Reasonable title length
                content = re.sub(pattern, '', content, count=1)
                break
        
        return content.strip()
    
    def _categorize_article(self, article_num: int) -> str:
        """Categorize articles by their legal focus."""
        if article_num == 11:
            return "Self-Defense"
        elif 293 <= article_num <= 302:
            return "Robbery"
        elif 303 <= article_num <= 312:
            return "Theft"
        elif article_num == 315:
            return "Estafa"
        else:
            return "Other Criminal Law"
    
    def validate_data(self, articles: List[Dict]) -> List[Dict]:
        """Validate extracted data for completeness and accuracy."""
        validated_articles = []
        
        for article in articles:
            # Check required fields
            if not all(key in article for key in ['article_number', 'article_text']):
                print(f"⚠️  Article missing required fields: {article.get('article_number', 'Unknown')}")
                continue
            
            # Check content quality
            if len(article['article_text']) < 50:
                print(f"⚠️  Article {article['article_number']} has insufficient content")
                continue
            
            # All articles are valid (no filtering)
            validated_articles.append(article)
        
        print(f"✅ Validated {len(validated_articles)} out of {len(articles)} articles")
        return validated_articles
    
    def export_data(self, articles: List[Dict], base_filename: str = "revised_penal_code"):
        """Export data as JSON and MD."""
        if not articles:
            print("❌ No articles to export")
            return
        
        # Ensure data/raw directory exists
        output_dir = Path(__file__).parent.parent / "data" / "raw"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Export to JSON
        json_filename = f"{base_filename}.json"
        json_path = output_dir / json_filename
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(articles, f, indent=2, ensure_ascii=False)
        print(f"✅ Exported JSON: {json_path}")
        
        # Export to Markdown
        md_filename = f"{base_filename}.md"
        md_path = output_dir / md_filename
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write("# REVISED PENAL CODE OF THE PHILIPPINES\n\n")
            f.write("**Source:** Supreme Court E-Library\n\n")
            f.write("---\n\n")
            
            # Group by category
            by_category = {}
            for article in articles:
                category = article.get('category', 'General')
                if category not in by_category:
                    by_category[category] = []
                by_category[category].append(article)
            
            # Write articles by category
            for category, cat_articles in sorted(by_category.items()):
                f.write(f"## {category}\n\n")
                
                for article in sorted(cat_articles, key=lambda x: x.get('article_number', 0)):
                    article_num = article.get('article_number', 'Unknown')
                    article_title = article.get('article_title', '')
                    article_text = article.get('article_text', '')
                    penalties = article.get('penalties', '')
                    
                    f.write(f"### Article {article_num}\n")
                    if article_title:
                        f.write(f"**{article_title}**\n\n")
                    f.write(f"{article_text}\n\n")
                    if penalties and penalties != "No specific penalty mentioned":
                        f.write(f"*Penalties:* {penalties}\n\n")
                    f.write("---\n\n")
            
            f.write(f"\n**Scraped:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        print(f"✅ Exported MD: {md_path}")
        
        return str(json_path), str(md_path)
    
    
    def scrape(self) -> List[Dict]:
        """Main scraping method that orchestrates the entire process."""
        print("🚀 Starting Revised Penal Code scraping process")
        
        # Fetch content
        soup = self.fetch_content(self.base_url)
        if not soup:
            print("❌ Failed to fetch content")
            return []
        
        # Extract articles
        articles = self.extract_articles(soup)
        if not articles:
            print("❌ No articles extracted")
            return []
        
        # Validate data
        validated_articles = self.validate_data(articles)
        
        # Store for later use
        self.scraped_data = validated_articles
        
        print(f"✅ Scraping completed successfully. {len(validated_articles)} articles extracted.")
        return validated_articles


def main():
    """Main execution function."""
    print("AIRTIGHT LEGAL SCRAPER - REVISED PENAL CODE")
    print("=" * 60)
    print("Target Articles: 11 (Self-Defense), 293-312 (Robbery & Theft), 315 (Estafa)")
    print("Source: Supreme Court E-Library")
    print()
    
    # Initialize scraper
    scraper = RevisedPenalCodeScraper()
    
    # Perform scraping
    articles = scraper.scrape()
    
    if articles:
        # Export data
        json_file = scraper.export_data(articles)
        
        print("\nSCRAPING COMPLETED SUCCESSFULLY")
        print(f"Articles extracted: {len(articles)}")
        print(f"JSON file: {json_file}")
        print()
        
        # Display summary
        categories = {}
        for article in articles:
            cat = article['category']
            categories[cat] = categories.get(cat, 0) + 1
        
        print("ARTICLES BY CATEGORY:")
        for category, count in categories.items():
            print(f"   {category}: {count} articles")
        
    else:
        print("SCRAPING FAILED")
        print("Check the log files for detailed error information.")


if __name__ == "__main__":
    main()
