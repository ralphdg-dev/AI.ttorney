"""
Suspension Appeals Routes

Endpoints for users to appeal their suspensions and for admins to review appeals.

User Endpoints:
- POST /appeals - Submit an appeal for active suspension
- GET /appeals/my - Get user's own appeals
- GET /appeals/{appeal_id} - Get specific appeal details

Admin Endpoints:
- GET /admin/appeals - Get all appeals with filters
- PATCH /admin/appeals/{appeal_id}/review - Approve or reject appeal
- GET /admin/appeals/stats - Get appeal statistics

Author: AI.ttorney Team
Date: 2025-10-31
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Literal
from datetime import datetime
from middleware.auth import get_current_user, require_role
from services.supabase_service import SupabaseService
import httpx
import logging

logger = logging.getLogger(__name__)

# Create routers
user_router = APIRouter(prefix="/appeals", tags=["appeals", "user"])
admin_router = APIRouter(prefix="/admin/appeals", tags=["appeals", "admin"])


# Request Models
class SubmitAppealRequest(BaseModel):
    appeal_reason: str = Field(..., min_length=1, max_length=2000, description="Reason for appeal (1-2000 characters)")
    additional_context: Optional[str] = Field(None, max_length=1000, description="Additional context (optional)")


class ReviewAppealRequest(BaseModel):
    decision: Literal["approve", "reject"] = Field(..., description="Approve or reject the appeal")
    admin_notes: Optional[str] = Field(None, max_length=1000, description="Internal admin notes")
    rejection_reason: Optional[str] = Field(None, max_length=500, description="Reason for rejection (shown to user)")


# Response Models
class AppealResponse(BaseModel):
    id: str
    user_id: str
    suspension_id: str
    appeal_reason: str
    additional_context: Optional[str]
    status: str
    reviewed_by: Optional[str]
    reviewed_at: Optional[str]
    rejection_reason: Optional[str]
    created_at: str
    updated_at: str


class AppealWithUserInfo(AppealResponse):
    user_email: Optional[str]
    user_username: Optional[str]
    suspension_type: Optional[str]
    suspension_number: Optional[int]


class AppealsListResponse(BaseModel):
    success: bool
    data: List[AppealWithUserInfo]
    total: int


class AppealStatsResponse(BaseModel):
    success: bool
    data: Dict[str, int]


# ============================================================================
# USER ENDPOINTS
# ============================================================================

@user_router.post("", response_model=AppealResponse)
async def submit_appeal(
    body: SubmitAppealRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Submit an appeal for an active suspension.
    
    Requirements:
    - User must be currently suspended
    - User can only have one active appeal per suspension
    """
    try:
        user_id = current_user["user"]["id"]
        supabase = SupabaseService()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Check if user is suspended
            user_response = await client.get(
                f"{supabase.rest_url}/users",
                params={
                    "id": f"eq.{user_id}",
                    "select": "account_status,suspension_end"
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if user_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to check user status"
                )
            
            users = user_response.json()
            if not users or users[0]["account_status"] != "suspended":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You can only appeal an active suspension"
                )
            
            # Get active suspension
            suspension_response = await client.get(
                f"{supabase.rest_url}/user_suspensions",
                params={
                    "user_id": f"eq.{user_id}",
                    "status": "eq.active",
                    "order": "started_at.desc",
                    "limit": "1"
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if suspension_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve suspension"
                )
            
            suspensions = suspension_response.json()
            if not suspensions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No active suspension found"
                )
            
            suspension_id = suspensions[0]["id"]
            
            # Check if appeal already exists for this suspension
            existing_appeal_response = await client.get(
                f"{supabase.rest_url}/suspension_appeals",
                params={
                    "suspension_id": f"eq.{suspension_id}",
                    "select": "id,status"
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if existing_appeal_response.status_code == 200:
                existing_appeals = existing_appeal_response.json()
                if existing_appeals:
                    existing_status = existing_appeals[0]["status"]
                    if existing_status in ["pending", "under_review"]:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"You already have a {existing_status} appeal for this suspension"
                        )
            
            # Create appeal
            appeal_data = {
                "user_id": user_id,
                "suspension_id": suspension_id,
                "appeal_reason": body.appeal_reason,
                "additional_context": body.additional_context,
                "status": "pending"
            }
            
            headers = supabase._get_headers(use_service_key=True)
            headers["Prefer"] = "return=representation"
            
            create_response = await client.post(
                f"{supabase.rest_url}/suspension_appeals",
                json=appeal_data,
                headers=headers
            )
            
            if create_response.status_code not in [200, 201]:
                logger.error(f"Failed to create appeal: {create_response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to submit appeal"
                )
            
            appeal = create_response.json()[0]
            
            logger.info(f"✅ User {user_id[:8]}... submitted appeal for suspension {suspension_id[:8]}...")
            
            return AppealResponse(**appeal)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error submitting appeal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@user_router.get("/my", response_model=AppealsListResponse)
async def get_my_appeals(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all appeals submitted by the current user."""
    try:
        user_id = current_user["user"]["id"]
        supabase = SupabaseService()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{supabase.rest_url}/suspension_appeals",
                params={
                    "user_id": f"eq.{user_id}",
                    "select": "id,user_id,suspension_id,appeal_reason,additional_context,status,reviewed_by,reviewed_at,rejection_reason,created_at,updated_at,user_suspensions!inner(suspension_type,suspension_number)",
                    "order": "created_at.desc"
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve appeals"
                )
            
            appeals = response.json()
            
            # Format response
            formatted_appeals = []
            for appeal in appeals:
                suspension_data = appeal.pop("user_suspensions", {})
                formatted_appeal = {
                    **appeal,
                    "user_email": None,
                    "user_username": None,
                    "suspension_type": suspension_data.get("suspension_type"),
                    "suspension_number": suspension_data.get("suspension_number")
                }
                formatted_appeals.append(AppealWithUserInfo(**formatted_appeal))
            
            return AppealsListResponse(
                success=True,
                data=formatted_appeals,
                total=len(formatted_appeals)
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting user appeals: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@user_router.get("/{appeal_id}", response_model=AppealResponse)
async def get_appeal(
    appeal_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get details of a specific appeal (user can only view their own appeals)."""
    try:
        user_id = current_user["user"]["id"]
        supabase = SupabaseService()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{supabase.rest_url}/suspension_appeals",
                params={
                    "id": f"eq.{appeal_id}",
                    "user_id": f"eq.{user_id}",
                    "select": "*"
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve appeal"
                )
            
            appeals = response.json()
            if not appeals:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Appeal not found"
                )
            
            return AppealResponse(**appeals[0])
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting appeal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@admin_router.get("", response_model=AppealsListResponse)
async def get_all_appeals(
    status_filter: Optional[Literal["pending", "under_review", "approved", "rejected"]] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Get all appeals with optional status filter.
    
    Requires admin role.
    """
    try:
        supabase = SupabaseService()
        
        # Build query params
        params = {
            "select": "id,user_id,suspension_id,appeal_reason,additional_context,status,reviewed_by,reviewed_at,rejection_reason,created_at,updated_at,users!inner(email,username),user_suspensions!inner(suspension_type,suspension_number)",
            "order": "created_at.desc",
            "limit": limit,
            "offset": offset
        }
        
        if status_filter:
            params["status"] = f"eq.{status_filter}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{supabase.rest_url}/suspension_appeals",
                params=params,
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve appeals"
                )
            
            appeals = response.json()
            
            # Get total count
            count_params = {"select": "count"}
            if status_filter:
                count_params["status"] = f"eq.{status_filter}"
            
            count_response = await client.get(
                f"{supabase.rest_url}/suspension_appeals",
                params=count_params,
                headers={**supabase._get_headers(use_service_key=True), "Prefer": "count=exact"}
            )
            
            total = 0
            if count_response.status_code == 200:
                content_range = count_response.headers.get("Content-Range", "")
                if "/" in content_range:
                    total = int(content_range.split("/")[1])
            
            # Format response
            formatted_appeals = []
            for appeal in appeals:
                user_data = appeal.pop("users", {})
                suspension_data = appeal.pop("user_suspensions", {})
                formatted_appeal = {
                    **appeal,
                    "user_email": user_data.get("email"),
                    "user_username": user_data.get("username"),
                    "suspension_type": suspension_data.get("suspension_type"),
                    "suspension_number": suspension_data.get("suspension_number")
                }
                formatted_appeals.append(AppealWithUserInfo(**formatted_appeal))
            
            logger.info(f"📊 Admin retrieved {len(appeals)} appeals (total: {total})")
            
            return AppealsListResponse(
                success=True,
                data=formatted_appeals,
                total=total
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting appeals: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@admin_router.patch("/{appeal_id}/review", response_model=AppealResponse)
async def review_appeal(
    appeal_id: str,
    body: ReviewAppealRequest,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Review an appeal - approve or reject.
    
    If approved:
    - Suspension status set to 'lifted'
    - User account_status set to 'active'
    - Strike count reset to 0
    
    Requires admin role.
    """
    try:
        admin_id = current_user["user"]["id"]
        supabase = SupabaseService()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get appeal details
            appeal_response = await client.get(
                f"{supabase.rest_url}/suspension_appeals",
                params={
                    "id": f"eq.{appeal_id}",
                    "select": "id,user_id,suspension_id,status"
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if appeal_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve appeal"
                )
            
            appeals = appeal_response.json()
            if not appeals:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Appeal not found"
                )
            
            appeal = appeals[0]
            
            if appeal["status"] not in ["pending", "under_review"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot review appeal with status: {appeal['status']}"
                )
            
            # Validate rejection reason if rejecting
            if body.decision == "reject" and not body.rejection_reason:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="rejection_reason is required when rejecting an appeal"
                )
            
            # Update appeal
            appeal_update = {
                "status": "approved" if body.decision == "approve" else "rejected",
                "reviewed_by": admin_id,
                "reviewed_at": datetime.utcnow().isoformat(),
                "admin_notes": body.admin_notes,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if body.decision == "reject":
                appeal_update["rejection_reason"] = body.rejection_reason
            
            headers = supabase._get_headers(use_service_key=True)
            headers["Prefer"] = "return=representation"
            
            update_appeal_response = await client.patch(
                f"{supabase.rest_url}/suspension_appeals",
                params={"id": f"eq.{appeal_id}"},
                json=appeal_update,
                headers=headers
            )
            
            if update_appeal_response.status_code not in [200, 204]:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update appeal"
                )
            
            # If approved, lift the suspension
            if body.decision == "approve":
                # Update suspension status
                await client.patch(
                    f"{supabase.rest_url}/user_suspensions",
                    params={"id": f"eq.{appeal['suspension_id']}"},
                    json={
                        "status": "lifted",
                        "lifted_at": datetime.utcnow().isoformat(),
                        "lifted_by": admin_id,
                        "lifted_reason": f"Appeal approved: {body.admin_notes or 'No reason provided'}",
                        "updated_at": datetime.utcnow().isoformat()
                    },
                    headers=supabase._get_headers(use_service_key=True)
                )
                
                # Update user status
                await client.patch(
                    f"{supabase.rest_url}/users",
                    params={"id": f"eq.{appeal['user_id']}"},
                    json={
                        "account_status": "active",
                        "strike_count": 0,
                        "suspension_end": None
                    },
                    headers=supabase._get_headers(use_service_key=True)
                )
                
                logger.info(f"✅ Admin {admin_id[:8]}... APPROVED appeal {appeal_id[:8]}... and lifted suspension")
            else:
                logger.info(f"❌ Admin {admin_id[:8]}... REJECTED appeal {appeal_id[:8]}...")
            
            # Get updated appeal
            final_response = await client.get(
                f"{supabase.rest_url}/suspension_appeals",
                params={"id": f"eq.{appeal_id}", "select": "*"},
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if final_response.status_code == 200:
                updated_appeal = final_response.json()[0]
                return AppealResponse(**updated_appeal)
            else:
                # Return the update response if final fetch fails
                return AppealResponse(**update_appeal_response.json()[0])
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error reviewing appeal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@admin_router.get("/stats", response_model=AppealStatsResponse)
async def get_appeal_stats(
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Get appeal statistics.
    
    Requires admin role.
    """
    try:
        supabase = SupabaseService()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get counts for each status
            stats = {}
            
            for status_value in ["pending", "under_review", "approved", "rejected"]:
                response = await client.get(
                    f"{supabase.rest_url}/suspension_appeals",
                    params={"select": "count", "status": f"eq.{status_value}"},
                    headers={**supabase._get_headers(use_service_key=True), "Prefer": "count=exact"}
                )
                
                count = 0
                if response.status_code == 200:
                    content_range = response.headers.get("Content-Range", "")
                    if "/" in content_range:
                        count = int(content_range.split("/")[1])
                
                stats[status_value] = count
            
            # Get total count
            total_response = await client.get(
                f"{supabase.rest_url}/suspension_appeals",
                params={"select": "count"},
                headers={**supabase._get_headers(use_service_key=True), "Prefer": "count=exact"}
            )
            
            total = 0
            if total_response.status_code == 200:
                content_range = total_response.headers.get("Content-Range", "")
                if "/" in content_range:
                    total = int(content_range.split("/")[1])
            
            stats["total"] = total
            
            logger.info(f"📊 Admin retrieved appeal stats: {stats}")
            
            return AppealStatsResponse(success=True, data=stats)
    
    except Exception as e:
        logger.error(f"❌ Error getting appeal stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
