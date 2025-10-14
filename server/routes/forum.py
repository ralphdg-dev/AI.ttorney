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


@router.get("/debug/replies_count")
async def debug_replies_count():
    """Debug endpoint to check total replies in database."""
    try:
        supabase = SupabaseService()
        
        # Get total count of replies
        async with httpx.AsyncClient(timeout=10.0) as client:
            count_response = await client.get(
                f"{supabase.rest_url}/forum_replies?select=count",
                headers=supabase._get_headers(use_service_key=True)
            )
        
        # Get sample replies
        async with httpx.AsyncClient(timeout=10.0) as client:
            sample_response = await client.get(
                f"{supabase.rest_url}/forum_replies?select=*&limit=5",
                headers=supabase._get_headers(use_service_key=True)
            )
        
        count_data = count_response.json() if count_response.content else []
        sample_data = sample_response.json() if sample_response.content else []
        
        return {
            "success": True,
            "total_replies": count_data[0].get("count", 0) if count_data else 0,
            "count_response_status": count_response.status_code,
            "sample_response_status": sample_response.status_code,
            "sample_replies": sample_data[:3] if isinstance(sample_data, list) else sample_data,
            "sample_count": len(sample_data) if isinstance(sample_data, list) else "not a list"
        }
    except Exception as e:
        logger.error(f"Debug replies count error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/debug/create_test_reply")
async def create_test_reply(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Debug endpoint to create a test reply."""
    try:
        supabase = SupabaseService()
        user_id = current_user["user"]["id"]
        
        # Get the first available post to reply to
        async with httpx.AsyncClient(timeout=10.0) as client:
            posts_response = await client.get(
                f"{supabase.rest_url}/forum_posts?select=id&limit=1",
                headers=supabase._get_headers(use_service_key=True)
            )
        
        posts_data = posts_response.json() if posts_response.content else []
        if not posts_data:
            return {"success": False, "error": "No posts found to reply to"}
        
        post_id = posts_data[0]["id"]
        
        # Create a test reply
        test_reply = {
            "post_id": post_id,
            "user_id": user_id,
            "reply_body": "This is a test reply created for debugging purposes.",
            "is_flagged": False
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            reply_response = await client.post(
                f"{supabase.rest_url}/forum_replies",
                json=test_reply,
                headers={**supabase._get_headers(use_service_key=True), "Prefer": "return=representation"}
            )
        
        reply_data = reply_response.json() if reply_response.content else []
        
        # Clear caches
        clear_posts_cache()
        clear_reply_counts_cache()
        
        return {
            "success": reply_response.status_code in [200, 201],
            "status_code": reply_response.status_code,
            "post_id": post_id,
            "reply_data": reply_data,
            "message": "Test reply created successfully" if reply_response.status_code in [200, 201] else "Failed to create test reply"
        }
    except Exception as e:
        logger.error(f"Create test reply error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


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
        
        # If no cached posts, fetch them WITH replies for instant ViewPost loading
        if base_posts is None:
            supabase = SupabaseService()
            async with httpx.AsyncClient(timeout=20.0) as client:
                # First fetch posts
                posts_response = await client.get(
                    f"{supabase.rest_url}/forum_posts?select=*,users(id,username,full_name,role)&order=created_at.desc&limit=20",
                    headers=supabase._get_headers(use_service_key=True)
                )

            if posts_response.status_code != 200:
                logger.error(f"Posts query failed: {posts_response.status_code}")
                return ListPostsResponse(success=True, data=[])

            base_posts = posts_response.json() if posts_response.content else []
            
            # If we have posts, fetch their replies
            if base_posts:
                post_ids = [str(p.get("id")) for p in base_posts if p.get("id")]
                if post_ids:
                    try:
                        # Fetch all replies for these posts
                        ids_param = ",".join(post_ids)
                        # Include user data with proper join syntax
                        replies_url = f"{supabase.rest_url}/forum_replies?select=*,users(id,username,full_name,role)&post_id=in.({ids_param})&order=created_at.asc"
                        
                        logger.info(f"🔍 Fetching replies with URL: {replies_url}")
                        
                        async with httpx.AsyncClient(timeout=15.0) as client:
                            replies_response = await client.get(
                                replies_url,
                                headers=supabase._get_headers(use_service_key=True)
                            )
                        
                        logger.info(f"📡 Replies response: {replies_response.status_code}")
                        if replies_response.status_code != 200:
                            error_text = replies_response.text if replies_response.content else "No error text"
                            logger.error(f"❌ Replies query failed: {replies_response.status_code} - {error_text}")
                            
                            # Try fallback query without users join
                            logger.info("🔄 Trying fallback query without users join...")
                            fallback_url = f"{supabase.rest_url}/forum_replies?select=id,reply_body,created_at,user_id,is_anonymous,post_id&post_id=in.({ids_param})&order=created_at.asc"
                            logger.info(f"🔍 Fallback URL: {fallback_url}")
                            
                            async with httpx.AsyncClient(timeout=15.0) as client:
                                fallback_response = await client.get(
                                    fallback_url,
                                    headers=supabase._get_headers(use_service_key=True)
                                )
                            
                            logger.info(f"📡 Fallback response: {fallback_response.status_code}")
                            if fallback_response.status_code == 200:
                                replies_response = fallback_response
                                logger.info("✅ Fallback query succeeded!")
                            else:
                                fallback_error = fallback_response.text if fallback_response.content else "No error text"
                                logger.error(f"❌ Fallback query also failed: {fallback_response.status_code} - {fallback_error}")
                        
                        if replies_response.status_code == 200:
                            all_replies = replies_response.json() if replies_response.content else []
                            logger.info(f"📊 Recent posts replies data: {len(all_replies) if isinstance(all_replies, list) else 'not a list'} total replies")
                            if isinstance(all_replies, list) and len(all_replies) > 0:
                                logger.info(f"📝 First reply sample from recent posts: {all_replies[0]}")
                            elif isinstance(all_replies, dict):
                                logger.info(f"📝 Recent posts replies structure: {list(all_replies.keys())}")
                            
                            # Group replies by post_id
                            replies_by_post = {}
                            for reply in all_replies:
                                post_id = str(reply.get("post_id"))
                                if post_id not in replies_by_post:
                                    replies_by_post[post_id] = []
                                replies_by_post[post_id].append(reply)
                            
                            # Add replies to each post
                            for post in base_posts:
                                post_id = str(post.get("id"))
                                post["forum_replies"] = replies_by_post.get(post_id, [])
                                
                            logger.info(f"📦 Fetched {len(base_posts)} posts with replies from {len(all_replies)} total replies")
                        else:
                            logger.warning(f"Failed to fetch replies: {replies_response.status_code}")
                            # Add empty replies to posts
                            for post in base_posts:
                                post["forum_replies"] = []
                    except Exception as e:
                        logger.warning(f"Error fetching replies: {str(e)}")
                        # Add empty replies to posts
                        for post in base_posts:
                            post["forum_replies"] = []
            
            # Cache globally (shared across all users)
            _posts_cache[cache_key] = (base_posts, current_time)
            logger.info(f"📦 CACHED {len(base_posts)} posts with replies for {CACHE_DURATION}s")
        
        # Get user-specific data using cached functions
        user_bookmarks = set()
        if base_posts:
            post_ids = [str(p.get("id")) for p in base_posts if p.get("id")]
            if post_ids:
                # Only need bookmarks now since replies are included in the main query
                user_bookmarks = await _get_cached_bookmarks(user_id, post_ids)

        # Combine base posts with user-specific data
        final_posts = []
        for post in base_posts:
            post_copy = post.copy()  # Don't modify cached data
            pid = str(post_copy.get("id"))
            
            # Calculate reply count from the included replies
            replies = post_copy.get("forum_replies", [])
            post_copy["reply_count"] = len(replies) if replies else 0
            post_copy["is_bookmarked"] = pid in user_bookmarks
            
            # Keep the replies data for frontend caching
            post_copy["replies"] = replies
            
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
        # Increased timeout for better reliability
        async with httpx.AsyncClient(timeout=30.0) as client:
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
            
            # Return more specific error codes
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Post not found")
            elif response.status_code == 403:
                raise HTTPException(status_code=403, detail="Access denied")
            else:
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
        # Increased timeout for better reliability
        # Include user data with proper join syntax
        replies_url = f"{supabase.rest_url}/forum_replies?select=*,users(id,username,full_name,role)&post_id=eq.{post_id}&order=created_at.desc"
        logger.info(f"🔍 Individual replies URL: {replies_url}")
        
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                replies_url,
                headers=supabase._get_headers(use_service_key=True)
            )
        
        logger.info(f"📡 Individual replies response: {response.status_code}")
        
        # Always log the response content for debugging
        if response.content:
            try:
                response_data = response.json()
                logger.info(f"📊 Individual replies data: {len(response_data) if isinstance(response_data, list) else 'not a list'} items")
                if isinstance(response_data, list) and len(response_data) > 0:
                    logger.info(f"📝 First reply sample: {response_data[0]}")
                elif isinstance(response_data, dict):
                    logger.info(f"📝 Response structure: {list(response_data.keys())}")
            except Exception as e:
                logger.error(f"❌ Could not parse response JSON: {e}")
                logger.info(f"📝 Raw response: {response.text[:500]}...")
        
        if response.status_code != 200:
            error_text = response.text if response.content else "No error text"
            logger.error(f"❌ Individual replies query failed: {response.status_code} - {error_text}")
            
            # Try fallback query without users join
            logger.info("🔄 Trying fallback individual replies query without users join...")
            fallback_url = f"{supabase.rest_url}/forum_replies?select=*&post_id=eq.{post_id}&order=created_at.desc"
            logger.info(f"🔍 Fallback individual replies URL: {fallback_url}")
            
            async with httpx.AsyncClient(timeout=20.0) as client:
                fallback_response = await client.get(
                    fallback_url,
                    headers=supabase._get_headers(use_service_key=True)
                )
            
            logger.info(f"📡 Fallback individual replies response: {fallback_response.status_code}")
            if fallback_response.status_code == 200:
                response = fallback_response
                logger.info("✅ Fallback individual replies query succeeded!")
            else:
                fallback_error = fallback_response.text if fallback_response.content else "No error text"
                logger.error(f"❌ Fallback individual replies query also failed: {fallback_response.status_code} - {fallback_error}")
        
        if response.status_code != 200:
            details = {}
            try:
                details = response.json() if response.content else {}
            except Exception:
                details = {"raw": response.text}
            logger.error(f"List replies failed: {response.status_code} - {details}")
            
            # More graceful error handling - return empty array instead of failing
            if response.status_code == 404:
                logger.info(f"No replies found for post {post_id}")
                return ListRepliesResponse(success=True, data=[])
            else:
                raise HTTPException(status_code=400, detail="Failed to fetch replies")
        
        data = response.json() if response.content else []
        return ListRepliesResponse(success=True, data=data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List replies error: {str(e)}")
        # Return empty array on error instead of failing completely
        logger.info("Returning empty replies array due to error")
        return ListRepliesResponse(success=True, data=[])


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

