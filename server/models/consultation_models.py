"""
Pydantic models for consultation request validation
Ensures data integrity and provides clear error messages
"""
from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional
from datetime import date
import re


class ConsultationRequestCreate(BaseModel):
    """Model for creating a consultation request with validation"""
    user_id: str = Field(..., min_length=36, max_length=36, description="User UUID")
    lawyer_id: str = Field(..., min_length=36, max_length=36, description="Lawyer UUID")
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
        # Remove spaces, dashes, parentheses
        cleaned = re.sub(r'[\s\-\(\)]', '', v)
        
        # Check if it's a valid format (10-15 digits, optional + prefix)
        if not re.match(r'^\+?[\d]{10,15}$', cleaned):
            raise ValueError('Invalid mobile number format. Must be 10-15 digits.')
        
        return v
    
    @validator('consultation_mode')
    def validate_mode(cls, v):
        """Validate and normalize consultation mode to match database enum"""
        # Normalize to lowercase first
        v_lower = v.lower() if isinstance(v, str) else v
        
        # Map frontend values to database enum values
        mode_mapping = {
            'online': 'online',
            'in-person': 'onsite',
            'onsite': 'onsite',
            'phone': 'phone'
        }
        
        if v_lower not in mode_mapping:
            raise ValueError(f'Consultation mode must be one of: online, onsite, phone (got: {v})')
        
        return mode_mapping[v_lower]  # Return lowercase database value
    
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
    days: Optional[str] = None  # Deprecated, kept for backward compatibility
    hours_available: Optional[dict] = None  # JSONB format: {"Monday": ["09:00", "11:00"]}
    
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
                
                # Validate HH:MM format
                if not re.match(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$', time_str):
                    raise ValueError(f'Invalid time format: {time_str}. Use HH:MM (24-hour format)')
        
        return v


class AcceptingConsultationsUpdate(BaseModel):
    """Model for toggling consultation acceptance"""
    accepting_consultations: bool
