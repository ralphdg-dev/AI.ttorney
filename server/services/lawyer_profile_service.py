"""
Lawyer Profile Service - Centralized business logic with caching
Simple implementation for <5000 users
"""
from typing import Dict, Any, Optional
from supabase import Client
from cachetools import TTLCache
import logging
import json

logger = logging.getLogger(__name__)

# Simple in-memory cache: 5 minutes TTL, 500 profiles max
profile_cache = TTLCache(maxsize=500, ttl=300)


class LawyerProfileService:
    """Service layer for lawyer profile operations with caching"""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    def _get_cache_key(self, lawyer_id: str) -> str:
        """Generate cache key for lawyer profile"""
        return f"profile:{lawyer_id}"
    
    async def get_profile(
        self, 
        lawyer_id: str, 
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Get lawyer profile with optional caching.
        
        Args:
            lawyer_id: Lawyer user ID
            use_cache: Whether to use cache (default True)
        
        Returns:
            Dict with profile data
        """
        cache_key = self._get_cache_key(lawyer_id)
        
        # Check cache first
        if use_cache and cache_key in profile_cache:
            logger.debug(f"Cache hit for lawyer {lawyer_id}")
            return profile_cache[cache_key]
        
        # Fetch from database
        try:
            # Get lawyer info
            lawyer_result = self.supabase.table("lawyer_info")\
                .select("*")\
                .eq("lawyer_id", lawyer_id)\
                .execute()
            
            # Get professional info
            professional_result = self.supabase.table("lawyer_applications")\
                .select("roll_number, roll_signing_date")\
                .eq("user_id", lawyer_id)\
                .execute()
            
            profile_data = {
                "lawyer_info": lawyer_result.data[0] if lawyer_result.data else None,
                "professional_info": professional_result.data[0] if professional_result.data else None
            }
            
            # Cache it
            if use_cache:
                profile_cache[cache_key] = profile_data
                logger.debug(f"Cached profile for lawyer {lawyer_id}")
            
            return profile_data
        
        except Exception as e:
            logger.error(f"Error fetching lawyer profile: {e}")
            raise
    
    async def upsert_profile(
        self,
        user_id: str,
        profile_data: Dict[str, Any],
        availability_slots: list = None
    ) -> Dict[str, Any]:
        """
        Create or update lawyer profile.
        Handles both lawyer_info and users table updates.
        
        Args:
            user_id: Lawyer user ID
            profile_data: Profile data dict
            availability_slots: Deprecated, kept for backward compatibility
        
        Returns:
            Dict with success status and data
        """
        try:
            # Prepare lawyer_info data
            hours_available = profile_data.get("hours_available")
            
            # JSONB column accepts dict directly, no need to convert to string
            # Supabase Python client handles JSONB serialization automatically
            if hours_available is None:
                hours_available = {}
            
            logger.info(f"Saving availability for user {user_id}: {hours_available}")
            
            lawyer_info_data = {
                "lawyer_id": user_id,
                "name": profile_data.get("name"),
                "specialization": profile_data.get("specialization"),
                "location": profile_data.get("location"),
                "days": profile_data.get("days"),  # Deprecated but kept for compatibility
                "hours_available": hours_available,  # Pass dict directly for JSONB
                "phone_number": profile_data.get("phone_number"),
                "bio": profile_data.get("bio")
            }
            
            # Check if profile exists
            existing = self.supabase.table("lawyer_info")\
                .select("*")\
                .eq("lawyer_id", user_id)\
                .execute()
            
            if existing.data:
                # Update existing profile
                old_name = existing.data[0].get('name', '')
                new_name = profile_data.get("name")
                
                result = self.supabase.table("lawyer_info")\
                    .update(lawyer_info_data)\
                    .eq("lawyer_id", user_id)\
                    .execute()
                
                # Update users table if name changed
                if old_name != new_name:
                    self.supabase.table("users")\
                        .update({"full_name": new_name})\
                        .eq("id", user_id)\
                        .execute()
            else:
                # Insert new profile
                result = self.supabase.table("lawyer_info")\
                    .insert(lawyer_info_data)\
                    .execute()
                
                # Update users table with name
                if result.data:
                    self.supabase.table("users")\
                        .update({"full_name": profile_data.get("name")})\
                        .eq("id", user_id)\
                        .execute()
            
            # Invalidate cache
            self.invalidate_cache(user_id)
            
            logger.info(f"Profile upserted for lawyer {user_id}")
            
            return {
                "success": True,
                "message": "Profile saved successfully",
                "data": result.data[0] if result.data else None
            }
        
        except Exception as e:
            logger.error(f"Error upserting lawyer profile: {e}")
            raise
    
    async def update_accepting_consultations(
        self,
        lawyer_id: str,
        accepting: bool
    ) -> Dict[str, Any]:
        """
        Update lawyer's accepting_consultations status.
        
        Args:
            lawyer_id: Lawyer user ID
            accepting: True to accept consultations, False otherwise
        
        Returns:
            Dict with success status
        """
        try:
            # Check if record exists
            existing = self.supabase.table("lawyer_info")\
                .select("lawyer_id")\
                .eq("lawyer_id", lawyer_id)\
                .execute()
            
            if not existing.data:
                # Create record if doesn't exist
                result = self.supabase.table("lawyer_info")\
                    .insert({
                        "lawyer_id": lawyer_id,
                        "accepting_consultations": accepting
                    })\
                    .execute()
            else:
                # Update existing record
                result = self.supabase.table("lawyer_info")\
                    .update({"accepting_consultations": accepting})\
                    .eq("lawyer_id", lawyer_id)\
                    .execute()
            
            # Invalidate cache
            self.invalidate_cache(lawyer_id)
            
            logger.info(f"Updated accepting_consultations={accepting} for lawyer {lawyer_id}")
            
            return {
                "success": True,
                "message": "Consultation status updated successfully",
                "accepting_consultations": accepting
            }
        
        except Exception as e:
            logger.error(f"Error updating accepting consultations: {e}")
            raise
    
    def invalidate_cache(self, lawyer_id: str):
        """Invalidate cache for a specific lawyer"""
        cache_key = self._get_cache_key(lawyer_id)
        profile_cache.pop(cache_key, None)
        logger.debug(f"Cache invalidated for lawyer {lawyer_id}")
    
    @staticmethod
    def clear_all_cache():
        """Clear entire profile cache (use sparingly)"""
        profile_cache.clear()
        logger.info("All profile cache cleared")
