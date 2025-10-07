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
                "role": "guest",  # Always start as guest until verified
                "is_verified": False
            }
            
            profile_response = await self.supabase.insert_user_profile(profile_data)
            
            if not profile_response["success"]:
                logger.error(f"Profile creation failed: {profile_response['error']}")
                # TODO: Consider rolling back auth.users creation here
                return {"success": False, "error": f"Failed to create user profile: {profile_response['error']}"}
            
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
        """Sign in user with verification check and RBAC"""
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
            
            if not profile_response["success"] or not profile_response["data"]:
                return {"success": False, "error": "User profile not found"}
            
            profile = profile_response["data"]
            
            # Check user verification and role status
            user_role = profile.get("role", "guest")
            is_verified = profile.get("is_verified", False)
            
            # Debug logging
            logger.info(f"Login attempt - Role: {user_role}, Verified: {is_verified}, Email: {credentials.email}")
            
            # Case 1: Unverified guest with account - send OTP and route to verification
            if user_role == "guest" and not is_verified:
                return {
                    "success": False,
                    "error": "account_not_verified",
                    "message": "Your account is not verified. Please check your email for the verification code.",
                    "requires_verification": True,
                    "email": credentials.email
                }
            
            # Case 2: Verified guest - route to role selection
            if user_role == "guest" and is_verified:
                redirect_path = "/role-selection"
            # Case 3: Verified registered_user - route to user pages
            elif user_role == "registered_user":
                redirect_path = "/home"
            # Case 4: Verified lawyer - route to lawyer dashboard (remove is_verified check for now)
            elif user_role == "verified_lawyer":
                redirect_path = "/lawyer"
            else:
                # Fallback for other roles (admin, superadmin, etc.)
                redirect_path = self._get_redirect_path_for_role(user_role)
            
            logger.info(f"Redirect path determined: {redirect_path}")
            
            return {
                "success": True,
                "user": user,
                "session": session,
                # Surface access token even if "session" is null in REST response
                "access_token": auth_response["data"].get("access_token"),
                "profile": profile,
                "redirect_path": redirect_path
            }
            
        except Exception as e:
            logger.error(f"Sign in error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _get_redirect_path_for_role(self, role: str) -> str:
        """Get redirect path based on user role"""
        role_redirects = {
            "registered_user": "/home",
            "verified_lawyer": "/lawyer", 
            "admin": "/admin",
            "superadmin": "/admin",
            "guest": "/role-selection"  # Verified guests go to role selection
        }
        return role_redirects.get(role, "/home")
    
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
        """Mark user as verified - role remains guest until role selection"""
        try:
            response = await self.supabase.update_user_profile(
                {
                    "is_verified": True
                    # Keep role as guest until user selects role
                },
                {"email": email}
            )
            return response
        except Exception as e:
            logger.error(f"Mark user verified error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def update_user_role(self, email: str, role_selection: str) -> Dict[str, Any]:
        """Update user role based on their selection after verification"""
        try:
            # First check if user is verified
            profile_response = await self.supabase.get_user_profile_by_email(email)
            if not profile_response["success"] or not profile_response["data"]:
                return {"success": False, "error": "User profile not found"}
            
            profile = profile_response["data"]
            if not profile.get("is_verified", False):
                return {"success": False, "error": "User must be verified before selecting a role"}
            
            # Determine final role based on selection
            final_role = "registered_user"  # Both seeker and lawyer become registered_user
            # Note: Lawyers will be upgraded to verified_lawyer after admin verification
            
            response = await self.supabase.update_user_profile(
                {"role": final_role},
                {"email": email}
            )
            return response
        except Exception as e:
            logger.error(f"Update user role error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def check_email_exists(self, email: str) -> Dict[str, Any]:
        """Check if email already exists in the system"""
        try:
            response = await self.supabase.check_user_exists("email", email)
            return response
        except Exception as e:
            logger.error(f"Check email exists error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def check_username_exists(self, username: str) -> Dict[str, Any]:
        """Check if username already exists in the system"""
        try:
            response = await self.supabase.check_user_exists("username", username)
            return response
        except Exception as e:
            logger.error(f"Check username exists error: {str(e)}")
            return {"success": False, "error": str(e)}
