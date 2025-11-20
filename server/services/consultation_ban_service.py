import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone
import httpx
from services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)

class ConsultationBanService:
    """
    Service for managing consultation booking bans for users who cancel accepted consultations.
    
    Ban Logic:
    1. 1st cancellation → 1 day ban (24 hours)
    2. 2nd cancellation within 30 days → 3 day ban
    3. 3rd+ cancellation within 30 days → 7 day ban
    4. Count resets after 30 days without cancellations
    5. Bans automatically expire after the ban period
    6. Users can still view consultations but cannot book new ones
    """
    
               
    FIRST_BAN_DAYS = 1                
    SECOND_BAN_DAYS = 3             
    THIRD_BAN_DAYS = 7              
    CANCELLATION_TRACKING_DAYS = 30                                          
    
    def __init__(self):
        """Initialize the consultation ban service."""
        self.supabase = SupabaseService()
        logger.info(" Consultation ban service initialized")
    
    async def apply_cancellation_ban(
        self,
        user_id: str,
        consultation_id: str,
        consultation_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Apply a temporary booking ban for cancelling an accepted consultation.
        
        Args:
            user_id: UUID of the user who cancelled
            consultation_id: UUID of the cancelled consultation
            consultation_data: Full consultation data from database
        
        Returns:
            Dict containing:
                - ban_applied: bool (True if ban was applied)
                - ban_end: datetime when ban expires
                - ban_duration_days: number of days banned
                - previous_cancellations: number of recent cancellations
                - message: user-friendly message
        
        Raises:
            Exception: If database operations fail
        """
        try:
            logger.info(f"🚫 Applying consultation ban for user {user_id[:8]}... (consultation: {consultation_id[:8]}...)")
            
                                                                      
            recent_cancellations = await self._count_recent_cancellations(user_id)
            logger.info(f" Recent cancellations: {recent_cancellations}")
            
                                                                          
            ban_duration_days = self._calculate_ban_duration(recent_cancellations)
            ban_end = datetime.now(timezone.utc) + timedelta(days=ban_duration_days)
            
            logger.info(f" Ban duration: {ban_duration_days} days (until {ban_end.strftime('%Y-%m-%d %H:%M UTC')})")
            
                                                           
            await self._update_user_ban_status(user_id, ban_end)
            
                                                          
            await self._record_consultation_cancellation(
                user_id=user_id,
                consultation_id=consultation_id,
                consultation_data=consultation_data,
                ban_end=ban_end,
                ban_duration_days=ban_duration_days
            )
            
                                                    
            message = self._generate_ban_message(ban_duration_days, ban_end, recent_cancellations)
            
            logger.info(f" Consultation ban applied: {ban_duration_days} days")
            
            return {
                "ban_applied": True,
                "ban_end": ban_end.isoformat(),
                "ban_duration_days": ban_duration_days,
                "previous_cancellations": recent_cancellations,
                "message": message
            }
            
        except Exception as e:
            logger.error(f" Failed to apply consultation ban: {str(e)}")
            raise Exception(f"Consultation ban error: {str(e)}")
    
    async def check_booking_eligibility(self, user_id: str) -> Dict[str, Any]:
        """
        Check if user is eligible to book new consultations.
        
        Args:
            user_id: UUID of the user
        
        Returns:
            Dict containing:
                - can_book: bool (True if user can book)
                - ban_status: 'none', 'active', or 'expired'
                - ban_end: when ban expires (if active)
                - message: reason if cannot book
        """
        try:
                                          
            await self._check_expired_bans(user_id)
            
            user_data = await self._get_user_ban_status(user_id)
            if not user_data:
                return {
                    "can_book": True,
                    "ban_status": "none",
                    "ban_end": None,
                    "message": None
                }
            
            consultation_ban_end = user_data.get("consultation_ban_end")
            
            if consultation_ban_end:
                ban_end_dt = datetime.fromisoformat(consultation_ban_end.replace('Z', '+00:00'))
                if ban_end_dt.tzinfo is None:
                    ban_end_dt = ban_end_dt.replace(tzinfo=timezone.utc)
                if ban_end_dt > datetime.now(timezone.utc):
                                         
                    return {
                        "can_book": False,
                        "ban_status": "active",
                        "ban_end": consultation_ban_end,
                        "message": f"You are temporarily banned from booking consultations until {ban_end_dt.strftime('%Y-%m-%d %H:%M UTC')} due to cancelling accepted consultations."
                    }
            
            return {
                "can_book": True,
                "ban_status": "none",
                "ban_end": None,
                "message": None
            }
            
        except Exception as e:
            logger.error(f" Failed to check booking eligibility: {str(e)}")
                                                                           
            return {
                "can_book": False,
                "ban_status": "unknown",
                "ban_end": None,
                "message": "Unable to verify booking eligibility at the moment. Please try again later."
            }
    
    async def lift_ban(self, user_id: str, admin_id: str, reason: str = "Admin override") -> Dict[str, Any]:
        """
        Manually lift a consultation ban (admin action).
        
        Args:
            user_id: UUID of the user
            admin_id: UUID of the admin lifting the ban
            reason: Reason for lifting the ban
        
        Returns:
            Dict containing success status and message
        """
        try:
            logger.info(f"🔓 Admin {admin_id[:8]}... lifting consultation ban for user {user_id[:8]}...")
            
                                      
            await self._update_user_ban_status(user_id, None)
            
                                  
            logger.info(f" Consultation ban lifted by admin: {reason}")
            
            return {
                "success": True,
                "message": "Consultation ban lifted successfully"
            }
            
        except Exception as e:
            logger.error(f" Failed to lift consultation ban: {str(e)}")
            raise Exception(f"Failed to lift ban: {str(e)}")
    
                            
    
    async def _count_recent_cancellations(self, user_id: str) -> int:
        """Count accepted consultation cancellations within the tracking period."""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.CANCELLATION_TRACKING_DAYS)
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.supabase.rest_url}/consultation_requests",
                    params={
                        "user_id": f"eq.{user_id}",
                        "status": "eq.cancelled",
                        "responded_at": f"gte.{cutoff_date.isoformat()}",
                        "select": "id,status,responded_at"
                    },
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    cancellations = response.json()
                                                                                        
                                                                                               
                    return len([c for c in cancellations if c.get("responded_at")])
                return 0
        except Exception as e:
            logger.error(f" Failed to count recent cancellations: {str(e)}")
            return 0
    
    def _calculate_ban_duration(self, recent_cancellations: int) -> int:
        """
        Calculate ban duration based on cancellation history.
        
        Logic:
        - 1st cancellation: 1 day (24 hours)
        - 2nd cancellation: 3 days  
        - 3rd+ cancellation: 7 days
        """
        if recent_cancellations == 0:
            return self.FIRST_BAN_DAYS           
        elif recent_cancellations == 1:
            return self.SECOND_BAN_DAYS           
        else:
            return self.THIRD_BAN_DAYS            
    
    async def _get_user_ban_status(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's current consultation ban status."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.supabase.rest_url}/users",
                    params={
                        "id": f"eq.{user_id}",
                        "select": "id,consultation_ban_end"
                    },
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data[0] if data else None
                return None
        except Exception as e:
            logger.error(f" Failed to get user ban status: {str(e)}")
            return None
    
    async def _update_user_ban_status(self, user_id: str, ban_end: Optional[datetime]) -> bool:
        """Update user's consultation ban status."""
        try:
            update_data = {
                "consultation_ban_end": (ban_end.astimezone(timezone.utc).isoformat() if ban_end else None)
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.patch(
                    f"{self.supabase.rest_url}/users",
                    params={"id": f"eq.{user_id}"},
                    json=update_data,
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                return response.status_code in [200, 204]
        except Exception as e:
            logger.error(f" Failed to update user ban status: {str(e)}")
            return False
    
    async def _record_consultation_cancellation(
        self,
        user_id: str,
        consultation_id: str,
        consultation_data: Dict[str, Any],
        ban_end: datetime,
        ban_duration_days: int
    ) -> bool:
        """Record consultation cancellation for audit trail."""
        try:
                                                                                 
            logger.info(
                f" Consultation cancellation recorded: "
                f"user={user_id[:8]}..., "
                f"consultation={consultation_id[:8]}..., "
                f"lawyer={consultation_data.get('lawyer_id', 'unknown')[:8]}..., "
                f"ban_duration={ban_duration_days}d, "
                f"ban_until={ban_end.isoformat()}"
            )
            return True
        except Exception as e:
            logger.error(f" Failed to record consultation cancellation: {str(e)}")
            return False
    
    async def _check_expired_bans(self, user_id: str) -> bool:
        """Check and clear expired consultation bans for a user."""
        try:
            user_data = await self._get_user_ban_status(user_id)
            if not user_data:
                return False
            
            consultation_ban_end = user_data.get("consultation_ban_end")
            if consultation_ban_end:
                ban_end_dt = datetime.fromisoformat(consultation_ban_end.replace('Z', '+00:00'))
                if ban_end_dt.tzinfo is None:
                    ban_end_dt = ban_end_dt.replace(tzinfo=timezone.utc)
                if ban_end_dt <= datetime.now(timezone.utc):
                                               
                    logger.info(f" Clearing expired consultation ban for user {user_id[:8]}...")
                    await self._update_user_ban_status(user_id, None)
                    return True
            return False
        except Exception as e:
            logger.error(f" Failed to check expired bans: {str(e)}")
            return False
    
    def _generate_ban_message(
        self,
        ban_duration_days: int,
        ban_end: datetime,
        previous_cancellations: int
    ) -> str:
        """Generate user-friendly ban message."""
        end_date = ban_end.strftime('%Y-%m-%d %H:%M UTC')
        
        if previous_cancellations == 0:
            return (
                f"You have been temporarily banned from booking consultations for {ban_duration_days} days "
                f"(until {end_date}) due to cancelling an accepted consultation. "
                f"This helps protect lawyers' time and ensures fair access to legal services."
            )
        else:
            return (
                f"You have been temporarily banned from booking consultations for {ban_duration_days} days "
                f"(until {end_date}) due to repeatedly cancelling accepted consultations. "
                f"This is your {previous_cancellations + 1} cancellation in the past 30 days. "
                f"Please be more considerate of lawyers' time when booking consultations."
            )


                    
_consultation_ban_service_instance: Optional[ConsultationBanService] = None

def get_consultation_ban_service() -> ConsultationBanService:
    """Get or create the singleton consultation ban service instance."""
    global _consultation_ban_service_instance
    
    if _consultation_ban_service_instance is None:
        _consultation_ban_service_instance = ConsultationBanService()
    
    return _consultation_ban_service_instance
