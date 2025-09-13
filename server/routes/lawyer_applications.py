from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from lawyer.models import (
    LawyerApplicationSubmit, 
    LawyerApplicationReview, 
    LawyerApplicationResponse,
    LawyerApplicationStatusResponse,
    FileUploadResponse
)
from lawyer.service import LawyerApplicationService
from services.storage_service import StorageService
from middleware.auth import get_current_user, require_role
from typing import Dict, Any, List
from datetime import date
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lawyer-applications", tags=["lawyer-applications"])
lawyer_service = LawyerApplicationService()
storage_service = StorageService()

@router.post("/upload/ibp-id", response_model=FileUploadResponse)
async def upload_ibp_id_card(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Upload IBP ID card image"""
    try:
        user_id = current_user["user"]["id"]
        
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Upload to storage
        result = await storage_service.upload_ibp_id_card(file, user_id)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return FileUploadResponse(
            success=True,
            file_path=result["file_path"],
            message=result["message"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload IBP ID error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload IBP ID card"
        )

@router.post("/upload/selfie", response_model=FileUploadResponse)
async def upload_selfie(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Upload selfie image"""
    try:
        user_id = current_user["user"]["id"]
        
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Upload to storage
        result = await storage_service.upload_selfie(file, user_id)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return FileUploadResponse(
            success=True,
            file_path=result["file_path"],
            message=result["message"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload selfie error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload selfie"
        )

@router.post("/submit", response_model=Dict[str, Any])
async def submit_lawyer_application(
    full_name: str = Form(...),
    roll_signing_date: str = Form(...),  # Accept as string, convert to date
    ibp_id: str = Form(...),
    roll_number: str = Form(...),
    selfie: str = Form(...),  # File path from previous upload
    current_user: Dict[str, Any] = Depends(require_role("registered_user"))
):
    """Submit a new lawyer application"""
    try:
        user_id = current_user["user"]["id"]
        
        # Convert string date to date object
        from datetime import datetime
        try:
            date_obj = datetime.fromisoformat(roll_signing_date.replace('Z', '+00:00')).date()
        except ValueError:
            # Try parsing as YYYY-MM-DD format
            date_obj = datetime.strptime(roll_signing_date, '%Y-%m-%d').date()
        
        # Create application data
        application_data = LawyerApplicationSubmit(
            full_name=full_name,
            roll_signing_date=date_obj,
            ibp_id=ibp_id,
            roll_number=roll_number,
            selfie=selfie
        )
        
        # Submit application
        result = await lawyer_service.submit_application(user_id, application_data)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return {
            "success": True,
            "message": result["message"],
            "application_id": result["application_id"],
            "data": {"redirect_path": "/onboarding/lawyer/lawyer-status"}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Submit application error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit application"
        )

@router.get("/me", response_model=LawyerApplicationStatusResponse)
async def get_my_application_status(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get current user's lawyer application status"""
    try:
        user_id = current_user["user"]["id"]
        
        result = await lawyer_service.get_user_application_status(user_id)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return LawyerApplicationStatusResponse(**result["data"])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get application status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get application status"
        )

@router.get("/pending", response_model=List[LawyerApplicationResponse])
async def get_pending_applications(
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Get all pending lawyer applications (admin only)"""
    try:
        result = await lawyer_service.get_pending_applications()
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        # Convert to response models
        applications = []
        for app_data in result["data"]:
            applications.append(LawyerApplicationResponse(**app_data))
        
        return applications
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get pending applications error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get pending applications"
        )

@router.post("/{application_id}/review", response_model=Dict[str, Any])
async def review_lawyer_application(
    application_id: str,
    review_data: LawyerApplicationReview,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Review a lawyer application (admin only)"""
    try:
        admin_id = current_user["user"]["id"]
        
        result = await lawyer_service.review_application(
            application_id, 
            review_data, 
            admin_id
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return {
            "success": True,
            "message": result["message"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Review application error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/clear-pending", response_model=Dict[str, Any])
async def clear_pending_lawyer_status(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Clear pending_lawyer flag when user completes accepted flow"""
    try:
        user_id = current_user["user"]["id"]
        
        result = await lawyer_service.clear_pending_lawyer_status(user_id)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return {
            "success": True,
            "message": result["message"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clear pending lawyer status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
