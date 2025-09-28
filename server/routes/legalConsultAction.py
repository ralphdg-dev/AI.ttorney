from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import logging
from uuid import UUID

from dependencies import get_current_user, get_supabase
from supabase import Client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/consultations", tags=["consultations"])

# Pydantic models for consultation requests
class ConsultationRequest(BaseModel):
    id: str
    user_id: Optional[str]
    lawyer_id: Optional[str]
    message: Optional[str]
    email: Optional[str]
    mobile_number: Optional[str]
    status: str = 'pending'
    consultation_mode: Optional[str]
    consultation_date: Optional[str]
    consultation_time: Optional[str]
    requested_at: Optional[datetime]
    responded_at: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    
    # Joined user data
    client_data: Optional[Dict[str, Any]] = None

class UpdateConsultationStatus(BaseModel):
    status: str
    responded_at: Optional[datetime] = None

@router.get("/lawyer/requests")
async def get_lawyer_consultation_requests(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, description="Number of records to return"),
    offset: int = Query(0, description="Number of records to skip")
):
    """
    Get all consultation requests for the logged-in lawyer.
    Only returns requests where lawyer_id matches the current user's ID.
    """
    try:
        # Verify user is a lawyer
        if current_user.get('role') != 'verified_lawyer':
            raise HTTPException(
                status_code=403,
                detail="Only verified lawyers can access consultation requests"
            )
        
        lawyer_id = current_user['id']
        
        # Build query with user data joined
        query = supabase.table('consultation_requests').select(
            """
            *,
            users!user_id (
                id,
                full_name,
                email,
                username
            )
            """
        ).eq('lawyer_id', lawyer_id)
        
        # Apply status filter if provided
        if status:
            query = query.eq('status', status)
        
        # Apply ordering and pagination
        query = query.order('requested_at', desc=True)
        query = query.range(offset, offset + limit - 1)
        
        # Execute query
        response = query.execute()
        
        if not response.data:
            return {
                "success": True,
                "data": [],
                "count": 0,
                "message": "No consultation requests found"
            }
        
        # Transform the data to include client information
        transformed_data = []
        for request in response.data:
            # Extract user data from the joined relationship
            client_info = request.pop('users', None)
            
            # Create client data dictionary
            client_data = None
            if client_info:
                client_data = {
                    "id": client_info.get('id'),
                    "name": client_info.get('full_name', 'Unknown Client'),
                    "email": client_info.get('email'),
                    "username": client_info.get('username')
                }
            elif request.get('email'):
                # Fallback to email from request if no user relation exists
                client_data = {
                    "id": None,
                    "name": request.get('email', '').split('@')[0],
                    "email": request.get('email'),
                    "username": None
                }
            
            # Add client data to request
            request['client_data'] = client_data
            transformed_data.append(request)
        
        # Get total count for pagination
        count_query = supabase.table('consultation_requests').select(
            'id', count='exact'
        ).eq('lawyer_id', lawyer_id)
        
        if status:
            count_query = count_query.eq('status', status)
        
        count_response = count_query.execute()
        total_count = count_response.count if hasattr(count_response, 'count') else len(transformed_data)
        
        # Calculate statistics
        stats = calculate_consultation_stats(transformed_data)
        
        return {
            "success": True,
            "data": transformed_data,
            "count": len(transformed_data),
            "total_count": total_count,
            "stats": stats,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching lawyer consultation requests: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch consultation requests: {str(e)}"
        )

@router.get("/lawyer/requests/{request_id}")
async def get_consultation_request_detail(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Get detailed information about a specific consultation request.
    Only accessible by the lawyer assigned to the request.
    """
    try:
        # Verify user is a lawyer
        if current_user.get('role') != 'verified_lawyer':
            raise HTTPException(
                status_code=403,
                detail="Only verified lawyers can access consultation requests"
            )
        
        # Fetch the consultation request with user data
        response = supabase.table('consultation_requests').select(
            """
            *,
            users!user_id (
                id,
                full_name,
                email,
                username,
                created_at
            )
            """
        ).eq('id', request_id).eq('lawyer_id', current_user['id']).single().execute()
        
        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Consultation request not found or you don't have access"
            )
        
        request_data = response.data
        
        # Extract and format client information
        client_info = request_data.pop('users', None)
        if client_info:
            request_data['client_data'] = {
                "id": client_info.get('id'),
                "name": client_info.get('full_name', 'Unknown Client'),
                "email": client_info.get('email'),
                "username": client_info.get('username'),
                "member_since": client_info.get('created_at')
            }
        elif request_data.get('email'):
            request_data['client_data'] = {
                "id": None,
                "name": request_data.get('email', '').split('@')[0],
                "email": request_data.get('email'),
                "username": None,
                "member_since": None
            }
        
        return {
            "success": True,
            "data": request_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching consultation request detail: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch consultation request: {str(e)}"
        )

@router.patch("/lawyer/requests/{request_id}/status")
async def update_consultation_status(
    request_id: str,
    status_update: UpdateConsultationStatus,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Update the status of a consultation request.
    Only the assigned lawyer can update the status.
    """
    try:
        # Verify user is a lawyer
        if current_user.get('role') != 'verified_lawyer':
            raise HTTPException(
                status_code=403,
                detail="Only verified lawyers can update consultation requests"
            )
        
        # Verify the request belongs to this lawyer
        existing = supabase.table('consultation_requests').select('id, status').eq(
            'id', request_id
        ).eq('lawyer_id', current_user['id']).single().execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=404,
                detail="Consultation request not found or you don't have access"
            )
        
        # Validate status transition
        current_status = existing.data['status']
        new_status = status_update.status
        
        valid_transitions = {
            'pending': ['accepted', 'rejected'],
            'accepted': ['completed', 'cancelled'],
            'rejected': [],
            'completed': [],
            'cancelled': []
        }
        
        if new_status not in valid_transitions.get(current_status, []):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from '{current_status}' to '{new_status}'"
            )
        
        # Prepare update data
        update_data = {
            'status': new_status,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Set responded_at if accepting or rejecting
        if current_status == 'pending' and new_status in ['accepted', 'rejected']:
            update_data['responded_at'] = datetime.utcnow().isoformat()
        elif status_update.responded_at:
            update_data['responded_at'] = status_update.responded_at.isoformat()
        
        # Update the status
        response = supabase.table('consultation_requests').update(
            update_data
        ).eq('id', request_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to update consultation status"
            )
        
        return {
            "success": True,
            "data": response.data[0],
            "message": f"Consultation status updated to '{new_status}'"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating consultation status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update status: {str(e)}"
        )

@router.get("/lawyer/stats")
async def get_lawyer_consultation_stats(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Get statistics about lawyer's consultation requests.
    """
    try:
        # Verify user is a lawyer
        if current_user.get('role') != 'verified_lawyer':
            raise HTTPException(
                status_code=403,
                detail="Only verified lawyers can access consultation stats"
            )
        
        lawyer_id = current_user['id']
        
        # Fetch all requests for stats calculation
        response = supabase.table('consultation_requests').select(
            'id, status, consultation_date, consultation_mode, created_at'
        ).eq('lawyer_id', lawyer_id).execute()
        
        if not response.data:
            return {
                "success": True,
                "stats": {
                    "total": 0,
                    "pending": 0,
                    "accepted": 0,
                    "completed": 0,
                    "rejected": 0,
                    "cancelled": 0,
                    "today_sessions": 0,
                    "online_requests": 0,
                    "onsite_requests": 0
                }
            }
        
        stats = calculate_consultation_stats(response.data)
        
        return {
            "success": True,
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"Error fetching consultation stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch stats: {str(e)}"
        )

def calculate_consultation_stats(requests: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    Calculate statistics from consultation requests.
    """
    today = datetime.now().date()
    
    stats = {
        "total": len(requests),
        "pending": 0,
        "accepted": 0,
        "completed": 0,
        "rejected": 0,
        "cancelled": 0,
        "today_sessions": 0,
        "online_requests": 0,
        "onsite_requests": 0
    }
    
    for request in requests:
        # Count by status
        status = request.get('status', 'pending')
        if status in stats:
            stats[status] += 1
        
        # Count today's sessions
        if status == 'accepted' and request.get('consultation_date'):
            try:
                consult_date = datetime.fromisoformat(
                    request['consultation_date'].replace('Z', '+00:00')
                ).date()
                if consult_date == today:
                    stats['today_sessions'] += 1
            except:
                pass
        
        # Count by mode
        mode = request.get('consultation_mode', '').lower()
        if mode == 'online':
            stats['online_requests'] += 1
        elif mode == 'onsite':
            stats['onsite_requests'] += 1
    
    return stats

# Add this router to your main FastAPI app
# In your main.py or app.py:
# app.include_router(router)