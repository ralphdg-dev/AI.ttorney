from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime

# User role enum based on database schema
UserRole = Literal["guest", "registered_user", "verified_lawyer", "admin", "superadmin"]

class UserSignUp(BaseModel):
    email: EmailStr
    password: str
    username: str
    full_name: Optional[str] = None
    role: UserRole = "registered_user"

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
