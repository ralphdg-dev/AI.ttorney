from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from middleware.auth import get_current_user
from services.supabase_service import SupabaseService
from services.bookmark_service import BookmarkService
from services.report_service import ReportService
import httpx
import logging
from middleware.auth import require_role
import time
from typing import Tuple
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/forum", tags=["forum"])

# BEST APPROACH: Global caching with minimal complexity
# Global cache for posts (shared across all users)
_posts_cache = {}
# User-specific caches with shorter duration to prevent stale user data
_bookmarks_cache = {}  # user_id -> {post_ids_hash: (bookmarks, timestamp)}
_replies_cache = {}    # post_ids_hash -> (reply_counts, timestamp)
CACHE_DURATION = 20  # 20 seconds
USER_CACHE_DURATION = 15  # 15 seconds for user-specific data cache - balance between freshness and performance

def clear_posts_cache():
    """Clear all cached posts when new content is added."""
    _posts_cache.clear()
    logger.debug("Posts cache cleared")

def clear_user_bookmark_cache(user_id: str):
    """Clear bookmark cache for a specific user."""
    if user_id in _bookmarks_cache:
        del _bookmarks_cache[user_id]
        logger.debug(f"Bookmark cache cleared for user {user_id[:8]}...")

def clear_reply_counts_cache():
    """Clear reply counts cache when new replies are added."""
    _replies_cache.clear()
    logger.debug("Reply counts cache cleared")

def _get_post_ids_hash(post_ids):
    """Generate a hash for post IDs to use as cache key."""
    return hash(tuple(sorted(post_ids)))

async def _get_cached_bookmarks(user_id: str, post_ids: list) -> set:
    """Get cached bookmarks or fetch from database."""
    if not post_ids:
        return set()
    
    post_ids_hash = _get_post_ids_hash(post_ids)
    current_time = time.time()
    
    # Check user-specific bookmark cache
    user_cache = _bookmarks_cache.get(user_id, {})
    if post_ids_hash in user_cache:
        bookmarks, timestamp = user_cache[post_ids_hash]
        age = current_time - timestamp
        if age < USER_CACHE_DURATION:
            logger.info(f"📚 USING CACHED BOOKMARKS for user {user_id[:8]}... (age: {age:.1f}s)")
            return bookmarks
    
    # Fetch from database
    try:
        supabase = SupabaseService()
        ids_param = ",".join(post_ids)
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{supabase.rest_url}/user_forum_bookmarks?select=post_id&post_id=in.({ids_param})&user_id=eq.{user_id}",
                headers=supabase._get_headers(use_service_key=True)
            )
        
        if response.status_code == 200:
            bookmarks_data = response.json() or []
            user_bookmarks = {str(b.get("post_id")) for b in bookmarks_data}
            
            # Cache the result
            if user_id not in _bookmarks_cache:
                _bookmarks_cache[user_id] = {}
            _bookmarks_cache[user_id][post_ids_hash] = (user_bookmarks, current_time)
            logger.info(f"📚 CACHED BOOKMARKS for user {user_id[:8]}... ({len(user_bookmarks)} bookmarks)")
            
            return user_bookmarks
    except Exception as e:
        logger.warning(f"Bookmark check failed: {str(e)}")
    
    return set()

async def _get_cached_reply_counts(post_ids: list) -> dict:
    """Get cached reply counts or fetch from database."""
    if not post_ids:
        return {}
    
    post_ids_hash = _get_post_ids_hash(post_ids)
    current_time = time.time()
    
    # Check reply counts cache
    if post_ids_hash in _replies_cache:
        reply_counts, timestamp = _replies_cache[post_ids_hash]
        age = current_time - timestamp
        if age < USER_CACHE_DURATION:
            logger.info(f"💬 USING CACHED REPLY COUNTS (age: {age:.1f}s)")
            return reply_counts
    
    # Fetch from database
    try:
        supabase = SupabaseService()
        ids_param = ",".join(post_ids)
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{supabase.rest_url}/forum_replies?select=post_id&post_id=in.({ids_param})",
                headers=supabase._get_headers(use_service_key=True)
            )
        
        if response.status_code == 200:
            replies = response.json() or []
            reply_counts = {}
            for reply in replies:
                post_id = str(reply.get("post_id"))
                reply_counts[post_id] = reply_counts.get(post_id, 0) + 1
            
            # Cache the result
            _replies_cache[post_ids_hash] = (reply_counts, current_time)
            logger.info(f"💬 CACHED REPLY COUNTS ({len(reply_counts)} posts with replies)")
            
            return reply_counts
    except Exception as e:
        logger.warning(f"Reply count check failed: {str(e)}")
    
    return {} 


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

        # Clear posts cache since we added a new post
        clear_posts_cache()

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
    """BEST APPROACH: Minimal queries with smart global caching."""
    try:
        user_id = current_user["user"]["id"]
        
        # Global posts cache (shared across users for base posts)
        cache_key = "global_posts"
        current_time = time.time()
        
        # Check global posts cache first
        base_posts = None
        if cache_key in _posts_cache:
            cached_posts, cache_time = _posts_cache[cache_key]
            age = current_time - cache_time
            logger.info(f"Cache found, age: {age:.1f}s, limit: {CACHE_DURATION}s")
            if age < CACHE_DURATION:
                base_posts = cached_posts
                logger.info("✅ USING CACHED POSTS - No database query needed!")
            else:
                logger.info("Cache expired, fetching fresh data")
        else:
            logger.info("No cache found, fetching fresh data")
        
        # If no cached posts, fetch them
        if base_posts is None:
            supabase = SupabaseService()
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    f"{supabase.rest_url}/forum_posts?select=*,users(id,username,full_name,role)&order=created_at.desc&limit=20",
                    headers=supabase._get_headers(use_service_key=True)
                )

            if response.status_code != 200:
                logger.error(f"Posts query failed: {response.status_code}")
                return ListPostsResponse(success=True, data=[])

            base_posts = response.json() if response.content else []
            
            # Cache globally (shared across all users)
            _posts_cache[cache_key] = (base_posts, current_time)
            logger.info(f"📦 CACHED {len(base_posts)} posts for {CACHE_DURATION}s")
        
        # Get user-specific data using cached functions
        user_bookmarks = set()
        reply_counts = {}
        if base_posts:
            post_ids = [str(p.get("id")) for p in base_posts if p.get("id")]
            if post_ids:
                # Use cached functions to prevent duplicate API calls
                user_bookmarks = await _get_cached_bookmarks(user_id, post_ids)
                reply_counts = await _get_cached_reply_counts(post_ids)

        # Combine base posts with user-specific data
        final_posts = []
        for post in base_posts:
            post_copy = post.copy()  # Don't modify cached data
            pid = str(post_copy.get("id"))
            post_copy["reply_count"] = reply_counts.get(pid, 0)  # Real reply counts
            post_copy["is_bookmarked"] = pid in user_bookmarks
            final_posts.append(post_copy)
        
        return ListPostsResponse(success=True, data=final_posts)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List recent forum posts error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


class GetPostResponse(BaseModel):
    success: bool
    data: Dict[str, Any]


@router.get("/posts/{post_id}", response_model=GetPostResponse)
async def get_post(post_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fetch a single forum post by ID with user information."""
    try:
        supabase = SupabaseService()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase.rest_url}/forum_posts?select=*,users(id,username,full_name,role)&id=eq.{post_id}",
                headers=supabase._get_headers(use_service_key=True)
            )

        if response.status_code != 200:
            details = {}
            try:
                details = response.json() if response.content else {}
            except Exception:
                details = {"raw": response.text}
            logger.error(f"Get post failed: {response.status_code} - {details}")
            raise HTTPException(status_code=400, detail="Failed to fetch post")

        rows = response.json() if response.content else []
        if not rows:
            raise HTTPException(status_code=404, detail="Post not found")

        return GetPostResponse(success=True, data=rows[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get forum post error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


class ListRepliesResponse(BaseModel):
    success: bool
    data: list


@router.get("/posts/{post_id}/replies", response_model=ListRepliesResponse)
async def list_replies(post_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """List replies for a forum post with user information."""
    try:
        supabase = SupabaseService()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase.rest_url}/forum_replies?select=*,users(id,username,full_name,role)&post_id=eq.{post_id}&order=created_at.desc",
                headers=supabase._get_headers(use_service_key=True)
            )
        if response.status_code != 200:
            details = {}
            try:
                details = response.json() if response.content else {}
            except Exception:
                details = {"raw": response.text}
            logger.error(f"List replies failed: {response.status_code} - {details}")
            raise HTTPException(status_code=400, detail="Failed to fetch replies")
        data = response.json() if response.content else []
        return ListRepliesResponse(success=True, data=data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List replies error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


class CreateReplyRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)
    is_anonymous: Optional[bool] = False


class CreateReplyResponse(BaseModel):
    success: bool
    message: str
    reply_id: Optional[str] = None


@router.post("/posts/{post_id}/replies", response_model=CreateReplyResponse)
async def create_reply(
    post_id: str,
    body: CreateReplyRequest,
    current_user: Dict[str, Any] = Depends(require_role("verified_lawyer"))
):
    """Create a reply to a forum post (lawyers only)."""
    try:
        user_id = current_user["user"]["id"]
        supabase = SupabaseService()
        if not supabase.service_key:
            logger.error("SUPABASE_SERVICE_ROLE_KEY is not configured; cannot insert into protected tables.")
            raise HTTPException(status_code=500, detail="Server misconfiguration: service role key missing")

        payload = {
            "post_id": post_id,
            "user_id": user_id,
            "reply_body": body.body.strip(),
            "is_flagged": False,
        }

        headers = supabase._get_headers(use_service_key=True)
        headers["Prefer"] = "return=representation"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{supabase.rest_url}/forum_replies",
                json=payload,
                headers=headers
            )

        if response.status_code not in (200, 201):
            details = {}
            try:
                details = response.json() if response.content else {}
            except Exception:
                details = {"raw": response.text}
            logger.error(f"Create reply failed: {response.status_code} - {details}")
            raise HTTPException(status_code=400, detail=details.get("message") or details.get("error") or "Failed to create reply")

        created = []
        try:
            created = response.json() if response.content else []
        except Exception:
            logger.warning("Create reply succeeded but response had no JSON body")
        reply_id = None
        if isinstance(created, list) and created:
            reply_id = str(created[0].get("id"))

        # Clear posts cache since we added a new reply
        clear_posts_cache()
        # Clear reply counts cache to ensure fresh reply counts
        clear_reply_counts_cache()

        return CreateReplyResponse(success=True, message="Reply created", reply_id=reply_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create reply error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Bookmark endpoints
class BookmarkRequest(BaseModel):
    post_id: str = Field(..., description="Post ID to bookmark")


class BookmarkResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@router.post("/bookmarks", response_model=BookmarkResponse)
async def add_bookmark(
    request: BookmarkRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Add a bookmark for a forum post"""
    try:
        user_id = current_user["user"]["id"]
        bookmark_service = BookmarkService()
        result = await bookmark_service.add_bookmark(request.post_id, user_id)
        
        if result["success"]:
            # Clear user's bookmark cache to ensure fresh data
            clear_user_bookmark_cache(user_id)
            return BookmarkResponse(success=True, data=result.get("data"))
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to add bookmark"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add bookmark endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/bookmarks/{post_id}")
async def remove_bookmark(
    post_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Remove a bookmark for a forum post"""
    try:
        user_id = current_user["user"]["id"]
        bookmark_service = BookmarkService()
        result = await bookmark_service.remove_bookmark(post_id, user_id)
        
        if result["success"]:
            # Clear user's bookmark cache to ensure fresh data
            clear_user_bookmark_cache(user_id)
            return {"success": True}
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to remove bookmark"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Remove bookmark endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/bookmarks/check/{post_id}", response_model=BookmarkResponse)
async def check_bookmark(
    post_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Check if a post is bookmarked by the current user"""
    try:
        user_id = current_user["user"]["id"]
        bookmark_service = BookmarkService()
        result = await bookmark_service.check_bookmark(post_id, user_id)
        
        if result["success"]:
            return BookmarkResponse(success=True, data=result.get("data"))
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to check bookmark"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check bookmark endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/bookmarks/user", response_model=BookmarkResponse)
async def get_user_bookmarks(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all bookmarks for the current user"""
    try:
        user_id = current_user["user"]["id"]
        bookmark_service = BookmarkService()
        result = await bookmark_service.get_user_bookmarks(user_id)
        
        if result["success"]:
            return BookmarkResponse(success=True, data=result.get("data"))
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to get bookmarks"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user bookmarks endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/bookmarks/toggle", response_model=BookmarkResponse)
async def toggle_bookmark(
    request: BookmarkRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Toggle bookmark status for a forum post"""
    try:
        user_id = current_user["user"]["id"]
        bookmark_service = BookmarkService()
        result = await bookmark_service.toggle_bookmark(request.post_id, user_id)
        
        if result["success"]:
            # Clear user's bookmark cache to ensure fresh data
            clear_user_bookmark_cache(user_id)
            return BookmarkResponse(success=True, data=result.get("data"))
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to toggle bookmark"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Toggle bookmark endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Report endpoints
class ReportRequest(BaseModel):
    target_id: str = Field(..., description="ID of the post or comment to report")
    target_type: str = Field(..., description="Type of target: 'post' or 'comment'")
    reason: str = Field(..., description="Reason for the report")
    reason_context: Optional[str] = Field(None, description="Additional context for the report")


class ReportResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@router.post("/reports", response_model=ReportResponse)
async def submit_report(
    report_data: ReportRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Submit a report for a forum post or comment"""
    try:
        user_id = current_user["user"]["id"]
        report_service = ReportService()
        result = await report_service.submit_report(
            report_data.target_id,
            report_data.target_type,
            report_data.reason,
            user_id,
            report_data.reason_context
        )
        
        if result["success"]:
            return ReportResponse(success=True, data=result.get("data"))
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to submit report"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Submit report endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/reports/check/{target_id}/{target_type}", response_model=ReportResponse)
async def check_user_report(
    target_id: str,
    target_type: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Check if the current user has already reported a specific target"""
    try:
        user_id = current_user["user"]["id"]
        report_service = ReportService()
        result = await report_service.check_user_report(target_id, target_type, user_id)
        
        if result["success"]:
            return ReportResponse(success=True, data=result.get("data"))
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to check report"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check user report endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/reports/target/{target_id}/{target_type}", response_model=ReportResponse)
async def get_reports_for_target(
    target_id: str,
    target_type: str,
    current_user: Dict[str, Any] = Depends(require_role("verified_lawyer"))
):
    """Get all reports for a specific target (lawyers only)"""
    try:
        report_service = ReportService()
        result = await report_service.get_reports_for_target(target_id, target_type)
        
        if result["success"]:
            return ReportResponse(success=True, data=result.get("data"))
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to get reports"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get reports for target endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/reports/user", response_model=ReportResponse)
async def get_reports_by_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all reports submitted by the current user"""
    try:
        user_id = current_user["user"]["id"]
        report_service = ReportService()
        result = await report_service.get_reports_by_user(user_id)
        
        if result["success"]:
            return ReportResponse(success=True, data=result.get("data"))
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to get user reports"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get reports by user endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

