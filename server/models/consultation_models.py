from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional
from datetime import date
import re
import logging

logger = logging.getLogger(__name__)


# Custom Exception Classes
class ConsultationError(Exception):
    """Base exception for consultation-related errors"""
    def __init__(self, message: str, code: str = "CONSULTATION_ERROR", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class InvalidDateError(ConsultationError):
    """Raised when consultation date is invalid"""
    def __init__(self):
        super().__init__(
            message="Consultation date must be in the future",
            code="INVALID_DATE",
            status_code=400
        )


class InvalidTimeError(ConsultationError):
    """Raised when consultation time is invalid"""
    def __init__(self, message: str = "Invalid consultation time format. Use HH:MM (24-hour format)"):
        super().__init__(
            message=message,
            code="INVALID_TIME",
            status_code=400
        )


class BookingConflictError(ConsultationError):
    """Raised when there's a scheduling conflict"""
    def __init__(self, lawyer_name: str, time_slot: str):
        super().__init__(
            message=f"{lawyer_name} is already booked for {time_slot}. Please select another time.",
            code="BOOKING_CONFLICT",
            status_code=409
        )


class DuplicatePendingError(ConsultationError):
    """Raised when user has a pending consultation with the same lawyer"""
    def __init__(self, lawyer_name: str):
        super().__init__(
            message=f"You already have a pending consultation with {lawyer_name}. Please wait for a response before requesting another.",
            code="DUPLICATE_PENDING",
            status_code=409
        )


class ConsultationRequestCreate(BaseModel):
    """Model for creating a consultation request with validation"""
    user_id: Optional[str] = Field(None, min_length=36, max_length=36, description="User UUID (users.id) - Optional, extracted from token")
    lawyer_id: str = Field(..., min_length=36, max_length=36, description="Lawyer Profile UUID (lawyer_info.id, NOT users.id)")
    message: str = Field(..., min_length=10, max_length=2000, description="Consultation message")
    email: EmailStr
    mobile_number: str = Field(..., min_length=10, max_length=20)
    consultation_date: date
    consultation_time: str = Field(..., min_length=5, max_length=20)
    consultation_mode: str
    
    @validator('consultation_date')
    def date_must_be_future(cls, v):
        """Ensure consultation date is in the future"""
        if v < date.today():
            raise ValueError('Consultation date must be in the future')
        return v
    
    @validator('mobile_number')
    def validate_mobile_number(cls, v):
        """Validate mobile number format"""
        try:
            import re as regex_module  # Explicit import to avoid namespace issues
            logger.info(f"🔍 Validating mobile number: {v}")
            
            # Clean the mobile number
            cleaned = regex_module.sub(r'[\s\-\(\)]', '', v)
            logger.info(f"📱 Cleaned mobile number: {cleaned}")
            
            # Validate format - must be 10-15 digits, optionally starting with +
            if not regex_module.match(r'^\+?[\d]{10,15}$', cleaned):
                logger.error(f"❌ Invalid mobile number format: {cleaned}")
                raise ValueError('Invalid mobile number format. Must be 10-15 digits.')
            
            logger.info(f"✅ Mobile number validation passed: {cleaned}")
            return v
        except ImportError as ie:
            logger.error(f"❌ Failed to import re module: {ie}")
            # Fallback validation without regex
            if not v or len(v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')) < 10:
                raise ValueError('Invalid mobile number format. Must be at least 10 digits.')
            return v
        except Exception as e:
            logger.error(f"❌ Mobile number validation error: {e}")
            raise
    
    @validator('consultation_mode')
    def validate_mode(cls, v):
        """Validate and normalize consultation mode to match database enum"""
                                      
        v_lower = v.lower() if isinstance(v, str) else v
        
                                                     
        mode_mapping = {
            'online': 'online',
            'in-person': 'onsite',
            'onsite': 'onsite',
            'phone': 'phone'
        }
        
        if v_lower not in mode_mapping:
            raise ValueError(f'Consultation mode must be one of: online, onsite, phone (got: {v})')
        
        return mode_mapping[v_lower]                                   
    
    @validator('message')
    def sanitize_message(cls, v):
        """Basic sanitization - remove excessive whitespace"""
        return ' '.join(v.split())


class ConsultationStatusUpdate(BaseModel):
    """Model for updating consultation status"""
    status: str
    
    @validator('status')
    def validate_status(cls, v):
        """Validate status value"""
        valid_statuses = ['pending', 'accepted', 'rejected', 'completed', 'cancelled']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v


class LawyerProfileUpdate(BaseModel):
    """Model for updating lawyer profile"""
    name: str = Field(..., min_length=2, max_length=100)
    specialization: str = Field(..., min_length=2, max_length=500)
    location: str = Field(..., min_length=2, max_length=200)
    phone_number: Optional[str] = Field(None, min_length=10, max_length=20)
    bio: str = Field(..., min_length=10, max_length=2000)
    days: Optional[str] = None                                               
    hours_available: Optional[dict] = None                                                
    
    @validator('phone_number')
    def validate_phone(cls, v):
        """Validate phone number if provided"""
        if v is None:
            return v
        
        cleaned = re.sub(r'[\s\-\(\)]', '', v)
        if not re.match(r'^\+?[\d]{10,15}$', cleaned):
            raise ValueError('Invalid phone number format')
        
        return v
    
    @validator('hours_available')
    def validate_availability(cls, v):
        """Validate availability structure"""
        if v is None:
            return v
        
        if not isinstance(v, dict):
            raise ValueError('hours_available must be a dictionary')
        
        valid_days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        
        for day, times in v.items():
            if day not in valid_days:
                raise ValueError(f'Invalid day: {day}. Must be one of: {", ".join(valid_days)}')
            
            if not isinstance(times, list):
                raise ValueError(f'Times for {day} must be a list')
            
            for time_str in times:
                if not isinstance(time_str, str):
                    raise ValueError(f'Time must be a string: {time_str}')
                
                                       
                if not re.match(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$', time_str):
                    raise ValueError(f'Invalid time format: {time_str}. Use HH:MM (24-hour format)')
        
        return v


class AcceptingConsultationsUpdate(BaseModel):
    """Model for toggling consultation acceptance"""
    accepting_consultations: bool
