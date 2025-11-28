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
    """
    Create a new consultation request with comprehensive validation.
    
    PRODUCTION-READY:
    - Validates user authentication
    - Checks consultation ban status
    - Validates lawyer_id is lawyer_info.id (NOT users.id)
    - Comprehensive error handling for Railway/Android
    - Proper HTTP status codes
    """
    try:
        # STEP 1: Validate authentication
        req_user_id = getattr(current_user, 'id', None)
        if not req_user_id:
            logger.error("❌ Authentication failed: No user ID")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Authentication required. Please log in again."
            )

        logger.info(f"📝 Creating consultation: user={req_user_id[:8]}..., lawyer_info.id={request.lawyer_id[:8]}..., mode={request.consultation_mode}")
        
        # STEP 2: Check consultation ban status
        try:
            ban_service = get_consultation_ban_service()
            eligibility = await ban_service.check_booking_eligibility(req_user_id)
            
            if not eligibility["can_book"]:
                logger.warning(f"🚫 User {req_user_id[:8]}... is banned from booking consultations")
                raise HTTPException(
                    status_code=403, 
                    detail=eligibility.get('message', 'You are temporarily restricted from booking consultations.')
                )
        except HTTPException:
            raise
        except Exception as ban_error:
            logger.error(f"⚠️  Ban check failed (non-critical): {ban_error}")
            # Fail-open: Allow booking if ban check fails (better UX)
        
        # STEP 3: Create consultation with full validation
        result = await service.create_consultation_request(
            user_id=req_user_id,
            lawyer_id=request.lawyer_id,  # This is lawyer_info.id
            message=request.message,
            email=request.email,
            mobile_number=request.mobile_number,
            consultation_date=str(request.consultation_date),
            consultation_time=request.consultation_time,
            consultation_mode=request.consultation_mode
        )
        
        logger.info(f"✅ Consultation created successfully: {result.get('data', {}).get('id', 'N/A')[:8]}...")
        return result
        
    except ConsultationError as e:
        # Custom consultation errors (booking conflicts, invalid dates, etc.)
        logger.error(f"⚠️  Consultation error: {e.code} - {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except HTTPException:
        # Re-raise HTTP exceptions (auth, ban, etc.)
        raise
    except Exception as e:
        # Unexpected errors - log full traceback for debugging
        logger.error(f"❌ Unexpected error creating consultation: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Failed to create consultation request. Please try again or contact support."
        )

@router.get("/user/{user_id}")
async def get_user_consultation_requests(
    user_id: str,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    service: ConsultationService = Depends(get_consultation_service)
):
    """
    Get consultation requests for a user with pagination.
    
    PRODUCTION-READY:
    - Pagination support for large datasets
    - Status filtering
    - Comprehensive error handling
    """
    try:
        logger.info(f"📋 Fetching consultations for user: {user_id[:8]}... (filter: {status_filter or 'all'}, page: {page})")
        
        result = await service.get_user_consultations(
            user_id=user_id,
            status_filter=status_filter,
            page=page,
            page_size=page_size
        )
        
        logger.info(f"✅ Returned {len(result.get('data', []))} consultations for user")
        return result
    except ConsultationError as e:
        logger.error(f"⚠️  Consultation error: {e.code} - {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"❌ Error fetching user consultations: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Failed to fetch consultations. Please try again."
        )

@router.get("/lawyer/{lawyer_id}")
async def get_lawyer_consultation_requests(
    lawyer_id: str,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    service: ConsultationService = Depends(get_consultation_service)
):
    """
    Get consultation requests for a lawyer with pagination.
    
    CRITICAL: lawyer_id parameter is lawyer_info.id (NOT users.id)
    
    PRODUCTION-READY:
    - Pagination support
    - Status filtering
    - Comprehensive error handling for Railway/Android
    """
    try:
        logger.info(f"📋 Fetching consultations for lawyer_info.id: {lawyer_id[:8]}... (filter: {status_filter or 'all'}, page: {page})")
        
        result = await service.get_lawyer_consultations(
            lawyer_id=lawyer_id,
            status_filter=status_filter,
            page=page,
            page_size=page_size
        )
        
        logger.info(f"✅ Returned {len(result.get('data', []))} consultations for lawyer")
        return result
    except ConsultationError as e:
        logger.error(f"⚠️  Consultation error: {e.code} - {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"❌ Error fetching lawyer consultations: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Failed to fetch consultations. Please try again."
        )

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
    """
    Update consultation request status (lawyer only).
    
    PRODUCTION-READY:
    - Validates lawyer ownership
    - Comprehensive error handling
    - Proper HTTP status codes for Android
    """
    try:
        logger.info(f"🔄 Updating consultation {request_id[:8]}... to status: {request.status}")
        
        result = await service.update_consultation_status(
            consultation_id=request_id,
            new_status=request.status,
            user_id=current_user.id,
            is_lawyer=True
        )
        
        logger.info(f"✅ Consultation status updated successfully")
        return result
    except ConsultationError as e:
        logger.error(f"⚠️  Consultation error: {e.code} - {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"❌ Error updating status: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Failed to update consultation status. Please try again."
        )

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
    """
    Check if user is banned from booking consultations.
    
    PRODUCTION-READY:
    - Validates user authorization
    - Comprehensive error handling
    - Proper HTTP status codes for Android
    """
    try:
        logger.info(f"🔍 Checking ban status for user: {user_id[:8]}...")
        
        # Validate authorization - users can only check their own status
        if current_user.id != user_id and not getattr(current_user, 'is_admin', False):
            logger.warning(f"⚠️  Unauthorized ban status check: {current_user.id[:8]}... tried to check {user_id[:8]}...")
            raise HTTPException(status_code=403, detail="Access denied")
        
        ban_service = get_consultation_ban_service()
        eligibility = await ban_service.check_booking_eligibility(user_id)
        
        logger.info(f"✅ Ban status: can_book={eligibility['can_book']}, status={eligibility['ban_status']}")
        
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
        logger.error(f"❌ Error checking ban status: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Failed to check ban status. Please try again."
        )


