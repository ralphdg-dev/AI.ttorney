import httpx
import os
import json
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv
import logging
from supabase import create_client, Client

load_dotenv()
logger = logging.getLogger(__name__)

class SupabaseService:
    """Production-ready Supabase service using HTTP API calls"""
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.anon_key = os.getenv("SUPABASE_ANON_KEY")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.url or not self.anon_key:
            raise ValueError("Missing Supabase configuration")
        
        self.auth_url = f"{self.url}/auth/v1"
        self.rest_url = f"{self.url}/rest/v1"
        
        # Create Supabase client for direct database operations
        self.supabase: Client = create_client(self.url, self.anon_key)
    
    def _get_headers(self, use_service_key: bool = False) -> Dict[str, str]:
        """Get request headers"""
        key = self.service_key if use_service_key and self.service_key else self.anon_key
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
    
    async def sign_up(self, email: str, password: str, user_metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Sign up a new user"""
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "email": email,
                    "password": password,
                    "user_metadata": user_metadata or {},
                    "email_confirm": False,   # Email will be confirmed via custom OTP
                    "phone_confirm": False,   # Disable phone confirmation
                    "confirm": False          # User must verify via custom OTP system
                }
                
                # Use service role key to bypass email confirmation entirely
                response = await client.post(
                    f"{self.auth_url}/admin/users",
                    json=payload,
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {"success": True, "data": data}
                else:
                    error_data = response.json() if response.content else {}
                    error_msg = error_data.get("msg") or error_data.get("message") or error_data.get("error_description") or f"Sign up failed: {response.status_code}"
                    logger.error(f"Supabase signup error: {error_data}")
                    return {"success": False, "error": error_msg}
                    
        except Exception as e:
            logger.error(f"Sign up error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """Sign in user"""
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "email": email,
                    "password": password
                }
                
                response = await client.post(
                    f"{self.auth_url}/token?grant_type=password",
                    json=payload,
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {"success": True, "data": data}
                else:
                    error_data = response.json() if response.content else {}
                    error_msg = error_data.get("error_description") or error_data.get("message") or f"Sign in failed: {response.status_code}"
                    logger.error(f"Supabase signin error: {error_data}")
                    return {"success": False, "error": error_msg}
                    
        except Exception as e:
            logger.error(f"Sign in error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_user(self, access_token: str) -> Dict[str, Any]:
        """Get user from access token"""
        try:
            async with httpx.AsyncClient() as client:
                headers = self._get_headers()
                headers["Authorization"] = f"Bearer {access_token}"
                
                response = await client.get(
                    f"{self.auth_url}/user",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {"success": True, "data": data}
                else:
                    return {"success": False, "error": "Invalid token"}
                    
        except Exception as e:
            logger.error(f"Get user error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def sign_out(self, access_token: str) -> Dict[str, Any]:
        """Sign out user"""
        try:
            async with httpx.AsyncClient() as client:
                headers = self._get_headers()
                headers["Authorization"] = f"Bearer {access_token}"
                
                response = await client.post(
                    f"{self.auth_url}/logout",
                    headers=headers
                )
                
                return {"success": True}
                    
        except Exception as e:
            logger.error(f"Sign out error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def reset_password(self, email: str) -> Dict[str, Any]:
        """Send password reset email"""
        try:
            async with httpx.AsyncClient() as client:
                payload = {"email": email}
                
                response = await client.post(
                    f"{self.auth_url}/recover",
                    json=payload,
                    headers=self._get_headers()
                )
                
                return {"success": True, "message": "Password reset email sent"}
                    
        except Exception as e:
            logger.error(f"Password reset error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # Database operations
    async def insert_user_profile(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert user profile into users table"""
        try:
            async with httpx.AsyncClient() as client:
                # Create a copy of user_data without None values
                clean_user_data = {k: v for k, v in user_data.items() if v is not None}
                
                response = await client.post(
                    f"{self.rest_url}/users",
                    json=clean_user_data,
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 201]:
                    if response.content:
                        data = response.json()
                        return {"success": True, "data": data}
                    else:
                        # Success but no content (common with Supabase inserts)
                        return {"success": True, "data": {"message": "User profile created successfully"}}
                else:
                    error_data = response.json() if response.content else {}
                    logger.error(f"Insert user profile failed: {response.status_code}, {error_data}")
                    return {"success": False, "error": error_data}
                    
        except Exception as e:
            logger.error(f"Insert user profile error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Get user profile from users table"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rest_url}/users?id=eq.{user_id}&select=*",
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        return {"success": True, "data": data[0]}
                    else:
                        return {"success": False, "error": "User not found"}
                else:
                    return {"success": False, "error": "Failed to get user profile"}
                    
        except Exception as e:
            logger.error(f"Get user profile error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_user_profile_by_email(self, email: str) -> Dict[str, Any]:
        """Get user profile from users table by email"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rest_url}/users?email=eq.{email}&select=*",
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        return {"success": True, "data": data[0]}
                    else:
                        return {"success": False, "error": "User not found"}
                else:
                    return {"success": False, "error": "Failed to get user profile"}
                    
        except Exception as e:
            logger.error(f"Get user profile by email error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def update_user_profile(self, update_data: Dict[str, Any], where_clause: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile in users table"""
        try:
            async with httpx.AsyncClient() as client:
                # Build query parameters for WHERE clause
                query_params = []
                for key, value in where_clause.items():
                    query_params.append(f"{key}=eq.{value}")
                query_string = "&".join(query_params)
                
                response = await client.patch(
                    f"{self.rest_url}/users?{query_string}",
                    json=update_data,
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 204]:
                    return {"success": True, "message": "User profile updated"}
                else:
                    error_data = response.json() if response.content else {}
                    return {"success": False, "error": error_data}
                    
        except Exception as e:
            logger.error(f"Update user profile error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def check_user_exists(self, field: str, value: str) -> Dict[str, Any]:
        """Check if a user exists by field (email or username) in both auth.users and public.users tables"""
        try:
            async with httpx.AsyncClient() as client:
                # Initialize data variables
                public_data = []
                auth_data = {"users": []}
                
                # Check public.users table
                public_response = await client.get(
                    f"{self.rest_url}/users?select=id&{field}=eq.{value}",
                    headers=self._get_headers(use_service_key=True)
                )
                
                public_exists = False
                if public_response.status_code == 200:
                    public_data = public_response.json()
                    public_exists = len(public_data) > 0
                    logger.info(f"Public users check: found {len(public_data)} records for {field}={value}")
                else:
                    logger.error(f"Check public.users error: {public_response.status_code} - {public_response.text}")
                    return {"success": False, "error": f"Database query failed: {public_response.status_code}"}
                
                # Check auth.users table (only for email field)
                auth_exists = False
                if field == "email":
                    # Use the get user by email endpoint instead of listing all users
                    auth_response = await client.get(
                        f"{self.auth_url}/admin/users",
                        headers=self._get_headers(use_service_key=True)
                    )
                    
                    if auth_response.status_code == 200:
                        auth_data = auth_response.json()
                        # Filter users by email manually since Supabase admin API doesn't support email filtering
                        all_users = auth_data.get("users", [])
                        matching_users = [user for user in all_users if user.get("email") == value]
                        auth_exists = len(matching_users) > 0
                        logger.info(f"Auth users check: found {len(matching_users)} records for email={value}")
                        # Update auth_data to only include matching users
                        auth_data = {"users": matching_users}
                    else:
                        logger.error(f"Check auth.users error: {auth_response.status_code} - {auth_response.text}")
                        return {"success": False, "error": f"Auth query failed: {auth_response.status_code}"}
                
                # User exists if found in either table
                exists = public_exists or auth_exists
                
                logger.info(f"Final result: exists={exists}, public_exists={public_exists}, auth_exists={auth_exists}")
                
                return {
                    "success": True,
                    "exists": exists,
                    "found_in_public": public_exists,
                    "found_in_auth": auth_exists,
                    "data": {
                        "public": public_data,
                        "auth": auth_data.get("users", [])
                    }
                }
                    
        except Exception as e:
            logger.error(f"Check user exists error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def delete_auth_user(self, user_id: str) -> Dict[str, Any]:
        """Delete an auth user (requires service role key) - used for rollback on registration failure"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.auth_url}/admin/users/{user_id}",
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"Successfully deleted auth user: {user_id}")
                    return {"success": True}
                else:
                    error_data = response.json() if response.content else {}
                    error_msg = error_data.get("message") or f"Delete failed: {response.status_code}"
                    logger.error(f"Failed to delete auth user {user_id}: {error_data}")
                    return {"success": False, "error": error_msg}
                    
        except Exception as e:
            logger.error(f"Delete auth user error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def confirm_user_email(self, user_id: str) -> Dict[str, Any]:
        """Confirm user email in Supabase Auth after OTP verification"""
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "email_confirm": True,
                    "confirm": True
                }
                
                response = await client.put(
                    f"{self.auth_url}/admin/users/{user_id}",
                    json=payload,
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    logger.info(f"Successfully confirmed email for user: {user_id}")
                    return {"success": True, "message": "Email confirmed successfully"}
                else:
                    error_data = response.json() if response.content else {}
                    error_msg = error_data.get("message") or f"Confirmation failed: {response.status_code}"
                    logger.error(f"Failed to confirm email for user {user_id}: {error_data}")
                    return {"success": False, "error": error_msg}
                    
        except Exception as e:
            logger.error(f"Confirm user email error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def update_user_email(self, user_id: str, new_email: str) -> Dict[str, Any]:
        """Update user email in Supabase Auth"""
        try:
            async with httpx.AsyncClient() as client:
                payload = {"email": new_email}
                
                response = await client.put(
                    f"{self.auth_url}/admin/users/{user_id}",
                    json=payload,
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    return {"success": True, "message": "Email updated successfully"}
                else:
                    error_data = response.json() if response.content else {}
                    error_msg = error_data.get("message") or f"Update failed: {response.status_code}"
                    logger.error(f"Failed to update email for user {user_id}: {error_data}")
                    return {"success": False, "error": error_msg}
                    
        except Exception as e:
            logger.error(f"Update user email error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # Forum Posts Operations
    async def create_forum_post(self, post_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new forum post"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.rest_url}/forum_posts",
                    json=post_data,
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    return {"success": True, "data": data[0] if isinstance(data, list) else data}
                else:
                    error_data = response.json() if response.content else {}
                    logger.error(f"Create forum post failed: {response.status_code}, {error_data}")
                    return {"success": False, "error": error_data}
                    
        except Exception as e:
            logger.error(f"Create forum post error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_forum_posts(self, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """Get forum posts with pagination"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rest_url}/forum_posts?select=*,users(username,full_name)&order=created_at.desc&limit={limit}&offset={offset}",
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {"success": True, "data": data}
                else:
                    error_data = response.json() if response.content else {}
                    return {"success": False, "error": error_data}
                    
        except Exception as e:
            logger.error(f"Get forum posts error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_forum_post_by_id(self, post_id: str) -> Dict[str, Any]:
        """Get a specific forum post by ID"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rest_url}/forum_posts?select=*,users(username,full_name)&id=eq.{post_id}",
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        return {"success": True, "data": data[0]}
                    else:
                        return {"success": False, "error": "Post not found"}
                else:
                    error_data = response.json() if response.content else {}
                    return {"success": False, "error": error_data}
                    
        except Exception as e:
            logger.error(f"Get forum post error: {str(e)}")
            return {"success": False, "error": str(e)}

    # Bookmark Operations
    async def create_bookmark(self, bookmark_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new bookmark"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.rest_url}/bookmarks",
                    json=bookmark_data,
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    return {"success": True, "data": data[0] if isinstance(data, list) else data}
                else:
                    error_data = response.json() if response.content else {}
                    logger.error(f"Create bookmark failed: {response.status_code}, {error_data}")
                    return {"success": False, "error": error_data}
                    
        except Exception as e:
            logger.error(f"Create bookmark error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def delete_bookmark(self, user_id: str, post_id: str) -> Dict[str, Any]:
        """Delete a bookmark"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.rest_url}/bookmarks?user_id=eq.{user_id}&post_id=eq.{post_id}",
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 204]:
                    return {"success": True}
                else:
                    error_data = response.json() if response.content else {}
                    return {"success": False, "error": error_data}
                    
        except Exception as e:
            logger.error(f"Delete bookmark error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def check_bookmark_exists(self, user_id: str, post_id: str) -> Dict[str, Any]:
        """Check if a bookmark exists"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rest_url}/bookmarks?select=id&user_id=eq.{user_id}&post_id=eq.{post_id}",
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    exists = len(data) > 0
                    return {"success": True, "exists": exists}
                else:
                    return {"success": False, "error": "Failed to check bookmark"}
                    
        except Exception as e:
            logger.error(f"Check bookmark error: {str(e)}")
            return {"success": False, "error": str(e)}

    # Report Operations
    async def create_report(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new report"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.rest_url}/reports",
                    json=report_data,
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    return {"success": True, "data": data[0] if isinstance(data, list) else data}
                else:
                    error_data = response.json() if response.content else {}
                    logger.error(f"Create report failed: {response.status_code}, {error_data}")
                    return {"success": False, "error": error_data}
                    
        except Exception as e:
            logger.error(f"Create report error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def check_user_reported_post(self, user_id: str, post_id: str) -> Dict[str, Any]:
        """Check if user has already reported a post"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rest_url}/reports?select=id&user_id=eq.{user_id}&post_id=eq.{post_id}",
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    has_reported = len(data) > 0
                    return {"success": True, "has_reported": has_reported}
                else:
                    return {"success": False, "error": "Failed to check report status"}
                    
        except Exception as e:
            logger.error(f"Check user reported post error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def test_connection(self) -> Dict[str, Any]:
        """Test Supabase connection"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rest_url}/glossary_terms?select=*&limit=1",
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    return {"success": True, "message": "Connection successful"}
                else:
                    return {"success": False, "error": f"Connection failed: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"Connection test error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_system_maintenance(self) -> Dict[str, Any]:
        """Fetch the latest system maintenance settings.

        Returns a payload with fields: is_active, message, allow_admin, start_time, end_time.
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rest_url}/system_maintenance?select=id,is_active,message,start_time,end_time,allow_admin,created_at&order=created_at.desc&limit=1",
                    headers=self._get_headers()
                )

                if response.status_code == 200:
                    data = response.json()
                    row = data[0] if isinstance(data, list) and len(data) > 0 else None

                    if row:
                        # Compute effective maintenance status based on schedule window in UTC
                        now = datetime.now(timezone.utc)

                        def parse_dt(value):
                            if not value:
                                return None
                            try:
                                # Supabase returns ISO8601 with offset, which fromisoformat can parse
                                return datetime.fromisoformat(value)
                            except Exception:
                                return None

                        start = parse_dt(row.get("start_time"))
                        end = parse_dt(row.get("end_time"))

                        has_schedule = start is not None or end is not None
                        within_window = has_schedule and (
                            (start is not None and end is not None and start <= now < end)
                            or (start is not None and end is None and now >= start)
                            or (start is None and end is not None and now < end)
                        )

                        stored_is_active = bool(row.get("is_active"))
                        effective_is_active = within_window if has_schedule else stored_is_active

                        maintenance = {
                            **row,
                            "is_active": effective_is_active,
                            "effective_is_active": effective_is_active,
                        }
                    else:
                        maintenance = {
                            "is_active": False,
                            "message": "",
                            "start_time": None,
                            "end_time": None,
                            "allow_admin": True,
                        }

                    return {"success": True, "data": maintenance}
                else:
                    return {"success": False, "error": "Failed to fetch maintenance status"}
        except Exception as e:
            logger.error(f"Get system maintenance error: {str(e)}")
            return {"success": False, "error": str(e)}
