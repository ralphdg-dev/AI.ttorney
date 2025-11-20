from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID


                                                                              
                                    
                                                                              

class SuspensionAppealDB(BaseModel):
    """Suspension appeal as stored in database"""
    id: UUID
    user_id: UUID
    suspension_id: UUID
    appeal_reason: str
    appeal_message: str
    evidence_urls: List[str] = []
    status: str                                             
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    admin_response: Optional[str] = None
    admin_notes: Optional[str] = None
    decision: Optional[str] = None                                            
    original_end_date: Optional[datetime] = None
    new_end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserSuspensionDB(BaseModel):
    """User suspension as stored in database"""
    id: UUID
    user_id: UUID
    suspension_type: str                        
    reason: str
    violation_ids: List[UUID] = []
    suspension_number: int
    strikes_at_suspension: int
    started_at: datetime
    ends_at: Optional[datetime] = None
    status: str                           
    lifted_at: Optional[datetime] = None
    lifted_by: Optional[UUID] = None
    lifted_reason: Optional[str] = None
    has_appeal: bool = False
    appeal_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


                                                                              
                    
                                                                              

class SubmitAppealRequest(BaseModel):
    """Request to submit a suspension appeal"""
    suspension_id: str
    appeal_reason: str = Field(..., min_length=10, max_length=200)
    appeal_message: str = Field(..., min_length=50, max_length=2000)
    evidence_urls: Optional[List[str]] = Field(default_factory=list, max_items=5)
    
    @validator('evidence_urls')
    def validate_evidence_urls(cls, v):
        """Validate evidence URLs"""
        if v:
            for url in v:
                if not url.startswith('http://') and not url.startswith('https://'):
                    raise ValueError(f'Invalid URL format: {url}')
                if len(url) > 500:
                    raise ValueError('URL too long (max 500 characters)')
        return v


class ReviewAppealRequest(BaseModel):
    """Request to review and decide on an appeal"""
    decision: Literal["lift_suspension", "reduce_duration", "reject"]
    admin_response: str = Field(..., min_length=20, max_length=1000)
    admin_notes: Optional[str] = Field(None, max_length=1000)
    new_end_date: Optional[datetime] = None
    
    @validator('new_end_date')
    def validate_new_end_date(cls, v, values):
        """Validate new_end_date is required for reduce_duration"""
        if values.get('decision') == 'reduce_duration' and not v:
            raise ValueError('new_end_date is required when decision is reduce_duration')
        if values.get('decision') != 'reduce_duration' and v:
            raise ValueError('new_end_date should only be provided for reduce_duration decision')
        if v and v <= datetime.now():
            raise ValueError('new_end_date must be in the future')
        return v


class UpdateAppealStatusRequest(BaseModel):
    """Request to update appeal status (for admin workflow)"""
    status: Literal["pending", "under_review", "approved", "rejected"]


                                                                              
                     
                                                                              

class AppealResponse(BaseModel):
    """Response model for a single appeal"""
    id: str
    user_id: str
    suspension_id: str
    appeal_reason: str
    appeal_message: str
    evidence_urls: List[str]
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    admin_response: Optional[str] = None
    decision: Optional[str] = None
    original_end_date: Optional[datetime] = None
    new_end_date: Optional[datetime] = None
    
    @classmethod
    def from_db(cls, db_appeal: SuspensionAppealDB) -> "AppealResponse":
        """Convert database model to response model"""
        return cls(
            id=str(db_appeal.id),
            user_id=str(db_appeal.user_id),
            suspension_id=str(db_appeal.suspension_id),
            appeal_reason=db_appeal.appeal_reason,
            appeal_message=db_appeal.appeal_message,
            evidence_urls=db_appeal.evidence_urls,
            status=db_appeal.status,
            created_at=db_appeal.created_at,
            reviewed_at=db_appeal.reviewed_at,
            admin_response=db_appeal.admin_response,
            decision=db_appeal.decision,
            original_end_date=db_appeal.original_end_date,
            new_end_date=db_appeal.new_end_date
        )


class SuspensionResponse(BaseModel):
    """Response model for suspension details"""
    id: str
    user_id: str
    suspension_type: str
    reason: str
    suspension_number: int
    strikes_at_suspension: int
    started_at: datetime
    ends_at: Optional[datetime] = None
    status: str
    has_appeal: bool
    can_appeal: bool
    
    @classmethod
    def from_db(cls, db_suspension: UserSuspensionDB, can_appeal: bool = False) -> "SuspensionResponse":
        """Convert database model to response model"""
        return cls(
            id=str(db_suspension.id),
            user_id=str(db_suspension.user_id),
            suspension_type=db_suspension.suspension_type,
            reason=db_suspension.reason,
            suspension_number=db_suspension.suspension_number,
            strikes_at_suspension=db_suspension.strikes_at_suspension,
            started_at=db_suspension.started_at,
            ends_at=db_suspension.ends_at,
            status=db_suspension.status,
            has_appeal=db_suspension.has_appeal,
            can_appeal=can_appeal
        )


class AppealWithUserResponse(BaseModel):
    """Appeal with user information for admin view"""
    id: str
    user: dict                                           
    suspension: dict                               
    appeal_reason: str
    appeal_message: str
    evidence_urls: List[str]
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[dict] = None
    admin_response: Optional[str] = None
    admin_notes: Optional[str] = None
    decision: Optional[str] = None


class AppealListResponse(BaseModel):
    """List of appeals with pagination"""
    appeals: List[AppealWithUserResponse]
    total: int
    page: int
    limit: int
    has_more: bool


class AppealStatsResponse(BaseModel):
    """Appeal statistics for admin dashboard"""
    pending: int
    under_review: int
    approved: int
    rejected: int
    total: int
    avg_review_time_hours: Optional[float] = None


class SubmitAppealResponse(BaseModel):
    """Response after submitting an appeal"""
    success: bool
    message: str
    appeal_id: str
    status: str


class ReviewAppealResponse(BaseModel):
    """Response after reviewing an appeal"""
    success: bool
    message: str
    decision: str


class UploadEvidenceResponse(BaseModel):
    """Response after uploading evidence file"""
    success: bool
    url: str
    filename: str
    size: int
