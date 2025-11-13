from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime, date

# User role enum based on database schema
UserRole = Literal["guest", "registered_user", "verified_lawyer", "admin", "superadmin"]

class UserSignUp(BaseModel):
    email: EmailStr
    password: str
    username: str
    first_name: str
    last_name: str
    birthdate: date
    role: UserRole = "registered_user"
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

class UserSignIn(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_verified: Optional[bool] = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordUpdate(BaseModel):
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

# OTP-related models
class OTPRequest(BaseModel):
    email: EmailStr
    otp_type: Literal["email_verification", "password_reset"]

class SendOTPRequest(BaseModel):
    email: EmailStr
    otp_type: Literal["email_verification", "password_reset"]
    user_name: Optional[str] = "User"

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str
    otp_type: Literal["email_verification", "password_reset"]

class OTPResponse(BaseModel):
    success: bool
    message: str
    expires_in_minutes: Optional[int] = None
