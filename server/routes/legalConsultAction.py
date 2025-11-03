from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from typing import List, Optional, Dict, Any
import logging
from pydantic import BaseModel
from datetime import datetime, date
from config.dependencies import get_current_user as get_auth_user, get_supabase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/consult-actions", tags=["consultation-actions"])

# Pydantic models
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

# Helper to convert auth user to dict format
def get_current_user_dict(user = Depends(get_auth_user)) -> Dict[str, Any]:
    """
    Convert auth user to dict format for compatibility
    """
    return {
        "id": user.id,
        "email": user.email
    }

# Helper to transform consultation data
def transform_consultation_data(consultation: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform raw consultation data with user information
    """
    user_data = consultation.get('users', {})
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
        "client_username": user_data.get("username")
    }

# Constant for user join query
USER_JOIN_QUERY = """*,
    users!consultation_requests_user_id_fkey(
        full_name,
        email,
        username
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
        
        # Get lawyer_info.id for this user
        try:
            lawyer_info_response = supabase.table("lawyer_info").select("id").eq("lawyer_id", user_id).execute()
            
            if not lawyer_info_response.data or len(lawyer_info_response.data) == 0:
                logger.warning(f"⚠️  No lawyer_info found for user: {user_id}")
                return []
            
            lawyer_info_id = lawyer_info_response.data[0]["id"]
            logger.info(f"🔍 Fetching consultations for lawyer_info.id: {lawyer_info_id} (user_id: {user_id}), filter: {status_filter}")
        except Exception as e:
            logger.error(f"❌ Error fetching lawyer_info: {e}")
            return []
        
        # Build the query using lawyer_info.id
        query = supabase.table("consultation_requests").select(USER_JOIN_QUERY).eq("lawyer_id", lawyer_info_id)
        
        # Debug: Log the query
        logger.info(f"📊 Query: consultation_requests WHERE lawyer_id = {lawyer_info_id}")
        
        # Apply status filter if provided
        if status_filter and status_filter != "all":
            query = query.eq("status", status_filter)
        
        # Order by creation date (newest first)
        query = query.order("created_at", desc=True)
        
        # Execute query
        response = query.execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"❌ Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        consultations = response.data if hasattr(response, 'data') else []
        
        # Debug: Log raw data
        logger.info(f"📥 Raw response: {len(consultations)} rows")
        if consultations:
            logger.info(f"📋 First consultation: {consultations[0]}")
        else:
            logger.warning(f"⚠️  No consultations found for lawyer_info.id: {lawyer_info_id}")
            # Check if any consultations exist in the table
            all_response = supabase.table("consultation_requests").select("id, lawyer_id, user_id, status, created_at").order("created_at", desc=True).limit(10).execute()
            if all_response.data:
                logger.info(f"🔍 Total consultations in DB: {len(all_response.data)}")
                for idx, c in enumerate(all_response.data):
                    logger.info(f"  [{idx+1}] id={c.get('id')[:8]}... lawyer_id={c.get('lawyer_id')[:8] if c.get('lawyer_id') else 'NULL'}... user_id={c.get('user_id')[:8]}... status={c.get('status')}")
                logger.info(f"🎯 Looking for lawyer_info.id: {lawyer_info_id}")
            else:
                logger.warning(f"🚨 NO CONSULTATIONS EXIST IN DATABASE AT ALL")
        
        # Transform the data using helper function
        transformed_consultations = [transform_consultation_data(c) for c in consultations]
        
        logger.info(f"✅ Returning {len(transformed_consultations)} consultations for lawyer_info.id {lawyer_info_id}")
        return transformed_consultations
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching consultations: {str(e)}")
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
        
        # Get lawyer_info.id for this user
        try:
            lawyer_info_response = supabase.table("lawyer_info").select("id").eq("lawyer_id", user_id).execute()
            
            if not lawyer_info_response.data or len(lawyer_info_response.data) == 0:
                logger.warning(f"⚠️  No lawyer_info found for user: {user_id}")
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
            logger.error(f"❌ Error fetching lawyer_info: {e}")
            return ConsultationStats(
                total_requests=0,
                pending_requests=0,
                accepted_requests=0,
                completed_requests=0,
                rejected_requests=0,
                cancelled_requests=0,
                today_sessions=0
            )
        
        # Get all consultations for the lawyer
        response = supabase.table("consultation_requests").select("*").eq("lawyer_id", lawyer_info_id).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        consultations = response.data if hasattr(response, 'data') else []
        
        # Calculate stats
        total_requests = len(consultations)
        pending_requests = len([c for c in consultations if c.get("status") == "pending"])
        accepted_requests = len([c for c in consultations if c.get("status") == "accepted"])
        completed_requests = len([c for c in consultations if c.get("status") == "completed"])
        rejected_requests = len([c for c in consultations if c.get("status") == "rejected"])
        cancelled_requests = len([c for c in consultations if c.get("status") == "cancelled"])  # Add this line
        
        # Calculate today's sessions (accepted consultations for today)
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
        logger.error(f"❌ Error fetching stats: {str(e)}")
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
        
        # Get lawyer_info.id for this user
        try:
            lawyer_info_response = supabase.table("lawyer_info").select("id").eq("lawyer_id", user_id).execute()
            
            if not lawyer_info_response.data or len(lawyer_info_response.data) == 0:
                logger.warning(f"⚠️  No lawyer_info found for user: {user_id}")
                raise HTTPException(status_code=404, detail="Lawyer profile not found")
            
            lawyer_info_id = lawyer_info_response.data[0]["id"]
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error fetching lawyer_info: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
        
        # Fetch consultation with user data
        response = supabase.table("consultation_requests").select(USER_JOIN_QUERY).eq("id", consultation_id).eq("lawyer_id", lawyer_info_id).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        consultations = response.data if hasattr(response, 'data') else []
        
        if not consultations:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        consultation = consultations[0]
        
        # Transform the data using helper function
        return transform_consultation_data(consultation)
        
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
        
        # Get lawyer_info.id for this user
        try:
            lawyer_info_response = supabase.table("lawyer_info").select("id").eq("lawyer_id", user_id).execute()
            
            if not lawyer_info_response.data or len(lawyer_info_response.data) == 0:
                logger.warning(f"⚠️  No lawyer_info found for user: {user_id}")
                raise HTTPException(status_code=404, detail="Lawyer profile not found")
            
            lawyer_info_id = lawyer_info_response.data[0]["id"]
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error fetching lawyer_info: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
        
        # First verify the consultation belongs to this lawyer
        response = supabase.table("consultation_requests").select("*").eq("id", consultation_id).eq("lawyer_id", lawyer_info_id).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        consultations = response.data if hasattr(response, 'data') else []
        
        if not consultations:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        # Update the consultation status
        update_data = {
            "status": new_status,
            "updated_at": now
        }
        
        # Set responded_at if this is the first response
        if new_status in ["accepted", "rejected"] and not consultations[0].get("responded_at"):
            update_data["responded_at"] = now
        
        update_response = supabase.table("consultation_requests").update(update_data).eq("id", consultation_id).execute()
        
        if hasattr(update_response, 'error') and update_response.error:
            logger.error(f"Supabase update error: {update_response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
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
        
        # First verify the consultation belongs to this user
        response = supabase.table("consultation_requests").select("*").eq("id", consultation_id).eq("user_id", user_id).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        consultations = response.data if hasattr(response, 'data') else []
        
        if not consultations:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        current_status = consultations[0].get("status")
        
        # Only allow cancellation for pending and accepted consultations
        if current_status not in ["pending", "accepted"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot cancel consultation with status: {current_status}"
            )
        
        # Update the consultation status
        update_data = {
            "status": "cancelled",
            "updated_at": now,
            "responded_at": now
        }
        
        update_response = supabase.table("consultation_requests").update(update_data).eq("id", consultation_id).execute()
        
        if hasattr(update_response, 'error') and update_response.error:
            logger.error(f"Supabase update error: {update_response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        return SuccessResponse(success=True, message="Consultation cancelled successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling consultation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")