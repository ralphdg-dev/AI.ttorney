from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any
from middleware.auth import get_current_user
from services.supabase_service import SupabaseService
from services.otp_service import OTPService
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["user_profile"])

class UserProfileResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: str
    birthdate: Optional[str] = None
    profile_photo: Optional[str] = None
    role: str
    is_verified: bool
    created_at: str
    updated_at: str

class UpdateUserProfileRequest(BaseModel):
    full_name: str
    email: EmailStr
    username: str
    birthdate: Optional[str] = None
    profile_photo: Optional[str] = None
    
    @validator('full_name')
    def validate_full_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Full name is required')
        return v.strip()
    
    @validator('username')
    def validate_username(cls, v):
        if not v or not v.strip():
            raise ValueError('Username is required')
        if len(v.strip()) < 3:
            raise ValueError('Username must be at least 3 characters long')
        return v.strip()
    
    @validator('birthdate')
    def validate_birthdate(cls, v):
        if v:
            try:
                                      
                datetime.fromisoformat(v.replace('Z', '+00:00'))
                return v
            except ValueError:
                raise ValueError('Invalid date format. Use YYYY-MM-DD')
        return v

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 6:
            raise ValueError('New password must be at least 6 characters long')
        return v

class UpdateEmailRequest(BaseModel):
    new_email: EmailStr
    password: str

class SendEmailChangeOTPRequest(BaseModel):
    new_email: EmailStr

class VerifyEmailChangeRequest(BaseModel):
    new_email: EmailStr
    otp_code: str

@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user's profile information"""
    try:
        user_data = current_user.get("user")
        profile_data = current_user.get("profile")
        
        if not user_data or not profile_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        return UserProfileResponse(
            id=profile_data["id"],
            email=profile_data["email"],
            username=profile_data["username"],
            full_name=profile_data["full_name"],
            birthdate=profile_data.get("birthdate"),
            profile_photo=profile_data.get("profile_photo"),
            role=profile_data["role"],
            is_verified=profile_data["is_verified"],
            created_at=profile_data["created_at"],
            updated_at=profile_data["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user profile error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user profile"
        )

@router.put("/profile")
async def update_user_profile(
    profile_data: UpdateUserProfileRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update user's profile information"""
    try:
        user_data = current_user.get("user")
        profile = current_user.get("profile")
        
        if not user_data or not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        user_id = user_data["id"]
        supabase_service = SupabaseService()
        
                                                                                           
        if profile_data.email != profile["email"]:
            email_check = await supabase_service.check_user_exists_excluding_current("email", profile_data.email, user_id)
            if email_check["success"] and email_check.get("exists"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email address is already in use"
                )
        
                                                                                              
        if profile_data.username != profile["username"]:
            username_check = await supabase_service.check_user_exists_excluding_current("username", profile_data.username, user_id)
            if username_check["success"] and username_check.get("exists"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username is already taken"
                )
        
                             
        update_data = {
            "full_name": profile_data.full_name,
            "email": profile_data.email,
            "username": profile_data.username,
            "updated_at": datetime.utcnow().isoformat()
        }
        
                                         
        if profile_data.birthdate is not None:
            update_data["birthdate"] = profile_data.birthdate
        
        if profile_data.profile_photo is not None:
            update_data["profile_photo"] = profile_data.profile_photo
        
                                    
        result = await supabase_service.update_user_profile(
            update_data,
            {"id": user_id}
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update profile: {result['error']}"
            )
        
                                                                  
        if profile_data.email != profile["email"]:
            auth_result = await supabase_service.update_user_email(user_id, profile_data.email)
            if not auth_result["success"]:
                logger.warning(f"Failed to update email in auth: {auth_result['error']}")
                                                                        
                                                                              
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "data": update_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update user profile error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )

@router.put("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Change user's password"""
    try:
        user_data = current_user.get("user")
        profile = current_user.get("profile")
        
        if not user_data or not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        supabase_service = SupabaseService()
        
                                                          
        verify_result = await supabase_service.sign_in(
            email=profile["email"],
            password=password_data.current_password
        )
        
        if not verify_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
                                          
        password_result = await supabase_service.update_user_password(
            user_data["id"],
            password_data.new_password
        )
        
        if not password_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update password: {password_result['error']}"
            )
        
        return {
            "success": True,
            "message": "Password updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change password error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )

@router.put("/update-email")
async def update_email(
    email_data: UpdateEmailRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update user's email address with password verification"""
    try:
        user_data = current_user.get("user")
        profile = current_user.get("profile")
        
        if not user_data or not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        supabase_service = SupabaseService()
        
                         
        verify_result = await supabase_service.sign_in(
            email=profile["email"],
            password=email_data.password
        )
        
        if not verify_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is incorrect"
            )
        
                                           
        email_check = await supabase_service.check_user_exists("email", email_data.new_email)
        if email_check["success"] and email_check.get("exists"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already in use"
            )
        
                                               
        auth_result = await supabase_service.update_user_email(user_data["id"], email_data.new_email)
        if not auth_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update email: {auth_result['error']}"
            )
        
                                       
        profile_result = await supabase_service.update_user_profile(
            {"email": email_data.new_email, "updated_at": datetime.utcnow().isoformat()},
            {"id": user_data["id"]}
        )
        
        if not profile_result["success"]:
            logger.warning(f"Failed to update email in profile: {profile_result['error']}")
        
        return {
            "success": True,
            "message": "Email updated successfully. Please check your new email for verification."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update email error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update email"
        )

@router.delete("/profile")
async def delete_user_account(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete user account (soft delete by archiving)"""
    try:
        user_data = current_user.get("user")
        profile = current_user.get("profile")
        
        if not user_data or not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        supabase_service = SupabaseService()
        
                                           
        result = await supabase_service.update_user_profile(
            {
                "archived": True,
                "updated_at": datetime.utcnow().isoformat()
            },
            {"id": user_data["id"]}
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to delete account: {result['error']}"
            )
        
        return {
            "success": True,
            "message": "Account deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete account error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )

@router.get("/check-username")
async def check_username_availability(username: str):
    """Check if username is available"""
    try:
        if len(username.strip()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be at least 3 characters long"
            )
        
        supabase_service = SupabaseService()
        result = await supabase_service.check_user_exists("username", username.strip())
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to check username availability"
            )
        
        return {
            "exists": result.get("exists", False),
            "available": not result.get("exists", False),
            "username": username.strip()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check username availability error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check username availability"
        )

@router.get("/check-email")
async def check_email_availability(email: str):
    """Check if email is available"""
    try:
                               
        import re
        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, email.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        supabase_service = SupabaseService()
        result = await supabase_service.check_user_exists("email", email.strip())
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to check email availability"
            )
        
        return {
            "exists": result.get("exists", False),
            "available": not result.get("exists", False),
            "email": email.strip()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check email availability error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check email availability"
        )

@router.post("/send-email-change-otp")
async def send_email_change_otp(
    request: SendEmailChangeOTPRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Send OTP to new email address for verification"""
    try:
        user_data = current_user.get("user")
        profile = current_user.get("profile")
        
        if not user_data or not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
                                                            
        if request.new_email == profile["email"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New email must be different from current email"
            )
        
                                           
        supabase_service = SupabaseService()
        email_check = await supabase_service.check_user_exists("email", request.new_email)
        if email_check["success"] and email_check.get("exists"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already in use"
            )
        
                               
        otp_service = OTPService()
        result = await otp_service.send_email_change_otp(
            request.new_email, 
            profile.get("full_name", "User")
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return {
            "success": True,
            "message": result["message"],
            "expires_in_minutes": result.get("expires_in_minutes", 2)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send email change OTP error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email change OTP"
        )

@router.post("/verify-email-change")
async def verify_email_change(
    request: VerifyEmailChangeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Verify OTP and update email address"""
    try:
        user_data = current_user.get("user")
        profile = current_user.get("profile")
        
        if not user_data or not profile:
            logger.error(f"User not found in verify_email_change. current_user: {current_user}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"Verifying email change for user {user_data.get('id')}, new email: {request.new_email}")
        
                    
        otp_service = OTPService()
        otp_result = await otp_service.verify_otp(
            request.new_email,
            request.otp_code,
            "email_change"
        )
        
        if not otp_result["success"]:
            logger.warning(f"OTP verification failed: {otp_result.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=otp_result.get("error", "Invalid OTP code")
            )
        
        logger.info("OTP verified successfully, updating email...")
        
                                               
        supabase_service = SupabaseService()
        
                                       
        auth_result = await supabase_service.update_user_email(user_data["id"], request.new_email)
        if not auth_result["success"]:
            logger.error(f"Failed to update email in auth: {auth_result.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update email: {auth_result.get('error', 'Unknown error')}"
            )
        
                                       
        profile_result = await supabase_service.update_user_profile(
            {"email": request.new_email, "updated_at": datetime.utcnow().isoformat()},
            {"id": user_data["id"]}
        )
        
        if not profile_result["success"]:
            logger.warning(f"Failed to update email in profile: {profile_result.get('error')}")
        
        logger.info(f"Email successfully updated to {request.new_email}")
        
        return {
            "success": True,
            "message": "Email address updated successfully",
            "new_email": request.new_email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify email change error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify email change: {str(e)}"
        )
