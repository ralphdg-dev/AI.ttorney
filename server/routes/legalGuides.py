from fastapi import APIRouter, HTTPException, Query, Depends
from services.legal_article_service import LegalArticleService
from services.notification_service import NotificationService
from config.dependencies import get_supabase
from supabase import Client
from models.legal_article import (
    LegalArticleResponse, 
    LegalArticleSearchResponse, 
    LegalArticleSingleResponse,
    CategoryResponse,
    SearchParams
)
from typing import Optional
import logging


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/legal", tags=["legal"])

@router.get("/articles", response_model=LegalArticleResponse)
async def get_legal_articles(
    domain: Optional[str] = Query(None, description="Filter by domain (legacy)"),
    category: Optional[str] = Query(None, description="Filter by category (preferred)"),
    search: Optional[str] = Query(None, description="Search query for titles, descriptions, and content in both languages"),
    limit: int = Query(50, ge=1, le=100, description="Number of articles to return"),
    offset: int = Query(0, ge=0, description="Number of articles to skip")
):
    """
    Get legal articles from the database with improved security and performance
    """
    try:
        service = LegalArticleService()
        params = SearchParams(
            search=search,
            category=category,
            limit=limit,
            offset=offset
        )
        
        articles, total_count = await service.get_articles(params)
        
        return LegalArticleResponse(
            success=True,
            data=articles,
            count=len(articles),
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        logger.error(f"Error fetching legal articles: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/search", response_model=LegalArticleSearchResponse)
async def search_legal_articles(
    q: str = Query(..., description="Search query for titles, descriptions, and content in both languages"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(20, ge=1, le=50, description="Number of articles to return"),
    offset: int = Query(0, ge=0, description="Number of articles to skip")
):
    """
    Search legal articles with support for Filipino and English text
    """
    try:
        service = LegalArticleService()
        articles, total_count = await service.search_articles(
            query=q,
            category=category,
            limit=limit,
            offset=offset
        )
        
        return LegalArticleSearchResponse(
            success=True,
            data=articles,
            count=len(articles),
            limit=limit,
            offset=offset,
            query=q
        )
        
    except Exception as e:
        logger.error(f"Error searching legal articles: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/categories", response_model=CategoryResponse)
async def get_legal_article_categories():
    """
    Get all available categories for legal articles
    """
    try:
        service = LegalArticleService()
        categories = await service.get_categories()
        
        return CategoryResponse(
            success=True,
            data=categories,
            count=len(categories)
        )
        
    except Exception as e:
        logger.error(f"Error fetching legal article categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/articles/{article_id}", response_model=LegalArticleSingleResponse)
async def get_legal_article(article_id: str):
    """
    Get a specific legal article by ID
    """
    try:
        service = LegalArticleService()
        article = await service.get_article_by_id(article_id)
        
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        return LegalArticleSingleResponse(
            success=True,
            data=article
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching legal article {article_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
