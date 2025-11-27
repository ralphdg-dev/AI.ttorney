from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from auth.models import UserSignUp, UserSignIn, OTPRequest, VerifyOTPRequest, OTPResponse, PasswordReset, SendOTPRequest
from auth.service import AuthService, clear_auth_cache
from services.otp_service import OTPService
from middleware.auth import get_current_user
from pydantic import BaseModel
from typing import Dict, Any
import logging
from supabase import create_client
import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])
auth_service = AuthService()
otp_service = OTPService()

# Rate limiter for auth endpoints
limiter = Limiter(key_func=get_remote_address)

# Rate limiting decorator for auth endpoints
def rate_limit_auth(limit: str):
    """Apply rate limiting to auth endpoints"""
    def decorator(func):
        return limiter.limit(limit)(func)
    return decorator

@router.post("/signup", response_model=Dict[str, Any])
@rate_limit_auth("10/minute")  # Increased for mobile network variability
async def sign_up(request: Request, user_data: UserSignUp):
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
@rate_limit_auth("10/minute")
async def sign_in(request: Request, credentials: UserSignIn):
    """Sign in user with verification check and RBAC"""
    result = await auth_service.sign_in(credentials)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result["error"]
        )
    
    # If user is not verified, automatically send OTP for verification
    profile = result.get("profile", {})
    is_verified = profile.get("is_verified", False)
    
    response_data = {
        "success": True,
        "message": "Sign in successful",
        "user": result["user"],
        "session": result["session"],
        "access_token": result.get("access_token"),
        "profile": result["profile"],
        "redirect_path": result.get("redirect_path", "/home")
    }
    
    # Send OTP to unverified users automatically
    if not is_verified:
        try:
            supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
            user_check = supabase.table('users').select('full_name').eq('email', credentials.email).execute()
            user_name = user_check.data[0].get('full_name', 'User') if user_check.data else 'User'
            logger.info(f"📧 Sending verification OTP for unverified user: {credentials.email}")
            
            otp_result = await otp_service.send_verification_otp(credentials.email, user_name)
            response_data["otp_sent"] = otp_result["success"]
            response_data["requires_verification"] = True
            if otp_result["success"]:
                logger.info(f"✅ Verification OTP sent to {credentials.email}")
            else:
                logger.error(f"❌ Failed to send OTP: {otp_result.get('error', 'Unknown error')}")
        except Exception as otp_error:
            logger.error(f"❌ Error sending verification OTP: {str(otp_error)}")
            response_data["otp_sent"] = False
    
    return response_data

@router.post("/signout")
async def sign_out(request: Request):
    """Sign out user"""
    from auth.service import clear_auth_cache
    from utils.auth_utils import extract_bearer_token
    
                                       
    token = extract_bearer_token(request)
    
                                     
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

@router.post("/check-email-exists")
async def check_email_exists(request: Dict[str, str] = Body(...)):
    """Check if email exists in database for password reset validation"""
    try:
        email = request.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
                                          
        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
        user_check = supabase.table('users').select('id').eq('email', email).execute()
        logger.info(f" Email existence check for: {email}")
        logger.info(f" User check result: {user_check.data}")
        
        if not user_check.data or len(user_check.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email address. Please check your email or sign up for a new account."
            )
        
        return {
            "success": True,
            "message": "Email found in database",
            "exists": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check email exists error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify email"
        )

@router.post("/forgot-password")
@rate_limit_auth("5/minute")  # Increased for mobile network variability
async def forgot_password(request: Request, body: Dict[str, str] = Body(...)):
    """Send OTP for password reset - only to registered users"""
    try:
        email = body.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
                                                             
        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
        user_check = supabase.table('users').select('id, full_name').eq('email', email).execute()
        logger.info(f" Password reset query for email: {email}")
        logger.info(f" User check result: {user_check.data}")
        
        if not user_check.data or len(user_check.data) == 0:
                                                                              
            return {
                "success": True,
                "message": "If the email exists, a reset code has been sent.",
                "expiresInMinutes": 10
            }
        
                               
        user_name = user_check.data[0].get('full_name', 'User')
        logger.info(f" Password reset OTP for email: {email}, fetched user_name: '{user_name}'")
        result = await otp_service.send_password_reset_otp(email, user_name)
        
                                                           
        return {
            "success": True,
            "message": "If the email exists, a reset code has been sent.",
            "expiresInMinutes": result.get("expires_in_minutes", 2)
        }
        
    except HTTPException:
                                                     
        return {
            "success": True,
            "message": "If the email exists, a reset code has been sent."
        }
    except Exception as e:
        logger.error(f"❌ FORGOT PASSWORD ERROR: {str(e)}")
        logger.error(f"❌ ERROR TYPE: {type(e).__name__}")
        import traceback
        logger.error(f"❌ FULL TRACEBACK:\n{traceback.format_exc()}")
        
        # Re-raise to see the actual error in Railway logs
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process password reset: {str(e)}"
        )

@router.post("/reset-password-old")
async def reset_password(reset_data: PasswordReset):
    """Send password reset email (legacy)"""
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

               
@router.post("/send-otp")
@rate_limit_auth("10/minute")  # Increased for mobile network variability
async def send_otp(http_request: Request, request: SendOTPRequest):
    """Send OTP for email verification or password reset"""
    try:
        logger.info(f"📧 OTP Request - Type: {request.otp_type}, Email: {request.email}")
        logger.info(f"📧 OTP Request user_name: '{request.user_name}'")
        
        # Validate user_name parameter for email verification
        if request.otp_type == "email_verification" and not request.user_name:
            logger.warning(f"⚠️ Missing user_name for email verification OTP: {request.email}")
            # Use a default name rather than failing
            user_name = "User"
        else:
            user_name = request.user_name or "User"
        
        logger.info(f"🔍 DEBUG: Using user_name: '{user_name}' for email: {request.email}")
        
        if request.otp_type == "email_verification":
            # For email verification, always attempt to send OTP
            logger.info(f"📤 Sending verification OTP to {request.email} with user_name: {user_name}")
            result = await otp_service.send_verification_otp(request.email, user_name)
            logger.info(f"✅ Verification OTP result: {result}")
        elif request.otp_type == "password_reset":
            # For password reset, check if user exists first
            supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
            user_check = supabase.table('users').select('id, full_name').eq('email', request.email).execute()
            logger.info(f"Password reset OTP request for email: {request.email}")
            logger.info(f"User check result: {user_check.data}")
            
            if not user_check.data or len(user_check.data) == 0:
                # Return success without sending OTP for security - plain dict
                logger.info("✅ Returning password reset response (no user found)")
                return {
                    "success": True,
                    "message": "If the email exists, a reset code has been sent.",
                    "expires_in_minutes": 10
                }
            
            # Use provided name or fall back to database name or default
            user_name = user_check.data[0].get('full_name', user_name)
            result = await otp_service.send_password_reset_otp(request.email, user_name)
            logger.info(f"🔍 DEBUG: Password reset OTP result: {result}")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP type"
            )
        
        logger.info(f"� OTP Service Result - Success: {result.get('success', False)}, Message: {result.get('message', 'N/A')}, Error: {result.get('error', 'None')}")
        logger.info(f"📊 Result type: {type(result)}, Keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
        
        if not result.get("success", False):
            logger.error(f"❌ OTP sending failed: {result.get('error', 'Unknown error')}")
            # Return a more user-friendly error message
            error_message = "Failed to send verification code. Please try again."
            if result.get('error', '') and "SMTP" in result.get('error', ''):
                error_message = "Email service temporarily unavailable. Please try again later."
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        logger.info(f"✅ OTP sent successfully to {request.email}")
        
        # Safely construct the response with defaults if fields are missing
        try:
            message = result.get("message", "Verification code sent successfully")
            expires_in_minutes = result.get("expires_in_minutes", 2)
            
            # Ensure expires_in_minutes is an integer
            if expires_in_minutes is not None:
                expires_in_minutes = int(expires_in_minutes)
            
            logger.info(f"📋 Constructing response - message: '{message}', expires_in_minutes: {expires_in_minutes} (type: {type(expires_in_minutes)})")
            
            # Return plain dict - let FastAPI handle serialization
            response_content = {
                "success": True,
                "message": str(message),
                "expires_in_minutes": int(expires_in_minutes) if expires_in_minutes is not None else 2
            }
            
            logger.info(f"✅ About to return response: {response_content}")
            logger.info(f"✅ Response type: {type(response_content)}")
            logger.info(f"✅ Response keys: {list(response_content.keys())}")
            return response_content
            
        except Exception as response_error:
            logger.error(f"❌ Error constructing OTP response: {str(response_error)}")
            logger.error(f"❌ Response construction error type: {type(response_error).__name__}")
            import traceback
            logger.error(f"❌ Response construction traceback: {traceback.format_exc()}")
            logger.error(f"❌ Result that caused error: {result}")
            
            # Fallback to a minimal valid response - plain dict
            logger.info("✅ Using fallback response")
            return {
                "success": True,
                "message": "Verification code sent successfully",
                "expires_in_minutes": 2
            }
        
    except HTTPException as http_exc:
        logger.error(f"🔴 HTTPException in send_otp: {http_exc.detail}")
        raise
    except Exception as e:
        logger.error(f"❌❌❌ CRITICAL: Unexpected error in send_otp")
        logger.error(f"❌ Error message: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        import traceback
        logger.error(f"❌ Full traceback:\n{traceback.format_exc()}")
        logger.error(f"❌ Request details - Email: {request.email}, Type: {request.otp_type}, User: {request.user_name}")
        
        # Return detailed error for debugging
        error_detail = f"Failed to process OTP request: {type(e).__name__}: {str(e)}"
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail
        )



@router.post("/verify-reset-otp")
@rate_limit_auth("10/minute")
async def verify_reset_otp(http_request: Request, request: Dict[str, str] = Body(...)):
    """Verify OTP for password reset and issue JWT token"""
    try:
        email = request.get("email")
        otp_code = request.get("otpCode")
        
        logger.info(f" DEBUG: Received OTP verification request")
        logger.info(f" DEBUG: Email: {email}")
        logger.info(f" DEBUG: OTP Code: '{otp_code}' (length: {len(otp_code) if otp_code else 0})")
        
        if not email or not otp_code:
            logger.error(f" DEBUG: Missing email or OTP - email: {email}, otp: {otp_code}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and OTP code are required"
            )
        
                                                               
        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
        user_check = supabase.table('users').select('id').eq('email', email).execute()
        logger.info(f" DEBUG: User existence check for email: {email}")
        logger.info(f" DEBUG: User check result: {user_check.data}")
        
        if not user_check.data or len(user_check.data) == 0:
            logger.warning(f" DEBUG: OTP verification attempted for non-existent user: {email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email or OTP code"
            )
        
                                       
        logger.info(f" DEBUG: Calling otp_service.verify_otp with type 'password_reset'")
        result = await otp_service.verify_otp(email, otp_code, "password_reset")
        logger.info(f" DEBUG: OTP service result: {result}")
        
        if not result["success"]:
            error_response = {
                "error": result["error"]
            }
                                                      
            if "locked_out" in result:
                error_response["lockedOut"] = result["locked_out"]
            if "retry_after" in result:
                error_response["retryAfter"] = result["retry_after"]
            if "attempts_remaining" in result:
                error_response["attemptsRemaining"] = result["attempts_remaining"]
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_response
            )
        
                                                
        import jwt
        from datetime import datetime, timedelta
        
        password_reset_token = jwt.encode(
            {
                "type": "password_reset",
                "email": email,
                "exp": datetime.utcnow() + timedelta(minutes=10)
            },
            os.getenv("JWT_SECRET", "your-secret-key"),
            algorithm="HS256"
        )
        
        return {
            "success": True,
            "message": "OTP verified",
            "passwordResetToken": password_reset_token
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify reset OTP error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify OTP"
        )

@router.post("/reset-password")
async def reset_password_with_token(request: Dict[str, str] = Body(...)):
    """Reset password using JWT token from verify-reset-otp"""
    try:
        password_reset_token = request.get("passwordResetToken")
        new_password = request.get("newPassword")
        
        logger.info(f" DEBUG: Reset password request received")
        logger.info(f" DEBUG: Token received: {password_reset_token}")
        logger.info(f" DEBUG: Token length: {len(password_reset_token) if password_reset_token else 0}")
        logger.info(f" DEBUG: New password provided: {bool(new_password)}")
        
        if not password_reset_token or not new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token and new password are required"
            )
        
                                    
        import re
        if (len(new_password) < 8 or 
            not re.search(r'[A-Z]', new_password) or 
            not re.search(r'[a-z]', new_password) or 
            not re.search(r'\d', new_password)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters and include uppercase, lowercase, and a number"
            )
        
                          
        import jwt
        from datetime import datetime
        
        try:
            decoded = jwt.decode(
                password_reset_token, 
                os.getenv("JWT_SECRET", "your-secret-key"), 
                algorithms=["HS256"]
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )
        
        if not decoded or decoded.get("type") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )
        
                                         
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database configuration missing"
            )
        
        supabase = create_client(supabase_url, supabase_key)
        
                                                       
        try:
            logger.info(f" DEBUG: Querying users table for email: {decoded['email']}")
            user_query = supabase.table('users').select('id').eq('email', decoded["email"]).execute()
            logger.info(f" DEBUG: Query result: {user_query}")
            user_data = user_query.data
            
            if not user_data or len(user_data) == 0:
                logger.error(f" DEBUG: No user found for email: {decoded['email']}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            user_id = user_data[0]['id']
            logger.info(f" DEBUG: Found user with ID: {user_id[:8]}...")
            
        except Exception as e:
            logger.error(f" Database query error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to find user"
            )

                                                                                      
                                                                                             
        try:
            login_check = supabase.auth.sign_in_with_password({
                "email": decoded["email"],
                "password": new_password,
            })
            if getattr(login_check, "user", None):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="New password must be different from your current password"
                )
        except Exception:
                                                                                             
            pass

                                              
        try:
            result = supabase.auth.admin.update_user_by_id(
                user_id,
                {"password": new_password}
            )
        except Exception as e:
            logger.error(f" Password update error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        if result.user is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        logger.info(f" Password reset successful for user: {user_id[:8]}...")
        
        return {
            "success": True,
            "message": "Password has been reset successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f" RESET PASSWORD ERROR: {str(e)}")
        logger.error(f" ERROR TYPE: {type(e).__name__}")
        import traceback
        logger.error(f" FULL TRACEBACK: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset password: {str(e)}"
        )

@router.post("/verify-otp", response_model=OTPResponse)
@rate_limit_auth("10/minute")
async def verify_otp(http_request: Request, request: VerifyOTPRequest):
    """Verify OTP code"""
    try:
        logger.info(f"🔍 Verifying OTP - Type: {request.otp_type}, Email: {request.email}")
        
        # For password reset, verify user exists first
        if request.otp_type == "password_reset":
            supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
            user_check = supabase.table('users').select('id').eq('email', request.email).execute()
            logger.info(f"User existence check for password reset OTP - email: {request.email}")
            logger.info(f"User check result: {user_check.data}")
            
            if not user_check.data or len(user_check.data) == 0:
                logger.warning(f"Password reset OTP verification attempted for non-existent user: {request.email}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid email or OTP code"
                )
        
        # For email verification, check if the user exists in Supabase
        if request.otp_type == "email_verification":
            try:
                supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
                user_check = supabase.table('users').select('id, is_verified').eq('email', request.email).execute()
                logger.info(f"User existence check for email verification - email: {request.email}")
                
                if not user_check.data or len(user_check.data) == 0:
                    logger.warning(f"Email verification attempted for non-existent user: {request.email}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="User not found. Please register first."
                    )
                
                # Check if user is already verified
                if user_check.data[0].get('is_verified'):
                    logger.info(f"User already verified: {request.email}")
                    return OTPResponse(
                        success=True,
                        message="Email already verified"
                    )
            except Exception as user_check_error:
                logger.error(f"Error checking user existence: {str(user_check_error)}")
                # Continue with verification - don't block the flow if this check fails
        
        # Verify the OTP
        result = await otp_service.verify_otp(
            request.email,
            request.otp_code,
            request.otp_type
        )
        
        if not result["success"]:
            error_detail = result["error"]
            # Include additional fields if available
            error_response = {"detail": error_detail}
            if "locked_out" in result:
                error_response["locked_out"] = result["locked_out"]
            if "retry_after" in result:
                error_response["retry_after"] = result["retry_after"]
            if "attempts_remaining" in result:
                error_response["attempts_remaining"] = result["attempts_remaining"]
                
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_response
            )
        
        # For email verification, mark the user as verified
        if request.otp_type == "email_verification":
            try:
                logger.info(f"Marking user as verified: {request.email}")
                await auth_service.mark_user_verified(request.email)
                logger.info(f"✅ User successfully verified: {request.email}")
            except Exception as verify_error:
                logger.error(f"Error marking user as verified: {str(verify_error)}")
                # Return success anyway - the client will handle auto-login
        
        return OTPResponse(
            success=True,
            message=result["message"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify OTP error: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify OTP. Please try again later."
        )

class RoleSelectionRequest(BaseModel):
    email: str
    selected_role: str                              

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

@router.post("/validate-email", response_model=Dict[str, Any])
async def validate_email(
    request: dict = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Validate user email without performing any action"""
    try:
                                         
        email = request.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        logger.info(f"Email validation request received for user: {current_user.get('user', {}).get('email', 'unknown')}")
        
                                            
        user_data = current_user.get("user", {})
        user_email = user_data.get("email")
        if not user_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User email not found"
            )
        
                                           
        if email.lower().strip() != user_email.lower().strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email does not match your account"
            )
        
        logger.info(f" Email validation successful for user: {user_email}")
        
        return {
            "success": True,
            "message": "Email is valid",
            "valid": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate email"
        )

@router.post("/validate-password", response_model=Dict[str, Any])
async def validate_password(
    request: dict = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Validate user password without performing any action"""
    try:
                                            
        password = request.get("password")
        if not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is required"
            )
        
        logger.info(f"Password validation request received for user: {current_user.get('user', {}).get('email', 'unknown')}")
        
                         
        user_data = current_user.get("user", {})
        email = user_data.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User email not found"
            )
        
                                                              
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database configuration missing"
            )
        
        supabase_client = create_client(supabase_url, supabase_key)
        
                         
        try:
            auth_result = supabase_client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if not auth_result.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid password"
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )
        
        logger.info(f" Password validation successful for user: {current_user.get('user', {}).get('email', 'unknown')}")
        
        return {
            "success": True,
            "message": "Password is valid",
            "valid": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate password"
        )

@router.patch("/deactivate", response_model=Dict[str, Any])
async def deactivate_account(
    request: dict = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Deactivate a user account"""
    try:
        logger.info(f" Deactivation request body: {request}")
        
                                         
        email = request.get("email")
        if not email:
            logger.error(" Email not found in request body")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        logger.info(f"📧 Email extracted from request: {email}")
        logger.info(f"Deactivation request received for user: {current_user.get('user', {}).get('email', 'unknown')}")
        
                                            
        user_data = current_user.get("user", {})
        user_email = user_data.get("email")
        if not user_email:
            logger.error(" User email not found in current_user")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User email not found"
            )
        
        logger.info(f"📧 User email from session: {user_email}")
        
                                                 
        if email.lower().strip() != user_email.lower().strip():
            logger.error(f" Email mismatch: request='{email}' vs user='{user_email}'")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email does not match your account"
            )
        
        logger.info(" Email validation passed")
        
        profile = current_user.get("profile")
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User profile not found"
            )
        
        user_id = profile.get("id")
        account_status = profile.get("account_status")
        
        if account_status == "deactivated":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your account is already deactivated. You can reactivate it anytime by logging in."
            )
        
                            
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database configuration missing"
            )
        
        supabase_client = create_client(supabase_url, supabase_key)
        
        result = supabase_client.table("users").update({"account_status": "deactivated"}).eq("id", user_id).execute()
        
        if result.data is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to deactivate account"
            )
        
        logger.info(f" Account deactivated successfully: {user_id[:8]}...")
        
                                                              
        clear_auth_cache()
        
        return {
            "success": True,
            "message": "Account deactivated successfully",
            "account_status": "deactivated"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deactivate account error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate account"
        )

@router.patch("/reactivate", response_model=Dict[str, Any])
async def reactivate_account(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Reactivate a deactivated account"""
    try:
        profile = current_user.get("profile")
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User profile not found"
            )
        
        user_id = profile.get("id")
        account_status = profile.get("account_status")
        
        if account_status != "deactivated":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is not deactivated and cannot be reactivated"
            )
        
                                    
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database configuration missing"
            )
        
        supabase = create_client(supabase_url, supabase_key)
        
                                         
        result = supabase.table("users").update({"account_status": "active"}).eq("id", user_id).execute()
        
        if result.data is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reactivate account"
            )
        
        logger.info(f" Account reactivated successfully: {user_id[:8]}...")
        
        return {
            "success": True,
            "message": "Account reactivated successfully",
            "account_status": "active"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reactivate account error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reactivate account"
        )
