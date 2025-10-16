from fastapi import APIRouter, HTTPException, Depends, status, Request
from auth.models import UserSignUp, UserSignIn, OTPRequest, VerifyOTPRequest, OTPResponse, PasswordReset, SendOTPRequest
from auth.service import AuthService
from services.otp_service import OTPService
from middleware.auth import get_current_user
from pydantic import BaseModel
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
    """Sign in user with verification check and RBAC"""
    result = await auth_service.sign_in(credentials)
    
    if not result["success"]:
        # Handle unverified account case
        if result.get("error") == "account_not_verified":
            # Automatically send OTP for unverified users
            if result.get("requires_verification") and result.get("email"):
                otp_result = await otp_service.send_verification_otp(result["email"], "User")
                return {
                    "success": False,
                    "error": "account_not_verified",
                    "message": result["message"],
                    "requires_verification": True,
                    "email": result["email"],
                    "otp_sent": otp_result["success"],
                    "otp_message": otp_result.get("message", "OTP sent to your email")
                }
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result["error"]
        )
    
    return {
        "success": True,
        "message": "Sign in successful",
        "user": result["user"],
        "session": result["session"],
        "access_token": result.get("access_token"),
        "profile": result["profile"],
        "redirect_path": result.get("redirect_path", "/home")
    }

@router.post("/signout")
async def sign_out(request: Request):
    """Sign out user"""
    from auth.service import clear_auth_cache
    from utils.auth_utils import extract_bearer_token
    
    # Extract token from request header
    token = extract_bearer_token(request)
    
    # Clear auth cache for this token
    if token:
        clear_auth_cache(token)
    
    result = await auth_service.sign_out(token)
    
    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result["error"]
        )
    
    return {"message": "Sign out successful"}

@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return {"success": True, "user": current_user}

class ValidationRequest(BaseModel):
    value: str

@router.post("/check-email")
async def check_email_exists(request: ValidationRequest):
    """Check if email already exists"""
    result = await auth_service.check_email_exists(request.value)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"exists": result["exists"]}

@router.post("/check-username") 
async def check_username_exists(request: ValidationRequest):
    """Check if username already exists"""
    result = await auth_service.check_username_exists(request.value)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"exists": result["exists"]}

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

class RoleSelectionRequest(BaseModel):
    email: str
    selected_role: str  # "legal_seeker" or "lawyer"

@router.post("/select-role")
async def select_role(request: RoleSelectionRequest):
    """Update user role based on their selection after verification"""
    try:
        result = await auth_service.update_user_role(request.email, request.selected_role)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        # Determine redirect path based on role
        redirect_path = "/home" if request.selected_role == "legal_seeker" else "/onboarding/lawyer"
        
        return {
            "success": True,
            "message": "Role updated successfully",
            "redirect_path": redirect_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Role selection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update role"
        )
