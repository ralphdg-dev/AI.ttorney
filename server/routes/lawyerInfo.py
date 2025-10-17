# C:\Users\Mikko\Desktop\AI.ttorney\server\routes\lawyerInfo.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
from supabase import Client
from config.dependencies import get_current_user, get_supabase

logger = logging.getLogger(__name__)

router = APIRouter()

class LawyerProfile(BaseModel):
    name: str
    specialization: str  # Changed from specializations to specialization
    location: str
    days: Optional[str] = None
    hours_available: Optional[str] = None
    phone_number: Optional[str] = None
    bio: str

class AcceptingConsultationsUpdate(BaseModel):
    accepting_consultations: bool

class AvailabilitySlot(BaseModel):
    id: str
    day: str
    startTime: str
    endTime: str
    isActive: bool

class LawyerProfileUpdate(BaseModel):
    profile_data: LawyerProfile
    availability_slots: List[AvailabilitySlot]

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
    supabase: Client = Depends(get_supabase),
    user=Depends(get_current_user)
):
    try:
        # Group days by similar hours to match your format
        day_groups = {}
        
        for slot in profile_data.availability_slots:
            if slot.isActive:
                time_range = f"{format_time_12h(slot.startTime)}-{format_time_12h(slot.endTime)}"
                if time_range not in day_groups:
                    day_groups[time_range] = []
                day_groups[time_range].append(slot.day)
        
        # Format hours and days according to your table format
        hours_entries = []
        days_entries = []
        hours_available_entries = []
        
        for time_range, days_list in day_groups.items():
            if days_list:
                # Format like "9AM-5PM"
                hours_entries.append(time_range)
                
                # Format days like "Monday Wednesday Friday" or "Tuesday Thursday"
                days_str = ', '.join([day for day in days_list])
                days_entries.append(days_str)
                
                # Generate time slots like "9:00AM, 11:00AM, 1:00PM, 3:00PM"
                start_time_12h = time_range.split('-')[0]
                end_time_12h = time_range.split('-')[1]
                time_slots = generate_time_slots(start_time_12h, end_time_12h)
                hours_available_entries.append(time_slots)
        
        # Join multiple entries with semicolons if needed
        hours = ', '.join(hours_entries) if hours_entries else None
        days = ', '.join(days_entries) if days_entries else None
        hours_available = ', '.join(hours_available_entries) if hours_available_entries else None
        
        lawyer_info_data = {
            "lawyer_id": user.id,
            "name": profile_data.profile_data.name,
            "specialization": profile_data.profile_data.specialization,
            "location": profile_data.profile_data.location,
            "days": profile_data.profile_data.days,  # Use directly from frontend
            "hours_available": profile_data.profile_data.hours_available,  # Use directly from frontend
            "phone_number": profile_data.profile_data.phone_number,
            "bio": profile_data.profile_data.bio
        }
        
        # Check if profile already exists
        existing_profile = supabase.table("lawyer_info")\
            .select("*")\
            .eq("lawyer_id", user.id)\
            .execute()
        
        # Start a transaction-like process (Supabase doesn't have true transactions, so we'll handle sequentially)
        if existing_profile.data:
            # Check if name has changed
            old_name = existing_profile.data[0].get('name', '')
            new_name = profile_data.profile_data.name
            
            # Update existing profile
            result = supabase.table("lawyer_info")\
                .update(lawyer_info_data)\
                .eq("lawyer_id", user.id)\
                .execute()
            
            # If name changed, update users table
            if old_name != new_name:
                update_user_result = supabase.table("users")\
                    .update({"full_name": new_name})\
                    .eq("id", user.id)\
                    .execute()
                
                if update_user_result.error:
                    logger.error(f"Error updating user full_name: {update_user_result.error}")
                    # Don't raise error here, but log it - the lawyer profile was still updated
        else:
            # Insert new profile
            result = supabase.table("lawyer_info")\
                .insert(lawyer_info_data)\
                .execute()
            
            # For new profiles, also update the users table with the name
            if result.data:
                update_user_result = supabase.table("users")\
                    .update({"full_name": profile_data.profile_data.name})\
                    .eq("id", user.id)\
                    .execute()
                
                if update_user_result.error:
                    logger.error(f"Error updating user full_name: {update_user_result.error}")
        
        if result.error:
            logger.error(f"Error saving lawyer profile: {result.error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save profile"
            )
        
        return {
            "success": True,
            "message": "Profile saved successfully",
            "data": result.data[0] if result.data else None
        }
        
    except Exception as e:
        logger.error(f"Error in save_lawyer_profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/api/lawyer/profile")
async def get_lawyer_profile(
    supabase: Client = Depends(get_supabase),
    user=Depends(get_current_user)
):
    try:
        # Get lawyer info
        lawyer_result = supabase.table("lawyer_info")\
            .select("*")\
            .eq("lawyer_id", user.id)\
            .execute()
        
        if lawyer_result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch profile"
            )
        
        # Get professional info too for consistency
        professional_result = supabase.table("lawyer_applications")\
            .select("roll_number, roll_signing_date")\
            .eq("user_id", user.id)\
            .execute()
        
        profile_data = lawyer_result.data[0] if lawyer_result.data else None
        professional_data = professional_result.data[0] if professional_result.data else None
        
        return {
            "success": True,
            "data": {
                "lawyer_info": profile_data,
                "professional_info": professional_data
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching lawyer profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/api/lawyer/accepting-consultations")
async def update_accepting_consultations(
    payload: AcceptingConsultationsUpdate,
    supabase: Client = Depends(get_supabase),
    user=Depends(get_current_user)
):
    """
    Update lawyer's accepting_consultations status
    """
    try:
        logger.info(f"Updating accepting_consultations for lawyer {user.id} to {payload.accepting_consultations}")
        
        # Check if lawyer_info record exists
        existing = supabase.table("lawyer_info")\
            .select("lawyer_id")\
            .eq("lawyer_id", user.id)\
            .execute()
        
        if not existing.data:
            # Create lawyer_info record if it doesn't exist
            result = supabase.table("lawyer_info")\
                .insert({
                    "lawyer_id": user.id,
                    "accepting_consultations": payload.accepting_consultations
                })\
                .execute()
        else:
            # Update existing record
            result = supabase.table("lawyer_info")\
                .update({"accepting_consultations": payload.accepting_consultations})\
                .eq("lawyer_id", user.id)\
                .execute()

        if result.error:
            logger.error(f"Database error: {result.error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {result.error}"
            )

        logger.info(f"Successfully updated accepting_consultations for lawyer {user.id}")
        
        return {
            "success": True,
            "message": "Consultation status updated successfully",
            "accepting_consultations": payload.accepting_consultations
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating accepting consultations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update consultation status"
        )


@router.get("/api/lawyer/accepting-consultations")
async def get_accepting_consultations(
    supabase: Client = Depends(get_supabase),
    user=Depends(get_current_user)
):
    """
    Get lawyer's current accepting_consultations status
    """
    try:
        result = supabase.table("lawyer_info")\
            .select("accepting_consultations")\
            .eq("lawyer_id", user.id)\
            .execute()
        
        if result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch consultation status"
            )
        
        accepting = False
        if result.data and len(result.data) > 0:
            accepting = result.data[0].get("accepting_consultations", False)
        
        return {
            "success": True,
            "accepting_consultations": accepting
        }
        
    except Exception as e:
        logger.error(f"Error fetching accepting consultations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch consultation status"
        )