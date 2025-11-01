"""
Admin Appeals Routes for AI.ttorney
Admin-facing endpoints for reviewing suspension appeals
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from middleware.auth import require_role
from services.appeal_service import AppealService
from models.appeal_models import (
    ReviewAppealRequest,
    ReviewAppealResponse,
    UpdateAppealStatusRequest,
    AppealWithUserResponse,
    AppealListResponse,
    AppealStatsResponse
)
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/moderation/appeals", tags=["Admin Appeals"])

appeal_service = AppealService()


@router.get("", response_model=AppealListResponse)
async def get_appeals(
    status_filter: str = Query("pending", alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user = Depends(require_role("admin"))
):
    """
    Get appeals for admin review
    
    Filter by status: pending, under_review, approved, rejected
    Supports pagination.
    """
    try:
        result = await appeal_service.get_pending_appeals(
            status=status_filter,
            page=page,
            limit=limit
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["error"]
            )
        
        # Transform appeals data for response
        appeals = []
        for appeal_data in result["appeals"]:
            user_data = appeal_data.get("users")
            suspension_data = appeal_data.get("user_suspensions")
            
            # Handle reviewed_by user data if exists
            reviewed_by = None
            if appeal_data.get("reviewed_by"):
                reviewed_by = {
                    "id": str(appeal_data["reviewed_by"])
                }
            
            appeals.append(AppealWithUserResponse(
                id=str(appeal_data["id"]),
                user={
                    "id": str(user_data["id"]) if user_data else "",
                    "username": user_data.get("username", "") if user_data else "",
                    "email": user_data.get("email", "") if user_data else "",
                    "full_name": user_data.get("full_name", "") if user_data else ""
                },
                suspension={
                    "id": str(suspension_data["id"]) if suspension_data else "",
                    "suspension_number": suspension_data.get("suspension_number", 0) if suspension_data else 0,
                    "suspension_type": suspension_data.get("suspension_type", "") if suspension_data else "",
                    "started_at": suspension_data.get("started_at") if suspension_data else None,
                    "ends_at": suspension_data.get("ends_at") if suspension_data else None,
                    "reason": suspension_data.get("reason", "") if suspension_data else "",
                    "strikes_at_suspension": suspension_data.get("strikes_at_suspension", 0) if suspension_data else 0
                },
                appeal_reason=appeal_data["appeal_reason"],
                appeal_message=appeal_data["appeal_message"],
                evidence_urls=appeal_data.get("evidence_urls", []),
                status=appeal_data["status"],
                created_at=appeal_data["created_at"],
                reviewed_at=appeal_data.get("reviewed_at"),
                reviewed_by=reviewed_by,
                admin_response=appeal_data.get("admin_response"),
                admin_notes=appeal_data.get("admin_notes"),
                decision=appeal_data.get("decision")
            ))
        
        return AppealListResponse(
            appeals=appeals,
            total=result["total"],
            page=result["page"],
            limit=result["limit"],
            has_more=result["has_more"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting appeals: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get appeals: {str(e)}"
        )


@router.post("/{appeal_id}/review", response_model=ReviewAppealResponse)
async def review_appeal(
    appeal_id: str,
    request: ReviewAppealRequest,
    current_user = Depends(require_role("admin"))
):
    """
    Review and decide on a suspension appeal
    
    Decisions:
    - lift_suspension: Remove suspension completely
    - reduce_duration: Shorten suspension (requires new_end_date)
    - reject: Keep suspension as-is
    """
    try:
        admin_id = current_user["profile"]["id"]
        
        result = await appeal_service.review_appeal(
            appeal_id=appeal_id,
            admin_id=str(admin_id),
            decision=request.decision,
            admin_response=request.admin_response,
            admin_notes=request.admin_notes,
            new_end_date=request.new_end_date
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return ReviewAppealResponse(
            success=True,
            message=result["message"],
            decision=result["decision"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reviewing appeal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to review appeal: {str(e)}"
        )


@router.patch("/{appeal_id}/status")
async def update_appeal_status(
    appeal_id: str,
    request: UpdateAppealStatusRequest,
    current_user = Depends(require_role("admin"))
):
    """
    Update appeal status (for workflow management)
    
    Allows admins to mark appeals as under_review without making a final decision.
    """
    try:
        result = await appeal_service.update_appeal_status(
            appeal_id=appeal_id,
            status=request.status
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return {
            "success": True,
            "message": f"Appeal status updated to {request.status}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating appeal status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}"
        )


@router.get("/stats", response_model=AppealStatsResponse)
async def get_appeal_stats(current_user = Depends(require_role("admin"))):
    """
    Get appeal statistics for admin dashboard
    
    Returns counts by status and average review time.
    """
    try:
        result = await appeal_service.get_appeal_stats()
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["error"]
            )
        
        stats = result["stats"]
        
        return AppealStatsResponse(
            pending=stats["pending"],
            under_review=stats["under_review"],
            approved=stats["approved"],
            rejected=stats["rejected"],
            total=stats["total"],
            avg_review_time_hours=stats.get("avg_review_time_hours")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting appeal stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get stats: {str(e)}"
        )


@router.get("/{appeal_id}")
async def get_appeal_details(
    appeal_id: str,
    current_user = Depends(require_role("admin"))
):
    """
    Get detailed information about a specific appeal
    
    Includes user info, suspension details, and appeal content.
    """
    try:
        from services.supabase_service import SupabaseService
        supabase = SupabaseService()
        
        response = await supabase.client.table("user_suspension_appeals")\
            .select("""
                *,
                users!user_id(id, username, email, full_name, account_status, strike_count, suspension_count),
                user_suspensions(
                    id, suspension_type, reason, started_at, ends_at,
                    suspension_number, strikes_at_suspension, violation_ids
                )
            """)\
            .eq("id", appeal_id)\
            .single()\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appeal not found"
            )
        
        return {
            "success": True,
            "appeal": response.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting appeal details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get appeal details: {str(e)}"
        )
