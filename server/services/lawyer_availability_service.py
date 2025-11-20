from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from supabase import Client
import logging
import json

logger = logging.getLogger(__name__)


class LawyerAvailabilityService:
    """Service for managing lawyer availability using JSONB column"""
    
                                 
    DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    @staticmethod
    def validate_availability(availability: Dict[str, List[str]]) -> bool:
        """
        Validate availability structure.
        
        Args:
            availability: {"Monday": ["09:00", "11:00"], "Tuesday": ["14:00"]}
        
        Returns:
            True if valid, raises ValueError otherwise
        """
        if not isinstance(availability, dict):
            raise ValueError("Availability must be a dictionary")
        
        for day, times in availability.items():
            if day not in LawyerAvailabilityService.DAYS:
                raise ValueError(f"Invalid day: {day}")
            
            if not isinstance(times, list):
                raise ValueError(f"Times for {day} must be a list")
            
            for time_str in times:
                try:
                                                   
                    datetime.strptime(time_str, "%H:%M")
                except ValueError:
                    raise ValueError(f"Invalid time format: {time_str}. Use HH:MM (24-hour)")
        
        return True
    
    async def set_availability(
        self,
        lawyer_id: str,
        availability: Dict[str, List[str]]
    ) -> Dict[str, Any]:
        """
        Set lawyer availability (replaces existing).
        
        Args:
            lawyer_id: Lawyer's lawyer_info.lawyer_id (user ID)
            availability: {"Monday": ["09:00", "11:00"], "Tuesday": ["14:00"]}
        
        Returns:
            Dict with success status
        """
        try:
                                
            self.validate_availability(availability)
            
                                      
            result = self.supabase.table("lawyer_info")\
                .update({"hours_available": json.dumps(availability)})\
                .eq("lawyer_id", lawyer_id)\
                .execute()
            
            logger.info(f"Updated availability for lawyer {lawyer_id}")
            
            return {
                "success": True,
                "message": "Availability updated successfully",
                "data": availability
            }
        
        except Exception as e:
            logger.error(f"Error setting availability: {e}")
            raise
    
    async def get_availability(
        self,
        lawyer_id: str,
        day: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get lawyer's availability.
        
        Args:
            lawyer_id: Lawyer's lawyer_info.lawyer_id (user ID)
            day: Optional filter by day name ("Monday", "Tuesday", etc.)
        
        Returns:
            Dict with availability data
        """
        try:
            result = self.supabase.table("lawyer_info")\
                .select("hours_available")\
                .eq("lawyer_id", lawyer_id)\
                .execute()
            
            if not result.data:
                return {"success": True, "data": {}}
            
            availability = result.data[0].get("hours_available", {})
            
                                        
            if day and isinstance(availability, dict):
                availability = {day: availability.get(day, [])}
            
            return {
                "success": True,
                "data": availability
            }
        
        except Exception as e:
            logger.error(f"Error getting availability: {e}")
            raise
    
    async def add_time_slot(
        self,
        lawyer_id: str,
        day: str,
        time_slot: str
    ) -> Dict[str, Any]:
        """
        Add a single time slot to a specific day.
        
        Args:
            lawyer_id: Lawyer's lawyer_info.lawyer_id (user ID)
            day: Day name ("Monday", "Tuesday", etc.)
            time_slot: Time in HH:MM format
        
        Returns:
            Dict with success status
        """
        try:
                             
            if day not in self.DAYS:
                raise ValueError(f"Invalid day: {day}")
            datetime.strptime(time_slot, "%H:%M")
            
                                      
            current = await self.get_availability(lawyer_id)
            availability = current["data"] if isinstance(current["data"], dict) else {}
            
                           
            if day not in availability:
                availability[day] = []
            
            if time_slot not in availability[day]:
                availability[day].append(time_slot)
                availability[day].sort()                     
            
                    
            return await self.set_availability(lawyer_id, availability)
        
        except Exception as e:
            logger.error(f"Error adding time slot: {e}")
            raise
    
    async def remove_time_slot(
        self,
        lawyer_id: str,
        day: str,
        time_slot: str
    ) -> Dict[str, Any]:
        """
        Remove a time slot from a specific day.
        
        Args:
            lawyer_id: Lawyer's lawyer_info.lawyer_id (user ID)
            day: Day name
            time_slot: Time in HH:MM format
        
        Returns:
            Dict with success status
        """
        try:
                                      
            current = await self.get_availability(lawyer_id)
            availability = current["data"] if isinstance(current["data"], dict) else {}
            
                              
            if day in availability and time_slot in availability[day]:
                availability[day].remove(time_slot)
                
                                             
                if not availability[day]:
                    del availability[day]
            
                    
            return await self.set_availability(lawyer_id, availability)
        
        except Exception as e:
            logger.error(f"Error removing time slot: {e}")
            raise
    
    async def get_bookable_slots(
        self,
        lawyer_id: str,
        day: str,
        date: Optional[str] = None
    ) -> List[str]:
        """
        Get list of bookable time slots for a specific day.
        Excludes already booked slots if date is provided.
        
        Args:
            lawyer_id: Lawyer's lawyer_info.id (primary key for consultation_requests)
            day: Day name ("Monday", "Tuesday", etc.)
            date: Optional specific date (YYYY-MM-DD) to check bookings
        
        Returns:
            List of available time slots in HH:MM format
        """
        try:
                                          
            result = await self.get_availability(lawyer_id, day)
            slots = result["data"].get(day, [])
            
            if not date:
                return slots
            
                                     
            bookable = []
            for slot in slots:
                is_booked = await self._is_slot_booked(lawyer_id, date, slot)
                if not is_booked:
                    bookable.append(slot)
            
            return bookable
        
        except Exception as e:
            logger.error(f"Error getting bookable slots: {e}")
            return []
    
    async def _is_slot_booked(
        self,
        lawyer_id: str,
        date: str,
        time_slot: str
    ) -> bool:
        """Check if a specific slot is already booked"""
        try:
            result = self.supabase.table("consultation_requests")\
                .select("id")\
                .eq("lawyer_id", lawyer_id)\
                .eq("consultation_date", date)\
                .eq("consultation_time", time_slot)\
                .in_("status", ["pending", "accepted"])\
                .execute()
            
            return len(result.data) > 0 if result.data else False
        
        except Exception as e:
            logger.error(f"Error checking if slot is booked: {e}")
            return False
