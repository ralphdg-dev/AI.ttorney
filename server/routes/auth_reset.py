"""
FAANG-style password reset endpoint - clean, working implementation
"""
from fastapi import APIRouter, HTTPException, status, Body
from pydantic import BaseModel
import os
import jwt
import logging
from supabase import create_client
import re

# Setup
router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

class PasswordResetRequest(BaseModel):
    passwordResetToken: str
    newPassword: str

@router.post("/reset-password-clean")
async def reset_password_clean(request: PasswordResetRequest = Body(...)):
    """Clean password reset implementation - FAANG style"""
    try:
        # Environment variables
        jwt_secret = os.getenv("JWT_SECRET")
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not all([jwt_secret, supabase_url, supabase_key]):
            raise HTTPException(
                status_code=500,
                detail="Server configuration missing"
            )
        
        # Decode JWT
        try:
            decoded = jwt.decode(request.passwordResetToken, jwt_secret, algorithms=["HS256"])
            email = decoded.get("email")
            if not email:
                raise HTTPException(status_code=400, detail="Invalid token")
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=400, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=400, detail="Invalid token")
        
        # Validate password
        password = request.newPassword
        if (len(password) < 8 or 
            not re.search(r'[A-Z]', password) or 
            not re.search(r'[a-z]', password) or 
            not re.search(r'\d', password)):
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters with uppercase, lowercase, and a number"
            )
        
        # Initialize Supabase
        supabase = create_client(supabase_url, supabase_key)
        
        # Get user from public.users table (more reliable than auth.users)
        try:
            result = supabase.table('users').select('id').eq('email', email).execute()
            if not result.data or len(result.data) == 0:
                raise HTTPException(status_code=404, detail="User not found")
            
            user_id = result.data[0]['id']
            logger.info(f"🔧 Found user: {user_id[:8]}...")
            
        except Exception as e:
            logger.error(f"❌ User lookup failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to find user")
        
        # Update password using admin API
        try:
            update_result = supabase.auth.admin.update_user_by_id(
                user_id,
                {"password": password}
            )
            
            if not update_result.user:
                raise HTTPException(status_code=500, detail="Failed to update password")
                
            logger.info(f"✅ Password updated for user: {user_id[:8]}...")
            
        except Exception as e:
            logger.error(f"❌ Password update failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update password")
        
        return {
            "success": True,
            "message": "Password has been reset successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while resetting password"
        )
