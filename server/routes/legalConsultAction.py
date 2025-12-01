from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from typing import List, Optional, Dict, Any
import logging
from pydantic import BaseModel
from datetime import datetime, date
from config.dependencies import get_current_user as get_auth_user, get_supabase
from services.notification_service import NotificationService
from services.consultation_service import ConsultationService
from services.consultation_request_service import ConsultationRequestService
from services.consultation_ban_service import get_consultation_ban_service

logger = logging.getLogger(__name__)

                   
logging.basicConfig(level=logging.INFO)

               
router = APIRouter(prefix="/api/consult-actions", tags=["consultation-actions"])

# ============================================================================
# CRITICAL ID RELATIONSHIPS DOCUMENTATION
# ============================================================================
# consultation_requests.lawyer_id → lawyer_info.id (PRIMARY KEY, NOT users.id)
# lawyer_info.lawyer_id → users.id (Foreign key to user account)
# 
# When querying consultations for a lawyer:
# 1. Get lawyer_info.id using: lawyer_info WHERE lawyer_id = auth.uid()
# 2. Query consultations using: consultation_requests WHERE lawyer_id = lawyer_info.id
#
# When sending notifications:
# 1. Get lawyer_info.lawyer_id (users.id) from lawyer_info table
# 2. Send notification to lawyer_info.lawyer_id (the user account)
# ============================================================================

                 
class ConsultationRequest(BaseModel):
    id: str
    user_id: str
    lawyer_id: Optional[str]
    message: str
    email: Optional[str]
    mobile_number: Optional[str]
    status: str
    consultation_date: Optional[str]
    consultation_time: Optional[str]
    consultation_mode: Optional[str]
    requested_at: Optional[str]
    responded_at: Optional[str]
    created_at: str
    updated_at: str
    client_name: str
    client_email: str
    client_username: Optional[str]

class ConsultationStats(BaseModel):
    total_requests: int
    pending_requests: int
    accepted_requests: int
    completed_requests: int
    rejected_requests: int
    cancelled_requests: int
    today_sessions: int

class SuccessResponse(BaseModel):
    success: bool
    message: str

                                            
def get_current_user_dict(user = Depends(get_auth_user)) -> Dict[str, Any]:
    """
    Convert auth user to dict format for compatibility
    """
    return {
        "id": user.id,
        "email": user.email
    }

                                       
def transform_consultation_data(consultation: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform raw consultation data with user information
    """
    try:
        user_data = consultation.get('users', {})
        if not isinstance(user_data, dict):
            logger.warning(f"⚠️ Invalid user_data type: {type(user_data)}, setting to empty dict")
            user_data = {}
            
        return {
            "id": consultation.get("id"),
            "user_id": consultation.get("user_id"),
            "lawyer_id": consultation.get("lawyer_id"),
            "message": consultation.get("message"),
            "email": consultation.get("email"),
            "mobile_number": consultation.get("mobile_number"),
            "status": consultation.get("status"),
            "consultation_date": consultation.get("consultation_date"),
            "consultation_time": consultation.get("consultation_time"),
            "consultation_mode": consultation.get("consultation_mode"),
            "requested_at": consultation.get("requested_at"),
            "responded_at": consultation.get("responded_at"),
            "created_at": consultation.get("created_at"),
            "updated_at": consultation.get("updated_at"),
            "client_name": user_data.get("full_name", "Unknown Client"),
            "client_email": user_data.get("email", consultation.get("email")),
            "client_username": user_data.get("username"),
            "client_profile_photo": user_data.get("profile_photo")
        }
    except Exception as e:
        logger.error(f"❌ Error in transform_consultation_data: {e}", exc_info=True)
        logger.error(f"❌ Consultation data: {consultation}")
        raise

async def fetch_user_data_fallback(supabase: Client, user_id: str) -> Dict[str, Any]:
    """
    Fallback function to fetch user data when JOIN fails
    """
    try:
        logger.info(f"🔍 FALLBACK: Fetching user data for user_id: {user_id[:8]}...")
        user_response = supabase.table("users").select("full_name, email, username, profile_photo").eq("id", user_id).execute()
        if user_response.data and len(user_response.data) > 0:
            user_data = user_response.data[0]
            logger.info(f"✅ FALLBACK: User data found: {user_data}")
            return user_data
        else:
            logger.warning(f"❌ FALLBACK: No user found for user_id: {user_id[:8]}...")
    except Exception as e:
        logger.error(f"❌ FALLBACK: Failed to fetch user data: {e}")
    return {}

                              
USER_JOIN_QUERY = """*,
    users!consultation_requests_user_id_fkey(
        full_name,
        email,
        username,
        profile_photo
    )
"""

@router.get("/my-consultations", response_model=List[ConsultationRequest])
async def get_my_consultations(
    status_filter: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    supabase: Client = Depends(get_supabase)
):
    """
    Get consultation requests for the logged-in lawyer with client names from users table
    """
    try:
        user_id = current_user["id"]
        
        # STEP 1: Get lawyer_info.id from users.id
        # consultation_requests.lawyer_id references lawyer_info.id (NOT users.id)
        try:
            logger.info(f"🔍 Looking up lawyer_info for user_id: {user_id[:8]}...")
            lawyer_info_response = supabase.table("lawyer_info").select("id, name").eq("lawyer_id", user_id).execute()
            
            if not lawyer_info_response.data or len(lawyer_info_response.data) == 0:
                logger.warning(f"⚠️  No lawyer_info found for user: {user_id[:8]}...")
                return []
            
            lawyer_info_id = lawyer_info_response.data[0]["id"]
            lawyer_name = lawyer_info_response.data[0].get("name", "Unknown")
            logger.info(f"✅ Found lawyer_info.id: {lawyer_info_id[:8]}... for {lawyer_name}")
            logger.info(f"📋 Fetching consultations WHERE lawyer_id = {lawyer_info_id[:8]}... (filter: {status_filter or 'all'})")
        except Exception as e:
            logger.error(f" Error fetching lawyer_info: {e}")
            return []
        
                                              
        query = supabase.table("consultation_requests").select(USER_JOIN_QUERY).eq("lawyer_id", lawyer_info_id)
        
                              
        logger.info(f" Query: consultation_requests WHERE lawyer_id = {lawyer_info_id}")
        
                                         
        if status_filter and status_filter != "all":
            query = query.eq("status", status_filter)
        
                                               
        query = query.order("created_at", desc=True)
        
                       
        response = query.execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f" Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        consultations = response.data if hasattr(response, 'data') else []
        
        # ALWAYS use fallback to ensure we get user data
        enhanced_consultations = []
        
        # Process consultations with proper async handling
        for idx, consultation in enumerate(consultations):
            logger.info(f"  [{idx+1}] Processing consultation: {consultation.get('id', 'unknown')[:8]}...")
            logger.info(f"  [{idx+1}] Keys: {list(consultation.keys())}")
            logger.info(f"  [{idx+1}] Has 'users': {'users' in consultation}")
            
            # Always try to get user data, either from JOIN or fallback
            user_id = consultation.get('user_id')
            if user_id:
                # Check if JOIN worked
                if 'users' in consultation and consultation['users']:
                    logger.info(f"  [{idx+1}] ✅ Users data found in JOIN: {consultation['users']}")
                else:
                    logger.warning(f"  [{idx+1}] ❌ Missing 'users' object! Using fallback query...")
                    try:
                        fallback_user_data = await fetch_user_data_fallback(supabase, user_id)
                        if fallback_user_data:
                            consultation['users'] = fallback_user_data
                            logger.info(f"  [{idx+1}] ✅ Fallback user data fetched: {fallback_user_data}")
                        else:
                            logger.warning(f"  [{idx+1}] ❌ Fallback fetch returned no data")
                    except Exception as e:
                        logger.error(f"  [{idx+1}] ❌ Fallback fetch failed: {e}")
            else:
                logger.error(f"  [{idx+1}] ❌ No user_id found in consultation!")
                
            enhanced_consultations.append(consultation)
        
        # Replace original consultations with enhanced ones
        consultations = enhanced_consultations
        
        # STEP 3: Log results and debug if empty
        logger.info(f"📊 Found {len(consultations)} consultation(s) for lawyer_info.id: {lawyer_info_id[:8]}...")
        if consultations:
            logger.info(f"✅ Sample consultation: id={consultations[0].get('id', 'N/A')[:8]}... status={consultations[0].get('status', 'N/A')}")
        else:
            logger.warning(f"⚠️  No consultations found for lawyer_info.id: {lawyer_info_id[:8]}...")
            # Debug: Check if consultations exist in DB at all
            all_response = supabase.table("consultation_requests").select("id, lawyer_id, user_id, status, created_at").order("created_at", desc=True).limit(10).execute()
            if all_response.data:
                logger.info(f"🔍 DEBUG: Total consultations in DB: {len(all_response.data)}")
                for idx, c in enumerate(all_response.data):
                    logger.info(f"  [{idx+1}] lawyer_id={c.get('lawyer_id', 'NULL')[:8] if c.get('lawyer_id') else 'NULL'}... status={c.get('status')}")
                logger.info(f"🎯 Looking for lawyer_info.id: {lawyer_info_id[:8]}...")
            else:
                logger.warning(f"🚨 NO CONSULTATIONS EXIST IN DATABASE AT ALL")
        
                                                  
        transformed_consultations = [transform_consultation_data(c) for c in consultations]
        
        # DEBUG: Log transformed data to verify profile photos are included
        logger.info(f"🔍 DEBUG: Transformed consultation data:")
        for idx, transformed in enumerate(transformed_consultations):
            logger.info(f"  [{idx+1}] client_name: {transformed.get('client_name')}")
            logger.info(f"  [{idx+1}] client_profile_photo: {transformed.get('client_profile_photo')}")
        
        logger.info(f" Returning {len(transformed_consultations)} consultations for lawyer_info.id {lawyer_info_id}")
        return transformed_consultations
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ CRITICAL ERROR in get_my_consultations: {str(e)}", exc_info=True)
        logger.error(f"❌ Error type: {type(e).__name__}")
        logger.error(f"❌ User ID: {current_user.get('id', 'unknown')[:8]}...")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/stats", response_model=ConsultationStats)
async def get_consultation_stats(
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    supabase: Client = Depends(get_supabase)
):
    """
    Get statistics for the logged-in lawyer's consultation requests
    """
    try:
        user_id = current_user["id"]
        
        # STEP 1: Get lawyer_info.id from users.id
        try:
            logger.info(f"📊 Fetching stats for user_id: {user_id[:8]}...")
            lawyer_info_response = supabase.table("lawyer_info").select("id, name").eq("lawyer_id", user_id).execute()
            
            if not lawyer_info_response.data or len(lawyer_info_response.data) == 0:
                logger.warning(f"⚠️  No lawyer_info found for user: {user_id[:8]}...")
                return ConsultationStats(
                    total_requests=0,
                    pending_requests=0,
                    accepted_requests=0,
                    completed_requests=0,
                    rejected_requests=0,
                    cancelled_requests=0,
                    today_sessions=0
                )
            
            lawyer_info_id = lawyer_info_response.data[0]["id"]
        except Exception as e:
            logger.error(f" Error fetching lawyer_info: {e}")
            return ConsultationStats(
                total_requests=0,
                pending_requests=0,
                accepted_requests=0,
                completed_requests=0,
                rejected_requests=0,
                cancelled_requests=0,
                today_sessions=0
            )
        
                                              
        response = supabase.table("consultation_requests").select("*").eq("lawyer_id", lawyer_info_id).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        consultations = response.data if hasattr(response, 'data') else []
        
                         
        total_requests = len(consultations)
        pending_requests = len([c for c in consultations if c.get("status") == "pending"])
        accepted_requests = len([c for c in consultations if c.get("status") == "accepted"])
        completed_requests = len([c for c in consultations if c.get("status") == "completed"])
        rejected_requests = len([c for c in consultations if c.get("status") == "rejected"])
        cancelled_requests = len([c for c in consultations if c.get("status") == "cancelled"])                 
        
                                                                       
        today = date.today().isoformat()
        today_sessions = len([
            c for c in consultations 
            if c.get("status") == "accepted" and c.get("consultation_date") == today
        ])
        
        stats = ConsultationStats(
            total_requests=total_requests,
            pending_requests=pending_requests,
            accepted_requests=accepted_requests,
            completed_requests=completed_requests,
            rejected_requests=rejected_requests,
            cancelled_requests=cancelled_requests, 
            today_sessions=today_sessions
        )
        
        return stats
        
    except Exception as e:
        logger.error(f" Error fetching stats: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{consultation_id}", response_model=ConsultationRequest)
async def get_consultation_detail(
    consultation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    supabase: Client = Depends(get_supabase)
):
    """
    Get a specific consultation request by ID
    """
    try:
        user_id = current_user["id"]
        
                                          
        try:
            lawyer_info_response = supabase.table("lawyer_info").select("id").eq("lawyer_id", user_id).execute()
            
            if not lawyer_info_response.data or len(lawyer_info_response.data) == 0:
                logger.warning(f"  No lawyer_info found for user: {user_id}")
                raise HTTPException(status_code=404, detail="Lawyer profile not found")
            
            lawyer_info_id = lawyer_info_response.data[0]["id"]
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f" Error fetching lawyer_info: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
        
                                           
        response = supabase.table("consultation_requests").select(USER_JOIN_QUERY).eq("id", consultation_id).eq("lawyer_id", lawyer_info_id).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        consultations = response.data if hasattr(response, 'data') else []
        
        if not consultations:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        consultation = consultations[0]
        
        # DEBUG: Log raw consultation data to check if users object is present
        logger.info(f"🔍 DEBUG: Single consultation raw data:")
        logger.info(f"  Keys: {list(consultation.keys())}")
        logger.info(f"  Has 'users': {'users' in consultation}")
        
        if 'users' in consultation and consultation['users']:
            logger.info(f"  ✅ Users data found in JOIN: {consultation['users']}")
        else:
            logger.warning(f"  ❌ Missing 'users' object! Using fallback query...")
            # Fallback: manually fetch user data
            user_id = consultation.get('user_id')
            if user_id:
                try:
                    fallback_user_data = await fetch_user_data_fallback(supabase, user_id)
                    if fallback_user_data:
                        consultation['users'] = fallback_user_data
                        logger.info(f"  ✅ Fallback user data fetched: {fallback_user_data}")
                    else:
                        logger.warning(f"  ❌ Fallback fetch returned no data")
                except Exception as e:
                    logger.error(f"  ❌ Fallback fetch failed: {e}")
            else:
                logger.error(f"  ❌ No user_id found in consultation!")
        
        # DEBUG: Log final transformed data
        transformed_data = transform_consultation_data(consultation)
        logger.info(f"🔍 DEBUG: Final transformed consultation:")
        logger.info(f"  client_name: {transformed_data.get('client_name')}")
        logger.info(f"  client_profile_photo: {transformed_data.get('client_profile_photo')}")
        
        return transformed_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching consultation detail: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{consultation_id}/accept", response_model=SuccessResponse)
async def accept_consultation(
    consultation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    supabase: Client = Depends(get_supabase)
):
    """
    Accept a consultation request
    """
    return await update_consultation_status(consultation_id, "accepted", current_user, supabase)

@router.post("/{consultation_id}/reject", response_model=SuccessResponse)
async def reject_consultation(
    consultation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    supabase: Client = Depends(get_supabase)
):
    """
    Reject a consultation request
    """
    return await update_consultation_status(consultation_id, "rejected", current_user, supabase)

@router.post("/{consultation_id}/complete", response_model=SuccessResponse)
async def complete_consultation(
    consultation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    supabase: Client = Depends(get_supabase)
):
    """
    Mark a consultation as completed
    """
    return await update_consultation_status(consultation_id, "completed", current_user, supabase)

async def update_consultation_status(
    consultation_id: str, 
    new_status: str, 
    current_user: Dict[str, Any],
    supabase: Client
) -> SuccessResponse:
    """
    Helper function to update consultation status
    """
    try:
        user_id = current_user["id"]
        now = datetime.now().isoformat()
        
                                          
        try:
            lawyer_info_response = supabase.table("lawyer_info").select("id").eq("lawyer_id", user_id).execute()
            
            if not lawyer_info_response.data or len(lawyer_info_response.data) == 0:
                logger.warning(f"  No lawyer_info found for user: {user_id}")
                raise HTTPException(status_code=404, detail="Lawyer profile not found")
            
            lawyer_info_id = lawyer_info_response.data[0]["id"]
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f" Error fetching lawyer_info: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
        
                                                              
        response = supabase.table("consultation_requests").select("*").eq("id", consultation_id).eq("lawyer_id", lawyer_info_id).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        consultations = response.data if hasattr(response, 'data') else []
        
        if not consultations:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
                                        
        update_data = {
            "status": new_status,
            "updated_at": now
        }
        
                                                        
        if new_status in ["accepted", "rejected"] and not consultations[0].get("responded_at"):
            update_data["responded_at"] = now
        
        update_response = supabase.table("consultation_requests").update(update_data).eq("id", consultation_id).execute()
        
        if hasattr(update_response, 'error') and update_response.error:
            logger.error(f"Supabase update error: {update_response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        await _send_consultation_notification(supabase, consultations[0], new_status)
        
        return SuccessResponse(success=True, message=f"Consultation {new_status} successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating consultation status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{consultation_id}/cancel", response_model=SuccessResponse)
async def cancel_consultation(
    consultation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    supabase: Client = Depends(get_supabase)
):
    """
    Cancel a consultation request (user-initiated)
    """
    try:
        user_id = current_user["id"]
        now = datetime.now().isoformat()
        
                                                            
        response = supabase.table("consultation_requests").select("*").eq("id", consultation_id).eq("user_id", user_id).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        consultations = response.data if hasattr(response, 'data') else []
        
        if not consultations:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        current_status = consultations[0].get("status")
        consultation_data = consultations[0]
        
                                                                        
        if current_status not in ["pending", "accepted"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot cancel consultation with status: {current_status}"
            )
        
                                                                      
        is_accepted_consultation = (
            current_status == "accepted" or 
            consultation_data.get("responded_at") is not None
        )
        
                                        
        update_data = {
            "status": "cancelled",
            "updated_at": now,
            "responded_at": now
        }
        
        update_response = supabase.table("consultation_requests").update(update_data).eq("id", consultation_id).execute()
        
        if hasattr(update_response, 'error') and update_response.error:
            logger.error(f"Supabase update error: {update_response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
                                                                     
        ban_message = None
        if is_accepted_consultation:
            try:
                ban_service = get_consultation_ban_service()
                ban_result = await ban_service.apply_cancellation_ban(
                    user_id=user_id,
                    consultation_id=consultation_id,
                    consultation_data=consultation_data
                )
                ban_message = ban_result.get("message")
                logger.info(f"Applied consultation ban for user {user_id[:8]}... - {ban_result.get('ban_duration_days')} days")
            except Exception as e:
                logger.error(f"Failed to apply consultation ban: {str(e)}")
                                                                      
        
        await _send_consultation_notification(supabase, consultation_data, "cancelled")
        
                                                           
        response_message = "Consultation cancelled successfully"
        if ban_message:
            response_message += f"\n\nImportant: {ban_message}"
        
        return SuccessResponse(success=True, message=response_message)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling consultation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def _send_consultation_notification(supabase: Client, consultation: Dict[str, Any], status: str):
    """
    Send notification based on consultation status change.
    
    CRITICAL: consultation["lawyer_id"] = lawyer_info.id (PRIMARY KEY)
    We need to get lawyer_info.lawyer_id (users.id) to send notification to user account.
    """
    try:
        notification_service = NotificationService(supabase)
        
        # Get lawyer_info.lawyer_id (users.id) for notification
        # consultation["lawyer_id"] is lawyer_info.id, not users.id
        logger.info(f"📬 Preparing notification for status: {status}")
        lawyer_result = supabase.table("lawyer_info").select("name, lawyer_id").eq("id", consultation["lawyer_id"]).execute()
        if not lawyer_result.data:
            logger.warning(f"⚠️  Lawyer not found for lawyer_info.id: {consultation['lawyer_id'][:8]}...")
            return
        
        lawyer_name = lawyer_result.data[0]["name"]
        lawyer_user_id = lawyer_result.data[0]["lawyer_id"]  # This is users.id for notifications
        user_id = consultation["user_id"]
        consultation_id = consultation["id"]
        
        logger.info(f"📧 Sending {status} notification: lawyer={lawyer_name}, user_id={user_id[:8]}...")
        
        if status == "accepted":
            await notification_service.notify_consultation_accepted(
                user_id=user_id,
                lawyer_name=lawyer_name,
                consultation_date=consultation.get("consultation_date", "TBD"),
                consultation_time=consultation.get("consultation_time", "TBD"),
                consultation_id=consultation_id
            )
        elif status == "rejected":
            await notification_service.notify_consultation_rejected(
                user_id=user_id,
                lawyer_name=lawyer_name,
                consultation_id=consultation_id
            )
        elif status == "completed":
            await notification_service.notify_consultation_completed(
                user_id=user_id,
                lawyer_name=lawyer_name,
                consultation_id=consultation_id
            )
        elif status == "cancelled":
            user_result = supabase.table("users").select("full_name").eq("id", user_id).execute()
            user_name = user_result.data[0]["full_name"] if user_result.data else "A user"
            
            await notification_service.notify_consultation_cancelled(
                lawyer_id=lawyer_user_id,
                user_name=user_name,
                consultation_id=consultation_id
            )
    except Exception as e:
        logger.error(f"Failed to send consultation notification: {e}")