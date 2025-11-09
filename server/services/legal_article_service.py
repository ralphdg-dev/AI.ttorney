from typing import List, Optional
from services.supabase_service import SupabaseService
from services.notification_service import NotificationService
from models.legal_article import LegalArticle, SearchParams
import logging
import httpx
import time
from supabase import create_client

logger = logging.getLogger(__name__)

class LegalArticleService:
    def __init__(self):
        self.supabase_service = SupabaseService()
        self._article_cache = {}
        self._cache_duration = 300  # 5 minutes
    
    async def get_articles(self, params: SearchParams) -> tuple[List[LegalArticle], int]:
        """
        Get legal articles with filtering and pagination using HTTP requests
        Returns tuple of (articles, total_count)
        """
        try:
            # Build query parameters
            query_params = ["is_verified=eq.true"]
            
            # Apply category filter
            if params.category:
                db_category = "labor" if params.category.lower() == "work" else params.category
                query_params.append(f"category=eq.{db_category}")
            
            # Apply search filter
            if params.search:
                search_term = params.search.replace(" ", "%20")
                search_filter = (
                    f"or=(title_en.ilike.*{search_term}*,"
                    f"title_fil.ilike.*{search_term}*,"
                    f"description_en.ilike.*{search_term}*,"
                    f"description_fil.ilike.*{search_term}*,"
                    f"content_en.ilike.*{search_term}*,"
                    f"content_fil.ilike.*{search_term}*)"
                )
                query_params.append(search_filter)
            
            # Build the query string
            query_string = "&".join(query_params)
            
            async with httpx.AsyncClient() as client:
                # Get total count
                count_url = f"{self.supabase_service.rest_url}/legal_articles?select=id&{query_string}"
                count_response = await client.get(
                    count_url,
                    headers={
                        **self.supabase_service._get_headers(),
                        "Prefer": "count=exact"
                    }
                )
                
                total_count = 0
                if count_response.status_code == 200:
                    content_range = count_response.headers.get("content-range", "")
                    if content_range and "/" in content_range:
                        total_count = int(content_range.split("/")[-1])
                
                # Get articles with pagination
                select_fields = (
                    "id,title_en,title_fil,description_en,description_fil,"
                    "content_en,content_fil,category,image_article,is_verified,created_at,updated_at"
                )
                
                range_header = f"{params.offset}-{params.offset + params.limit - 1}"
                articles_url = f"{self.supabase_service.rest_url}/legal_articles?select={select_fields}&{query_string}"
                
                articles_response = await client.get(
                    articles_url,
                    headers={
                        **self.supabase_service._get_headers(),
                        "Range": range_header
                    }
                )
                
                if articles_response.status_code != 200:
                    logger.error(f"Failed to fetch articles: {articles_response.status_code} - {articles_response.text}")
                    return [], 0
                
                articles_data = articles_response.json()
                if not articles_data:
                    return [], total_count
                
                # Convert to Pydantic models
                articles = [LegalArticle(**article) for article in articles_data]
                return articles, total_count
            
        except Exception as e:
            logger.error(f"Error fetching articles: {str(e)}")
            raise Exception(f"Failed to fetch articles: {str(e)}")
    
    async def search_articles(self, query: str, category: Optional[str] = None, 
                            limit: int = 20, offset: int = 0) -> tuple[List[LegalArticle], int]:
        """
        Search articles with multilingual support
        Returns tuple of (articles, total_count)
        """
        params = SearchParams(
            search=query,
            category=category,
            limit=limit,
            offset=offset
        )
        return await self.get_articles(params)
    
    async def get_article_by_id(self, article_id: str) -> Optional[LegalArticle]:
        """
        Get a specific article by ID using HTTP requests with caching
        """
        try:
            # Check cache first
            cache_key = f"article_{article_id}"
            cached_data = self._get_cached_data(cache_key)
            if cached_data:
                logger.info(f"📦 USING CACHED ARTICLE: {article_id}")
                return LegalArticle(**cached_data)
            
            select_fields = (
                "id,title_en,title_fil,description_en,description_fil,"
                "content_en,content_fil,category,image_article,is_verified,created_at,updated_at"
            )
            
            async with httpx.AsyncClient() as client:
                # Sanitize article_id to prevent SQL injection
                import urllib.parse
                sanitized_article_id = urllib.parse.quote(str(article_id), safe='')
                
                response = await client.get(
                    f"{self.supabase_service.rest_url}/legal_articles",
                    params={
                        "select": select_fields,
                        "id": f"eq.{sanitized_article_id}",
                        "is_verified": "eq.true"
                    },
                    headers=self.supabase_service._get_headers()
                )
                
                if response.status_code != 200:
                    logger.error(f"Failed to fetch article {article_id}: {response.status_code} - {response.text}")
                    return None
                
                articles_data = response.json()
                if not articles_data:
                    return None
                
                article_data = articles_data[0]
                
                # Cache the result
                self._set_cache(cache_key, article_data)
                logger.info(f"✅ CACHED ARTICLE: {article_id} - {article_data.get('title_en', 'Unknown')}")
                
                return LegalArticle(**article_data)
            
        except Exception as e:
            logger.error(f"Error fetching article {article_id}: {str(e)}")
            return None
    
    async def get_categories(self) -> List[str]:
        """
        Get all available article categories using HTTP requests
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.supabase_service.rest_url}/legal_articles?select=category&is_verified=eq.true"
                
                response = await client.get(
                    url,
                    headers=self.supabase_service._get_headers()
                )
                
                if response.status_code != 200:
                    logger.error(f"Failed to fetch categories: {response.status_code} - {response.text}")
                    return []
                
                articles_data = response.json()
                if not articles_data:
                    return []
                
                # Extract unique categories
                categories = list(set([
                    article.get("category") 
                    for article in articles_data 
                    if article.get("category")
                ]))
                categories.sort()
                
                return categories
            
        except Exception as e:
            logger.error(f"Error fetching categories: {str(e)}")
            raise Exception(f"Failed to fetch categories: {str(e)}")
    
    async def get_articles_by_category(self, category: str, limit: int = 50, 
                                     offset: int = 0) -> tuple[List[LegalArticle], int]:
        """
        Get articles filtered by category
        """
        params = SearchParams(
            category=category,
            limit=limit,
            offset=offset
        )
        return await self.get_articles(params)
    
    def _get_cached_data(self, cache_key: str):
        """Get data from cache if not expired"""
        if cache_key in self._article_cache:
            cached_item = self._article_cache[cache_key]
            if time.time() - cached_item['timestamp'] < self._cache_duration:
                return cached_item['data']
            else:
                # Remove expired cache
                del self._article_cache[cache_key]
        return None
    
    def _set_cache(self, cache_key: str, data):
        """Set data in cache with timestamp"""
        self._article_cache[cache_key] = {
            'data': data,
            'timestamp': time.time()
        }
    
    def clear_cache(self):
        """Clear all cached data"""
        self._article_cache.clear()
        logger.info("🗑️ Article cache cleared")

    async def notify_article_published(self, article_id: str, title: str):
        """Notify all users of new article"""
        try:
            supabase = create_client(self.supabase_service.url, self.supabase_service.service_key)
            notification_service = NotificationService(supabase)

            users_result = supabase.table("users").select("id").eq("role", "registered_user").execute()
            if users_result.data:
                user_ids = [user["id"] for user in users_result.data[:100]]
                await notification_service.notify_content_published(
                    user_ids=user_ids,
                    content_type="article",
                    title=title,
                    content_id=article_id
                )
                logger.info(f"✅ Sent article published notifications to {len(user_ids)} users")
        except Exception as e:
            logger.error(f"Failed to send article published notifications: {e}")

    async def notify_article_updated(self, article_id: str, title: str):
        """Notify users who bookmarked the article"""
        try:
            supabase = create_client(self.supabase_service.url, self.supabase_service.service_key)
            notification_service = NotificationService(supabase)

            bookmarks_result = supabase.table("user_guide_bookmarks").select("user_id").eq("guide_id", article_id).execute()
            if bookmarks_result.data:
                user_ids = list(set([bookmark["user_id"] for bookmark in bookmarks_result.data]))
                await notification_service.notify_content_updated(
                    user_ids=user_ids,
                    content_type="article",
                    title=title,
                    content_id=article_id
                )
                logger.info(f"✅ Sent article updated notifications to {len(user_ids)} users")
        except Exception as e:
            logger.error(f"Failed to send article updated notifications: {e}")
