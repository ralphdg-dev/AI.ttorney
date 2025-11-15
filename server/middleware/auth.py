from fastapi import HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth.service import AuthService
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)  # Don't auto-error so we can log the issue

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict[str, Any]]:
    """Get current authenticated user"""
    try:
        if not credentials:
            logger.error("🔐 No credentials provided - Authorization header missing")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header missing",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = credentials.credentials
        logger.info(f"🔐 Authenticating user with token: {token[:20]}...")
        user_data = await AuthService.get_user(token)
        
        logger.info(f"🔐 User data received: {user_data}")
        
        if not user_data:
            logger.warning("🔐 No user data returned from AuthService")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔐 Authentication error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_active_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Get current active user"""
    profile = current_user.get("profile")
    if not profile:
        raise HTTPException(status_code=400, detail="User profile not found")
    
    account_status = profile.get("account_status")
    
    # Check for permanent ban - this must block ALL access
    if account_status == "banned":
        logger.warning(f"🚫 PERMANENTLY_BANNED user attempted access: {profile.get('id', 'unknown')[:8]}...")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "PERMANENTLY_BANNED",
                "message": "This account has been permanently banned."
            }
        )
    
    # Check for deactivated status - allow auth but return special status
    if account_status == "deactivated":
        logger.info(f"⏸️ DEACTIVATED user accessed: {profile.get('id', 'unknown')[:8]}...")
        # Add status to user data for frontend handling
        current_user["deactivated"] = True
        return current_user
    
    return current_user

def require_role(required_role: str):
    """Dependency to require specific user role"""
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_active_user)):
        profile = current_user.get("profile", {})
        user_role = profile.get("role")
        
        # Block deactivated users from accessing protected routes
        if current_user.get("deactivated") or profile.get("account_status") == "deactivated":
            logger.warning(f"⏸️ DEACTIVATED user attempted protected route: {profile.get('id', 'unknown')[:8]}...")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "ACCOUNT_DEACTIVATED", 
                    "message": "Account is deactivated. Please reactivate to access this feature."
                }
            )
        
        # Role hierarchy: guest < registered_user < verified_lawyer < admin < superadmin
        role_hierarchy = {
            "guest": 0,
            "registered_user": 1,
            "verified_lawyer": 2,
            "admin": 3,
            "superadmin": 4
        }
        
        user_level = role_hierarchy.get(user_role, 0)
        required_level = role_hierarchy.get(required_role, 0)
        
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role}"
            )
        
        return current_user
    
    return role_checker
