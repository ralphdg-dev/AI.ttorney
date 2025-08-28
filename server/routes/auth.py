from fastapi import APIRouter, HTTPException, Depends, status
from auth.models import UserSignUp, UserSignIn, UserResponse, PasswordReset, TokenResponse
from auth.service import AuthService
from middleware.auth import get_current_user, get_current_active_user
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])
auth_service = AuthService()

@router.post("/signup", response_model=Dict[str, Any])
async def sign_up(user_data: UserSignUp):
    """Register a new user"""
    result = await auth_service.sign_up(user_data)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return {
        "message": "User created successfully",
        "user": result["user"],
        "session": result["session"]
    }

@router.post("/signin", response_model=Dict[str, Any])
async def sign_in(credentials: UserSignIn):
    """Sign in user"""
    result = await auth_service.sign_in(credentials)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result["error"]
        )
    
    return {
        "message": "Sign in successful",
        "user": result["user"],
        "session": result["session"],
        "profile": result["profile"]
    }

@router.post("/signout")
async def sign_out():
    """Sign out user"""
    # Extract token from request header
    from fastapi import Request
    token = None  # TODO: Extract from Authorization header
    result = await auth_service.sign_out(token or "")
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return {"message": "Sign out successful"}

@router.get("/me", response_model=Dict[str, Any])
async def get_me(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    """Get current user profile"""
    return {
        "user": current_user["user"],
        "profile": current_user["profile"]
    }

@router.post("/reset-password")
async def reset_password(reset_data: PasswordReset):
    """Send password reset email"""
    result = await auth_service.reset_password(reset_data.email)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return {"message": result["message"]}

@router.get("/verify-token")
async def verify_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Verify if token is valid"""
    return {
        "valid": True,
        "user": current_user["user"],
        "profile": current_user["profile"]
    }
