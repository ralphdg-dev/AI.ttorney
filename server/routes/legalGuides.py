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
    limit: int = Query(50, ge=1, le=100, description="Number of articles to return"),
    offset: int = Query(0, ge=0, description="Number of articles to skip")
):
    """
    Get legal articles from the database
    """
    try:
        supabase_service = SupabaseService()
        
        # Build the query
        query = supabase_service.supabase.table("legal_articles").select("*").eq("is_verified", True)
        
        # Apply filters
        if category:
            db_category = "labor" if category.lower() == "work" else category
            query = query.eq("category", db_category)
        elif domain:
            query = query.eq("domain", domain)
        
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


@router.get("/articles/{article_id}")
def get_legal_article(article_id: int):
    """
    Get a specific legal article by ID
    """
    try:
        supabase_service = SupabaseService()
        
        response = supabase_service.supabase.table("legal_articles") \
            .select("*") \
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


@router.get("/articles/domains")
async def get_legal_article_domains():
    """
    Get all available domains/categories for legal articles
    """
    try:
        supabase_service = SupabaseService()
        
        response = await supabase_service.supabase.table("legal_articles").select("domain").execute()
        
        if response.error:
            logger.error(f"Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        # Extract unique domains
        domains = list(set([article.get("domain") for article in (response.data or []) if article.get("domain")]))
        domains.sort()
        
        return {
            "success": True,
            "data": domains,
            "count": len(domains)
        }
        
    except Exception as e:
        logger.error(f"Error fetching legal article domains: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
