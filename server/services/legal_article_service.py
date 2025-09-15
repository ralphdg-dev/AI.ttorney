from typing import List, Optional
from services.supabase_service import SupabaseService
from models.legal_article import LegalArticle, SearchParams
import logging

logger = logging.getLogger(__name__)

class LegalArticleService:
    def __init__(self):
        self.supabase_service = SupabaseService()
    
    async def get_articles(self, params: SearchParams) -> tuple[List[LegalArticle], int]:
        """
        Get legal articles with filtering and pagination
        Returns tuple of (articles, total_count)
        """
        try:
            # Build base query
            query = self.supabase_service.supabase.table("legal_articles").select(
                "id, title_en, title_fil, description_en, description_fil, content_en, content_fil, "
                "category, image_article, is_verified, created_at, updated_at"
            ).eq("is_verified", True)
            
            # Apply category filter
            if params.category:
                db_category = "labor" if params.category.lower() == "work" else params.category
                query = query.eq("category", db_category)
            
            # Apply search filter
            if params.search:
                search_term = f"%{params.search}%"
                query = query.or_(
                    f"title_en.ilike.{search_term},"
                    f"title_fil.ilike.{search_term},"
                    f"description_en.ilike.{search_term},"
                    f"description_fil.ilike.{search_term},"
                    f"content_en.ilike.{search_term},"
                    f"content_fil.ilike.{search_term}"
                )
            
            # Get total count for pagination
            count_query = self.supabase_service.supabase.table("legal_articles").select(
                "id", count="exact"
            ).eq("is_verified", True)
            
            if params.category:
                db_category = "labor" if params.category.lower() == "work" else params.category
                count_query = count_query.eq("category", db_category)
            
            if params.search:
                search_term = f"%{params.search}%"
                count_query = count_query.or_(
                    f"title_en.ilike.{search_term},"
                    f"title_fil.ilike.{search_term},"
                    f"description_en.ilike.{search_term},"
                    f"description_fil.ilike.{search_term},"
                    f"content_en.ilike.{search_term},"
                    f"content_fil.ilike.{search_term}"
                )
            
            # Execute count query
            count_response = count_query.execute()
            total_count = count_response.count or 0
            
            # Apply pagination and execute main query
            query = query.range(params.offset, params.offset + params.limit - 1)
            response = query.execute()
            
            if not response.data:
                return [], 0
            
            # Convert to Pydantic models
            articles = [LegalArticle(**article) for article in response.data]
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
    
    async def get_article_by_id(self, article_id: int) -> Optional[LegalArticle]:
        """
        Get a specific article by ID
        """
        try:
            response = self.supabase_service.supabase.table("legal_articles") \
                .select(
                    "id, title_en, title_fil, description_en, description_fil, content_en, content_fil, "
                    "category, image_article, is_verified, created_at, updated_at"
                ) \
                .eq("id", article_id) \
                .eq("is_verified", True) \
                .single() \
                .execute()
            
            if not response.data:
                return None
            
            return LegalArticle(**response.data)
            
        except Exception as e:
            logger.error(f"Error fetching article {article_id}: {str(e)}")
            return None
    
    async def get_categories(self) -> List[str]:
        """
        Get all available article categories
        """
        try:
            response = self.supabase_service.supabase.table("legal_articles") \
                .select("category") \
                .eq("is_verified", True) \
                .execute()
            
            if not response.data:
                return []
            
            # Extract unique categories
            categories = list(set([
                article.get("category") 
                for article in response.data 
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
