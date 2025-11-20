from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional, Dict, Any
import logging
from supabase import Client
from config.dependencies import get_current_user, get_supabase
from services.consultation_service import ConsultationService, ConsultationError
from services.consultation_ban_service import get_consultation_ban_service
from models.consultation_models import ConsultationRequestCreate, ConsultationStatusUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/consultation-requests", tags=["consultation-requests"])


def get_consultation_service(supabase: Client = Depends(get_supabase)) -> ConsultationService:
    """Dependency injection for ConsultationService"""
    return ConsultationService(supabase)

@router.post("/")
async def create_consultation_request(
    request: ConsultationRequestCreate,
    current_user = Depends(get_current_user),
    service: ConsultationService = Depends(get_consultation_service)
):
    """Create a new consultation request with validation"""
    try:
                                                                                   
        req_user_id = getattr(current_user, 'id', None)
        if not req_user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

        logger.info(f" Creating consultation request: user={req_user_id}, lawyer={request.lawyer_id}, mode={request.consultation_mode}")
        
                                                            
        ban_service = get_consultation_ban_service()
        eligibility = await ban_service.check_booking_eligibility(req_user_id)
        
        if not eligibility["can_book"]:
            logger.warning(f"🚫 User {req_user_id[:8]}... is banned from booking consultations")
            raise HTTPException(
                status_code=403, 
                detail=f"Booking temporarily restricted: {eligibility['message']}"
            )
        
        result = await service.create_consultation_request(
            user_id=req_user_id,
            lawyer_id=request.lawyer_id,
            message=request.message,
            email=request.email,
            mobile_number=request.mobile_number,
            consultation_date=str(request.consultation_date),
            consultation_time=request.consultation_time,
            consultation_mode=request.consultation_mode
        )
        return result
    except ConsultationError as e:
        logger.error(f" Consultation error: {e.code} - {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f" Error creating consultation: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/user/{user_id}")
async def get_user_consultation_requests(
    user_id: str,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    service: ConsultationService = Depends(get_consultation_service)
):
    """Get consultation requests for a user with pagination"""
    try:
        result = await service.get_user_consultations(
            user_id=user_id,
            status_filter=status_filter,
            page=page,
            page_size=page_size
        )
        return result
    except ConsultationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error fetching user consultations: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/lawyer/{lawyer_id}")
async def get_lawyer_consultation_requests(
    lawyer_id: str,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    service: ConsultationService = Depends(get_consultation_service)
):
    """Get consultation requests for a lawyer with pagination"""
    try:
        result = await service.get_lawyer_consultations(
            lawyer_id=lawyer_id,
            status_filter=status_filter,
            page=page,
            page_size=page_size
        )
        return result
    except ConsultationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error fetching lawyer consultations: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{request_id}")
async def get_consultation_request(
    request_id: str,
    current_user = Depends(get_current_user),
    service: ConsultationService = Depends(get_consultation_service)
):
    """Get a specific consultation request by ID"""
    try:
                                                             
        result = await service.get_consultation_by_id(request_id)
        return result
    except ConsultationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error fetching consultation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/{request_id}/status")
async def update_consultation_request_status(
    request_id: str,
    request: ConsultationStatusUpdate,
    current_user = Depends(get_current_user),
    service: ConsultationService = Depends(get_consultation_service)
):
    """Update consultation request status (lawyer only)"""
    try:
        result = await service.update_consultation_status(
            consultation_id=request_id,
            new_status=request.status,
            user_id=current_user.id,
            is_lawyer=True
        )
        return result
    except ConsultationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error updating status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{request_id}")
async def delete_consultation_request(
    request_id: str,
    current_user = Depends(get_current_user),
    service: ConsultationService = Depends(get_consultation_service)
):
    """Soft delete a consultation request (user only)"""
    try:
        result = await service.soft_delete_consultation(
            consultation_id=request_id,
            user_id=current_user.id
        )
        return result
    except ConsultationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error deleting consultation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

                                                                
                                               

@router.get("/ban-status/{user_id}")
async def check_consultation_ban_status(
    user_id: str,
    current_user = Depends(get_current_user)
):
    """Check if user is banned from booking consultations"""
    try:
                                                                                  
        if current_user.id != user_id and not getattr(current_user, 'is_admin', False):
            raise HTTPException(status_code=403, detail="Access denied")
        
        ban_service = get_consultation_ban_service()
        eligibility = await ban_service.check_booking_eligibility(user_id)
        
        return {
            "user_id": user_id,
            "can_book": eligibility["can_book"],
            "ban_status": eligibility["ban_status"],
            "ban_end": eligibility["ban_end"],
            "message": eligibility["message"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking ban status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


