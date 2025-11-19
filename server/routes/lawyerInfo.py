from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Dict, Any
import logging
from supabase import Client
from config.dependencies import get_current_user, get_supabase
from services.lawyer_profile_service import LawyerProfileService
from services.lawyer_availability_service import LawyerAvailabilityService
from models.consultation_models import LawyerProfileUpdate, AcceptingConsultationsUpdate
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()


def get_lawyer_service(supabase: Client = Depends(get_supabase)) -> LawyerProfileService:
    """Dependency injection for LawyerProfileService"""
    return LawyerProfileService(supabase)

def get_availability_service(supabase: Client = Depends(get_supabase)) -> LawyerAvailabilityService:
    """Dependency injection for LawyerAvailabilityService"""
    return LawyerAvailabilityService(supabase)

class AvailabilityUpdate(BaseModel):
    """Model for updating lawyer availability"""
    availability: Dict[str, List[str]]  # {"Monday": ["09:00", "11:00"]}

class TimeSlotUpdate(BaseModel):
    """Model for adding/removing a single time slot"""
    day: str
    time_slot: str

def format_time_12h(time_24h: str) -> str:
    """Convert 24h time (09:00) to 12h format (9:00 AM)"""
    try:
        hour, minute = time_24h.split(':')
        hour_int = int(hour)
        
        if hour_int == 0:
            return f"12:{minute} AM"
        elif hour_int < 12:
            return f"{hour_int}:{minute} AM"
        elif hour_int == 12:
            return f"12:{minute} PM"
        else:
            return f"{hour_int - 12}:{minute} PM"
    except:
        return time_24h

def generate_time_slots(start_time: str, end_time: str) -> str:
    """Generate available time slots like '9:00AM, 11:00AM, 1:00PM, 3:00PM'"""
    try:
        # Convert to 24h for calculations
        def to_24h(time_str):
            time_str = time_str.upper()
            if 'AM' in time_str:
                time_clean = time_str.replace('AM', '').strip()
                hour, minute = time_clean.split(':')
                hour = int(hour)
                if hour == 12:
                    hour = 0
                return hour, int(minute)
            else:  # PM
                time_clean = time_str.replace('PM', '').strip()
                hour, minute = time_clean.split(':')
                hour = int(hour)
                if hour != 12:
                    hour += 12
                return hour, int(minute)
        
        start_hour, start_minute = to_24h(start_time)
        end_hour, end_minute = to_24h(end_time)
        
        # Generate 2-hour slots
        slots = []
        current_hour = start_hour
        
        while current_hour < end_hour:
            # Format back to 12h
            if current_hour == 0:
                slot = f"12:{start_minute:02d}AM"
            elif current_hour < 12:
                slot = f"{current_hour}:{start_minute:02d}AM"
            elif current_hour == 12:
                slot = f"12:{start_minute:02d}PM"
            else:
                slot = f"{current_hour - 12}:{start_minute:02d}PM"
            
            slots.append(slot)
            current_hour += 2  # 2-hour intervals
        
        return ', '.join(slots)
    except:
        return f"{start_time}-{end_time}"

@router.post("/api/lawyer/profile")
async def save_lawyer_profile(
    profile_data: LawyerProfileUpdate,
    user=Depends(get_current_user),
    service: LawyerProfileService = Depends(get_lawyer_service)
):
    """Save or update lawyer profile using service layer"""
    try:
        result = await service.upsert_profile(
            user_id=user.id,
            profile_data=profile_data.dict(),
            availability_slots=[]  # Simplified for <5000 users
        )
        return result
    except Exception as e:
        logger.error(f"Error saving lawyer profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save profile"
        )

@router.get("/api/lawyer/profile")
async def get_lawyer_profile(
    user=Depends(get_current_user),
    service: LawyerProfileService = Depends(get_lawyer_service)
):
    """Get lawyer profile with caching"""
    try:
        profile_data = await service.get_profile(user.id, use_cache=True)
        return {
            "success": True,
            "data": profile_data
        }
    except Exception as e:
        logger.error(f"Error fetching lawyer profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch profile"
        )

@router.post("/api/lawyer/accepting-consultations")
async def update_accepting_consultations(
    payload: AcceptingConsultationsUpdate,
    user=Depends(get_current_user),
    service: LawyerProfileService = Depends(get_lawyer_service)
):
    """Update lawyer's accepting_consultations status"""
    try:
        result = await service.update_accepting_consultations(
            lawyer_id=user.id,
            accepting=payload.accepting_consultations
        )
        return result
    except Exception as e:
        logger.error(f"Error updating accepting consultations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update consultation status"
        )


@router.get("/api/lawyer/accepting-consultations")
async def get_accepting_consultations(
    user=Depends(get_current_user),
    service: LawyerProfileService = Depends(get_lawyer_service)
):
    """Get lawyer's current accepting_consultations status with caching"""
    try:
        profile_data = await service.get_profile(user.id, use_cache=True)
        accepting = False
        
        if profile_data.get("lawyer_info"):
            accepting = profile_data["lawyer_info"].get("accepting_consultations", False)
        
        return {
            "success": True,
            "accepting_consultations": accepting
        }
    except Exception as e:
        logger.error(f"Error fetching accepting consultations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch consultation status"
        )


# ============================================================================
# AVAILABILITY MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/api/lawyer/availability")
async def get_availability(
    day: Optional[str] = None,
    user=Depends(get_current_user),
    service: LawyerAvailabilityService = Depends(get_availability_service)
):
    """Get lawyer's availability schedule"""
    try:
        result = await service.get_availability(user.id, day)
        return result
    except Exception as e:
        logger.error(f"Error fetching availability: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch availability"
        )


@router.post("/api/lawyer/availability")
async def set_availability(
    payload: AvailabilityUpdate,
    user=Depends(get_current_user),
    service: LawyerAvailabilityService = Depends(get_availability_service),
    profile_service: LawyerProfileService = Depends(get_lawyer_service)
):
    """Set lawyer's complete availability schedule"""
    try:
        result = await service.set_availability(user.id, payload.availability)
        
        # Invalidate profile cache since availability changed
        profile_service.invalidate_cache(user.id)
        
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error setting availability: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set availability"
        )


@router.post("/api/lawyer/availability/add-slot")
async def add_time_slot(
    payload: TimeSlotUpdate,
    user=Depends(get_current_user),
    service: LawyerAvailabilityService = Depends(get_availability_service),
    profile_service: LawyerProfileService = Depends(get_lawyer_service)
):
    """Add a single time slot to availability"""
    try:
        result = await service.add_time_slot(user.id, payload.day, payload.time_slot)
        
        # Invalidate profile cache
        profile_service.invalidate_cache(user.id)
        
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error adding time slot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add time slot"
        )


@router.post("/api/lawyer/availability/remove-slot")
async def remove_time_slot(
    payload: TimeSlotUpdate,
    user=Depends(get_current_user),
    service: LawyerAvailabilityService = Depends(get_availability_service),
    profile_service: LawyerProfileService = Depends(get_lawyer_service)
):
    """Remove a single time slot from availability"""
    try:
        result = await service.remove_time_slot(user.id, payload.day, payload.time_slot)
        
        # Invalidate profile cache
        profile_service.invalidate_cache(user.id)
        
        return result
    except Exception as e:
        logger.error(f"Error removing time slot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove time slot"
        )


@router.get("/api/lawyer/availability/bookable-slots")
async def get_bookable_slots(
    day: str,
    date: Optional[str] = None,
    user=Depends(get_current_user),
    service: LawyerAvailabilityService = Depends(get_availability_service)
):
    """Get bookable time slots for a specific day (excludes already booked slots)"""
    try:
        slots = await service.get_bookable_slots(user.id, day, date)
        return {
            "success": True,
            "day": day,
            "date": date,
            "slots": slots
        }
    except Exception as e:
        logger.error(f"Error fetching bookable slots: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch bookable slots"
        )