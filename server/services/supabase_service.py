import httpx
import os
import json
from typing import Dict, Any, Optional
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
                    "email_confirm": True,    # Mark email as already confirmed
                    "phone_confirm": False,   # Disable phone confirmation
                    "confirm": True           # Skip confirmation process entirely
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
                
                logger.info(f"Authenticating with Supabase using token: {access_token[:10]}...")
                
                response = await client.get(
                    f"{self.auth_url}/user",
                    headers=headers,
                    timeout=10.0  # Add timeout to prevent hanging requests
                )
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"Successfully authenticated user: {data.get('id', 'unknown')[:8]}...")
                    return {"success": True, "data": data}
                else:
                    error_data = response.text if response.content else ""
                    logger.error(f"Authentication failed with status {response.status_code}: {error_data}")
                    
                    # For development/debugging - provide more detailed error info
                    if response.status_code == 401:
                        logger.error("Token is invalid or expired. User needs to sign in again.")
                    elif response.status_code == 403:
                        logger.error("Token doesn't have permission to access this resource.")
                    
                    return {"success": False, "error": f"Invalid token (HTTP {response.status_code})"}
                    
        except Exception as e:
            logger.error(f"Get user error: {str(e)}")
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
            # Sanitize user_id to prevent SQL injection
            sanitized_user_id = self._sanitize_value(user_id)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rest_url}/users",
                    params={"id": f"eq.{sanitized_user_id}", "select": "*"},
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
            # Sanitize email to prevent SQL injection
            sanitized_email = self._sanitize_value(email)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rest_url}/users",
                    params={"email": f"eq.{sanitized_email}", "select": "*"},
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
                # Build sanitized query parameters for WHERE clause
                query_params = {}
                for key, value in where_clause.items():
                    # Validate field name to prevent SQL injection
                    if not self._validate_field_name(key):
                        return {"success": False, "error": f"Invalid field name: {key}"}
                    # Sanitize value to prevent SQL injection
                    sanitized_value = self._sanitize_value(str(value))
                    query_params[key] = f"eq.{sanitized_value}"
                
                response = await client.patch(
                    f"{self.rest_url}/users",
                    params=query_params,
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
    
    def _validate_field_name(self, field: str) -> bool:
        """Validate field name to prevent SQL injection"""
        allowed_fields = {"email", "username", "id"}
        return field in allowed_fields
    
    def _sanitize_value(self, value: str) -> str:
        """Sanitize value to prevent SQL injection"""
        import urllib.parse
        # URL encode the value to prevent injection
        return urllib.parse.quote(str(value), safe='')
    
    async def check_user_exists(self, field: str, value: str) -> Dict[str, Any]:
        """Check if a user exists by field (email or username) in both auth.users and public.users tables"""
        try:
            # Validate field name to prevent SQL injection
            if not self._validate_field_name(field):
                return {"success": False, "error": f"Invalid field name: {field}"}
            
            # Sanitize value to prevent SQL injection
            sanitized_value = self._sanitize_value(value)
            
            async with httpx.AsyncClient() as client:
                # Initialize data variables
                public_data = []
                auth_data = {"users": []}
                
                # Check public.users table with sanitized parameters
                public_response = await client.get(
                    f"{self.rest_url}/users",
                    params={"select": "id", field: f"eq.{sanitized_value}"},
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
    
    async def check_user_exists_excluding_current(self, field: str, value: str, current_user_id: str) -> Dict[str, Any]:
        """Check if a user exists by field, excluding the current user"""
        try:
            # Validate field name to prevent SQL injection
            if not self._validate_field_name(field):
                return {"success": False, "error": f"Invalid field name: {field}"}
            
            # Sanitize values to prevent SQL injection
            sanitized_value = self._sanitize_value(value)
            sanitized_user_id = self._sanitize_value(current_user_id)
            
            async with httpx.AsyncClient() as client:
                # Check public.users table (exclude current user) with sanitized parameters
                public_response = await client.get(
                    f"{self.rest_url}/users",
                    params={
                        "select": "id", 
                        field: f"eq.{sanitized_value}",
                        "id": f"neq.{sanitized_user_id}"
                    },
                    headers=self._get_headers(use_service_key=True)
                )
                
                public_exists = False
                if public_response.status_code == 200:
                    public_data = public_response.json()
                    public_exists = len(public_data) > 0
                    logger.info(f"Public users check (excluding current): found {len(public_data)} records for {field}={value}")
                else:
                    logger.error(f"Check public.users error: {public_response.status_code} - {public_response.text}")
                    return {"success": False, "error": f"Database query failed: {public_response.status_code}"}
                
                # Check auth.users table (only for email field, exclude current user)
                auth_exists = False
                if field == "email":
                    auth_response = await client.get(
                        f"{self.auth_url}/admin/users",
                        headers=self._get_headers(use_service_key=True)
                    )
                    
                    if auth_response.status_code == 200:
                        auth_data = auth_response.json()
                        all_users = auth_data.get("users", [])
                        # Filter by email and exclude current user
                        matching_users = [
                            user for user in all_users 
                            if user.get("email") == value and user.get("id") != current_user_id
                        ]
                        auth_exists = len(matching_users) > 0
                        logger.info(f"Auth users check (excluding current): found {len(matching_users)} records for email={value}")
                    else:
                        logger.error(f"Check auth.users error: {auth_response.status_code} - {auth_response.text}")
                        return {"success": False, "error": f"Auth query failed: {auth_response.status_code}"}
                
                # User exists if found in either table (excluding current user)
                exists = public_exists or auth_exists
                
                logger.info(f"Final result (excluding current user): exists={exists}, public_exists={public_exists}, auth_exists={auth_exists}")
                
                return {
                    "success": True,
                    "exists": exists,
                    "found_in_public": public_exists,
                    "found_in_auth": auth_exists
                }
                    
        except Exception as e:
            logger.error(f"Check user exists error: {str(e)}")
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
                    error_msg = error_data.get("message") or f"Email update failed: {response.status_code}"
                    logger.error(f"Update email error: {error_data}")
                    return {"success": False, "error": error_msg}
                    
        except Exception as e:
            logger.error(f"Update user email error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def update_user_password(self, user_id: str, new_password: str) -> Dict[str, Any]:
        """Update user password in Supabase Auth"""
        try:
            async with httpx.AsyncClient() as client:
                payload = {"password": new_password}
                
                response = await client.put(
                    f"{self.auth_url}/admin/users/{user_id}",
                    json=payload,
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    return {"success": True, "message": "Password updated successfully"}
                else:
                    error_data = response.json() if response.content else {}
                    error_msg = error_data.get("message") or f"Password update failed: {response.status_code}"
                    logger.error(f"Update password error: {error_data}")
                    return {"success": False, "error": error_msg}
                    
        except Exception as e:
            logger.error(f"Update user password error: {str(e)}")
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
