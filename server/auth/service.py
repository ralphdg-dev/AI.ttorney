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
        """Register a new user in both auth.users and public.users tables"""
        try:
            # Create user in Supabase Auth (auth.users table)
            auth_response = await self.supabase.sign_up(
                email=user_data.email,
                password=user_data.password,
                user_metadata={
                    "username": user_data.username,
                    "first_name": user_data.first_name,
                    "last_name": user_data.last_name,
                    "full_name": user_data.full_name,
                    "birthdate": user_data.birthdate.isoformat(),
                    "role": user_data.role
                }
            )
            
            if not auth_response["success"]:
                return {"success": False, "error": auth_response["error"]}
            
            # Handle Supabase response structure
            response_data = auth_response["data"]
            logger.info(f"Supabase response data: {response_data}")
            
            # Supabase may return user directly or nested
            auth_user = response_data.get("user") or response_data
            
            if not auth_user or not auth_user.get("id"):
                logger.error(f"No user ID in Supabase response: {response_data}")
                return {"success": False, "error": "User creation failed - no user ID returned"}
            
            # Create user profile in public.users table (match actual schema)
            profile_data = {
                "id": auth_user["id"],  # Use same UUID from auth.users
                "email": user_data.email,
                "username": user_data.username,
                "full_name": user_data.full_name,
                "birthdate": user_data.birthdate.isoformat(),
                "role": user_data.role,
                "is_verified": False
            }
            
            profile_response = await self.supabase.insert_user_profile(profile_data)
            
            if not profile_response["success"]:
                logger.warning(f"Profile creation failed: {profile_response['error']}")
            
            return {
                "success": True,
                "user": auth_user,
                "session": auth_response["data"].get("session"),
                "profile": profile_data
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
    
    @staticmethod
    async def get_user(access_token: str) -> Optional[Dict[str, Any]]:
        """Get current user from token"""
        try:
            supabase_service = SupabaseService()
            user_response = await supabase_service.get_user(access_token)
            
            if not user_response["success"]:
                return None
            
            user = user_response["data"]
            
            # Get profile from public.users table
            profile_response = await supabase_service.get_user_profile(user["id"])
            
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
    
    async def mark_user_verified(self, email: str) -> Dict[str, Any]:
        """Mark user as verified after OTP verification"""
        try:
            response = await self.supabase.update_user_profile(
                {"is_verified": True},
                {"email": email}
            )
            return response
        except Exception as e:
            logger.error(f"Mark user verified error: {str(e)}")
            return {"success": False, "error": str(e)}
