from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth.service import AuthService
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict[str, Any]]:
    """Get current authenticated user"""
    try:
        token = credentials.credentials
        user_data = await AuthService.get_user(token)
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_data
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
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
    
    return current_user

async def require_role(required_role: str):
    """Dependency to require specific user role"""
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_active_user)):
        profile = current_user.get("profile", {})
        user_role = profile.get("role")
        
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
