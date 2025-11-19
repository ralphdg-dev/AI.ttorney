from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from middleware.auth import get_current_user
from services.supabase_service import SupabaseService
import logging
import httpx

router = APIRouter(prefix="/api/user/favorites", tags=["user_favorites"])
logger = logging.getLogger(__name__)

# Pydantic models
class FavoriteTermRequest(BaseModel):
    glossary_id: str  # UUID

class FavoriteTermResponse(BaseModel):
    id: str
    user_id: str
    glossary_id: str  # UUID
    favorited_at: str

class BookmarkGuideRequest(BaseModel):
    article_id: str

class BookmarkGuideResponse(BaseModel):
    id: str
    user_id: str
    article_id: str
    bookmarked_at: str

# ============= GLOSSARY FAVORITES ENDPOINTS =============

@router.get("/terms")
async def get_favorite_terms(current_user: dict = Depends(get_current_user)):
    """Get all favorite glossary terms with full term details for the current user"""
    try:
        user_id = current_user.get("user", {}).get("id") or current_user.get("profile", {}).get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        supabase_service = SupabaseService()
        
        async with httpx.AsyncClient() as client:
            # Single query with embedded resource (PostgREST feature)
            response = await client.get(
                f"{supabase_service.rest_url}/user_glossary_favorites",
                params={
                    "user_id": f"eq.{user_id}",
                    "select": "id,glossary_id,favorited_at,glossary_terms!glossary_id(id,term_en,term_fil,definition_en,definition_fil,category)",
                    "order": "favorited_at.desc"
                },
                headers=supabase_service._get_headers()
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch favorites: {response.text}")
                return []
            
            favorites = response.json()
            
            # Transform to expected format
            result = [
                {
                    "id": fav["id"],
                    "glossary_id": fav["glossary_id"],
                    "favorited_at": fav["favorited_at"],
                    "term": fav.get("glossary_terms")
                }
                for fav in favorites
                if fav.get("glossary_terms")
            ]
            
            logger.info(f"✅ Retrieved {len(result)} favorite terms for user {user_id}")
            return result
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching favorite terms: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/terms", response_model=FavoriteTermResponse)
async def add_favorite_term(
    request: FavoriteTermRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add a glossary term to favorites"""
    try:
        user_id = current_user.get("user", {}).get("id") or current_user.get("profile", {}).get("id")
        if not user_id:
            logger.error(f"User ID not found in current_user: {current_user}")
            raise HTTPException(status_code=401, detail="User ID not found")
        
        supabase_service = SupabaseService()
        
        # Check if already favorited
        async with httpx.AsyncClient() as client:
            check_response = await client.get(
                f"{supabase_service.rest_url}/user_glossary_favorites",
                params={
                    "user_id": f"eq.{user_id}",
                    "glossary_id": f"eq.{request.glossary_id}",
                    "select": "id"
                },
                headers=supabase_service._get_headers()
            )
            
            if check_response.status_code == 200:
                existing = check_response.json()
                if existing:
                    logger.info(f"Term {request.glossary_id} already favorited by user {user_id}")
                    raise HTTPException(status_code=409, detail="Term already in favorites")
            
            # Insert new favorite
            insert_response = await client.post(
                f"{supabase_service.rest_url}/user_glossary_favorites",
                json={
                    "user_id": user_id,
                    "glossary_id": request.glossary_id
                },
                headers={**supabase_service._get_headers(), "Prefer": "return=representation"}
            )
            
            if insert_response.status_code == 201:
                favorite = insert_response.json()[0]
                logger.info(f"✅ Added term {request.glossary_id} to favorites for user {user_id}")
                return favorite
            else:
                logger.error(f"Failed to add favorite: {insert_response.text}")
                raise HTTPException(status_code=500, detail="Failed to add favorite term")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding favorite term: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/terms/{term_id}")
async def remove_favorite_term(term_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a glossary term from favorites"""
    try:
        user_id = current_user.get("user", {}).get("id") or current_user.get("profile", {}).get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        supabase_service = SupabaseService()
        
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{supabase_service.rest_url}/user_glossary_favorites",
                params={
                    "user_id": f"eq.{user_id}",
                    "glossary_id": f"eq.{term_id}"
                },
                headers=supabase_service._get_headers()
            )
            
            if response.status_code == 204:
                logger.info(f"✅ Removed term {term_id} from favorites for user {user_id}")
                return {"success": True, "message": "Favorite removed successfully"}
            else:
                logger.error(f"Failed to remove favorite: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to remove favorite term")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing favorite term: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/terms/check/{glossary_id}")
async def check_favorite_term(
    glossary_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check if a glossary term is favorited by the current user"""
    try:
        user_id = current_user.get("user", {}).get("id") or current_user.get("profile", {}).get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        supabase_service = SupabaseService()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase_service.rest_url}/user_glossary_favorites",
                params={
                    "user_id": f"eq.{user_id}",
                    "glossary_id": f"eq.{glossary_id}",
                    "select": "id"
                },
                headers=supabase_service._get_headers()
            )
            
            if response.status_code == 200:
                existing = response.json()
                is_favorite = len(existing) > 0
                return {"is_favorite": is_favorite}
            else:
                logger.error(f"Failed to check favorite: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to check favorite status")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking favorite term: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ============= GUIDE BOOKMARKS ENDPOINTS =============

@router.get("/guides", response_model=List[BookmarkGuideResponse])
async def get_bookmarked_guides(current_user: dict = Depends(get_current_user)):
    """Get all bookmarked legal guides for the current user"""
    try:
        user_id = current_user.get("user", {}).get("id") or current_user.get("profile", {}).get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        supabase_service = SupabaseService()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase_service.rest_url}/user_guide_bookmarks",
                params={
                    "user_id": f"eq.{user_id}",
                    "select": "*",
                    "order": "bookmarked_at.desc"
                },
                headers=supabase_service._get_headers()
            )
            
            if response.status_code == 200:
                bookmarks = response.json()
                logger.info(f"✅ Retrieved {len(bookmarks)} bookmarked guides for user {user_id}")
                return bookmarks
            else:
                logger.error(f"Failed to fetch bookmarks: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to fetch bookmarked guides")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching bookmarked guides: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/guides", response_model=BookmarkGuideResponse)
async def add_bookmarked_guide(
    request: BookmarkGuideRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add a legal guide to bookmarks"""
    try:
        user_id = current_user.get("user", {}).get("id") or current_user.get("profile", {}).get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        supabase_service = SupabaseService()
        
        # Check if already bookmarked
        async with httpx.AsyncClient() as client:
            check_response = await client.get(
                f"{supabase_service.rest_url}/user_guide_bookmarks",
                params={
                    "user_id": f"eq.{user_id}",
                    "article_id": f"eq.{request.article_id}",
                    "select": "id"
                },
                headers=supabase_service._get_headers()
            )
            
            if check_response.status_code == 200:
                existing = check_response.json()
                if existing:
                    logger.info(f"Guide {request.article_id} already bookmarked by user {user_id}")
                    raise HTTPException(status_code=409, detail="Guide already in bookmarks")
            
            # Insert new bookmark
            insert_response = await client.post(
                f"{supabase_service.rest_url}/user_guide_bookmarks",
                json={
                    "user_id": user_id,
                    "article_id": request.article_id
                },
                headers={**supabase_service._get_headers(), "Prefer": "return=representation"}
            )
            
            if insert_response.status_code == 201:
                bookmark = insert_response.json()[0]
                logger.info(f"✅ Added guide {request.article_id} to bookmarks for user {user_id}")
                return bookmark
            else:
                logger.error(f"Failed to add bookmark: {insert_response.text}")
                raise HTTPException(status_code=500, detail="Failed to add bookmarked guide")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding bookmarked guide: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/guides/{article_id}")
async def remove_bookmarked_guide(
    article_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a legal guide from bookmarks"""
    try:
        user_id = current_user.get("user", {}).get("id") or current_user.get("profile", {}).get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        supabase_service = SupabaseService()
        
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{supabase_service.rest_url}/user_guide_bookmarks",
                params={
                    "user_id": f"eq.{user_id}",
                    "article_id": f"eq.{article_id}"
                },
                headers=supabase_service._get_headers()
            )
            
            if response.status_code == 204:
                logger.info(f"✅ Removed guide {article_id} from bookmarks for user {user_id}")
                return {"success": True, "message": "Bookmark removed successfully"}
            else:
                logger.error(f"Failed to remove bookmark: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to remove bookmarked guide")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing bookmarked guide: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/guides/check/{article_id}")
async def check_bookmarked_guide(
    article_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check if a legal guide is bookmarked by the current user"""
    try:
        user_id = current_user.get("user", {}).get("id") or current_user.get("profile", {}).get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        supabase_service = SupabaseService()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase_service.rest_url}/user_guide_bookmarks",
                params={
                    "user_id": f"eq.{user_id}",
                    "article_id": f"eq.{article_id}",
                    "select": "id"
                },
                headers=supabase_service._get_headers()
            )
            
            if response.status_code == 200:
                existing = response.json()
                is_bookmarked = len(existing) > 0
                return {"is_bookmarked": is_bookmarked}
            else:
                logger.error(f"Failed to check bookmark: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to check bookmark status")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking bookmarked guide: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
