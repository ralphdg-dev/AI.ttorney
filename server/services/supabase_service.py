import httpx
import os
import json
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import logging

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
                    "data": user_metadata or {}
                }
                
                response = await client.post(
                    f"{self.auth_url}/signup",
                    json=payload,
                    headers=self._get_headers()
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
                    data = response.json()
                    return {"success": True, "data": data}
                else:
                    error_data = response.json() if response.content else {}
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
