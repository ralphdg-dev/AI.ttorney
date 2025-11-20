import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, timedelta
import httpx
from services.supabase_service import SupabaseService
from models.violation_types import ViolationType, SuspensionType, AccountStatus

logger = logging.getLogger(__name__)

class ViolationTrackingService:
    """
    Service for tracking content violations and managing user suspensions.
    
    Suspension Logic:
    1. User violates rule → strike_count += 1
    2. If strike_count >= 3:
       - If suspension_count >= 2 → Permanent Ban
       - Else → 7-day Suspension, suspension_count += 1, strike_count = 0
    3. After suspension expires → strike_count resets to 0
    
    This follows industry best practices from Discord, Reddit, and Slack.
    """
    
               
    STRIKES_FOR_SUSPENSION = 3
    SUSPENSIONS_FOR_BAN = 3
    SUSPENSION_DURATION_DAYS = 7
    
    def __init__(self):
        """Initialize the violation tracking service."""
        self.supabase = SupabaseService()
        logger.info(" Violation tracking service initialized")
    
    async def record_violation(
        self,
        user_id: str,
        violation_type: Union[str, ViolationType],
        content_text: str,
        moderation_result: Dict[str, Any],
        content_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record a content violation and apply appropriate action.
        
        Args:
            user_id: UUID of the user who violated rules
            violation_type: Type of content (ViolationType enum or string: 'forum_post', 'forum_reply', 'chatbot_prompt')
            content_text: The actual violating content
            moderation_result: Result from ContentModerationService.moderate_content()
            content_id: Optional ID of the post/reply/prompt
        
        Returns:
            Dict containing:
                - action_taken: 'strike_added', 'suspended', or 'banned'
                - strike_count: Current strike count
                - suspension_count: Current suspension count
                - suspension_end: When suspension ends (if suspended)
                - violation_id: UUID of the violation record
                - message: User-friendly message
        
        Raises:
            Exception: If database operations fail
        """
        try:
                                              
            violation_type_str = violation_type.value if isinstance(violation_type, ViolationType) else violation_type
            
                                     
            if not ViolationType.is_valid(violation_type_str):
                raise ValueError(f"Invalid violation_type: {violation_type_str}. Must be one of: {ViolationType.values()}")
            
            logger.info(f"🚨 Recording violation for user {user_id[:8]}... (type: {violation_type_str})")
            
                                             
            user_data = await self._get_user_status(user_id)
            if not user_data:
                raise Exception(f"User {user_id} not found")
            
                                                                                   
            current_strikes = user_data.get("strike_count") or 0
            current_suspensions = user_data.get("suspension_count") or 0
            
                                      
            current_strikes = int(current_strikes) if current_strikes is not None else 0
            current_suspensions = int(current_suspensions) if current_suspensions is not None else 0
            
                                            
            new_strike_count = current_strikes + 1
            logger.info(f" Strike count: {current_strikes} → {new_strike_count}")
            
                                                                              
            action_taken = "strike_added"
            new_suspension_count = current_suspensions
            suspension_end = None
            account_status = AccountStatus.ACTIVE
            
            if new_strike_count >= self.STRIKES_FOR_SUSPENSION:
                                                   
                if current_suspensions >= self.SUSPENSIONS_FOR_BAN:
                                                                          
                    action_taken = "banned"
                    account_status = AccountStatus.BANNED
                    new_suspension_count = current_suspensions + 1
                    new_strike_count = 0                                                   
                    logger.warning(f"🔨 PERMANENT BAN for user {user_id[:8]}... (suspension #{new_suspension_count})")
                else:
                                                   
                    action_taken = "suspended"
                    account_status = AccountStatus.SUSPENDED
                    suspension_end = datetime.utcnow() + timedelta(days=self.SUSPENSION_DURATION_DAYS)
                    new_suspension_count = current_suspensions + 1
                    new_strike_count = 0                                  
                    logger.warning(f"⏸  SUSPENDED for user {user_id[:8]}... for {self.SUSPENSION_DURATION_DAYS} days (suspension #{new_suspension_count})")
            
                                        
            await self._update_user_status(
                user_id=user_id,
                strike_count=new_strike_count,
                suspension_count=new_suspension_count,
                account_status=account_status,
                suspension_end=suspension_end
            )
            
                                                  
            violation_id = await self._insert_violation_record(
                user_id=user_id,
                violation_type=violation_type_str,
                content_id=content_id,
                content_text=content_text,
                moderation_result=moderation_result,
                action_taken=action_taken,
                strike_count_after=new_strike_count,
                suspension_count_after=new_suspension_count
            )
            
                                                                     
            if action_taken in ["suspended", "banned"]:
                await self._create_suspension_record(
                    user_id=user_id,
                    suspension_type=SuspensionType.PERMANENT if action_taken == "banned" else SuspensionType.TEMPORARY,
                    violation_id=violation_id,
                    suspension_number=new_suspension_count,
                    strikes_at_suspension=current_strikes + 1,
                    ends_at=suspension_end
                )
            
                                                    
            message = self._generate_user_message(
                action_taken=action_taken,
                strike_count=new_strike_count,
                suspension_count=new_suspension_count,
                suspension_end=suspension_end
            )
            
            logger.info(f" Violation recorded: {action_taken} (violation_id: {violation_id})")
            
            return {
                "action_taken": action_taken,
                "strike_count": new_strike_count,
                "suspension_count": new_suspension_count,
                "suspension_end": suspension_end.isoformat() if suspension_end else None,
                "violation_id": violation_id,
                "message": message
            }
            
        except Exception as e:
            logger.error(f" Failed to record violation: {str(e)}")
            raise Exception(f"Violation tracking error: {str(e)}")
    
    async def check_user_status(self, user_id: str) -> Dict[str, Any]:
        """
        Check if user is allowed to post/interact.
        
        Args:
            user_id: UUID of the user
        
        Returns:
            Dict containing:
                - is_allowed: bool (True if user can post)
                - account_status: 'active', 'suspended', or 'banned'
                - reason: Reason if not allowed
                - suspension_end: When suspension ends (if suspended)
        """
        try:
                                                 
            await self._check_expired_suspensions(user_id)
            
            user_data = await self._get_user_status(user_id)
            if not user_data:
                return {
                    "is_allowed": False,
                    "account_status": "unknown",
                    "reason": "User not found"
                }
            
            account_status = user_data.get("account_status", "active")
            suspension_end = user_data.get("suspension_end")
            
            if account_status == "banned":
                return {
                    "is_allowed": False,
                    "account_status": "banned",
                    "reason": "Your account has been permanently banned for repeated violations of community guidelines.",
                    "suspension_end": None
                }
            
            if account_status == "suspended":
                if suspension_end:
                    suspension_end_dt = datetime.fromisoformat(suspension_end.replace('Z', '+00:00'))
                    return {
                        "is_allowed": False,
                        "account_status": "suspended",
                        "reason": f"Your account is temporarily suspended until {suspension_end_dt.strftime('%Y-%m-%d %H:%M UTC')}.",
                        "suspension_end": suspension_end
                    }
            
            return {
                "is_allowed": True,
                "account_status": "active",
                "reason": None,
                "suspension_end": None
            }
            
        except Exception as e:
            logger.error(f" Failed to check user status: {str(e)}")
                                                          
            return {
                "is_allowed": True,
                "account_status": "active",
                "reason": None,
                "suspension_end": None
            }
    
    async def get_user_violations(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get violation history for a user.
        
        Args:
            user_id: UUID of the user
            limit: Maximum number of violations to return
            offset: Offset for pagination
        
        Returns:
            List of violation records
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.supabase.rest_url}/user_violations",
                    params={
                        "user_id": f"eq.{user_id}",
                        "order": "created_at.desc",
                        "limit": limit,
                        "offset": offset
                    },
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get violations: {response.status_code}")
                    return []
        except Exception as e:
            logger.error(f" Failed to get user violations: {str(e)}")
            return []
    
                            
    
    async def _get_user_status(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's current moderation status."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.supabase.rest_url}/users",
                    params={
                        "id": f"eq.{user_id}",
                        "select": "id,strike_count,suspension_count,account_status,suspension_end,last_violation_at"
                    },
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data[0] if data else None
                return None
        except Exception as e:
            logger.error(f" Failed to get user status: {str(e)}")
            return None
    
    async def _update_user_status(
        self,
        user_id: str,
        strike_count: int,
        suspension_count: int,
        account_status: Union[str, AccountStatus],
        suspension_end: Optional[datetime]
    ) -> bool:
        """Update user's moderation status."""
        try:
                                              
            account_status_str = account_status.value if isinstance(account_status, AccountStatus) else account_status
            
                                     
            if not AccountStatus.is_valid(account_status_str):
                raise ValueError(f"Invalid account_status: {account_status_str}. Must be one of: {AccountStatus.values()}")
            
            update_data = {
                "strike_count": strike_count,
                "suspension_count": suspension_count,
                "account_status": account_status_str,
                "suspension_end": suspension_end.isoformat() if suspension_end else None,
                "last_violation_at": datetime.utcnow().isoformat()
            }
            
            if account_status_str == AccountStatus.BANNED.value:
                update_data["banned_at"] = datetime.utcnow().isoformat()
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.patch(
                    f"{self.supabase.rest_url}/users",
                    params={"id": f"eq.{user_id}"},
                    json=update_data,
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                return response.status_code in [200, 204]
        except Exception as e:
            logger.error(f" Failed to update user status: {str(e)}")
            return False
    
    async def _insert_violation_record(
        self,
        user_id: str,
        violation_type: str,
        content_text: str,
        moderation_result: Dict[str, Any],
        action_taken: str,
        strike_count_after: int,
        suspension_count_after: int,
        content_id: Optional[str] = None
    ) -> str:
        """Insert violation record into database."""
        try:
            violation_data = {
                "user_id": user_id,
                "violation_type": violation_type,
                "content_id": content_id,
                "content_text": content_text[:1000],                       
                "flagged_categories": moderation_result.get("categories", {}),
                "category_scores": moderation_result.get("category_scores", {}),
                "violation_summary": moderation_result.get("violation_summary", ""),
                "action_taken": action_taken,
                "strike_count_after": strike_count_after,
                "suspension_count_after": suspension_count_after
                                                                                       
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = self.supabase._get_headers(use_service_key=True)
                headers["Prefer"] = "return=representation"
                
                response = await client.post(
                    f"{self.supabase.rest_url}/user_violations",
                    json=violation_data,
                    headers=headers
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    return data[0]["id"] if data else None
                else:
                    logger.error(f"Failed to insert violation: {response.status_code}")
                    return None
        except Exception as e:
            logger.error(f" Failed to insert violation record: {str(e)}")
            return None
    
    async def _create_suspension_record(
        self,
        user_id: str,
        suspension_type: Union[str, SuspensionType],
        violation_id: str,
        suspension_number: int,
        strikes_at_suspension: int,
        ends_at: Optional[datetime]
    ) -> bool:
        """Create suspension record in database."""
        try:
                                              
            suspension_type_str = suspension_type.value if isinstance(suspension_type, SuspensionType) else suspension_type
            
                                      
            if not SuspensionType.is_valid(suspension_type_str):
                raise ValueError(f"Invalid suspension_type: {suspension_type_str}. Must be one of: {SuspensionType.values()}")
            
            suspension_data = {
                "user_id": user_id,
                "suspension_type": suspension_type_str,
                "reason": f"Automatic {suspension_type_str} suspension after {strikes_at_suspension} strikes",
                "violation_ids": [violation_id],
                "suspension_number": suspension_number,
                "strikes_at_suspension": strikes_at_suspension,
                "ends_at": ends_at.isoformat() if ends_at else None,
                "status": "active"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.supabase.rest_url}/user_suspensions",
                    json=suspension_data,
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                return response.status_code in [200, 201]
        except Exception as e:
            logger.error(f" Failed to create suspension record: {str(e)}")
            return False
    
    async def _check_expired_suspensions(self, user_id: str) -> bool:
        """Check and reset expired suspensions for a user."""
        try:
            user_data = await self._get_user_status(user_id)
            if not user_data:
                return False
            
            if user_data.get("account_status") == AccountStatus.SUSPENDED.value:
                suspension_end = user_data.get("suspension_end")
                if suspension_end:
                    suspension_end_dt = datetime.fromisoformat(suspension_end.replace('Z', '+00:00'))
                    if suspension_end_dt <= datetime.utcnow():
                                                            
                        logger.info(f" Resetting expired suspension for user {user_id[:8]}...")
                        await self._update_user_status(
                            user_id=user_id,
                            strike_count=0,
                            suspension_count=user_data.get("suspension_count", 0),
                            account_status=AccountStatus.ACTIVE,
                            suspension_end=None
                        )
                        return True
            return False
        except Exception as e:
            logger.error(f" Failed to check expired suspensions: {str(e)}")
            return False
    
    def _generate_user_message(
        self,
        action_taken: str,
        strike_count: int,
        suspension_count: int,
        suspension_end: Optional[datetime]
    ) -> str:
        """Generate user-friendly message based on action taken."""
        if action_taken == "banned":
            return (
                "Your account has been permanently banned for repeated violations of our community guidelines. "
                "This is your third suspension. If you believe this was a mistake, please contact support."
            )
        elif action_taken == "suspended":
            end_date = suspension_end.strftime('%Y-%m-%d %H:%M UTC') if suspension_end else "unknown"
            return (
                f"Your account has been suspended until {end_date} for violating our community guidelines. "
                f"This is suspension #{suspension_count}. Your strike count has been reset. "
                f"Please review our community guidelines before posting again."
            )
        else:
            remaining_strikes = self.STRIKES_FOR_SUSPENSION - strike_count
            strike_word = "strike" if strike_count == 1 else "strikes"
            
                                                             
            remaining_text = {1: "One", 2: "Two", 3: "Three"}.get(remaining_strikes, str(remaining_strikes))
            
            return (
                f"Community guidelines violation detected.\n"
                f"You have {strike_count} {strike_word}. {remaining_text} more will lead to suspension."
            )


                    
_violation_tracking_service_instance: Optional[ViolationTrackingService] = None

def get_violation_tracking_service() -> ViolationTrackingService:
    """Get or create the singleton violation tracking service instance."""
    global _violation_tracking_service_instance
    
    if _violation_tracking_service_instance is None:
        _violation_tracking_service_instance = ViolationTrackingService()
    
    return _violation_tracking_service_instance
