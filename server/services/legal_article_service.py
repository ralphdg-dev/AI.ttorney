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
        self._cache_duration = 300             
    
    async def get_articles(self, params: SearchParams) -> tuple[List[LegalArticle], int]:
        """
        Get legal articles with filtering and pagination using HTTP requests
        Returns tuple of (articles, total_count)
        """
        try:
            logger.info(f"📚 Fetching articles with params: category={params.category}, search={params.search}, limit={params.limit}, offset={params.offset}")
            
            # CRITICAL FIX: Fetch ALL articles first, then check verified status in code
            # This ensures we can see what's in the database and provide better debugging
            query_params = []
            
            # Only filter by is_verified if it's explicitly needed
            # For now, let's fetch ALL and filter in Python to debug
            logger.info("🔍 DEBUG: Fetching all articles (including unverified) to debug")
            
            if params.category:
                db_category = "labor" if params.category.lower() == "work" else params.category
                query_params.append(f"category=eq.{db_category}")
                logger.info(f"🔍 DEBUG: Filtering by category: {db_category}")
            
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
                logger.info(f"🔍 DEBUG: Searching for: {params.search}")
            
            query_string = "&".join(query_params) if query_params else ""
            logger.info(f"🔍 DEBUG: Query string: {query_string}")
            
            async with httpx.AsyncClient() as client:
                select_fields = (
                    "id,title_en,title_fil,description_en,description_fil,"
                    "content_en,content_fil,category,image_article,is_verified,created_at,updated_at"
                )
                
                # Build the count URL
                count_url = f"{self.supabase_service.rest_url}/legal_articles?select=id"
                if query_string:
                    count_url += f"&{query_string}"
                
                logger.info(f"🔍 DEBUG: Count URL: {count_url}")
                
                count_response = await client.get(
                    count_url,
                    headers={
                        **self.supabase_service._get_headers(),
                        "Prefer": "count=exact"
                    }
                )
                
                logger.info(f"🔍 DEBUG: Count response status: {count_response.status_code}")
                
                total_count = 0
                if count_response.status_code == 200:
                    content_range = count_response.headers.get("content-range", "")
                    logger.info(f"🔍 DEBUG: Content-Range header: {content_range}")
                    if content_range and "/" in content_range:
                        total_count = int(content_range.split("/")[-1])
                        logger.info(f"📊 Total count from database: {total_count}")
                else:
                    logger.error(f"❌ Count query failed: {count_response.text}")
                
                # Build the articles URL
                range_header = f"{params.offset}-{params.offset + params.limit - 1}"
                articles_url = f"{self.supabase_service.rest_url}/legal_articles?select={select_fields}"
                if query_string:
                    articles_url += f"&{query_string}"
                
                logger.info(f"🔍 DEBUG: Articles URL: {articles_url}")
                logger.info(f"🔍 DEBUG: Range header: {range_header}")
                
                articles_response = await client.get(
                    articles_url,
                    headers={
                        **self.supabase_service._get_headers(),
                        "Range": range_header
                    }
                )
                
                logger.info(f"🔍 DEBUG: Articles response status: {articles_response.status_code}")
                
                if articles_response.status_code != 200:
                    logger.error(f"❌ Failed to fetch articles: {articles_response.status_code}")
                    logger.error(f"❌ Response body: {articles_response.text}")
                    return [], 0
                
                articles_data = articles_response.json()
                logger.info(f"📊 Database returned {len(articles_data)} total articles")
                
                if not articles_data:
                    logger.warning("⚠️ No articles found in database!")
                    logger.warning(f"⚠️ Check that 'legal_articles' table exists in Supabase")
                    logger.warning(f"⚠️ Check that articles have content in title_en field")
                    return [], total_count
                
                # Log sample of what we got
                if articles_data:
                    sample = articles_data[0]
                    logger.info(f"🔍 DEBUG: Sample article: id={sample.get('id')}, title={sample.get('title_en')}, is_verified={sample.get('is_verified')}")
                
                # FILTER in Python: Only return verified articles
                verified_articles = [article for article in articles_data if article.get('is_verified') == True]
                unverified_count = len(articles_data) - len(verified_articles)
                
                if unverified_count > 0:
                    logger.warning(f"⚠️ Found {unverified_count} UNVERIFIED articles that will be filtered out")
                    logger.warning(f"⚠️ To show these articles, set is_verified=true in Supabase")
                
                logger.info(f"✅ Returning {len(verified_articles)} verified articles out of {len(articles_data)} total")
                
                # Transform to LegalArticle objects
                articles = [LegalArticle(**article) for article in verified_articles]
                
                return articles, len(verified_articles)
            
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
                
                                  
                self._set_cache(cache_key, article_data)
                logger.info(f" CACHED ARTICLE: {article_id} - {article_data.get('title_en', 'Unknown')}")
                
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
        logger.info("🗑 Article cache cleared")

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
                logger.info(f" Sent article published notifications to {len(user_ids)} users")
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
                logger.info(f" Sent article updated notifications to {len(user_ids)} users")
        except Exception as e:
            logger.error(f"Failed to send article updated notifications: {e}")
