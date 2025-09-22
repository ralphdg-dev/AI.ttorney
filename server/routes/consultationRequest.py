from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
import logging
from datetime import datetime
from services.consultation_request_service import ConsultationRequestService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/consultation-requests", tags=["consultation-requests"])

# Initialize the service
consultation_service = ConsultationRequestService()

# Pydantic models for request/response
class ConsultationRequestCreate(BaseModel):
    user_id: str
    lawyer_id: str
    message: str
    email: EmailStr
    mobile_number: str
    consultation_date: str
    consultation_time: str
    consultation_mode: str

class ConsultationRequestUpdate(BaseModel):
    status: str  # pending, accepted, rejected

class ConsultationRequestResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    message: Optional[str] = None

@router.post("/", response_model=ConsultationRequestResponse)
async def create_consultation_request(request: ConsultationRequestCreate):
    """Create a new consultation request"""
    try:
        # Convert request to dictionary
        request_data = request.dict()
        
        logger.info(f"Creating consultation request: {request_data}")
        
        # Call the service to create the consultation request
        result = await consultation_service.create_consultation_request(request_data)
        
        if result["success"]:
            return ConsultationRequestResponse(
                success=True,
                data=result["data"],
                message="Consultation request created successfully"
            )
        else:
            # Provide more specific error messages
            error_msg = result["error"]
            status_code = status.HTTP_400_BAD_REQUEST
            
            if "not found" in error_msg.lower():
                status_code = status.HTTP_404_NOT_FOUND
            elif "foreign key constraint" in error_msg.lower():
                status_code = status.HTTP_400_BAD_REQUEST
                error_msg = "Invalid lawyer ID provided"
            
            raise HTTPException(
                status_code=status_code,
                detail=error_msg
            )
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error creating consultation request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/user/{user_id}", response_model=ConsultationRequestResponse)
async def get_user_consultation_requests(user_id: str):
    """Get all consultation requests for a specific user"""
    try:
        result = await consultation_service.get_consultation_requests_by_user(user_id)
        
        if result["success"]:
            return ConsultationRequestResponse(
                success=True,
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Error getting user consultation requests: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/lawyer/{lawyer_id}", response_model=ConsultationRequestResponse)
async def get_lawyer_consultation_requests(lawyer_id: str):
    """Get all consultation requests for a specific lawyer"""
    try:
        result = await consultation_service.get_consultation_requests_by_lawyer(lawyer_id)
        
        if result["success"]:
            return ConsultationRequestResponse(
                success=True,
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Error getting lawyer consultation requests: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/{request_id}", response_model=ConsultationRequestResponse)
async def get_consultation_request(request_id: str):
    """Get a specific consultation request by ID"""
    try:
        result = await consultation_service.get_consultation_request_by_id(request_id)
        
        if result["success"]:
            return ConsultationRequestResponse(
                success=True,
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Error getting consultation request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.patch("/{request_id}/status", response_model=ConsultationRequestResponse)
async def update_consultation_request_status(request_id: str, request: ConsultationRequestUpdate):
    """Update consultation request status (accept/reject)"""
    try:
        result = await consultation_service.update_consultation_request_status(
            request_id=request_id,
            status=request.status
        )
        
        if result["success"]:
            return ConsultationRequestResponse(
                success=True,
                message=result["message"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Error updating consultation request status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.delete("/{request_id}/user/{user_id}", response_model=ConsultationRequestResponse)
async def delete_consultation_request(request_id: str, user_id: str):
    """Delete a consultation request (only by the user who created it)"""
    try:
        result = await consultation_service.delete_consultation_request(request_id, user_id)
        
        if result["success"]:
            return ConsultationRequestResponse(
                success=True,
                message=result["message"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Error deleting consultation request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/statistics/user/{user_id}", response_model=ConsultationRequestResponse)
async def get_user_consultation_statistics(user_id: str):
    """Get consultation request statistics for a specific user"""
    try:
        result = await consultation_service.get_consultation_requests_statistics(user_id=user_id)
        
        if result["success"]:
            return ConsultationRequestResponse(
                success=True,
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Error getting user consultation statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/statistics/lawyer/{lawyer_id}", response_model=ConsultationRequestResponse)
async def get_lawyer_consultation_statistics(lawyer_id: str):
    """Get consultation request statistics for a specific lawyer"""
    try:
        result = await consultation_service.get_consultation_requests_statistics(lawyer_id=lawyer_id)
        
        if result["success"]:
            return ConsultationRequestResponse(
                success=True,
                data=result["data"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Error getting lawyer consultation statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/test-connection", response_model=ConsultationRequestResponse)
async def test_consultation_service_connection():
    """Test the consultation service database connection"""
    try:
        result = await consultation_service.test_connection()
        
        if result["success"]:
            return ConsultationRequestResponse(
                success=True,
                message=result["message"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=result["error"]
            )
            
    except Exception as e:
        logger.error(f"Error testing consultation service connection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )