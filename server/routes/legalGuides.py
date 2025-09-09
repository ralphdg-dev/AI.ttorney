from fastapi import APIRouter, HTTPException, Query
from services.supabase_service import SupabaseService
from typing import List, Optional
import logging


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/legal", tags=["legal"])

@router.get("/articles")
def get_legal_articles(
    domain: Optional[str] = Query(None, description="Filter by domain (legacy)"),
    category: Optional[str] = Query(None, description="Filter by category (preferred)"),
    search: Optional[str] = Query(None, description="Search query for titles, descriptions, and content in both languages"),
    limit: int = Query(50, ge=1, le=100, description="Number of articles to return"),
    offset: int = Query(0, ge=0, description="Number of articles to skip")
):
    """
    Get legal articles from the database
    """
    try:
        supabase_service = SupabaseService()
        
        # Build the query - select all fields including new description fields
        query = supabase_service.supabase.table("legal_articles").select(
            "id, title_en, title_fil, description_en, description_fil, content_en, content_fil, "
            "category, image_article, is_verified, created_at, updated_at"
        ).eq("is_verified", True)
        
        # Apply filters
        if category:
            db_category = "labor" if category.lower() == "work" else category
            query = query.eq("category", db_category)
        
        # Apply search filter - search across all text fields in both languages
        if search:
            search_term = f"%{search}%"
            query = query.or_(
                f"title_en.ilike.{search_term},"
                f"title_fil.ilike.{search_term},"
                f"description_en.ilike.{search_term},"
                f"description_fil.ilike.{search_term},"
                f"content_en.ilike.{search_term},"
                f"content_fil.ilike.{search_term}"
            )
        
        # Pagination
        query = query.range(offset, offset + limit - 1)
        
        # Execute (no await)
        response = query.execute()
        
        if not response.data:
            return {"success": True, "data": [], "count": 0, "limit": limit, "offset": offset}
        
        return {
            "success": True,
            "data": response.data,
            "count": len(response.data),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching legal articles: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/search")
def search_legal_articles(
    q: str = Query(..., description="Search query for titles, descriptions, and content in both languages"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(20, ge=1, le=50, description="Number of articles to return"),
    offset: int = Query(0, ge=0, description="Number of articles to skip")
):
    """
    Search legal articles with support for Filipino and English text
    """
    try:
        supabase_service = SupabaseService()
        
        # Build the query - select all fields including new description fields
        query = supabase_service.supabase.table("legal_articles").select(
            "id, title_en, title_fil, description_en, description_fil, content_en, content_fil, "
            "category, image_article, is_verified, created_at, updated_at"
        ).eq("is_verified", True)
        
        # Apply category filter if provided
        if category:
            db_category = "labor" if category.lower() == "work" else category
            query = query.eq("category", db_category)
        
        # Apply search filter - search across all text fields in both languages
        search_term = f"%{q}%"
        query = query.or_(
            f"title_en.ilike.{search_term},"
            f"title_fil.ilike.{search_term},"
            f"description_en.ilike.{search_term},"
            f"description_fil.ilike.{search_term},"
            f"content_en.ilike.{search_term},"
            f"content_fil.ilike.{search_term}"
        )
        
        # Pagination
        query = query.range(offset, offset + limit - 1)
        
        # Execute (no await)
        response = query.execute()
        
        if not response.data:
            return {"success": True, "data": [], "count": 0, "limit": limit, "offset": offset, "query": q}
        
        return {
            "success": True,
            "data": response.data,
            "count": len(response.data),
            "limit": limit,
            "offset": offset,
            "query": q
        }
        
    except Exception as e:
        logger.error(f"Error searching legal articles: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/categories")
def get_legal_article_categories():
    """
    Get all available categories for legal articles
    """
    try:
        supabase_service = SupabaseService()
        
        response = supabase_service.supabase.table("legal_articles").select("category").execute()
        
        if response.data is None:
            logger.error("No data returned from Supabase")
            raise HTTPException(status_code=500, detail="Database error")
        
        # Extract unique categories
        categories = list(set([article.get("category") for article in (response.data or []) if article.get("category")]))
        categories.sort()
        
        return {
            "success": True,
            "data": categories,
            "count": len(categories)
        }
        
    except Exception as e:
        logger.error(f"Error fetching legal article categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/articles/{article_id}")
def get_legal_article(article_id: int):
    """
    Get a specific legal article by ID
    """
    try:
        supabase_service = SupabaseService()
        
        response = supabase_service.supabase.table("legal_articles") \
            .select(
                "id, title_en, title_fil, description_en, description_fil, content_en, content_fil, "
                "category, image_article, is_verified, created_at, updated_at"
            ) \
            .eq("id", article_id) \
            .eq("is_verified", True) \
            .single() \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Article not found")
        
        return {"success": True, "data": response.data}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching legal article {article_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
