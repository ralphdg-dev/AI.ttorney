from services.supabase_service import SupabaseService
from auth.models import UserSignUp, UserSignIn, UserResponse
from typing import Optional, Dict, Any
import logging
import hashlib
import time

logger = logging.getLogger(__name__)

                                                         
_auth_cache = {}                                        
AUTH_CACHE_DURATION = 30                                  

def clear_auth_cache(access_token: str = None):
    """Clear authentication cache for a specific token or all tokens"""
    global _auth_cache
    if access_token:
        token_hash = hashlib.sha256(access_token.encode()).hexdigest()[:16]
        if token_hash in _auth_cache:
            del _auth_cache[token_hash]
            logger.debug(f"Auth cache cleared for token {token_hash}")
    else:
        _auth_cache.clear()
        logger.debug("All auth cache cleared")

class AuthService:
    def __init__(self):
        self.supabase = SupabaseService()
    
    async def sign_up(self, user_data: UserSignUp) -> Dict[str, Any]:
        """Register a new user in both auth.users and public.users tables"""
        try:
                                                                     
            check_result = await self.supabase.check_user_exists("email", user_data.email)
            if check_result.get("success") and check_result.get("found_in_auth") and not check_result.get("found_in_public"):
                                                         
                logger.warning(f"Found orphaned auth user for email {user_data.email}, cleaning up...")
                auth_users = check_result.get("data", {}).get("auth", [])
                if auth_users:
                    orphaned_user_id = auth_users[0].get("id")
                    try:
                        await self.supabase.delete_auth_user(orphaned_user_id)
                        logger.info(f"Successfully cleaned up orphaned auth user: {orphaned_user_id}")
                    except Exception as cleanup_error:
                        logger.error(f"Failed to cleanup orphaned auth user: {cleanup_error}")
            
                                                                     
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
            
                                                
            response_data = auth_response["data"]
            logger.info(f"Supabase response data: {response_data}")
            
                                                         
            auth_user = response_data.get("user") or response_data
            
            if not auth_user or not auth_user.get("id"):
                logger.error(f"No user ID in Supabase response: {response_data}")
                return {"success": False, "error": "User creation failed - no user ID returned"}
            
                                                                        
                                                                                            
                                                                  
            import asyncio
            await asyncio.sleep(0.5)                                
            
                                                     
            existing_profile = await self.supabase.get_user_profile(auth_user["id"])
            
            if existing_profile["success"] and existing_profile.get("data"):
                                                                                   
                logger.info(f" Profile created by trigger for user {auth_user['id']}, updating with complete data")
                profile_data = {
                    "username": user_data.username,
                    "full_name": user_data.full_name,
                    "birthdate": user_data.birthdate.isoformat(),
                    "role": "guest",                                        
                    "is_verified": False,
                    "auth_provider": "email",
                    "onboard": False,                                           
                }
                profile_response = await self.supabase.update_user_profile(
                    profile_data,
                    {"id": auth_user["id"]}
                )
            else:
                                                                                        
                logger.warning(f" Trigger did not create profile for user {auth_user['id']}, creating manually")
                profile_data = {
                    "id": auth_user["id"],                                 
                    "email": user_data.email,
                    "username": user_data.username,
                    "full_name": user_data.full_name,
                    "birthdate": user_data.birthdate.isoformat(),
                    "role": "guest",                                        
                    "is_verified": False,
                    "auth_provider": "email",
                    "onboard": False,                                           
                }
                profile_response = await self.supabase.insert_user_profile(profile_data)
            
            if not profile_response["success"]:
                logger.error(f"Profile creation/update failed: {profile_response['error']}")
                
                                                                                   
                try:
                    logger.warning(f"Rolling back auth user creation for ID: {auth_user['id']}")
                    await self.supabase.delete_auth_user(auth_user["id"])
                    logger.info(f"Successfully rolled back auth user: {auth_user['id']}")
                except Exception as rollback_error:
                    logger.error(f"Failed to rollback auth user: {rollback_error}")
                
                return {"success": False, "error": f"Failed to create user profile: {profile_response['error']}"}
            
                                        
            final_profile = await self.supabase.get_user_profile(auth_user["id"])
            
            return {
                "success": True,
                "user": auth_user,
                "session": auth_response["data"].get("session"),
                "profile": final_profile.get("data") if final_profile["success"] else None
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
            
                                               
            profile_response = await self.supabase.get_user_profile(user["id"])
            
            if not profile_response["success"] or not profile_response["data"]:
                return {"success": False, "error": "User profile not found"}
            
            profile = profile_response["data"]
            
                                                     
            user_role = profile.get("role", "guest")
            is_verified = profile.get("is_verified", False)
            
                           
            logger.info(f" Login attempt - Role: {user_role}, Verified: {is_verified}, Email: {credentials.email}")
            logger.info(f" Full profile data: {profile}")
            
                                                                                        
            if user_role == "guest" and not is_verified:
                return {
                    "success": False,
                    "error": "account_not_verified",
                    "message": "Your account is not verified. Please check your email for the verification code.",
                    "requires_verification": True,
                    "email": credentials.email
                }
            
                                                              
            if user_role == "guest" and is_verified:
                redirect_path = "/role-selection"
                                                                    
            elif user_role == "registered_user":
                redirect_path = "/home"
                                                                                                    
            elif user_role == "verified_lawyer":
                redirect_path = "/lawyer"
            else:
                                                                    
                redirect_path = self._get_redirect_path_for_role(user_role)
            
            logger.info(f"Redirect path determined: {redirect_path}")
            
            return {
                "success": True,
                "user": user,
                "session": session,
                                                                                 
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
            "guest": "/role-selection"                                        
        }
        return role_redirects.get(role, "/home")
    
    async def sign_out(self, access_token: str) -> Dict[str, Any]:
        """Sign out user"""
        try:
            response = await self.supabase.sign_out(access_token)
                                             
            clear_auth_cache(access_token)
            return response
        except Exception as e:
            logger.error(f"Sign out error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    async def get_user(access_token: str) -> Optional[Dict[str, Any]]:
        """Get current user from token with caching"""
        try:
                                              
            token_hash = hashlib.sha256(access_token.encode()).hexdigest()[:16]
            current_time = time.time()
            
                               
            if token_hash in _auth_cache:
                user_data, timestamp = _auth_cache[token_hash]
                age = current_time - timestamp
                if age < AUTH_CACHE_DURATION:
                    if __debug__:
                        logger.info(f" USING CACHED AUTH for user {user_data.get('user', {}).get('id', 'unknown')[:8]}... (age: {age:.1f}s)")
                    return user_data
            
                                 
            supabase_service = SupabaseService()
            user_response = await supabase_service.get_user(access_token)
            
            if not user_response["success"]:
                return None
            
            user = user_response["data"]
            
                                                 
            profile_response = await supabase_service.get_user_profile(user["id"])
            
            user_data = {
                "user": user,
                "profile": profile_response["data"] if profile_response["success"] else None
            }
            
                              
            _auth_cache[token_hash] = (user_data, current_time)
            if __debug__:
                logger.info(f" CACHED AUTH for user {user.get('id', 'unknown')[:8]}... (30s duration)")
            
            return user_data
            
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
        """Mark user as verified and confirm email in Supabase Auth"""
        try:
            logger.info(f" Marking user as verified: {email}")
            
                                                        
            profile_response = await self.supabase.get_user_profile_by_email(email)
            if not profile_response["success"] or not profile_response["data"]:
                return {"success": False, "error": "User profile not found"}
            
            current_profile = profile_response["data"]
            user_id = current_profile.get("id")
            logger.info(f" Current profile before update: role={current_profile.get('role')}, is_verified={current_profile.get('is_verified')}")
            
                                                             
            profile_update_response = await self.supabase.update_user_profile(
                {
                    "is_verified": True
                                                                
                },
                {"email": email}
            )
            
            if not profile_update_response["success"]:
                return profile_update_response
            
                                                                                         
            if user_id:
                auth_confirm_response = await self.supabase.confirm_user_email(user_id)
                if not auth_confirm_response["success"]:
                    logger.warning(f"Failed to confirm email in Supabase Auth: {auth_confirm_response['error']}")
                                                                              
                else:
                    logger.info(f" Email confirmed in Supabase Auth for user: {user_id}")
            
            logger.info(f" Profile update response: {profile_update_response}")
            
                                      
            verify_response = await self.supabase.get_user_profile_by_email(email)
            if verify_response["success"] and verify_response["data"]:
                updated_profile = verify_response["data"]
                logger.info(f" Profile after update: role={updated_profile.get('role')}, is_verified={updated_profile.get('is_verified')}")
            
            return profile_update_response
        except Exception as e:
            logger.error(f"Mark user verified error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def update_user_role(self, email: str, role_selection: str) -> Dict[str, Any]:
        """Update user role based on their selection after verification"""
        try:
                                             
            profile_response = await self.supabase.get_user_profile_by_email(email)
            if not profile_response["success"] or not profile_response["data"]:
                return {"success": False, "error": "User profile not found"}
            
            profile = profile_response["data"]
            if not profile.get("is_verified", False):
                return {"success": False, "error": "User must be verified before selecting a role"}
            
                                                     
            final_role = "registered_user"                                                 
                                                                                        
            
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
