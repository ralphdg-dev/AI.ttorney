"""
Account Status Middleware

Middleware to check if users are suspended or banned before allowing access to protected routes.

Features:
- Automatic suspension expiry checking
- Clear error messages for suspended/banned users
- Fail-open for high availability
- Comprehensive logging

Author: AI.ttorney Team
Date: 2025-10-22
"""

from fastapi import HTTPException, Depends, status
from typing import Dict, Any
import logging
from middleware.auth import get_current_user
from services.violation_tracking_service import get_violation_tracking_service

logger = logging.getLogger(__name__)


async def check_account_status(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Dependency to check if user's account is active (not suspended/banned).
    
    This middleware should be used on routes where suspended/banned users should be blocked.
    
    Usage:
        @router.post("/some-protected-route")
        async def protected_route(
            current_user: Dict[str, Any] = Depends(check_account_status)
        ):
            # User is guaranteed to be active here
            ...
    
    Args:
        current_user: Current authenticated user from get_current_user dependency
    
    Returns:
        Dict containing user information (same as get_current_user)
    
    Raises:
        HTTPException: 403 if user is suspended or banned
    """
    try:
        user_id = current_user["user"]["id"]
        
        # Check user status
        violation_service = get_violation_tracking_service()
        user_status = await violation_service.check_user_status(user_id)
        
        if not user_status["is_allowed"]:
            logger.warning(f"🚫 Blocked access for {user_status['account_status']} user {user_id[:8]}...")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=user_status["reason"]
            )
        
        return current_user
        
    except HTTPException:
        raise
    except Exception as e:
        # Fail-open: if status check fails, allow access
        logger.error(f"⚠️  Account status check failed: {str(e)} - allowing access")
        return current_user


async def check_account_status_optional(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> tuple[Dict[str, Any], bool]:
    """
    Optional account status check that doesn't block access but returns status.
    
    Useful for routes that want to show warnings but not block access.
    
    Usage:
        @router.get("/some-route")
        async def some_route(
            user_and_status: tuple = Depends(check_account_status_optional)
        ):
            current_user, is_active = user_and_status
            if not is_active:
                # Show warning but allow access
                ...
    
    Args:
        current_user: Current authenticated user from get_current_user dependency
    
    Returns:
        Tuple of (user_dict, is_active_bool)
    """
    try:
        user_id = current_user["user"]["id"]
        
        # Check user status
        violation_service = get_violation_tracking_service()
        user_status = await violation_service.check_user_status(user_id)
        
        return (current_user, user_status["is_allowed"])
        
    except Exception as e:
        # Fail-open: if status check fails, assume active
        logger.error(f"⚠️  Account status check failed: {str(e)} - assuming active")
        return (current_user, True)
