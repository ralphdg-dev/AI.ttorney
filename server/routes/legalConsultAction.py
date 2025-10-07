from fastapi import APIRouter, HTTPException, Depends, Header
from supabase import create_client, Client
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
import logging
from pydantic import BaseModel
from datetime import datetime, date

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/consult-actions", tags=["consultation-actions"])

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase configuration")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
    requested_at: str
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
    today_sessions: int

class SuccessResponse(BaseModel):
    success: bool
    message: str

# Dependency to verify and extract user ID from token
async def get_current_user(authorization: str = Header(...)) -> Dict[str, Any]:
    """
    Extract user ID from Supabase JWT token
    """
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = authorization.replace("Bearer ", "")
        
        # Verify token and get user data using Supabase
        user_data = supabase.auth.get_user(token)
        
        if not user_data or not user_data.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return {
            "id": user_data.user.id,
            "email": user_data.user.email
        }
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/my-consultations", response_model=List[ConsultationRequest])
async def get_my_consultations(
    status_filter: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get consultation requests for the logged-in lawyer with client names from users table
    """
    try:
        lawyer_id = current_user["id"]
        logger.info(f"Fetching consultations for lawyer: {lawyer_id}, filter: {status_filter}")
        
        # Build the query
        query = supabase.table("consultation_requests").select("""
            *,
            users!consultation_requests_user_id_fkey(
                full_name,
                email,
                username
            )
        """).eq("lawyer_id", lawyer_id)
        
        # Apply status filter if provided
        if status_filter and status_filter != "all":
            query = query.eq("status", status_filter)
        
        # Order by creation date (newest first)
        query = query.order("created_at", desc=True)
        
        # Execute query
        response = query.execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        consultations = response.data if hasattr(response, 'data') else []
        
        # Transform the data to include client information
        transformed_consultations = []
        for consultation in consultations:
            # Extract client info from the joined users table
            user_data = consultation.get('users', {})
            
            transformed_consultations.append({
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
            })
        
        logger.info(f"Found {len(transformed_consultations)} consultations for lawyer {lawyer_id}")
        return transformed_consultations
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching consultations: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{consultation_id}", response_model=ConsultationRequest)
async def get_consultation_detail(
    consultation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get detailed information for a specific consultation request
    """
    try:
        lawyer_id = current_user["id"]
        
        # Fetch consultation with user data
        response = supabase.table("consultation_requests").select("""
            *,
            users!consultation_requests_user_id_fkey(
                full_name,
                email,
                username
            )
        """).eq("id", consultation_id).eq("lawyer_id", lawyer_id).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Supabase error: {response.error}")
            raise HTTPException(status_code=500, detail="Database error")
        
        consultations = response.data if hasattr(response, 'data') else []
        
        if not consultations:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        consultation = consultations[0]
        user_data = consultation.get('users', {})
        
        # Transform the data
        transformed_consultation = {
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
        
        return transformed_consultation
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching consultation detail: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/stats", response_model=ConsultationStats)
async def get_consultation_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get statistics for the logged-in lawyer's consultation requests
    """
    try:
        lawyer_id = current_user["id"]
        
        # Get all consultations for the lawyer
        response = supabase.table("consultation_requests").select("*").eq("lawyer_id", lawyer_id).execute()
        
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
            today_sessions=today_sessions
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{consultation_id}/accept", response_model=SuccessResponse)
async def accept_consultation(
    consultation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Accept a consultation request
    """
    return await update_consultation_status(consultation_id, "accepted", current_user)

@router.post("/{consultation_id}/reject", response_model=SuccessResponse)
async def reject_consultation(
    consultation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Reject a consultation request
    """
    return await update_consultation_status(consultation_id, "rejected", current_user)

@router.post("/{consultation_id}/complete", response_model=SuccessResponse)
async def complete_consultation(
    consultation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Mark a consultation as completed
    """
    return await update_consultation_status(consultation_id, "completed", current_user)

async def update_consultation_status(
    consultation_id: str, 
    new_status: str, 
    current_user: Dict[str, Any]
) -> SuccessResponse:
    """
    Helper function to update consultation status
    """
    try:
        lawyer_id = current_user["id"]
        now = datetime.now().isoformat()
        
        # First verify the consultation belongs to this lawyer
        response = supabase.table("consultation_requests").select("*").eq("id", consultation_id).eq("lawyer_id", lawyer_id).execute()
        
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