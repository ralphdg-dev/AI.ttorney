from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from middleware.auth import get_current_user
from services.supabase_service import SupabaseService
import httpx
import logging
import re
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/forum", tags=["forum-search"])

class SearchResult(BaseModel):
    id: str
    body: str
    category: str
    created_at: str
    updated_at: Optional[str]
    user_id: str
    is_anonymous: bool
    is_flagged: bool
    reply_count: int
    is_bookmarked: bool
    relevance_score: float
    users: Optional[Dict[str, Any]]

class SearchResponse(BaseModel):
    success: bool
    data: List[SearchResult]
    total: int
    query: str
    search_type: str
    message: Optional[str]
    filters_applied: Dict[str, Any]

class ForumSearchAPI:
    def __init__(self):
        self.supabase = SupabaseService()
    
    def calculate_relevance_score(self, post: Dict[str, Any], query: str, search_type: str, is_category_focused: bool = False) -> float:
        """Calculate relevance score for search results."""
        score = 0.0
        body = (post.get("body") or "").lower()
        query_lower = query.lower()
        
        if search_type == "content":
            # Exact phrase match gets highest score
            if query_lower in body:
                if body == query_lower:
                    score += 100  # Exact match
                elif body.startswith(query_lower):
                    score += 80   # Starts with query
                elif body.endswith(query_lower):
                    score += 70   # Ends with query
                else:
                    score += 60   # Contains query
            
            # Word matches
            query_words = query_lower.split()
            body_words = body.split()
            
            for word in query_words:
                if word in body_words:
                    score += 10  # Each word match
                    
            # Boost score based on query word density
            word_matches = sum(1 for word in query_words if word in body)
            if len(query_words) > 0:
                density = word_matches / len(query_words)
                score += density * 20
                
        elif search_type == "username":
            # Username searches get high relevance if they match
            user_data = post.get("users", {}) or {}
            username = (user_data.get("username") or "").lower()
            full_name = (user_data.get("full_name") or "").lower()
            
            search_term = query_lower.replace("@", "")
            
            if username == search_term or full_name == search_term:
                score += 100  # Exact username match
            elif search_term in username or search_term in full_name:
                score += 80   # Partial username match
            
            # For username searches, all posts by matching users should have high relevance
            if search_term in username or search_term in full_name:
                score += 50  # Boost all posts by this user
                
        elif search_type == "category":
            category = (post.get("category") or "").lower()
            if query_lower in category:
                score += 90
                
        # Special boost for category matches when search is category-focused
        if is_category_focused:
            category = (post.get("category") or "").lower()
            query_clean = query_lower.replace(" law", "").strip()
            
            # Exact category match gets massive boost
            if query_clean == "family" and "family" in category:
                score += 200  # Highest priority for exact category match
            elif query_clean == "labor" and ("labor" in category or "labour" in category):
                score += 200
            elif query_clean == "civil" and "civil" in category:
                score += 200
            elif query_clean == "consumer" and "consumer" in category:
                score += 200
            elif query_clean == "criminal" and "criminal" in category:
                score += 200
            elif query_clean in category:
                score += 150  # High boost for partial category match
                
        # Boost recent posts slightly
        try:
            created_at = datetime.fromisoformat(post.get("created_at", "").replace("Z", "+00:00"))
            days_old = (datetime.now().replace(tzinfo=created_at.tzinfo) - created_at).days
            if days_old < 7:
                score += 5  # Recent posts get small boost
        except:
            pass
            
        # Boost posts with more engagement
        reply_count = post.get("reply_count", 0)
        score += min(reply_count * 2, 10)  # Max 10 points for engagement
        
        return score
    
    def detect_search_type(self, query: str) -> str:
        """Detect the type of search based on query pattern."""
        query = query.strip()
        query_lower = query.lower()
        
        if query.startswith("@"):
            return "username"
        elif query_lower in ["family", "labor", "civil", "consumer", "criminal", "other", "others",
                           "family law", "labor law", "civil law", "consumer law", "criminal law"]:
            return "category"
        else:
            return "content"
    
    def build_search_filters(self, query: str, search_type: str, category: Optional[str] = None) -> Dict[str, Any]:
        """Build search filters based on query and type."""
        filters = {
            "query": query,
            "search_type": search_type,
            "category_filter": category,
            "case_sensitive": False,
            "exact_match": False
        }
        
        # Check for exact match indicators
        if query.startswith('"') and query.endswith('"'):
            filters["exact_match"] = True
            filters["query"] = query.strip('"')
            
        return filters
    
    async def search_by_content(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search posts by content with advanced filtering."""
        try:
            # Clean and prepare query
            clean_query = re.sub(r'[^\w\s]', '', query).strip()
            if not clean_query:
                return []
            
            # Split into words for better matching
            words = clean_query.lower().split()
            if not words:
                return []
            
            # Build search conditions - search for any of the words
            search_conditions = []
            for word in words:
                if len(word) >= 2:  # Only search for words with 2+ characters
                    search_conditions.append(f"body.ilike.*{word}*")
            
            if not search_conditions:
                return []
            
            # Use OR condition to find posts containing any of the words
            search_filter = "or=(" + ",".join(search_conditions) + ")"
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.supabase.rest_url}/forum_posts?"
                    f"select=*,users(id,username,full_name,role)"
                    f"&{search_filter}"
                    f"&order=created_at.desc"
                    f"&limit={limit * 2}",  # Get more results for filtering
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    results = response.json() or []
                    
                    # Filter results to only include posts that contain the original query
                    # or a significant portion of the search words
                    filtered_results = []
                    query_lower = query.lower()
                    
                    for post in results:
                        body = (post.get("body") or "").lower()
                        
                        # Check if post is relevant
                        if query_lower in body:
                            # Direct match - high relevance
                            filtered_results.append(post)
                        else:
                            # Check word matches
                            word_matches = sum(1 for word in words if word in body)
                            match_ratio = word_matches / len(words) if words else 0
                            
                            # Include if at least 50% of words match
                            if match_ratio >= 0.5:
                                filtered_results.append(post)
                    
                    return filtered_results[:limit]
                else:
                    logger.error(f"Content search failed: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"Content search error: {str(e)}")
            return []
    
    async def search_by_username(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search posts by username."""
        try:
            username = query.replace("@", "").strip().lower()
            if not username:
                return []
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                # Search by username
                username_response = await client.get(
                    f"{self.supabase.rest_url}/forum_posts?"
                    f"select=*,users!inner(id,username,full_name,role)"
                    f"&users.username.ilike.*{username}*"
                    f"&order=created_at.desc"
                    f"&limit={limit}",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                results = []
                logger.info(f"Username search found {len(username_response.json() or [])} posts for username containing '{username}'")
                results.extend(username_response.json() or [])
                
                # Also search by full name
                fullname_response = await client.get(
                    f"{self.supabase.rest_url}/forum_posts?"
                    f"select=*,users!inner(id,username,full_name,role)"
                    f"&users.full_name.ilike.*{username}*"
                    f"&order=created_at.desc"
                    f"&limit={limit}",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if fullname_response.status_code == 200:
                    results.extend(fullname_response.json() or [])
                
                # Remove duplicates
                seen_ids = set()
                unique_results = []
                for post in results:
                    post_id = str(post.get('id'))
                    if post_id not in seen_ids:
                        seen_ids.add(post_id)
                        unique_results.append(post)
                
                return unique_results[:limit]
                
        except Exception as e:
            logger.error(f"Username search error: {str(e)}")
            return []
    
    async def search_by_category(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search posts by category."""
        try:
            query_lower = query.strip().lower()
            
            # Map search terms to actual category names
            category_mapping = {
                "family": "Family Law",
                "family law": "Family Law",
                "labor": "Labor Law", 
                "labour": "Labor Law",
                "labor law": "Labor Law",
                "labour law": "Labor Law",
                "civil": "Civil Law",
                "civil law": "Civil Law",
                "consumer": "Consumer Law",
                "consumer law": "Consumer Law",
                "criminal": "Criminal Law",
                "criminal law": "Criminal Law",
                "other": "Others",
                "others": "Others"
            }
            
            # Get the actual category name
            actual_category = category_mapping.get(query_lower, query.strip())
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                # Try exact match first
                response = await client.get(
                    f"{self.supabase.rest_url}/forum_posts?"
                    f"select=*,users(id,username,full_name,role)"
                    f"&category=eq.{actual_category}"
                    f"&order=created_at.desc"
                    f"&limit={limit}",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    results = response.json() or []
                    if results:
                        logger.info(f"Category search found {len(results)} posts for '{actual_category}'")
                        return results
                
                # If no exact match, try partial match
                response = await client.get(
                    f"{self.supabase.rest_url}/forum_posts?"
                    f"select=*,users(id,username,full_name,role)"
                    f"&category.ilike.*{actual_category}*"
                    f"&order=created_at.desc"
                    f"&limit={limit}",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    results = response.json() or []
                    logger.info(f"Category partial search found {len(results)} posts for '{actual_category}'")
                    return results
                else:
                    logger.error(f"Category search failed: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"Category search error: {str(e)}")
            return []

# Initialize search API
search_api = ForumSearchAPI()

@router.get("/search", response_model=SearchResponse)
async def search_forum_posts(
    q: str = Query(..., description="Search query"),
    limit: int = Query(50, ge=1, le=100, description="Number of results to return"),
    category: Optional[str] = Query(None, description="Filter by category"),
    sort: str = Query("relevance", description="Sort by: relevance, date, replies"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Advanced forum search API with intelligent filtering and relevance scoring.
    
    Supports:
    - Content search: Search in post body text
    - Username search: Use @username to find posts by specific users
    - Category search: Filter by legal categories
    - Exact phrase: Use "quotes" for exact phrase matching
    """
    try:
        if not q or len(q.strip()) < 2:
            return SearchResponse(
                success=True,
                data=[],
                total=0,
                query=q,
                search_type="none",
                message="Please enter at least 2 characters to search",
                filters_applied={}
            )
        
        query = q.strip()
        search_type = search_api.detect_search_type(query)
        filters = search_api.build_search_filters(query, search_type, category)
        
        logger.info(f"Forum search: query='{query}', type={search_type}, user={current_user.get('id', 'unknown')}")
        logger.info(f"Search filters: {filters}")
        
        # Execute search based on type
        raw_results = []
        
        if search_type == "username":
            raw_results = await search_api.search_by_username(query, limit * 2)
        elif search_type == "category":
            raw_results = await search_api.search_by_category(query, limit * 2)
        else:  # content search - prioritize category matches, then content matches
            # Check if query matches a category first
            query_lower = query.lower()
            category_keywords = ["family", "labor", "labour", "civil", "consumer", "criminal", "law"]
            is_likely_category = any(keyword in query_lower for keyword in category_keywords)
            
            if is_likely_category:
                # Prioritize category search for category-like queries - get more results
                category_results = await search_api.search_by_category(query, limit * 3)  # Get 3x more category results
                raw_results.extend(category_results)
                
                # Add content search results but with lower priority
                content_results = await search_api.search_by_content(query, limit // 2)
                raw_results.extend(content_results)
                
                # Add username search for completeness
                username_results = await search_api.search_by_username(query, limit // 4)
                raw_results.extend(username_results)
            else:
                # For non-category queries, prioritize content search
                content_results = await search_api.search_by_content(query, limit)
                raw_results.extend(content_results)
                
                # Also search usernames
                username_results = await search_api.search_by_username(query, limit // 2)
                raw_results.extend(username_results)
                
                # Check categories as fallback
                category_results = await search_api.search_by_category(query, limit // 4)
                raw_results.extend(category_results)
                
            # Remove duplicates from mixed search
            seen_ids = set()
            unique_raw_results = []
            for post in raw_results:
                post_id = str(post.get('id'))
                if post_id not in seen_ids:
                    seen_ids.add(post_id)
                    unique_raw_results.append(post)
            raw_results = unique_raw_results
        
        # Apply additional category filter if specified
        if category and search_type != "category":
            raw_results = [
                post for post in raw_results 
                if (post.get("category") or "").lower() == category.lower()
            ]
        
        # Calculate relevance scores and sort
        scored_results = []
        
        # Check if this is a category-focused search for scoring
        query_lower = query.lower()
        category_keywords = ["family", "labor", "labour", "civil", "consumer", "criminal", "law"]
        is_category_focused = search_type == "category" or any(keyword in query_lower for keyword in category_keywords)
        
        for post in raw_results:
            try:
                relevance_score = search_api.calculate_relevance_score(post, query, search_type, is_category_focused)
                post["relevance_score"] = relevance_score
                scored_results.append(post)
            except Exception as e:
                logger.error(f"Error scoring post {post.get('id', 'unknown')}: {str(e)}")
                continue
        
        # Sort by relevance or date
        if sort == "relevance":
            scored_results.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
        elif sort == "date":
            scored_results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Return final results with proper pagination - increase limit for category searches
        result_limit = limit * 2 if is_category_focused else limit
        final_results = scored_results[:result_limit]
        
        # Get user bookmarks for the results
        user_id = current_user.get("id")
        post_ids = [str(post.get("id")) for post in final_results]
        user_bookmarks = set()  # Simplified for now
        
        # Format results
        formatted_results = []
        for post in final_results:
            try:
                user_data = post.get("users", {}) or {}
                
                result = SearchResult(
                    id=str(post.get("id")),
                    body=post.get("body", ""),
                    category=post.get("category", ""),
                    created_at=post.get("created_at", ""),
                    updated_at=post.get("updated_at"),
                    user_id=str(post.get("user_id", "")),
                    is_anonymous=post.get("is_anonymous", False),
                    is_flagged=post.get("is_flagged", False),
                    reply_count=0,  # Simplified for now
                    is_bookmarked=str(post.get("id")) in user_bookmarks,
                    relevance_score=post.get("relevance_score", 0.0),
                    users=user_data
                )
                formatted_results.append(result)
            except Exception as e:
                logger.error(f"Error formatting result: {str(e)}")
                continue
        
        message = f"Found {len(formatted_results)} relevant posts"
        if len(raw_results) > len(formatted_results):
            message += f" (filtered from {len(raw_results)} total matches)"
        
        return SearchResponse(
            success=True,
            data=formatted_results,
            total=len(formatted_results),
            query=query,
            search_type=search_type,
            message=message,
            filters_applied=filters
        )
        
    except Exception as e:
        logger.error(f"Forum search error: {str(e)}")
        raise HTTPException(status_code=500, detail="Search failed")

@router.get("/search/suggestions")
async def get_search_suggestions(
    q: str = Query(..., description="Partial search query"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get intelligent search suggestions."""
    try:
        if not q or len(q.strip()) < 2:
            return {"suggestions": []}
        
        query = q.strip().lower()
        suggestions = []
        
        # Category suggestions
        categories = ["Family Law", "Labor Law", "Civil Law", "Consumer Law", "Criminal Law", "Others"]
        category_suggestions = [cat for cat in categories if query in cat.lower()]
        suggestions.extend(category_suggestions)
        
        # Also suggest short category names
        short_categories = ["Family", "Labor", "Civil", "Consumer", "Criminal", "Other"]
        short_suggestions = [cat for cat in short_categories if query in cat.lower()]
        suggestions.extend(short_suggestions)
        
        # Common legal terms
        legal_terms = [
            "contract", "breach of contract", "employment law", "divorce", "custody",
            "inheritance", "property law", "criminal defense", "small claims",
            "illegal dismissal", "labor dispute", "family court", "civil case"
        ]
        term_suggestions = [term for term in legal_terms if query in term.lower()]
        suggestions.extend(term_suggestions)
        
        # Username suggestions (if starts with @)
        if query.startswith('@'):
            username_query = query[1:]
            if len(username_query) >= 2:
                try:
                    supabase = SupabaseService()
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        response = await client.get(
                            f"{supabase.rest_url}/users?"
                            f"select=username,full_name"
                            f"&or=(username.ilike.*{username_query}*,full_name.ilike.*{username_query}*)"
                            f"&limit=5",
                            headers=supabase._get_headers(use_service_key=True)
                        )
                        
                        if response.status_code == 200:
                            users = response.json() or []
                            for user in users:
                                username = user.get("username")
                                if username:
                                    suggestions.append(f"@{username}")
                except Exception as e:
                    logger.error(f"Username suggestions error: {str(e)}")
        
        # Remove duplicates and limit
        suggestions = list(dict.fromkeys(suggestions))[:10]
        
        return {"suggestions": suggestions}
        
    except Exception as e:
        logger.error(f"Search suggestions error: {str(e)}")
        return {"suggestions": []}
