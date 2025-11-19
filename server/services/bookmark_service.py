from typing import Dict, Any, List, Optional
import httpx
import logging
from .supabase_service import SupabaseService

logger = logging.getLogger(__name__)

class BookmarkService:
    """Service for handling forum post bookmarks"""
    
    def __init__(self):
        self.supabase = SupabaseService()
    
    async def add_bookmark(self, post_id: str, user_id: str) -> Dict[str, Any]:
        """Add a bookmark for a forum post"""
        try:
            # First check if the post exists
            async with httpx.AsyncClient() as client:
                post_response = await client.get(
                    f"{self.supabase.rest_url}/forum_posts?select=id&id=eq.{post_id}",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
            
            if post_response.status_code != 200:
                return {"success": False, "error": "Failed to verify post exists"}
            
            posts = post_response.json() if post_response.content else []
            if not posts:
                return {"success": False, "error": "Post not found"}
            
            # Check if bookmark already exists
            async with httpx.AsyncClient() as client:
                existing_response = await client.get(
                    f"{self.supabase.rest_url}/user_forum_bookmarks?select=id&post_id=eq.{post_id}&user_id=eq.{user_id}",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
            
            if existing_response.status_code == 200:
                existing = existing_response.json() if existing_response.content else []
                if existing:
                    return {"success": True, "data": existing[0], "message": "Bookmark already exists"}
            
            # Create new bookmark
            bookmark_data = {
                "post_id": post_id,
                "user_id": user_id,
                "bookmarked_at": "now()"
            }
            
            headers = self.supabase._get_headers(use_service_key=True)
            headers["Prefer"] = "return=representation"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.supabase.rest_url}/user_forum_bookmarks",
                    json=bookmark_data,
                    headers=headers
                )
            
            if response.status_code not in (200, 201):
                details = {}
                try:
                    details = response.json() if response.content else {}
                except Exception:
                    details = {"raw": response.text}
                logger.error(f"Add bookmark failed: {response.status_code} - {details}")
                return {"success": False, "error": details.get("message", "Failed to add bookmark")}
            
            created = response.json() if response.content else []
            if isinstance(created, list) and created:
                return {"success": True, "data": created[0]}
            
            return {"success": True, "data": {}}
            
        except Exception as e:
            logger.error(f"Add bookmark error: {str(e)}")
            return {"success": False, "error": "Internal server error"}
    
    async def remove_bookmark(self, post_id: str, user_id: str) -> Dict[str, Any]:
        """Remove a bookmark for a forum post"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.supabase.rest_url}/user_forum_bookmarks?post_id=eq.{post_id}&user_id=eq.{user_id}",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
            
            if response.status_code not in (200, 204):
                details = {}
                try:
                    details = response.json() if response.content else {}
                except Exception:
                    details = {"raw": response.text}
                logger.error(f"Remove bookmark failed: {response.status_code} - {details}")
                return {"success": False, "error": details.get("message", "Failed to remove bookmark")}
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Remove bookmark error: {str(e)}")
            return {"success": False, "error": "Internal server error"}
    
    async def check_bookmark(self, post_id: str, user_id: str) -> Dict[str, Any]:
        """Check if a post is bookmarked by a user"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase.rest_url}/user_forum_bookmarks?select=id&post_id=eq.{post_id}&user_id=eq.{user_id}",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
            
            if response.status_code != 200:
                details = {}
                try:
                    details = response.json() if response.content else {}
                except Exception:
                    details = {"raw": response.text}
                logger.error(f"Check bookmark failed: {response.status_code} - {details}")
                return {"success": False, "error": details.get("message", "Failed to check bookmark")}
            
            bookmarks = response.json() if response.content else []
            is_bookmarked = len(bookmarks) > 0
            
            return {"success": True, "data": {"bookmarked": is_bookmarked}}
            
        except Exception as e:
            logger.error(f"Check bookmark error: {str(e)}")
            return {"success": False, "error": "Internal server error"}
    
    async def get_user_bookmarks(self, user_id: str) -> Dict[str, Any]:
        """Get all bookmarks for a user with full post and user data"""
        try:
            # First, get the bookmarked post IDs
            async with httpx.AsyncClient(timeout=20.0) as client:
                bookmarks_response = await client.get(
                    f"{self.supabase.rest_url}/user_forum_bookmarks?select=post_id,bookmarked_at&user_id=eq.{user_id}&order=bookmarked_at.desc",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
            
            if bookmarks_response.status_code != 200:
                details = {}
                try:
                    details = bookmarks_response.json() if bookmarks_response.content else {}
                except Exception:
                    details = {"raw": bookmarks_response.text}
                logger.error(f"Get user bookmarks failed: {bookmarks_response.status_code} - {details}")
                return {"success": False, "error": details.get("message", "Failed to get bookmarks")}
            
            bookmarks = bookmarks_response.json() if bookmarks_response.content else []
            
            if not bookmarks:
                return {"success": True, "data": []}
            
            # Get the post IDs
            post_ids = [str(b.get("post_id")) for b in bookmarks if b.get("post_id")]
            
            if not post_ids:
                return {"success": True, "data": []}
            
            # Fetch the full post data with user information and replies
            ids_param = ",".join(post_ids)
            async with httpx.AsyncClient(timeout=20.0) as client:
                posts_response = await client.get(
                    f"{self.supabase.rest_url}/forum_posts?select=*,users(id,username,full_name,role)&id=in.({ids_param})",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
            
            if posts_response.status_code != 200:
                logger.error(f"Get posts for bookmarks failed: {posts_response.status_code}")
                return {"success": False, "error": "Failed to fetch post details"}
            
            posts = posts_response.json() if posts_response.content else []
            
            # Fetch replies for these posts
            if posts:
                try:
                    async with httpx.AsyncClient(timeout=15.0) as client:
                        replies_response = await client.get(
                            f"{self.supabase.rest_url}/forum_replies?select=*,users(id,username,full_name,role)&post_id=in.({ids_param})&order=created_at.asc",
                            headers=self.supabase._get_headers(use_service_key=True)
                        )
                    
                    if replies_response.status_code == 200:
                        all_replies = replies_response.json() if replies_response.content else []
                        
                        # Group replies by post_id
                        replies_by_post = {}
                        for reply in all_replies:
                            post_id = str(reply.get("post_id"))
                            if post_id not in replies_by_post:
                                replies_by_post[post_id] = []
                            replies_by_post[post_id].append(reply)
                        
                        # Add replies to each post
                        for post in posts:
                            post_id = str(post.get("id"))
                            post["replies"] = replies_by_post.get(post_id, [])
                    else:
                        # Add empty replies if fetch fails
                        for post in posts:
                            post["replies"] = []
                except Exception as e:
                    logger.warning(f"Error fetching replies for bookmarks: {str(e)}")
                    for post in posts:
                        post["replies"] = []
            
            # Sort posts by bookmark date (maintain bookmark order)
            post_order = {str(b.get("post_id")): i for i, b in enumerate(bookmarks)}
            posts.sort(key=lambda p: post_order.get(str(p.get("id")), 999))
            
            return {"success": True, "data": posts}
            
        except Exception as e:
            logger.error(f"Get user bookmarks error: {str(e)}")
            return {"success": False, "error": "Internal server error"}
    
    async def toggle_bookmark(self, post_id: str, user_id: str) -> Dict[str, Any]:
        """Toggle bookmark status (add if not bookmarked, remove if bookmarked)"""
        try:
            # Check current status
            check_result = await self.check_bookmark(post_id, user_id)
            if not check_result["success"]:
                return check_result
            
            is_bookmarked = check_result["data"]["bookmarked"]
            
            if is_bookmarked:
                # Remove bookmark
                result = await self.remove_bookmark(post_id, user_id)
                if result["success"]:
                    result["data"] = {"bookmarked": False}
                return result
            else:
                # Add bookmark
                result = await self.add_bookmark(post_id, user_id)
                if result["success"]:
                    result["data"] = {"bookmarked": True}
                return result
                
        except Exception as e:
            logger.error(f"Toggle bookmark error: {str(e)}")
            return {"success": False, "error": "Internal server error"}
