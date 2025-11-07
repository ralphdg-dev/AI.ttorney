"""
Consultation Service - Centralized business logic for consultation management
Follows DRY principles and FAANG best practices for <5000 users
"""
from typing import Dict, Any, Optional, List
from datetime import datetime, date, time, timedelta
from supabase import Client
from services.notification_service import NotificationService
import logging
import re

logger = logging.getLogger(__name__)


class ConsultationError(Exception):
    """Base exception for consultation errors"""
    def __init__(self, message: str, code: str, status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)


class BookingConflictError(ConsultationError):
    """Raised when attempting to book an already-taken time slot"""
    def __init__(self, lawyer_name: str, time_slot: str):
        super().__init__(
            message=f"{lawyer_name} is already booked for {time_slot}. Please select another time.",
            code="BOOKING_CONFLICT",
            status_code=409
        )


class InvalidDateError(ConsultationError):
    """Raised when consultation date is in the past"""
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


class DuplicatePendingError(ConsultationError):
    """Raised when user already has pending consultation with same lawyer"""
    def __init__(self, lawyer_name: str):
        super().__init__(
            message=f"You already have a pending consultation with {lawyer_name}. Please wait for a response before requesting another.",
            code="DUPLICATE_PENDING",
            status_code=409
        )


class ConsultationService:
    """
    Service layer for consultation operations.
    Handles business logic, validation, and database operations.
    """
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def check_booking_conflict(
        self, 
        lawyer_id: str, 
        consultation_date: str, 
        consultation_time: str
    ) -> bool:
        """
        Check if lawyer already has a booking at this date/time.
        lawyer_id here is lawyer_info.id (the lawyer profile ID)
        
        Returns:
            True if conflict exists, False otherwise
        """
        try:
            result = self.supabase.table("consultation_requests")\
                .select("id")\
                .eq("lawyer_id", lawyer_id)\
                .eq("consultation_date", consultation_date)\
                .eq("consultation_time", consultation_time)\
                .in_("status", ["pending", "accepted"])\
                .execute()
            
            return len(result.data) > 0 if result.data else False
        except Exception as e:
            logger.error(f"Error checking booking conflict: {e}")
            return False  # Fail open - allow booking if check fails
    
    def _validate_time_format(self, time_str: str) -> bool:
        """Validate time is in HH:MM format (24-hour)"""
        time_pattern = re.compile(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
        return bool(time_pattern.match(time_str))
    
    def _validate_business_hours(self, time_str: str) -> bool:
        """Validate time is within business hours (8 AM - 8 PM)"""
        try:
            hour = int(time_str.split(':')[0])
            return 8 <= hour < 20  # 8 AM to 8 PM
        except:
            return False
    
    async def check_duplicate_pending(self, user_id: str, lawyer_id: str) -> bool:
        """
        Check if user already has a pending consultation with this lawyer.
        Prevents spam and ensures orderly processing.
        """
        try:
            result = self.supabase.table("consultation_requests")\
                .select("id")\
                .eq("user_id", user_id)\
                .eq("lawyer_id", lawyer_id)\
                .eq("status", "pending")\
                .is_("deleted_at", None)\
                .execute()
            
            return len(result.data) > 0 if result.data else False
        except Exception as e:
            logger.error(f"Error checking duplicate pending: {e}")
            return False  # Fail open
    
    async def create_consultation_request(
        self, 
        user_id: str,
        lawyer_id: str,
        message: str,
        email: str,
        mobile_number: str,
        consultation_date: str,
        consultation_time: str,
        consultation_mode: str
    ) -> Dict[str, Any]:
        """
        Create a new consultation request with comprehensive validation.
        
        Validates:
        - Date is in the future (not today, must be at least tomorrow)
        - Time format is valid (HH:MM, 24-hour)
        - Time is within business hours (8 AM - 8 PM)
        - Lawyer exists and is accepting consultations
        - No booking conflict exists (same lawyer, date, time)
        - User doesn't have duplicate pending consultation with same lawyer
        
        Returns:
            Dict with success status and data/error
        """
        try:
            # 1. Validate date is in the future (at least tomorrow)
            consultation_date_obj = date.fromisoformat(consultation_date)
            tomorrow = date.today() + timedelta(days=1)
            
            if consultation_date_obj < tomorrow:
                raise InvalidDateError()
            
            # 2. Validate time format
            if not self._validate_time_format(consultation_time):
                raise InvalidTimeError()
            
            # 3. Validate business hours
            if not self._validate_business_hours(consultation_time):
                raise InvalidTimeError(
                    "Consultation time must be between 8:00 AM and 8:00 PM"
                )
            
            # 4. Verify lawyer exists and is accepting consultations
            logger.info(f"🔍 Checking if lawyer exists: {lawyer_id}")
            lawyer_result = self.supabase.table("lawyer_info")\
                .select("name, accepting_consultations")\
                .eq("id", lawyer_id)\
                .execute()
            
            logger.info(f"🔍 Query result: {lawyer_result.data}")
            
            if not lawyer_result.data:
                logger.error(f"❌ Lawyer not found in lawyer_info table: {lawyer_id}")
                raise ConsultationError(
                    "This lawyer profile does not exist or is not available for consultations",
                    "LAWYER_NOT_FOUND",
                    404
                )
            
            lawyer_name = lawyer_result.data[0]["name"]
            accepting_consultations = lawyer_result.data[0].get("accepting_consultations", False)
            
            if not accepting_consultations:
                raise ConsultationError(
                    f"{lawyer_name} is not currently accepting consultations",
                    "LAWYER_NOT_ACCEPTING",
                    400
                )
            
            # 5. Check for duplicate pending consultation
            has_duplicate = await self.check_duplicate_pending(user_id, lawyer_id)
            
            if has_duplicate:
                raise DuplicatePendingError(lawyer_name)
            
            # 6. Check for booking conflict (overlapping time slots)
            has_conflict = await self.check_booking_conflict(
                lawyer_id, consultation_date, consultation_time
            )
            
            if has_conflict:
                raise BookingConflictError(lawyer_name, consultation_time)
            
            # 7. Create consultation request
            consultation_data = {
                "user_id": user_id,
                "lawyer_id": lawyer_id,
                "message": message,
                "email": email,
                "mobile_number": mobile_number,
                "status": "pending",
                "consultation_date": consultation_date,
                "consultation_time": consultation_time,
                "consultation_mode": consultation_mode
                # Note: created_at and updated_at are auto-generated by database
            }
            
            logger.info(f"💾 Inserting consultation: user_id={user_id}, lawyer_id={lawyer_id}")
            
            result = self.supabase.table("consultation_requests")\
                .insert(consultation_data)\
                .execute()
            
            logger.info(f"📊 Insert result: {result.data if result.data else 'No data'}")
            
            if result.data:
                consultation_id = result.data[0]['id']
                logger.info(f"Consultation created: {consultation_id} for lawyer {lawyer_id}")
                
                # Send real-time notification to lawyer
                await self._notify_lawyer_new_consultation(
                    lawyer_id=lawyer_id,
                    consultation_id=consultation_id,
                    consultation_date=consultation_date,
                    consultation_time=consultation_time,
                    user_id=user_id
                )
                
                return {
                    "success": True,
                    "data": result.data[0]
                }
            else:
                raise ConsultationError(
                    "Failed to create consultation request",
                    "CREATE_FAILED",
                    500
                )
        
        except (BookingConflictError, InvalidDateError, InvalidTimeError, DuplicatePendingError, ConsultationError):
            raise  # Re-raise custom errors
        except Exception as e:
            logger.error(f"Error creating consultation: {e}")
            raise ConsultationError(
                f"Internal server error: {str(e)}",
                "INTERNAL_ERROR",
                500
            )
    
    async def _notify_lawyer_new_consultation(
        self,
        lawyer_id: str,
        consultation_id: str,
        consultation_date: str,
        consultation_time: str,
        user_id: str
    ):
        """Send notification to lawyer about new consultation"""
        try:
            logger.info(f"📬 Attempting to send notification to lawyer {lawyer_id[:8]}...")
            
            user_result = self.supabase.table("users")\
                .select("full_name")\
                .eq("id", user_id)\
                .execute()
            
            user_name = user_result.data[0]["full_name"] if user_result.data else "A user"
            logger.info(f"👤 User name: {user_name}")
            
            notification_service = NotificationService(self.supabase)
            result = await notification_service.notify_consultation_booked(
                lawyer_id=lawyer_id,
                user_name=user_name,
                consultation_date=consultation_date,
                consultation_time=consultation_time,
                consultation_id=consultation_id
            )
            
            if result:
                logger.info(f"✅ Notification sent successfully to lawyer {lawyer_id[:8]}...")
            else:
                logger.error(f"❌ Notification failed - no result returned")
                
        except Exception as e:
            logger.error(f"⚠️ Failed to send notification: {e}")
            import traceback
            logger.error(traceback.format_exc())
    
    async def get_user_consultations(
        self, 
        user_id: str, 
        status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Get consultations for a user with pagination.
        
        Args:
            user_id: User ID
            status_filter: Optional status filter (pending, accepted, etc.)
            page: Page number (1-indexed)
            page_size: Items per page (max 100)
        
        Returns:
            Dict with consultations and pagination info
        """
        try:
            # Limit page size to prevent abuse
            page_size = min(page_size, 100)
            offset = (page - 1) * page_size
            
            # Build query
            query = self.supabase.table("consultation_requests")\
                .select("""
                    *,
                    lawyer_info:lawyer_id (
                        name,
                        specialization
                    )
                """, count="exact")\
                .eq("user_id", user_id)\
                .is_("deleted_at", None)  # Exclude soft-deleted
            
            if status_filter and status_filter != "all":
                query = query.eq("status", status_filter)
            
            # Execute with pagination
            result = query.order("created_at", desc=True)\
                .range(offset, offset + page_size - 1)\
                .execute()
            
            total = result.count if hasattr(result, 'count') else len(result.data)
            
            return {
                "success": True,
                "data": result.data,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": (total + page_size - 1) // page_size
                }
            }
        
        except Exception as e:
            logger.error(f"Error fetching user consultations: {e}")
            raise ConsultationError(
                "Failed to fetch consultations",
                "FETCH_FAILED",
                500
            )
    
    async def get_lawyer_consultations(
        self, 
        lawyer_id: str, 
        status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Get consultations for a lawyer with pagination"""
        try:
            page_size = min(page_size, 100)
            offset = (page - 1) * page_size
            
            query = self.supabase.table("consultation_requests")\
                .select("""
                    *,
                    users!consultation_requests_user_id_fkey(
                        full_name,
                        email,
                        username
                    )
                """, count="exact")\
                .eq("lawyer_id", lawyer_id)\
                .is_("deleted_at", None)
            
            if status_filter and status_filter != "all":
                query = query.eq("status", status_filter)
            
            result = query.order("created_at", desc=True)\
                .range(offset, offset + page_size - 1)\
                .execute()
            
            total = result.count if hasattr(result, 'count') else len(result.data)
            
            return {
                "success": True,
                "data": result.data,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": (total + page_size - 1) // page_size
                }
            }
        
        except Exception as e:
            logger.error(f"Error fetching lawyer consultations: {e}")
            raise ConsultationError(
                "Failed to fetch consultations",
                "FETCH_FAILED",
                500
            )
    
    async def update_consultation_status(
        self,
        consultation_id: str,
        new_status: str,
        user_id: str,
        is_lawyer: bool = False
    ) -> Dict[str, Any]:
        """
        Update consultation status with ownership validation.
        
        Args:
            consultation_id: Consultation ID
            new_status: New status (accepted, rejected, completed, cancelled)
            user_id: User making the change
            is_lawyer: True if lawyer is updating, False if user
        """
        try:
            # Validate status
            valid_statuses = ["pending", "accepted", "rejected", "completed", "cancelled"]
            if new_status not in valid_statuses:
                raise ConsultationError(
                    f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
                    "INVALID_STATUS",
                    400
                )
            
            # Verify ownership
            field = "lawyer_id" if is_lawyer else "user_id"
            consultation = self.supabase.table("consultation_requests")\
                .select("*")\
                .eq("id", consultation_id)\
                .eq(field, user_id)\
                .execute()
            
            if not consultation.data:
                raise ConsultationError(
                    "Consultation not found or access denied",
                    "NOT_FOUND",
                    404
                )
            
            # Update status (updated_at is auto-generated by trigger)
            update_data = {
                "status": new_status
            }
            
            # Set responded_at for first response (if column exists)
            if new_status in ["accepted", "rejected"] and not consultation.data[0].get("responded_at"):
                update_data["responded_at"] = datetime.utcnow().isoformat()
            
            result = self.supabase.table("consultation_requests")\
                .update(update_data)\
                .eq("id", consultation_id)\
                .execute()
            
            logger.info(f"Consultation {consultation_id} status updated to {new_status}")
            
            return {
                "success": True,
                "message": f"Consultation {new_status} successfully"
            }
        
        except ConsultationError:
            raise
        except Exception as e:
            logger.error(f"Error updating consultation status: {e}")
            raise ConsultationError(
                "Failed to update consultation",
                "UPDATE_FAILED",
                500
            )
    
    async def get_consultation_by_id(
        self,
        consultation_id: str
    ) -> Dict[str, Any]:
        """Get a single consultation by ID"""
        try:
            result = self.supabase.table("consultation_requests")\
                .select("""
                    *,
                    lawyer_info:lawyer_id (
                        name,
                        specialization
                    ),
                    users!consultation_requests_user_id_fkey(
                        full_name,
                        email,
                        username
                    )
                """)\
                .eq("id", consultation_id)\
                .is_("deleted_at", None)\
                .execute()
            
            if result.data:
                return {
                    "success": True,
                    "data": result.data[0]
                }
            else:
                raise ConsultationError(
                    "Consultation not found",
                    "NOT_FOUND",
                    404
                )
        
        except ConsultationError:
            raise
        except Exception as e:
            logger.error(f"Error fetching consultation: {e}")
            raise ConsultationError(
                "Failed to fetch consultation",
                "FETCH_FAILED",
                500
            )
    
    async def soft_delete_consultation(
        self,
        consultation_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Soft delete a consultation (user can only delete their own)"""
        try:
            result = self.supabase.table("consultation_requests")\
                .update({
                    "deleted_at": datetime.utcnow().isoformat(),
                    "deleted_by": user_id
                })\
                .eq("id", consultation_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if result.data:
                logger.info(f"Consultation {consultation_id} soft deleted by {user_id}")
                return {
                    "success": True,
                    "message": "Consultation deleted successfully"
                }
            else:
                raise ConsultationError(
                    "Consultation not found or access denied",
                    "NOT_FOUND",
                    404
                )
        
        except ConsultationError:
            raise
        except Exception as e:
            logger.error(f"Error deleting consultation: {e}")
            raise ConsultationError(
                "Failed to delete consultation",
                "DELETE_FAILED",
                500
            )
