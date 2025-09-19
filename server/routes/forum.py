from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from middleware.auth import get_current_user
from services.supabase_service import SupabaseService
import httpx
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/forum", tags=["forum"]) 


class CreatePostRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)
    category: Optional[str] = Field(None, description="Optional category e.g. family, work, civil, criminal, consumer")
    is_anonymous: Optional[bool] = False


class CreatePostResponse(BaseModel):
    success: bool
    message: str
    post_id: Optional[str] = None


@router.post("/posts", response_model=CreatePostResponse)
async def create_post(
    body: CreatePostRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new forum post in Supabase."""
    try:
        user_id = current_user["user"]["id"]

        # Prepare row for insertion
        post_row: Dict[str, Any] = {
            "user_id": user_id,
            "body": body.body.strip(),
            "category": (body.category or None),
            "is_anonymous": bool(body.is_anonymous),
            "is_flagged": False,
        }

        supabase = SupabaseService()
        if not supabase.service_key:
            logger.error("SUPABASE_SERVICE_ROLE_KEY is not configured; cannot insert into protected tables.")
            raise HTTPException(status_code=500, detail="Server misconfiguration: service role key missing")

        # Insert row into Supabase
        headers = supabase._get_headers(use_service_key=True)
        headers["Prefer"] = "return=representation"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{supabase.rest_url}/forum_posts",
                json=post_row,
                headers=headers
            )

        if response.status_code not in (200, 201):
            details = {}
            try:
                details = response.json() if response.content else {}
            except Exception:
                details = {"raw": response.text}
            logger.error(f"Create post failed: {response.status_code} - {details}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=details.get("message") or details.get("error") or "Failed to create post",
            )

        created = []
        try:
            created = response.json() if response.content else []
        except Exception:
            logger.warning("Create post succeeded but response had no JSON body")
        post_id: Optional[str] = None
        if isinstance(created, list) and created:
            post_id = str(created[0].get("id"))

        return CreatePostResponse(success=True, message="Post created", post_id=post_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create forum post error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


class ListPostsResponse(BaseModel):
    success: bool
    data: list


@router.get("/posts", response_model=ListPostsResponse)
async def list_my_posts(current_user: Dict[str, Any] = Depends(get_current_user)):
    """List recent posts by the current user for quick verification/debugging."""
    try:
        user_id = current_user["user"]["id"]
        supabase = SupabaseService()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase.rest_url}/forum_posts?select=*&user_id=eq.{user_id}&order=created_at.desc&limit=20",
                headers=supabase._get_headers(use_service_key=True)
            )

        if response.status_code != 200:
            details = {}
            try:
                details = response.json() if response.content else {}
            except Exception:
                details = {"raw": response.text}
            logger.error(f"List posts failed: {response.status_code} - {details}")
            raise HTTPException(status_code=400, detail="Failed to fetch posts")

        data = response.json() if response.content else []
        return ListPostsResponse(success=True, data=data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List forum posts error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


class SupabaseInfoResponse(BaseModel):
    success: bool
    supabase_url: str
    has_service_role_key: bool


@router.get("/debug/supabase_info", response_model=SupabaseInfoResponse)
async def supabase_info():
    """Return server Supabase URL and whether service key is configured (no secrets)."""
    try:
        supabase = SupabaseService()
        return SupabaseInfoResponse(
            success=True,
            supabase_url=supabase.url,
            has_service_role_key=bool(supabase.service_key)
        )
    except Exception as e:
        logger.error(f"Supabase info error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/posts/recent", response_model=ListPostsResponse)
async def list_recent_posts(current_user: Dict[str, Any] = Depends(get_current_user)):
    """List recent posts across all users (debug helper)."""
    try:
        supabase = SupabaseService()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase.rest_url}/forum_posts?select=*&order=created_at.desc&limit=20",
                headers=supabase._get_headers(use_service_key=True)
            )

        if response.status_code != 200:
            details = {}
            try:
                details = response.json() if response.content else {}
            except Exception:
                details = {"raw": response.text}
            logger.error(f"List recent posts failed: {response.status_code} - {details}")
            raise HTTPException(status_code=400, detail="Failed to fetch posts")

        data = response.json() if response.content else []
        return ListPostsResponse(success=True, data=data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List recent forum posts error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


