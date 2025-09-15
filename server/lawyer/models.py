from pydantic import BaseModel, validator
from typing import Optional, Literal
from datetime import datetime, date
from uuid import UUID

# Lawyer application status enum based on database schema
LawyerApplicationStatus = Literal["pending", "accepted", "rejected", "resubmission"]

class LawyerApplicationSubmit(BaseModel):
    full_name: str
    roll_signing_date: date
    ibp_id: str
    roll_number: str
    selfie: str  # File path in storage bucket
    
    @validator('full_name')
    def validate_full_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Full name must be at least 2 characters long')
        return v.strip()
    
    @validator('ibp_id')
    def validate_ibp_id(cls, v):
        # Allow empty string for cases where upload failed
        if v and len(v.strip()) < 3:
            raise ValueError('IBP ID must be at least 3 characters long')
        return v.strip() if v else ''
    
    @validator('roll_number')
    def validate_roll_number(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Roll number must be at least 3 characters long')
        return v.strip()
    
    @validator('selfie')
    def validate_selfie(cls, v):
        # Allow empty string for cases where upload failed
        return v.strip() if v else ''

class LawyerApplicationReview(BaseModel):
    status: LawyerApplicationStatus
    admin_notes: Optional[str] = None
    matched_roll_id: Optional[int] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v not in ["accepted", "rejected", "resubmission"]:
            raise ValueError('Status must be accepted, rejected, or resubmission')
        return v

class LawyerApplicationResponse(BaseModel):
    id: UUID
    user_id: UUID
    full_name: Optional[str]
    roll_signing_date: Optional[date]
    ibp_id: Optional[str]
    roll_number: Optional[str]
    selfie: Optional[str]
    status: LawyerApplicationStatus
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    admin_notes: Optional[str] = None
    matched_roll_id: Optional[int] = None
    matched_at: Optional[datetime] = None
    submitted_at: datetime
    updated_at: datetime

class LawyerApplicationStatusResponse(BaseModel):
    has_application: bool
    application: Optional[LawyerApplicationResponse] = None
    can_apply: bool
    reject_count: int
    is_blocked: bool
    last_rejected_at: Optional[datetime] = None

class FileUploadResponse(BaseModel):
    success: bool
    file_path: Optional[str] = None
    message: str
    error: Optional[str] = None
