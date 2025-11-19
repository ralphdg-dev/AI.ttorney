"""
Appeal Service for AI.ttorney
Business logic for suspension appeal system
"""

from services.supabase_service import SupabaseService
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
from uuid import UUID

logger = logging.getLogger(__name__)


class AppealService:
    def __init__(self):
        self.supabase = SupabaseService()
    
    async def create_appeal(
        self,
        user_id: str,
        suspension_id: str,
        appeal_reason: str,
        appeal_message: str,
        evidence_urls: List[str] = None
    ) -> Dict[str, Any]:
        """Create a new suspension appeal"""
        try:
            # 1. Verify user is suspended
            user_response = await self.supabase.client.table("users")\
                .select("id, account_status, suspension_end")\
                .eq("id", user_id)\
                .single()\
                .execute()
            
            if not user_response.data:
                return {"success": False, "error": "User not found"}
            
            user = user_response.data
            if user.get("account_status") != "suspended":
                return {"success": False, "error": "You are not currently suspended"}
            
            # 2. Verify suspension exists and belongs to user
            suspension_response = await self.supabase.client.table("user_suspensions")\
                .select("*")\
                .eq("id", suspension_id)\
                .eq("user_id", user_id)\
                .eq("status", "active")\
                .single()\
                .execute()
            
            if not suspension_response.data:
                return {"success": False, "error": "Suspension not found or not active"}
            
            suspension = suspension_response.data
            
            # 3. Check if appeal already exists for this suspension
            existing_appeal = await self.supabase.client.table("user_suspension_appeals")\
                .select("id, status")\
                .eq("suspension_id", suspension_id)\
                .in_("status", ["pending", "under_review"])\
                .execute()
            
            if existing_appeal.data:
                return {"success": False, "error": "An appeal is already pending for this suspension"}
            
            # 4. Create appeal record
            appeal_data = {
                "user_id": user_id,
                "suspension_id": suspension_id,
                "appeal_reason": appeal_reason,
                "appeal_message": appeal_message,
                "evidence_urls": evidence_urls or [],
                "status": "pending",
                "original_end_date": suspension.get("ends_at")
            }
            
            appeal_response = await self.supabase.client.table("user_suspension_appeals")\
                .insert(appeal_data)\
                .execute()
            
            if not appeal_response.data:
                return {"success": False, "error": "Failed to create appeal"}
            
            appeal = appeal_response.data[0]
            
            # 5. Update suspension to mark it has an appeal
            await self.supabase.client.table("user_suspensions")\
                .update({
                    "has_appeal": True,
                    "appeal_id": appeal["id"],
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", suspension_id)\
                .execute()
            
            logger.info(f"Appeal created: {appeal['id']} for user {user_id}")
            
            return {
                "success": True,
                "appeal": appeal
            }
            
        except Exception as e:
            logger.error(f"Error creating appeal: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_user_appeals(self, user_id: str) -> Dict[str, Any]:
        """Get all appeals for a user"""
        try:
            response = await self.supabase.client.table("user_suspension_appeals")\
                .select("*, user_suspensions(*)")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .execute()
            
            return {
                "success": True,
                "appeals": response.data or []
            }
            
        except Exception as e:
            logger.error(f"Error getting user appeals: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_current_suspension(self, user_id: str) -> Dict[str, Any]:
        """Get current active suspension for a user"""
        try:
            response = await self.supabase.client.table("user_suspensions")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("status", "active")\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if not response.data:
                return {"success": False, "error": "No active suspension found"}
            
            suspension = response.data[0]
            
            # Check if user can appeal (no pending appeal exists)
            can_appeal = not suspension.get("has_appeal", False)
            
            # Cannot appeal permanent bans (3rd suspension)
            if suspension.get("suspension_type") == "permanent":
                can_appeal = False
            
            return {
                "success": True,
                "suspension": suspension,
                "can_appeal": can_appeal
            }
            
        except Exception as e:
            logger.error(f"Error getting current suspension: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_pending_appeals(
        self,
        status: str = "pending",
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get appeals for admin review with pagination"""
        try:
            offset = (page - 1) * limit
            
            # Get appeals with user and suspension details
            response = await self.supabase.client.table("user_suspension_appeals")\
                .select("""
                    *,
                    users!user_id(id, username, email, full_name),
                    user_suspensions(
                        id, suspension_type, reason, started_at, ends_at,
                        suspension_number, strikes_at_suspension
                    )
                """)\
                .eq("status", status)\
                .order("created_at", desc=False)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            # Get total count
            count_response = await self.supabase.client.table("user_suspension_appeals")\
                .select("id", count="exact")\
                .eq("status", status)\
                .execute()
            
            total = count_response.count or 0
            
            return {
                "success": True,
                "appeals": response.data or [],
                "total": total,
                "page": page,
                "limit": limit,
                "has_more": total > (page * limit)
            }
            
        except Exception as e:
            logger.error(f"Error getting pending appeals: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def review_appeal(
        self,
        appeal_id: str,
        admin_id: str,
        decision: str,
        admin_response: str,
        admin_notes: Optional[str] = None,
        new_end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Review and decide on an appeal"""
        try:
            # 1. Get appeal details
            appeal_response = await self.supabase.client.table("user_suspension_appeals")\
                .select("*, user_suspensions(*)")\
                .eq("id", appeal_id)\
                .single()\
                .execute()
            
            if not appeal_response.data:
                return {"success": False, "error": "Appeal not found"}
            
            appeal = appeal_response.data
            
            if appeal["status"] not in ["pending", "under_review"]:
                return {"success": False, "error": "Appeal has already been reviewed"}
            
            suspension = appeal.get("user_suspensions")
            if not suspension:
                return {"success": False, "error": "Suspension not found"}
            
            user_id = appeal["user_id"]
            suspension_id = appeal["suspension_id"]
            
            # 2. Process decision
            decision_status = "approved" if decision in ["lift_suspension", "reduce_duration"] else "rejected"
            
            if decision == "lift_suspension":
                # Lift the suspension completely
                await self._lift_suspension(suspension_id, user_id, admin_id, admin_response)
                
            elif decision == "reduce_duration":
                # Reduce suspension duration
                if not new_end_date:
                    return {"success": False, "error": "new_end_date required for reduce_duration"}
                
                await self._reduce_suspension(suspension_id, user_id, new_end_date)
            
            # 3. Update appeal record
            update_data = {
                "status": decision_status,
                "decision": decision,
                "reviewed_by": admin_id,
                "reviewed_at": datetime.utcnow().isoformat(),
                "admin_response": admin_response,
                "admin_notes": admin_notes,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if decision == "reduce_duration" and new_end_date:
                update_data["new_end_date"] = new_end_date.isoformat()
            
            await self.supabase.client.table("user_suspension_appeals")\
                .update(update_data)\
                .eq("id", appeal_id)\
                .execute()
            
            # 4. Notify user of decision
            await self.supabase.client.table("users")\
                .update({"has_pending_appeal_response": True})\
                .eq("id", user_id)\
                .execute()
            
            logger.info(f"Appeal {appeal_id} reviewed by admin {admin_id}: {decision}")
            
            return {
                "success": True,
                "message": f"Appeal {decision_status}",
                "decision": decision
            }
            
        except Exception as e:
            logger.error(f"Error reviewing appeal: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _lift_suspension(
        self,
        suspension_id: str,
        user_id: str,
        admin_id: str,
        reason: str
    ):
        """Lift a suspension completely"""
        try:
            # Update suspension status
            await self.supabase.client.table("user_suspensions")\
                .update({
                    "status": "lifted",
                    "lifted_at": datetime.utcnow().isoformat(),
                    "lifted_by": admin_id,
                    "lifted_reason": f"Appeal approved: {reason}",
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", suspension_id)\
                .execute()
            
            # Update user status back to active
            await self.supabase.client.table("users")\
                .update({
                    "account_status": "active",
                    "suspension_end": None
                })\
                .eq("id", user_id)\
                .execute()
            
            logger.info(f"Suspension {suspension_id} lifted for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error lifting suspension: {str(e)}")
            raise
    
    async def _reduce_suspension(
        self,
        suspension_id: str,
        user_id: str,
        new_end_date: datetime
    ):
        """Reduce suspension duration"""
        try:
            # Update suspension end date
            await self.supabase.client.table("user_suspensions")\
                .update({
                    "ends_at": new_end_date.isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", suspension_id)\
                .execute()
            
            # Update user suspension_end
            await self.supabase.client.table("users")\
                .update({"suspension_end": new_end_date.isoformat()})\
                .eq("id", user_id)\
                .execute()
            
            logger.info(f"Suspension {suspension_id} reduced to {new_end_date}")
            
        except Exception as e:
            logger.error(f"Error reducing suspension: {str(e)}")
            raise
    
    async def get_appeal_stats(self) -> Dict[str, Any]:
        """Get appeal statistics for admin dashboard"""
        try:
            # Get counts by status
            stats = {
                "pending": 0,
                "under_review": 0,
                "approved": 0,
                "rejected": 0,
                "total": 0
            }
            
            for status in ["pending", "under_review", "approved", "rejected"]:
                response = await self.supabase.client.table("user_suspension_appeals")\
                    .select("id", count="exact")\
                    .eq("status", status)\
                    .execute()
                
                stats[status] = response.count or 0
            
            stats["total"] = sum(stats.values())
            
            # Calculate average review time for approved/rejected appeals
            reviewed_response = await self.supabase.client.table("user_suspension_appeals")\
                .select("created_at, reviewed_at")\
                .in_("status", ["approved", "rejected"])\
                .not_.is_("reviewed_at", "null")\
                .execute()
            
            if reviewed_response.data:
                total_hours = 0
                count = 0
                for appeal in reviewed_response.data:
                    created = datetime.fromisoformat(appeal["created_at"].replace('Z', '+00:00'))
                    reviewed = datetime.fromisoformat(appeal["reviewed_at"].replace('Z', '+00:00'))
                    hours = (reviewed - created).total_seconds() / 3600
                    total_hours += hours
                    count += 1
                
                stats["avg_review_time_hours"] = round(total_hours / count, 2) if count > 0 else None
            else:
                stats["avg_review_time_hours"] = None
            
            return {
                "success": True,
                "stats": stats
            }
            
        except Exception as e:
            logger.error(f"Error getting appeal stats: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def update_appeal_status(
        self,
        appeal_id: str,
        status: str
    ) -> Dict[str, Any]:
        """Update appeal status (for admin workflow management)"""
        try:
            await self.supabase.client.table("user_suspension_appeals")\
                .update({
                    "status": status,
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", appeal_id)\
                .execute()
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Error updating appeal status: {str(e)}")
            return {"success": False, "error": str(e)}
