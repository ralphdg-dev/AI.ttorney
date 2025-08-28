from services.supabase_service import SupabaseService
from auth.models import UserSignUp, UserSignIn, UserResponse
from typing import Optional, Dict, Any
import logging
import hashlib

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self):
        self.supabase = SupabaseService()
    
    async def sign_up(self, user_data: UserSignUp) -> Dict[str, Any]:
        """Register a new user"""
        try:
            # Create user in Supabase Auth
            auth_response = await self.supabase.sign_up(
                email=user_data.email,
                password=user_data.password,
                user_metadata={
                    "username": user_data.username,
                    "full_name": user_data.full_name,
                    "role": user_data.role
                }
            )
            
            if not auth_response["success"]:
                return {"success": False, "error": auth_response["error"]}
            
            user = auth_response["data"]["user"]
            
            # Hash password for users table (following schema)
            password_hash = hashlib.sha256(user_data.password.encode()).hexdigest()
            
            # Insert user profile data using correct schema
            profile_data = {
                "id": user["id"],
                "email": user_data.email,
                "username": user_data.username,
                "full_name": user_data.full_name,
                "role": user_data.role,
                "password_hash": password_hash,
                "is_verified": False
            }
            
            profile_response = await self.supabase.insert_user_profile(profile_data)
            
            return {
                "success": True,
                "user": user,
                "session": auth_response["data"].get("session")
            }
            
        except Exception as e:
            logger.error(f"Sign up error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def sign_in(self, credentials: UserSignIn) -> Dict[str, Any]:
        """Sign in user"""
        try:
            auth_response = await self.supabase.sign_in(
                email=credentials.email,
                password=credentials.password
            )
            
            if not auth_response["success"]:
                return {"success": False, "error": auth_response["error"]}
            
            user = auth_response["data"]["user"]
            session = auth_response["data"].get("session")
            
            # Get user profile from users table
            profile_response = await self.supabase.get_user_profile(user["id"])
            
            return {
                "success": True,
                "user": user,
                "session": session,
                "profile": profile_response["data"] if profile_response["success"] else None
            }
            
        except Exception as e:
            logger.error(f"Sign in error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def sign_out(self, access_token: str) -> Dict[str, Any]:
        """Sign out user"""
        try:
            response = await self.supabase.sign_out(access_token)
            return response
        except Exception as e:
            logger.error(f"Sign out error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_user(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get current user from token"""
        try:
            user_response = await self.supabase.get_user(access_token)
            
            if not user_response["success"]:
                return None
            
            user = user_response["data"]
            
            # Get profile from users table
            profile_response = await self.supabase.get_user_profile(user["id"])
            
            return {
                "user": user,
                "profile": profile_response["data"] if profile_response["success"] else None
            }
            
        except Exception as e:
            logger.error(f"Get user error: {str(e)}")
            return None
    
    async def reset_password(self, email: str) -> Dict[str, Any]:
        """Send password reset email"""
        try:
            response = await self.supabase.reset_password(email)
            return response
        except Exception as e:
            logger.error(f"Password reset error: {str(e)}")
            return {"success": False, "error": str(e)}
