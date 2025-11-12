from services.supabase_service import SupabaseService
from lawyer.models import (
    LawyerApplicationSubmit, 
    LawyerApplicationReview, 
    LawyerApplicationResponse,
    LawyerApplicationStatusResponse,
    LawyerApplicationHistoryResponse
)
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import logging
import uuid
import httpx

logger = logging.getLogger(__name__)

class LawyerApplicationService:
    """Service for handling lawyer applications with role/pending logic"""
    
    def __init__(self):
        self.supabase = SupabaseService()
    
    async def submit_application(self, user_id: str, application_data: LawyerApplicationSubmit) -> Dict[str, Any]:
        """Submit a new lawyer application"""
        try:
            # First, check if user can apply
            can_apply_result = await self._can_user_apply(user_id)
            if not can_apply_result["can_apply"]:
                return {
                    "success": False,
                    "error": can_apply_result["reason"]
                }
            
            # Create application record
            application_id = str(uuid.uuid4())
            application_record = {
                "id": application_id,
                "user_id": user_id,
                "full_name": application_data.full_name,
                "roll_signing_date": application_data.roll_signing_date.isoformat(),
                "ibp_id": application_data.ibp_id,
                "roll_number": application_data.roll_number,
                "selfie": application_data.selfie,
                "status": "pending",
                "version": 1,
                "parent_application_id": None,
                "is_latest": True,
                "submitted_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Insert application
            insert_result = await self._insert_application(application_record)
            if not insert_result["success"]:
                return insert_result
            
            # Update user status: role = 'registered_user', pending_lawyer = true
            user_update_result = await self._update_user_for_pending_application(user_id)
            if not user_update_result["success"]:
                # Rollback application if user update fails
                await self._delete_application(application_id)
                return {
                    "success": False,
                    "error": "Failed to update user status"
                }
            
            return {
                "success": True,
                "message": "Application submitted successfully",
                "application_id": application_id
            }
            
        except Exception as e:
            logger.error(f"Submit application error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def resubmit_application(self, user_id: str, application_data: LawyerApplicationSubmit) -> Dict[str, Any]:
        """Resubmit a lawyer application (creates new version)"""
        try:
            # First, check if user can resubmit
            can_apply_result = await self._can_user_resubmit(user_id)
            if not can_apply_result["can_apply"]:
                return {
                    "success": False,
                    "error": can_apply_result["reason"]
                }
            
            # Get current latest application
            current_app_result = await self._get_latest_user_application(user_id)
            if not current_app_result["success"]:
                return {
                    "success": False,
                    "error": "No previous application found"
                }
            
            current_app = current_app_result["data"]
            current_version = current_app.get("version", 1)
            current_app_id = current_app["id"]
            
            # Mark current application as not latest
            mark_old_result = await self._mark_application_as_old(current_app_id)
            if not mark_old_result["success"]:
                return mark_old_result
            
            # Create new application record with incremented version
            new_application_id = str(uuid.uuid4())
            new_application_record = {
                "id": new_application_id,
                "user_id": user_id,
                "full_name": application_data.full_name,
                "roll_signing_date": application_data.roll_signing_date.isoformat(),
                "ibp_id": application_data.ibp_id,
                "roll_number": application_data.roll_number,
                "selfie": application_data.selfie,
                "status": "pending",  # New resubmissions start as pending for admin review
                "version": current_version + 1,
                "parent_application_id": current_app_id,
                "is_latest": True,
                "submitted_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Insert new application
            insert_result = await self._insert_application(new_application_record)
            if not insert_result["success"]:
                # Rollback: mark old application as latest again
                await self._mark_application_as_latest(current_app_id)
                return insert_result
            
            # Update user status: role = 'registered_user', pending_lawyer = true
            user_update_result = await self._update_user_for_pending_application(user_id)
            if not user_update_result["success"]:
                # Rollback both changes
                await self._delete_application(new_application_id)
                await self._mark_application_as_latest(current_app_id)
                return {
                    "success": False,
                    "error": "Failed to update user status"
                }
            
            return {
                "success": True,
                "message": "Application resubmitted successfully",
                "application_id": new_application_id,
                "version": current_version + 1
            }
            
        except Exception as e:
            logger.error(f"Resubmit application error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_user_application_status(self, user_id: str) -> Dict[str, Any]:
        """Get user's current application status"""
        try:
            # Get user info
            user_result = await self.supabase.get_user_profile(user_id)
            if not user_result["success"]:
                return {"success": False, "error": "User not found"}
            
            user_data = user_result["data"]
            
            # Get latest application
            application_result = await self._get_latest_user_application(user_id)
            
            status_response = LawyerApplicationStatusResponse(
                has_application=application_result["success"],
                application=application_result.get("data") if application_result["success"] else None,
                can_apply=not user_data.get("is_blocked_from_applying", False),
                reject_count=user_data.get("reject_count", 0),
                is_blocked=user_data.get("is_blocked_from_applying", False),
                last_rejected_at=user_data.get("last_rejected_at")
            )
            
            return {
                "success": True,
                "data": status_response.dict()
            }
            
        except Exception as e:
            logger.error(f"Get user application status error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_pending_applications(self) -> Dict[str, Any]:
        """Get all pending applications (admin only)"""
        try:
            result = await self._get_applications_by_status("pending")
            return result
            
        except Exception as e:
            logger.error(f"Get pending applications error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def review_application(self, application_id: str, review_data: LawyerApplicationReview, admin_id: str) -> Dict[str, Any]:
        """Review an application (admin only)"""
        try:
            # Get application
            app_result = await self._get_application_by_id(application_id)
            if not app_result["success"]:
                return {"success": False, "error": "Application not found"}
            
            application = app_result["data"]
            user_id = application["user_id"]
            
            # Update application with review
            review_record = {
                "status": review_data.status,
                "reviewed_by": admin_id,
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "admin_notes": review_data.admin_notes,
                "matched_roll_id": review_data.matched_roll_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if review_data.matched_roll_id:
                review_record["matched_at"] = datetime.now(timezone.utc).isoformat()
            
            # Update application
            update_result = await self._update_application(application_id, review_record)
            if not update_result["success"]:
                return update_result
            
            # Apply role/pending logic based on status
            user_update_result = await self._apply_review_logic(user_id, review_data.status)
            if not user_update_result["success"]:
                return user_update_result
            
            return {
                "success": True,
                "message": f"Application {review_data.status} successfully"
            }
            
        except Exception as e:
            logger.error(f"Review application error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # Private helper methods
    async def _can_user_apply(self, user_id: str) -> Dict[str, Any]:
        """Check if user can submit an application"""
        try:
            # Get user profile
            user_result = await self.supabase.get_user_profile(user_id)
            if not user_result["success"]:
                return {"can_apply": False, "reason": "User not found"}
            
            user_data = user_result["data"]
            
            # Check if blocked from applying
            if user_data.get("is_blocked_from_applying", False):
                return {
                    "can_apply": False,
                    "reason": "You are blocked from applying due to multiple rejections"
                }
            
            # Check if user has pending application
            if user_data.get("pending_lawyer", False):
                return {
                    "can_apply": False,
                    "reason": "You already have a pending application"
                }
            
            return {"can_apply": True}
            
        except Exception as e:
            logger.error(f"Can user apply check error: {str(e)}")
            return {"can_apply": False, "reason": "Error checking eligibility"}
    
    async def _insert_application(self, application_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert application into database"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.supabase.rest_url}/lawyer_applications",
                    json=application_data,
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 201]:
                    return {"success": True}
                else:
                    error_data = response.json() if response.content else {}
                    logger.error(f"Insert application failed: {response.status_code}, {error_data}")
                    return {"success": False, "error": "Failed to create application"}
                    
        except Exception as e:
            logger.error(f"Insert application error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _update_user_for_pending_application(self, user_id: str) -> Dict[str, Any]:
        """Update user when application is submitted"""
        update_data = {
            "role": "registered_user",
            "pending_lawyer": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        return await self.supabase.update_user_profile(
            update_data, 
            {"id": user_id}
        )
    
    async def _apply_review_logic(self, user_id: str, status: str) -> Dict[str, Any]:
        """Apply role/pending logic based on review status"""
        try:
            if status == "accepted":
                # Accepted: role = 'verified_lawyer', pending_lawyer = false
                update_data = {
                    "role": "verified_lawyer",
                    "pending_lawyer": False,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
            elif status == "rejected":
                # Get current user data to increment reject_count
                user_result = await self.supabase.get_user_profile(user_id)
                if not user_result["success"]:
                    return {"success": False, "error": "User not found"}
                
                user_data = user_result["data"]
                current_reject_count = user_data.get("reject_count", 0)
                new_reject_count = current_reject_count + 1
                
                # Rejected: role = 'registered_user', pending_lawyer = false, increment reject_count
                update_data = {
                    "role": "registered_user",
                    "pending_lawyer": False,
                    "reject_count": new_reject_count,
                    "last_rejected_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Block if reject_count >= 3
                if new_reject_count >= 3:
                    update_data["is_blocked_from_applying"] = True
                    
            elif status == "resubmission":
                # Resubmission: role = 'registered_user', pending_lawyer = false
                update_data = {
                    "role": "registered_user",
                    "pending_lawyer": False,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            
            else:
                return {"success": False, "error": "Invalid status"}
            
            return await self.supabase.update_user_profile(
                update_data,
                {"id": user_id}
            )
            
        except Exception as e:
            logger.error(f"Apply review logic error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _get_latest_user_application(self, user_id: str) -> Dict[str, Any]:
        """Get user's latest application"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase.rest_url}/lawyer_applications?user_id=eq.{user_id}&is_latest=eq.true&select=id,user_id,full_name,roll_signing_date,ibp_id,roll_number,selfie,status,reviewed_by,reviewed_at,admin_notes,matched_roll_id,matched_at,submitted_at,updated_at,version,parent_application_id,is_latest,acknowledged",
                    headers=self.supabase._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        return {"success": True, "data": data[0]}
                    else:
                        return {"success": False, "error": "No application found"}
                else:
                    return {"success": False, "error": "Failed to get application"}
                    
        except Exception as e:
            logger.error(f"Get latest user application error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _get_applications_by_status(self, status: str) -> Dict[str, Any]:
        """Get applications by status"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase.rest_url}/lawyer_applications?status=eq.{status}&order=submitted_at.desc&select=*",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {"success": True, "data": data}
                else:
                    return {"success": False, "error": "Failed to get applications"}
                    
        except Exception as e:
            logger.error(f"Get applications by status error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _get_application_by_id(self, application_id: str) -> Dict[str, Any]:
        """Get application by ID"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase.rest_url}/lawyer_applications?id=eq.{application_id}&select=*",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        return {"success": True, "data": data[0]}
                    else:
                        return {"success": False, "error": "Application not found"}
                else:
                    return {"success": False, "error": "Failed to get application"}
                    
        except Exception as e:
            logger.error(f"Get application by ID error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _update_application(self, application_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update application"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.supabase.rest_url}/lawyer_applications?id=eq.{application_id}",
                    json=update_data,
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 204]:
                    return {"success": True}
                else:
                    error_data = response.json() if response.content else {}
                    return {"success": False, "error": error_data}
                    
        except Exception as e:
            logger.error(f"Update application error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _delete_application(self, application_id: str) -> Dict[str, Any]:
        """Delete application (for rollback purposes)"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.supabase.rest_url}/lawyer_applications?id=eq.{application_id}",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 204]:
                    return {"success": True}
                else:
                    return {"success": False, "error": "Failed to delete application"}
                    
        except Exception as e:
            logger.error(f"Delete application error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def clear_pending_lawyer_status(self, user_id: str) -> Dict[str, Any]:
        """Clear pending_lawyer flag when user completes accepted flow"""
        try:
            # Update user: pending_lawyer = false
            update_data = {
                "pending_lawyer": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = await self.supabase.update_user_profile(
                update_data,
                {"id": user_id}
            )
            
            if result["success"]:
                return {
                    "success": True,
                    "message": "Pending lawyer status cleared successfully"
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to clear pending lawyer status"
                }
                
        except Exception as e:
            logger.error(f"Clear pending lawyer status error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_user_application(self, user_id: str) -> Dict[str, Any]:
        """Get user's current application"""
        try:
            result = await self._get_latest_user_application(user_id)
            if result["success"]:
                return result["data"]
            return None
        except Exception as e:
            logger.error(f"Get user application error: {str(e)}")
            return None

    async def activate_verified_lawyer(self, user_id: str) -> Dict[str, Any]:
        """Update user role to verified_lawyer after accepting application approval"""
        try:
            # First, verify the user has an accepted application
            application = await self.get_user_application(user_id)
            
            if not application or application.get("status") != "accepted":
                return {
                    "success": False,
                    "error": "No accepted application found for this user"
                }
            
            # Update user: role = verified_lawyer, pending_lawyer = false
            update_data = {
                "role": "verified_lawyer",
                "pending_lawyer": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = await self.supabase.update_user_profile(
                update_data,
                {"id": user_id}
            )
            
            if result["success"]:
                return {
                    "success": True,
                    "message": "User role updated to verified lawyer successfully"
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to update user role"
                }
                
        except Exception as e:
            logger.error(f"Activate verified lawyer error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_user_application_history(self, user_id: str) -> Dict[str, Any]:
        """Get user's complete application history"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase.rest_url}/lawyer_applications?user_id=eq.{user_id}&order=version.asc&select=*",
                    headers=self.supabase._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    history_response = LawyerApplicationHistoryResponse(
                        applications=data,
                        total_applications=len(data)
                    )
                    return {
                        "success": True,
                        "data": history_response.dict()
                    }
                else:
                    return {"success": False, "error": "Failed to get application history"}
                    
        except Exception as e:
            logger.error(f"Get user application history error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def acknowledge_rejection(self, user_id: str) -> Dict[str, Any]:
        """Acknowledge that user has seen their rejection"""
        try:
            # Get the latest application
            app_result = await self._get_latest_user_application(user_id)
            if not app_result["success"]:
                return {"success": False, "error": "No application found"}
            
            application = app_result["data"]
            
            # Check if application is rejected
            if application.get("status") != "rejected":
                return {"success": False, "error": "Application is not rejected"}
            
            # Update acknowledged field
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.supabase.rest_url}/lawyer_applications?id=eq.{application['id']}",
                    json={"acknowledged": True},
                    headers=self.supabase._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"✅ User {user_id[:8]}... acknowledged rejection for application {application['id']}")
                    return {
                        "success": True,
                        "message": "Rejection acknowledged successfully"
                    }
                else:
                    logger.error(f"Failed to acknowledge rejection: {response.status_code}")
                    return {"success": False, "error": "Failed to acknowledge rejection"}
                    
        except Exception as e:
            logger.error(f"Acknowledge rejection error: {str(e)}")
            return {"success": False, "error": str(e)}

    # Helper methods for resubmission logic
    async def _can_user_resubmit(self, user_id: str) -> Dict[str, Any]:
        """Check if user can resubmit an application"""
        try:
            # Get user profile
            user_result = await self.supabase.get_user_profile(user_id)
            if not user_result["success"]:
                return {"can_apply": False, "reason": "User not found"}
            
            user_data = user_result["data"]
            
            # Check if blocked from applying
            if user_data.get("is_blocked_from_applying", False):
                return {
                    "can_apply": False,
                    "reason": "You are blocked from applying due to multiple rejections"
                }
            
            # Get current application status
            current_app_result = await self._get_latest_user_application(user_id)
            if not current_app_result["success"]:
                return {
                    "can_apply": False,
                    "reason": "No previous application found to resubmit"
                }
            
            current_app = current_app_result["data"]
            current_status = current_app.get("status")
            
            # Can only resubmit if status is 'rejected' or 'resubmission'
            if current_status not in ["rejected", "resubmission"]:
                return {
                    "can_apply": False,
                    "reason": f"Cannot resubmit application with status: {current_status}"
                }
            
            return {"can_apply": True}
            
        except Exception as e:
            logger.error(f"Can user resubmit check error: {str(e)}")
            return {"can_apply": False, "reason": "Error checking resubmission eligibility"}

    async def _mark_application_as_old(self, application_id: str) -> Dict[str, Any]:
        """Mark an application as not latest"""
        try:
            update_data = {
                "is_latest": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            return await self._update_application(application_id, update_data)
        except Exception as e:
            logger.error(f"Mark application as old error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _mark_application_as_latest(self, application_id: str) -> Dict[str, Any]:
        """Mark an application as latest (for rollback)"""
        try:
            update_data = {
                "is_latest": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            return await self._update_application(application_id, update_data)
        except Exception as e:
            logger.error(f"Mark application as latest error: {str(e)}")
            return {"success": False, "error": str(e)}
