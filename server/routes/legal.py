from fastapi import APIRouter, HTTPException, Query
from services.supabase_service import SupabaseService
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/legal", tags=["legal"])

@router.get("/articles")
async def get_legal_articles(
    domain: Optional[str] = Query(None, description="Filter by domain/category"),
    limit: int = Query(50, ge=1, le=100, description="Number of articles to return"),
    offset: int = Query(0, ge=0, description="Number of articles to skip")
):
    """
    Get legal articles from the database
    """
    try:
        supabase_service = SupabaseService()
        
        # Build the query
        query = supabase_service.supabase.table("legal_articles").select("*")
        
        # Apply domain filter if provided
        if domain:
            query = query.eq("domain", domain)
        
        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        # Execute the query
        response = await query.execute()
        
        if response.error:
            logger.error(f"Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        articles = response.data or []
        
        return {
            "success": True,
            "data": articles,
            "count": len(articles),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching legal articles: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/articles/{article_id}")
async def get_legal_article(article_id: int):
    """
    Get a specific legal article by ID
    """
    try:
        supabase_service = SupabaseService()
        
        response = await supabase_service.supabase.table("legal_articles").select("*").eq("id", article_id).single().execute()
        
        if response.error:
            if response.error.code == "PGRST116":
                raise HTTPException(status_code=404, detail="Article not found")
            logger.error(f"Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        return {
            "success": True,
            "data": response.data
        }
        
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
