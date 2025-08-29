from fastapi import APIRouter, HTTPException, Depends, status
from auth.models import UserSignUp, UserSignIn, UserResponse, PasswordReset, TokenResponse, SendOTPRequest, VerifyOTPRequest, OTPResponse
from auth.service import AuthService
from services.otp_service import OTPService
from middleware.auth import get_current_user, get_current_active_user
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])
auth_service = AuthService()
otp_service = OTPService()

@router.post("/signup", response_model=Dict[str, Any])
async def sign_up(user_data: UserSignUp):
    """Register a new user in both auth.users and public.users"""
    result = await auth_service.sign_up(user_data)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return {
        "message": "User registered successfully",
        "user": result["user"],
        "session": result["session"],
        "profile": result["profile"]
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

# OTP Endpoints
@router.post("/send-otp", response_model=OTPResponse)
async def send_otp(request: SendOTPRequest):
    """Send OTP for email verification or password reset"""
    try:
        if request.otp_type == "email_verification":
            result = await otp_service.send_verification_otp(request.email, "User")
        elif request.otp_type == "password_reset":
            result = await otp_service.send_password_reset_otp(request.email, "User")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP type"
            )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return OTPResponse(
            success=True,
            message=result["message"],
            expires_in_minutes=result.get("expires_in_minutes")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send OTP error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )

@router.post("/verify-otp", response_model=OTPResponse)
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP code"""
    try:
        result = await otp_service.verify_otp(
            request.email,
            request.otp_code,
            request.otp_type
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        # If this is email verification, update user's verified status
        if request.otp_type == "email_verification":
            # Update user profile to mark as verified
            await auth_service.mark_user_verified(request.email)
        
        return OTPResponse(
            success=True,
            message=result["message"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify OTP error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify OTP"
        )
