from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from middleware.auth import get_current_user
from services.supabase_service import SupabaseService
from services.bookmark_service import BookmarkService
from services.report_service import ReportService
from services.content_moderation_service import get_moderation_service
from services.violation_tracking_service import get_violation_tracking_service
from services.notification_service import NotificationService
from services.promotional_content_validator import get_promotional_validator
from models.violation_types import ViolationType
import httpx
import logging
from middleware.auth import require_role
import time
from typing import Tuple
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/forum", tags=["forum"])

                                                       
                                                  
_posts_cache = {}
                                                                       
_bookmarks_cache = {}                                                      
_replies_cache = {}                                                
CACHE_DURATION = 10                                         
USER_CACHE_DURATION = 8                                                                                      

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
    
                                        
    user_cache = _bookmarks_cache.get(user_id, {})
    if post_ids_hash in user_cache:
        bookmarks, timestamp = user_cache[post_ids_hash]
        age = current_time - timestamp
        if age < USER_CACHE_DURATION:
            logger.info(f"📚 USING CACHED BOOKMARKS for user {user_id[:8]}... (age: {age:.1f}s)")
            return bookmarks
    
                         
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
    
                              
    if post_ids_hash in _replies_cache:
        reply_counts, timestamp = _replies_cache[post_ids_hash]
        age = current_time - timestamp
        if age < USER_CACHE_DURATION:
            logger.info(f" USING CACHED REPLY COUNTS (age: {age:.1f}s)")
            return reply_counts
    
                         
    try:
        supabase = SupabaseService()
        ids_param = ",".join(post_ids)
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{supabase.rest_url}/forum_replies?select=post_id&post_id=in.({ids_param})&hidden=eq.false",
                headers=supabase._get_headers(use_service_key=True)
            )
        
        if response.status_code == 200:
            replies = response.json() or []
            reply_counts = {}
            for reply in replies:
                post_id = str(reply.get("post_id"))
                reply_counts[post_id] = reply_counts.get(post_id, 0) + 1
            
                              
            _replies_cache[post_ids_hash] = (reply_counts, current_time)
            logger.info(f" CACHED REPLY COUNTS ({len(reply_counts)} posts with replies)")
            
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
    """Create a new forum post in Supabase with content moderation and violation tracking."""
    try:
        user_id = current_user["user"]["id"]
        logger.info(f" Creating forum post for user {user_id[:8]}...")
        
                                                                         
        try:
            violation_service = get_violation_tracking_service()
            user_status = await violation_service.check_user_status(user_id)
            
            if not user_status["is_allowed"]:
                logger.warning(f"🚫 User {user_id[:8]}... blocked: {user_status['account_status']}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=user_status["reason"]
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f" User status check failed: {str(e)}")
                                                         
            logger.warning("  Proceeding with post creation (status check failed)")
        
                                                                              
        try:
            logger.info(f" Validating post for promotional content and links from user {user_id[:8]}...")
            promotional_validator = get_promotional_validator()
            
                                                                    
            validation_result = await promotional_validator.validate_content(body.body.strip())
            
            if not validation_result["is_valid"]:
                logger.warning(f"🚫 Post blocked for user {user_id[:8]}: {validation_result['reason']}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "detail": validation_result["details"],
                        "reason": validation_result["reason"],
                        "violation_type": validation_result["violation_type"],
                        "action_taken": "content_blocked"
                    }
                )
            
            logger.info(f" Post passed promotional validation for user {user_id[:8]}...")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f" Promotional validation failed: {str(e)}")
                                                               
            logger.warning("  Proceeding with post creation (promotional validation failed - fail-open strategy)")
        
                                                                        
        try:
            logger.info(f" Moderating forum post from user {user_id[:8]}...")
            moderation_service = get_moderation_service()
            
                                                                       
            moderation_result = await moderation_service.moderate_content(body.body.strip())
            
                                                                      
            if not moderation_service.is_content_safe(moderation_result):
                logger.warning(f"  Post flagged for user {user_id[:8]}: {moderation_result['violation_summary']}")
                
                                                       
                violation_result = await violation_service.record_violation(
                    user_id=user_id,
                    violation_type=ViolationType.FORUM_POST,
                    content_text=body.body.strip(),
                    moderation_result=moderation_result,
                    content_id=None                                          
                )
                
                                                                     
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "detail": violation_result["message"],
                        "action_taken": violation_result["action_taken"],
                        "strike_count": violation_result["strike_count"],
                        "suspension_count": violation_result["suspension_count"],
                        "suspension_end": violation_result.get("suspension_end")
                    }
                )
            
            logger.info(f" Post content passed moderation for user {user_id[:8]}...")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f" Content moderation failed: {str(e)}")
            logger.error(f" Error type: {type(e).__name__}")
            logger.error(f" Error details: {repr(e)}")
            import traceback
            logger.error(f" Traceback: {traceback.format_exc()}")
                                                                             
            logger.warning("  Proceeding with post creation (moderation service failed - fail-open strategy)")

                                           
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
async def list_my_posts(
    limit: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List recent posts by the current user for quick verification/debugging."""
    try:
        user_id = current_user["user"]["id"]
        supabase = SupabaseService()

        limit_param = f"&limit={limit}" if limit is not None else "&limit=10000"
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase.rest_url}/forum_posts?select=*&user_id=eq.{user_id}&order=created_at.desc{limit_param}",
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
        
                                    
        async with httpx.AsyncClient(timeout=10.0) as client:
            count_response = await client.get(
                f"{supabase.rest_url}/forum_replies?select=count",
                headers=supabase._get_headers(use_service_key=True)
            )
        
                            
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
        
                                                  
        async with httpx.AsyncClient(timeout=10.0) as client:
            posts_response = await client.get(
                f"{supabase.rest_url}/forum_posts?select=id&limit=1",
                headers=supabase._get_headers(use_service_key=True)
            )
        
        posts_data = posts_response.json() if posts_response.content else []
        if not posts_data:
            return {"success": False, "error": "No posts found to reply to"}
        
        post_id = posts_data[0]["id"]
        
                             
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
async def list_recent_posts(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """BEST APPROACH: Minimal queries with smart global caching and pagination support."""
    try:
        user_id = current_user["user"]["id"]
        
                                                                 
        cache_key = "global_posts_all"
        current_time = time.time()
        
                                        
        base_posts = None
        if cache_key in _posts_cache:
            cached_posts, cache_time = _posts_cache[cache_key]
            age = current_time - cache_time
            logger.info(f"Cache found, age: {age:.1f}s, limit: {CACHE_DURATION}s")
            if age < CACHE_DURATION:
                base_posts = cached_posts
                logger.info(" USING CACHED POSTS - No database query needed!")
            else:
                logger.info("Cache expired, fetching fresh data")
        else:
            logger.info("No cache found, fetching fresh data")
        
                                                                                  
        if base_posts is None:
            supabase = SupabaseService()
            async with httpx.AsyncClient(timeout=15.0) as client:
                                                                                 
                posts_response = await client.get(
                    f"{supabase.rest_url}/forum_posts?select=*,users(id,username,full_name,role,profile_photo,photo_url,account_status)&order=created_at.desc&is_flagged=eq.false&limit=100",
                    headers=supabase._get_headers(use_service_key=True)
                )

            if posts_response.status_code != 200:
                logger.error(f"Posts query failed: {posts_response.status_code}")
                return ListPostsResponse(success=True, data=[])

            base_posts = posts_response.json() if posts_response.content else []
            
                                                   
            if base_posts:
                post_ids = [str(p.get("id")) for p in base_posts if p.get("id")]
                if post_ids:
                    try:
                                                           
                        ids_param = ",".join(post_ids)
                                                                   
                        replies_url = f"{supabase.rest_url}/forum_replies?select=*,users(id,username,full_name,role,profile_photo,photo_url,account_status)&post_id=in.({ids_param})&hidden=eq.false&order=created_at.asc"
                        
                        logger.info(f" Fetching replies with URL: {replies_url}")
                        
                        async with httpx.AsyncClient(timeout=10.0) as client:
                            replies_response = await client.get(
                                replies_url,
                                headers=supabase._get_headers(use_service_key=True)
                            )
                        
                        logger.info(f"📡 Replies response: {replies_response.status_code}")
                        if replies_response.status_code != 200:
                            error_text = replies_response.text if replies_response.content else "No error text"
                            logger.error(f" Replies query failed: {replies_response.status_code} - {error_text}")
                            
                                                                   
                            logger.info(" Trying fallback query without users join...")
                            fallback_url = f"{supabase.rest_url}/forum_replies?select=id,reply_body,created_at,user_id,is_anonymous,post_id&post_id=in.({ids_param})&hidden=eq.false&order=created_at.asc"
                            logger.info(f" Fallback URL: {fallback_url}")
                            
                            async with httpx.AsyncClient(timeout=10.0) as client:
                                fallback_response = await client.get(
                                    fallback_url,
                                    headers=supabase._get_headers(use_service_key=True)
                                )
                            
                            logger.info(f"📡 Fallback response: {fallback_response.status_code}")
                            if fallback_response.status_code == 200:
                                replies_response = fallback_response
                                logger.info(" Fallback query succeeded!")
                            else:
                                fallback_error = fallback_response.text if fallback_response.content else "No error text"
                                logger.error(f" Fallback query also failed: {fallback_response.status_code} - {fallback_error}")
                        
                        if replies_response.status_code == 200:
                            all_replies = replies_response.json() if replies_response.content else []
                            logger.info(f" Recent posts replies data: {len(all_replies) if isinstance(all_replies, list) else 'not a list'} total replies")
                            if isinstance(all_replies, list) and len(all_replies) > 0:
                                logger.info(f" First reply sample from recent posts: {all_replies[0]}")
                            elif isinstance(all_replies, dict):
                                logger.info(f" Recent posts replies structure: {list(all_replies.keys())}")
                            
                                                      
                            replies_by_post = {}
                            for reply in all_replies:
                                post_id = str(reply.get("post_id"))
                                if post_id not in replies_by_post:
                                    replies_by_post[post_id] = []
                                replies_by_post[post_id].append(reply)
                            
                                                      
                            for post in base_posts:
                                post_id = str(post.get("id"))
                                post["forum_replies"] = replies_by_post.get(post_id, [])
                                
                            logger.info(f"📦 Fetched {len(base_posts)} posts with replies from {len(all_replies)} total replies")
                        else:
                            logger.warning(f"Failed to fetch replies: {replies_response.status_code}")
                                                        
                            for post in base_posts:
                                post["forum_replies"] = []
                    except Exception as e:
                        logger.warning(f"Error fetching replies: {str(e)}")
                                                    
                        for post in base_posts:
                            post["forum_replies"] = []
            
                                                      
            _posts_cache[cache_key] = (base_posts, current_time)
            logger.info(f"📦 CACHED {len(base_posts)} posts with replies for {CACHE_DURATION}s")
        
                                                       
        user_bookmarks = set()
        if base_posts:
            post_ids = [str(p.get("id")) for p in base_posts if p.get("id")]
            if post_ids:
                                                                                      
                user_bookmarks = await _get_cached_bookmarks(user_id, post_ids)

                                                    
        final_posts = []
        for post in base_posts:
            post_copy = post.copy()                            
            pid = str(post_copy.get("id"))
            
                                                             
            replies = post_copy.get("forum_replies", [])
            post_copy["reply_count"] = len(replies) if replies else 0
            post_copy["is_bookmarked"] = pid in user_bookmarks
            
                                                        
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
                                                  
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{supabase.rest_url}/forum_posts?select=*,users(id,username,full_name,role,profile_photo,photo_url,account_status)&id=eq.{post_id}&is_flagged=eq.false",
                headers=supabase._get_headers(use_service_key=True)
            )

        if response.status_code != 200:
            details = {}
            try:
                details = response.json() if response.content else {}
            except Exception:
                details = {"raw": response.text}
            logger.error(f"Get post failed: {response.status_code} - {details}")
            
                                              
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
                                                  
                                                   
        replies_url = f"{supabase.rest_url}/forum_replies?select=*,users(id,username,full_name,role,profile_photo,photo_url,account_status)&post_id=eq.{post_id}&hidden=eq.false&order=created_at.desc"
        logger.info(f" Individual replies URL: {replies_url}")
        
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                replies_url,
                headers=supabase._get_headers(use_service_key=True)
            )
        
        logger.info(f"📡 Individual replies response: {response.status_code}")
        
                                                       
        if response.content:
            try:
                response_data = response.json()
                logger.info(f" Individual replies data: {len(response_data) if isinstance(response_data, list) else 'not a list'} items")
                if isinstance(response_data, list) and len(response_data) > 0:
                    logger.info(f" First reply sample: {response_data[0]}")
                elif isinstance(response_data, dict):
                    logger.info(f" Response structure: {list(response_data.keys())}")
            except Exception as e:
                logger.error(f" Could not parse response JSON: {e}")
                logger.info(f" Raw response: {response.text[:500]}...")
        
        if response.status_code != 200:
            error_text = response.text if response.content else "No error text"
            logger.error(f" Individual replies query failed: {response.status_code} - {error_text}")
            
                                                   
            logger.info(" Trying fallback individual replies query without users join...")
            fallback_url = f"{supabase.rest_url}/forum_replies?select=*&post_id=eq.{post_id}&hidden=eq.false&order=created_at.desc"
            logger.info(f" Fallback individual replies URL: {fallback_url}")
            
            async with httpx.AsyncClient(timeout=20.0) as client:
                fallback_response = await client.get(
                    fallback_url,
                    headers=supabase._get_headers(use_service_key=True)
                )
            
            logger.info(f"📡 Fallback individual replies response: {fallback_response.status_code}")
            if fallback_response.status_code == 200:
                response = fallback_response
                logger.info(" Fallback individual replies query succeeded!")
            else:
                fallback_error = fallback_response.text if fallback_response.content else "No error text"
                logger.error(f" Fallback individual replies query also failed: {fallback_response.status_code} - {fallback_error}")
        
        if response.status_code != 200:
            details = {}
            try:
                details = response.json() if response.content else {}
            except Exception:
                details = {"raw": response.text}
            logger.error(f"List replies failed: {response.status_code} - {details}")
            
                                                                                  
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
    """Create a reply to a forum post (lawyers only) with content moderation and violation tracking."""
    try:
        user_id = current_user["user"]["id"]
        logger.info(f" Creating reply for post {post_id} from lawyer {user_id[:8]}...")
        
                                                                            
        try:
            violation_service = get_violation_tracking_service()
            user_status = await violation_service.check_user_status(user_id)
            
            if not user_status["is_allowed"]:
                logger.warning(f"🚫 Lawyer {user_id[:8]}... blocked: {user_status['account_status']}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=user_status["reason"]
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f" User status check failed: {str(e)}")
                                                          
            logger.warning("  Proceeding with reply creation (status check failed)")
        
                                                                              
        try:
            logger.info(f" Validating reply for promotional content and links from lawyer {user_id[:8]}...")
            promotional_validator = get_promotional_validator()
            
                                                                    
            validation_result = await promotional_validator.validate_content(body.body.strip())
            
            if not validation_result["is_valid"]:
                logger.warning(f"🚫 Reply blocked for lawyer {user_id[:8]}: {validation_result['reason']}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "detail": validation_result["details"],
                        "reason": validation_result["reason"],
                        "violation_type": validation_result["violation_type"],
                        "action_taken": "content_blocked"
                    }
                )
            
            logger.info(f" Reply passed promotional validation for lawyer {user_id[:8]}...")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f" Promotional validation failed: {str(e)}")
                                                                
            logger.warning("  Proceeding with reply creation (promotional validation failed - fail-open strategy)")
        
                                                                        
        try:
            logger.info(f" Moderating reply from lawyer {user_id[:8]}...")
            moderation_service = get_moderation_service()
            
                                                                         
            moderation_result = await moderation_service.moderate_content(body.body.strip())
            
                                                                      
            if not moderation_service.is_content_safe(moderation_result):
                logger.warning(f"  Reply flagged for lawyer {user_id[:8]}: {moderation_result['violation_summary']}")
                
                                                       
                violation_result = await violation_service.record_violation(
                    user_id=user_id,
                    violation_type=ViolationType.FORUM_REPLY,
                    content_text=body.body.strip(),
                    moderation_result=moderation_result,
                    content_id=None                                           
                )
                
                                                                       
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "detail": violation_result["message"],
                        "action_taken": violation_result["action_taken"],
                        "strike_count": violation_result["strike_count"],
                        "suspension_count": violation_result["suspension_count"],
                        "suspension_end": violation_result.get("suspension_end")
                    }
                )
            
            logger.info(f" Reply content passed moderation for lawyer {user_id[:8]}...")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f" Content moderation failed: {str(e)}")
            logger.error(f" Error type: {type(e).__name__}")
            logger.error(f" Error details: {repr(e)}")
            import traceback
            logger.error(f" Traceback: {traceback.format_exc()}")
                                                                              
            logger.warning("  Proceeding with reply creation (moderation service failed - fail-open strategy)")
        
                                               
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

        clear_posts_cache()
        clear_reply_counts_cache()
        
        await _send_forum_reply_notifications(supabase, post_id, user_id, reply_id)

        return CreateReplyResponse(success=True, message="Reply created", reply_id=reply_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create reply error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def _send_forum_reply_notifications(supabase_service: SupabaseService, post_id: str, replier_id: str, reply_id: str):
    """Send notifications to post author and other commenters"""
    try:
        from supabase import create_client
        supabase = create_client(supabase_service.url, supabase_service.service_key)
        notification_service = NotificationService(supabase)
        
        post_result = supabase.table("forum_posts").select("user_id, title").eq("id", post_id).execute()
        if not post_result.data:
            return
        
        post_author_id = post_result.data[0]["user_id"]
        post_title = post_result.data[0]["title"]
        
        replier_result = supabase.table("users").select("full_name, username, profile_photo, photo_url").eq("id", replier_id).execute()
        replier_name = "A lawyer"
        if replier_result.data:
            replier_name = replier_result.data[0].get("full_name") or replier_result.data[0].get("username") or "A lawyer"
        
        notified_users = set()
        
        if post_author_id != replier_id:
            await notification_service.notify_forum_reply(
                user_id=post_author_id,
                commenter_name=replier_name,
                post_title=post_title,
                post_id=post_id,
                reply_id=reply_id
            )
            notified_users.add(post_author_id)
        
        replies_result = supabase.table("forum_replies").select("user_id").eq("post_id", post_id).neq("user_id", replier_id).execute()
        if replies_result.data:
            for reply in replies_result.data:
                commenter_id = reply["user_id"]
                if commenter_id not in notified_users and commenter_id != replier_id:
                    await notification_service.notify_forum_reply(
                        user_id=commenter_id,
                        commenter_name=replier_name,
                        post_title=post_title,
                        post_id=post_id,
                        reply_id=reply_id
                    )
                    notified_users.add(commenter_id)
        
        logger.info(f" Sent {len(notified_users)} forum reply notifications for post {post_id}")
    except Exception as e:
        logger.error(f"Failed to send forum reply notifications: {e}")


                    
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


@router.get("/bookmarks/user", response_model=ListPostsResponse)
async def get_user_bookmarks(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all bookmarks for the current user"""
    try:
        user_id = current_user["user"]["id"]
        bookmark_service = BookmarkService()
        result = await bookmark_service.get_user_bookmarks(user_id)
        
        if result["success"]:
            return ListPostsResponse(success=True, data=result.get("data", []))
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
                                                              
            clear_user_bookmark_cache(user_id)
            return BookmarkResponse(success=True, data=result.get("data"))
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to toggle bookmark"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Toggle bookmark endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


                  
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
        
                                                               
        check_result = await report_service.check_user_report(
            report_data.target_id,
            report_data.target_type,
            user_id
        )
        
        if check_result["success"] and check_result.get("data", {}).get("hasReported"):
            raise HTTPException(status_code=400, detail="You have already reported this content")
        
                                 
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


               
class SearchPostsResponse(BaseModel):
    success: bool
    data: list
    total: int
    query: str
    message: Optional[str] = None


@router.get("/search", response_model=SearchPostsResponse)
async def search_forum_posts(
    q: str,                
    limit: Optional[int] = None,
    category: Optional[str] = None,
    sort: str = "relevance",                            
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Search forum posts by keywords, exact content, username, or category.
    
    Search capabilities:
    - Keywords in post content
    - Exact post content matching
    - Username search (searches posts by specific users)
    - Category filtering
    - Sorting by relevance, date, or reply count
    """
    try:
        if not q or len(q.strip()) < 2:
            return SearchPostsResponse(
                success=True,
                data=[],
                total=0,
                query=q,
                message="Please enter at least 2 characters to search"
            )
        
        query = q.strip()
        supabase = SupabaseService()
        
                                
        search_conditions = []
        
                                                        
        if query.startswith('@'):
            username = query[1:].lower()                                     
                                                   
            search_conditions.append(f"users.username.ilike.%{username}%")
            search_conditions.append(f"users.full_name.ilike.%{username}%")
        else:
                                                       
            search_conditions.append(f"body.ilike.%{query}%")
        
                                          
        category_filter = ""
        if category:
            category_filter = f"&category=eq.{category}"
        
                              
        sort_param = ""
        if sort == "date":
            sort_param = "&order=created_at.desc"
        elif sort == "replies":
            sort_param = "&order=reply_count.desc"
        else:                       
            sort_param = "&order=created_at.desc"                                  
        
                                 
        limit_param = f"&limit={limit}" if limit is not None else "&limit=10000"
        base_query = (
            f"{supabase.rest_url}/forum_posts?"
            f"select=*,users(id,username,full_name,role,profile_photo,photo_url,account_status),"
            f"forum_replies(count)"
            f"{category_filter}"
            f"{sort_param}"
            f"{limit_param}"
        )
        
                                                  
        all_results = []
        
        if query.startswith('@'):
                                                             
            username = query[1:].lower()
            async with httpx.AsyncClient(timeout=15.0) as client:
                                                                  
                username_response = await client.get(
                    f"{supabase.rest_url}/forum_posts?"
                    f"select=*,users!inner(id,username,full_name,role,profile_photo,photo_url,account_status)"
                    f"&users.username.ilike.*{username}*"
                    f"{category_filter}"
                    f"{sort_param}"
                    f"{limit_param}",
                    headers=supabase._get_headers(use_service_key=True)
                )
                
                logger.info(f"Username search URL: {username_response.url}")
                logger.info(f"Username search status: {username_response.status_code}")
                
                if username_response.status_code == 200:
                    username_results = username_response.json() or []
                    logger.info(f"Username search results: {len(username_results)} posts")
                    all_results.extend(username_results)
                else:
                    logger.error(f"Username search failed: {username_response.text}")
                
                                          
                fullname_response = await client.get(
                    f"{supabase.rest_url}/forum_posts?"
                    f"select=*,users!inner(id,username,full_name,role,profile_photo,photo_url,account_status)"
                    f"&users.full_name.ilike.*{username}*"
                    f"{category_filter}"
                    f"{sort_param}"
                    f"{limit_param}",
                    headers=supabase._get_headers(use_service_key=True)
                )
                
                logger.info(f"Full name search status: {fullname_response.status_code}")
                
                if fullname_response.status_code == 200:
                    fullname_results = fullname_response.json() or []
                    logger.info(f"Full name search results: {len(fullname_results)} posts")
                    all_results.extend(fullname_results)
                else:
                    logger.error(f"Full name search failed: {fullname_response.text}")
        else:
                            
            async with httpx.AsyncClient(timeout=15.0) as client:
                                                                   
                content_response = await client.get(
                    f"{supabase.rest_url}/forum_posts?"
                    f"select=*,users(id,username,full_name,role,profile_photo,photo_url,account_status)"
                    f"&body.ilike.*{query}*"
                    f"{category_filter}"
                    f"{sort_param}"
                    f"{limit_param}",
                    headers=supabase._get_headers(use_service_key=True)
                )
                
                logger.info(f"Content search URL: {content_response.url}")
                logger.info(f"Content search status: {content_response.status_code}")
                
                if content_response.status_code == 200:
                    content_results = content_response.json() or []
                    logger.info(f"Content search results: {len(content_results)} posts")
                    all_results.extend(content_results)
                else:
                    logger.error(f"Content search failed: {content_response.text}")
        
                                            
        seen_ids = set()
        unique_results = []
        for post in all_results:
            post_id = str(post.get('id'))
            if post_id not in seen_ids:
                seen_ids.add(post_id)
                unique_results.append(post)
        
                       
        unique_results = unique_results[:limit]
        
                                                
        user_id = current_user.get("id")
        post_ids = [str(post.get("id")) for post in unique_results]
        user_bookmarks = await _get_cached_bookmarks(user_id, post_ids) if post_ids else set()
        
                         
        processed_results = []
        for post in unique_results:
            try:
                                                            
                reply_count = 0                                                              
                
                                                    
                is_bookmarked = str(post.get("id")) in user_bookmarks
                
                                   
                user_data = post.get("users", {}) or {}
                
                processed_post = {
                    "id": post.get("id"),
                    "body": post.get("body"),
                    "category": post.get("category"),
                    "created_at": post.get("created_at"),
                    "updated_at": post.get("updated_at"),
                    "user_id": post.get("user_id"),
                    "is_anonymous": post.get("is_anonymous", False),
                    "is_flagged": post.get("is_flagged", False),
                    "reply_count": reply_count,
                    "is_bookmarked": is_bookmarked,
                    "users": user_data
                }
                processed_results.append(processed_post)
                
            except Exception as e:
                logger.error(f"Error processing post {post.get('id', 'unknown')}: {str(e)}")
                continue
        
                                                
        if sort == "relevance":
                                                                                 
            def relevance_score(post):
                body = (post.get("body") or "").lower()
                query_lower = query.lower()
                
                                                
                if query_lower in body:
                    if body == query_lower:
                        return 1000                    
                    elif body.startswith(query_lower):
                        return 900                      
                    elif body.endswith(query_lower):
                        return 800                    
                    else:
                        return 700                   
                
                                  
                user_data = post.get("users", {}) or {}
                username = (user_data.get("username") or "").lower()
                full_name = (user_data.get("full_name") or "").lower()
                
                if query.startswith('@'):
                    search_term = query[1:].lower()
                    if search_term in username or search_term in full_name:
                        return 600
                
                return 0
            
            processed_results.sort(key=relevance_score, reverse=True)
        
        logger.info(f"Forum search completed: query='{query}', results={len(processed_results)}")
        
        return SearchPostsResponse(
            success=True,
            data=processed_results,
            total=len(processed_results),
            query=query,
            message=f"Found {len(processed_results)} posts" if processed_results else "No posts found"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forum search error: {str(e)}")
        raise HTTPException(status_code=500, detail="Search failed")


@router.get("/search/suggestions")
async def get_search_suggestions(
    q: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get search suggestions based on partial query."""
    try:
        if not q or len(q.strip()) < 2:
            return {"suggestions": []}
        
        query = q.strip().lower()
        supabase = SupabaseService()
        
        suggestions = []
        
                                  
        categories = ["Family Law", "Criminal Law", "Labor Law", "Civil Law", "Commercial Law", "Others"]
        category_suggestions = [cat for cat in categories if query in cat.lower()]
        suggestions.extend(category_suggestions)
        
                                                         
        if query.startswith('@'):
            username_query = query[1:]
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{supabase.rest_url}/users?"
                    f"select=username,full_name"
                    f"&or=(username.ilike.%{username_query}%,full_name.ilike.%{username_query}%)"
                    f"&limit=5",
                    headers=supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    users = response.json() or []
                    for user in users:
                        username = user.get("username")
                        full_name = user.get("full_name")
                        if username:
                            suggestions.append(f"@{username}")
                        if full_name and full_name != username:
                            suggestions.append(f"@{full_name}")
        
                           
        suggestions = list(set(suggestions))[:10]
        
        return {"suggestions": suggestions}
        
    except Exception as e:
        logger.error(f"Search suggestions error: {str(e)}")
        return {"suggestions": []}


@router.get("/search/popular")
async def get_popular_searches(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get popular search terms."""
    try:
                                                 
                                                                       
        popular_searches = [
            "labor law",
            "family law",
            "criminal law",
            "contract",
            "employment",
            "divorce",
            "inheritance",
            "small claims",
            "illegal dismissal",
            "breach of contract"
        ]
        
        return {"popular": popular_searches}
        
    except Exception as e:
        logger.error(f"Popular searches error: {str(e)}")
        return {"popular": []}


@router.get("/debug/search-test")
async def debug_search_test():
    """Debug endpoint to test basic forum post retrieval and search."""
    try:
        supabase = SupabaseService()
        
                                            
        async with httpx.AsyncClient(timeout=10.0) as client:
            all_posts_response = await client.get(
                f"{supabase.rest_url}/forum_posts?select=*&limit=5",
                headers=supabase._get_headers(use_service_key=True)
            )
            
            logger.info(f"All posts query status: {all_posts_response.status_code}")
            all_posts = all_posts_response.json() if all_posts_response.status_code == 200 else []
            
                                          
            posts_with_users_response = await client.get(
                f"{supabase.rest_url}/forum_posts?select=*,users(id,username,full_name,profile_photo,photo_url,account_status)&limit=5",
                headers=supabase._get_headers(use_service_key=True)
            )
            
            logger.info(f"Posts with users query status: {posts_with_users_response.status_code}")
            posts_with_users = posts_with_users_response.json() if posts_with_users_response.status_code == 200 else []
            
                                           
            content_search_response = await client.get(
                f"{supabase.rest_url}/forum_posts?select=*&body.ilike.*test*&limit=5",
                headers=supabase._get_headers(use_service_key=True)
            )
            
            logger.info(f"Content search query status: {content_search_response.status_code}")
            content_search_results = content_search_response.json() if content_search_response.status_code == 200 else []
            
            return {
                "success": True,
                "tests": {
                    "all_posts": {
                        "status": all_posts_response.status_code,
                        "count": len(all_posts),
                        "sample": all_posts[:2] if all_posts else []
                    },
                    "posts_with_users": {
                        "status": posts_with_users_response.status_code,
                        "count": len(posts_with_users),
                        "sample": posts_with_users[:2] if posts_with_users else []
                    },
                    "content_search": {
                        "status": content_search_response.status_code,
                        "count": len(content_search_results),
                        "sample": content_search_results[:2] if content_search_results else []
                    }
                }
            }
            
    except Exception as e:
        logger.error(f"Debug search test error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

