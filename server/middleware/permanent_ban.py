from fastapi import HTTPException, Depends, status, Request
from typing import Dict, Any
import logging
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)


async def block_permanently_banned_users(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Strict dependency to block ALL access from permanently banned users.
    
    This middleware should be used on ALL authenticated routes to ensure
    banned users cannot access any part of the application.
    
    Usage:
        @router.post("/any-authenticated-route")
        async def protected_route(
            current_user: Dict[str, Any] = Depends(block_permanently_banned_users)
        ):
            # User is guaranteed to NOT be banned here
            ...
    
    Args:
        current_user: Current authenticated user from get_current_user dependency
    
    Returns:
        Dict containing user information (same as get_current_user)
    
    Raises:
        HTTPException: 403 with PERMANENTLY_BANNED error if user is banned
    """
    try:
                                               
        profile = current_user.get("profile")
        if not profile:
            logger.error("🚫 User profile missing in permanent ban check")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User profile not found"
            )
        
        account_status = profile.get("account_status")
        user_id = profile.get("id", "unknown")
        
                                               
        if account_status == "banned":
            logger.warning(f"🚫 PERMANENTLY_BANNED user blocked: {user_id[:8]}...")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "PERMANENTLY_BANNED", 
                    "message": "This account has been permanently banned."
                }
            )
        
        logger.debug(f" User {user_id[:8]}... passed permanent ban check (status: {account_status})")
        return current_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🚫 Permanent ban check failed: {str(e)}", exc_info=True)
                                                                                      
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "PERMANENTLY_BANNED",
                "message": "Account status verification failed. Access blocked for security."
            }
        )


async def block_permanently_banned_users_optional(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> tuple[Dict[str, Any], bool]:
    """
    Optional permanent ban check that doesn't block but returns status.
    
    Useful for routes that need to know ban status without blocking.
    
    Args:
        current_user: Current authenticated user from get_current_user dependency
    
    Returns:
        Tuple of (user_dict, is_not_banned_bool)
    """
    try:
        profile = current_user.get("profile")
        if not profile:
            return (current_user, False)
        
        account_status = profile.get("account_status")
        is_not_banned = account_status != "banned"
        
        return (current_user, is_not_banned)
        
    except Exception as e:
        logger.error(f"  Optional permanent ban check failed: {str(e)}")
        return (current_user, False)
