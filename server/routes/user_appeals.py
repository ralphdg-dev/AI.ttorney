"""
User Appeals Routes for AI.ttorney
User-facing endpoints for suspension appeals
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from config.dependencies import get_current_user
from services.appeal_service import AppealService
from services.supabase_service import SupabaseService
from models.appeal_models import (
    SubmitAppealRequest,
    SubmitAppealResponse,
    AppealResponse,
    SuspensionResponse,
    UploadEvidenceResponse
)
from typing import List
import logging
import os
from uuid import uuid4

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user/suspensions", tags=["User Appeals"])

appeal_service = AppealService()
supabase_service = SupabaseService()


@router.post("/appeal", response_model=SubmitAppealResponse)
async def submit_suspension_appeal(
    request: SubmitAppealRequest,
    current_user = Depends(get_current_user)
):
    """
    Submit a suspension appeal
    
    User must be currently suspended and can only have one active appeal per suspension.
    """
    try:
        user_id = current_user.id
        
        result = await appeal_service.create_appeal(
            user_id=str(user_id),
            suspension_id=request.suspension_id,
            appeal_reason=request.appeal_reason,
            appeal_message=request.appeal_message,
            evidence_urls=request.evidence_urls
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        appeal = result["appeal"]
        
        return SubmitAppealResponse(
            success=True,
            message="Appeal submitted successfully",
            appeal_id=str(appeal["id"]),
            status=appeal["status"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting appeal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit appeal: {str(e)}"
        )


@router.get("/appeals", response_model=List[AppealResponse])
async def get_my_appeals(current_user = Depends(get_current_user)):
    """
    Get all appeals submitted by the current user
    
    Returns appeal history with status and admin responses.
    """
    try:
        user_id = current_user.id
        
        result = await appeal_service.get_user_appeals(str(user_id))
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["error"]
            )
        
        appeals = []
        for appeal_data in result["appeals"]:
            appeals.append(AppealResponse(
                id=str(appeal_data["id"]),
                user_id=str(appeal_data["user_id"]),
                suspension_id=str(appeal_data["suspension_id"]),
                appeal_reason=appeal_data["appeal_reason"],
                appeal_message=appeal_data["appeal_message"],
                evidence_urls=appeal_data.get("evidence_urls", []),
                status=appeal_data["status"],
                created_at=appeal_data["created_at"],
                reviewed_at=appeal_data.get("reviewed_at"),
                admin_response=appeal_data.get("admin_response"),
                decision=appeal_data.get("decision"),
                original_end_date=appeal_data.get("original_end_date"),
                new_end_date=appeal_data.get("new_end_date")
            ))
        
        return appeals
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting appeals: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get appeals: {str(e)}"
        )


@router.get("/current", response_model=SuspensionResponse)
async def get_current_suspension(current_user = Depends(get_current_user)):
    """
    Get current active suspension details
    
    Returns suspension information and whether user can appeal.
    """
    try:
        user_id = current_user.id
        
        result = await appeal_service.get_current_suspension(str(user_id))
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        
        suspension = result["suspension"]
        can_appeal = result["can_appeal"]
        
        return SuspensionResponse(
            id=str(suspension["id"]),
            user_id=str(suspension["user_id"]),
            suspension_type=suspension["suspension_type"],
            reason=suspension["reason"],
            suspension_number=suspension["suspension_number"],
            strikes_at_suspension=suspension["strikes_at_suspension"],
            started_at=suspension["started_at"],
            ends_at=suspension.get("ends_at"),
            status=suspension["status"],
            has_appeal=suspension.get("has_appeal", False),
            can_appeal=can_appeal
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current suspension: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get suspension: {str(e)}"
        )


@router.post("/upload-evidence", response_model=UploadEvidenceResponse)
async def upload_appeal_evidence(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """
    Upload evidence file for appeal
    
    Files are stored in Supabase Storage bucket 'appeals_evidence'.
    Allowed formats: jpg, jpeg, png, gif, pdf, webp
    Max size: 5MB
    """
    try:
        user_id = str(current_user.id)
        
        # Validate file type
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.webp']
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Validate file size (5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Max size: 5MB"
            )
        
        # Generate unique filename
        unique_filename = f"{uuid4()}{file_ext}"
        file_path = f"{user_id}/{unique_filename}"
        
        # Upload to Supabase Storage
        try:
            upload_result = supabase_service.client.storage\
                .from_("appeals_evidence")\
                .upload(file_path, file_content, {
                    "content-type": file.content_type,
                    "upsert": "false"
                })
            
            # Get public URL
            url_result = supabase_service.client.storage\
                .from_("appeals_evidence")\
                .get_public_url(file_path)
            
            public_url = url_result
            
            logger.info(f"Evidence uploaded: {file_path} for user {user_id}")
            
            return UploadEvidenceResponse(
                success=True,
                url=public_url,
                filename=unique_filename,
                size=file_size
            )
            
        except Exception as storage_error:
            logger.error(f"Storage error: {str(storage_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file: {str(storage_error)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading evidence: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload evidence: {str(e)}"
        )


@router.delete("/evidence/{filename}")
async def delete_appeal_evidence(
    filename: str,
    current_user = Depends(get_current_user)
):
    """
    Delete uploaded evidence file
    
    Users can only delete their own files.
    """
    try:
        user_id = str(current_user.id)
        file_path = f"{user_id}/{filename}"
        
        # Delete from Supabase Storage
        try:
            supabase_service.client.storage\
                .from_("appeals_evidence")\
                .remove([file_path])
            
            logger.info(f"Evidence deleted: {file_path} by user {user_id}")
            
            return {"success": True, "message": "File deleted successfully"}
            
        except Exception as storage_error:
            logger.error(f"Storage error: {str(storage_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete file: {str(storage_error)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting evidence: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete evidence: {str(e)}"
        )
