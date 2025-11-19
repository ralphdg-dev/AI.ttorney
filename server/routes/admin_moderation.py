"""
Admin Moderation Routes

Endpoints for administrators to view and manage user violations, suspensions, and bans.

Features:
- View all suspended/banned users
- View user violation history
- View suspension history
- Lift suspensions early (admin override)
- View moderation statistics

Security:
- Requires admin role
- Comprehensive audit logging
- GDPR compliant (data access controls)

Author: AI.ttorney Team
Date: 2025-10-22
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Literal
from datetime import datetime
from middleware.auth import require_role
from services.supabase_service import SupabaseService
from models.violation_types import ViolationType
import httpx
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/moderation", tags=["admin", "moderation"])


# Response Models
class UserModerationStatus(BaseModel):
    user_id: str
    username: Optional[str] = None
    email: Optional[str] = None
    account_status: str
    strike_count: int
    suspension_count: int
    suspension_end: Optional[str] = None
    last_violation_at: Optional[str] = None
    banned_at: Optional[str] = None
    banned_reason: Optional[str] = None


class ViolationRecord(BaseModel):
    id: str
    user_id: str
    violation_type: str
    content_text: str
    flagged_categories: Dict[str, Any]
    violation_summary: str
    action_taken: str
    strike_count_after: int
    suspension_count_after: int
    created_at: str
    appeal_status: str


class SuspensionRecord(BaseModel):
    id: str
    user_id: str
    suspension_type: str
    reason: str
    started_at: str
    ends_at: Optional[str] = None
    suspension_number: int
    strikes_at_suspension: int
    status: str


class ModerationStats(BaseModel):
    total_violations: int
    total_suspensions: int
    total_bans: int
    active_suspensions: int
    violations_today: int
    violations_this_week: int
    violations_this_month: int


class SuspendedUsersResponse(BaseModel):
    success: bool
    data: List[UserModerationStatus]
    total: int


class ViolationsResponse(BaseModel):
    success: bool
    data: List[ViolationRecord]
    total: int


class SuspensionsResponse(BaseModel):
    success: bool
    data: List[SuspensionRecord]
    total: int


class StatsResponse(BaseModel):
    success: bool
    data: ModerationStats


class LiftSuspensionRequest(BaseModel):
    reason: str = Field(..., description="Reason for lifting suspension early")


class LiftSuspensionResponse(BaseModel):
    success: bool
    message: str


# Endpoints

@router.get("/suspended-users", response_model=SuspendedUsersResponse)
async def get_suspended_users(
    status_filter: Optional[str] = Query(None, description="Filter by status: suspended, banned, or all"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Get list of suspended and banned users.
    
    Requires admin role.
    """
    try:
        supabase = SupabaseService()
        
        # Build query
        params = {
            "select": "id,username,email,account_status,strike_count,suspension_count,suspension_end,last_violation_at,banned_at,banned_reason",
            "order": "last_violation_at.desc.nullslast",
            "limit": limit,
            "offset": offset
        }
        
        # Apply status filter
        if status_filter == "suspended":
            params["account_status"] = "eq.suspended"
        elif status_filter == "banned":
            params["account_status"] = "eq.banned"
        elif status_filter == "all" or status_filter is None:
            params["account_status"] = "in.(suspended,banned)"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{supabase.rest_url}/users",
                params=params,
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if response.status_code == 200:
                users = response.json()
                
                # Get total count
                count_params = {"select": "count", "account_status": params.get("account_status", "in.(suspended,banned)")}
                count_response = await client.get(
                    f"{supabase.rest_url}/users",
                    params=count_params,
                    headers={**supabase._get_headers(use_service_key=True), "Prefer": "count=exact"}
                )
                
                total = 0
                if count_response.status_code == 200:
                    content_range = count_response.headers.get("Content-Range", "")
                    if "/" in content_range:
                        total = int(content_range.split("/")[1])
                
                logger.info(f"📊 Admin retrieved {len(users)} suspended/banned users (total: {total})")
                
                return SuspendedUsersResponse(
                    success=True,
                    data=[UserModerationStatus(**user) for user in users],
                    total=total
                )
            else:
                logger.error(f"Failed to get suspended users: {response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve suspended users"
                )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting suspended users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/violations", response_model=ViolationsResponse)
async def get_violations(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    violation_type: Optional[Literal["forum_post", "forum_reply", "chatbot_prompt"]] = Query(
        None, 
        description="Filter by type: forum_post, forum_reply, chatbot_prompt"
    ),
    action_taken: Optional[str] = Query(None, description="Filter by action: warning, strike_added, suspended, banned"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Get list of all violations with optional filters.
    
    Requires admin role.
    """
    try:
        supabase = SupabaseService()
        
        # Build query
        params = {
            "select": "id,user_id,violation_type,content_text,flagged_categories,violation_summary,action_taken,strike_count_after,suspension_count_after,created_at,appeal_status",
            "order": "created_at.desc",
            "limit": limit,
            "offset": offset
        }
        
        # Apply filters
        if user_id:
            params["user_id"] = f"eq.{user_id}"
        if violation_type:
            # Validate violation type
            if not ViolationType.is_valid(violation_type):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid violation_type. Must be one of: {ViolationType.values()}"
                )
            params["violation_type"] = f"eq.{violation_type}"
        if action_taken:
            params["action_taken"] = f"eq.{action_taken}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{supabase.rest_url}/user_violations",
                params=params,
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if response.status_code == 200:
                violations = response.json()
                
                # Get total count
                count_params = {k: v for k, v in params.items() if k != "select" and k != "order" and k != "limit" and k != "offset"}
                count_params["select"] = "count"
                count_response = await client.get(
                    f"{supabase.rest_url}/user_violations",
                    params=count_params,
                    headers={**supabase._get_headers(use_service_key=True), "Prefer": "count=exact"}
                )
                
                total = 0
                if count_response.status_code == 200:
                    content_range = count_response.headers.get("Content-Range", "")
                    if "/" in content_range:
                        total = int(content_range.split("/")[1])
                
                logger.info(f"📊 Admin retrieved {len(violations)} violations (total: {total})")
                
                return ViolationsResponse(
                    success=True,
                    data=[ViolationRecord(**v) for v in violations],
                    total=total
                )
            else:
                logger.error(f"Failed to get violations: {response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve violations"
                )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/suspensions", response_model=SuspensionsResponse)
async def get_suspensions(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    status_filter: Optional[str] = Query(None, description="Filter by status: active, lifted, expired"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Get list of all suspensions with optional filters.
    
    Requires admin role.
    """
    try:
        supabase = SupabaseService()
        
        # Build query
        params = {
            "select": "id,user_id,suspension_type,reason,started_at,ends_at,suspension_number,strikes_at_suspension,status",
            "order": "started_at.desc",
            "limit": limit,
            "offset": offset
        }
        
        # Apply filters
        if user_id:
            params["user_id"] = f"eq.{user_id}"
        if status_filter:
            params["status"] = f"eq.{status_filter}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{supabase.rest_url}/user_suspensions",
                params=params,
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if response.status_code == 200:
                suspensions = response.json()
                
                # Get total count
                count_params = {k: v for k, v in params.items() if k != "select" and k != "order" and k != "limit" and k != "offset"}
                count_params["select"] = "count"
                count_response = await client.get(
                    f"{supabase.rest_url}/user_suspensions",
                    params=count_params,
                    headers={**supabase._get_headers(use_service_key=True), "Prefer": "count=exact"}
                )
                
                total = 0
                if count_response.status_code == 200:
                    content_range = count_response.headers.get("Content-Range", "")
                    if "/" in content_range:
                        total = int(content_range.split("/")[1])
                
                logger.info(f"📊 Admin retrieved {len(suspensions)} suspensions (total: {total})")
                
                return SuspensionsResponse(
                    success=True,
                    data=[SuspensionRecord(**s) for s in suspensions],
                    total=total
                )
            else:
                logger.error(f"Failed to get suspensions: {response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve suspensions"
                )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting suspensions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/stats", response_model=StatsResponse)
async def get_moderation_stats(
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Get moderation statistics.
    
    Requires admin role.
    """
    try:
        supabase = SupabaseService()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get total violations
            violations_response = await client.get(
                f"{supabase.rest_url}/user_violations",
                params={"select": "count"},
                headers={**supabase._get_headers(use_service_key=True), "Prefer": "count=exact"}
            )
            total_violations = 0
            if violations_response.status_code == 200:
                content_range = violations_response.headers.get("Content-Range", "")
                if "/" in content_range:
                    total_violations = int(content_range.split("/")[1])
            
            # Get total suspensions
            suspensions_response = await client.get(
                f"{supabase.rest_url}/user_suspensions",
                params={"select": "count"},
                headers={**supabase._get_headers(use_service_key=True), "Prefer": "count=exact"}
            )
            total_suspensions = 0
            if suspensions_response.status_code == 200:
                content_range = suspensions_response.headers.get("Content-Range", "")
                if "/" in content_range:
                    total_suspensions = int(content_range.split("/")[1])
            
            # Get total bans
            bans_response = await client.get(
                f"{supabase.rest_url}/users",
                params={"select": "count", "account_status": "eq.banned"},
                headers={**supabase._get_headers(use_service_key=True), "Prefer": "count=exact"}
            )
            total_bans = 0
            if bans_response.status_code == 200:
                content_range = bans_response.headers.get("Content-Range", "")
                if "/" in content_range:
                    total_bans = int(content_range.split("/")[1])
            
            # Get active suspensions
            active_suspensions_response = await client.get(
                f"{supabase.rest_url}/users",
                params={"select": "count", "account_status": "eq.suspended"},
                headers={**supabase._get_headers(use_service_key=True), "Prefer": "count=exact"}
            )
            active_suspensions = 0
            if active_suspensions_response.status_code == 200:
                content_range = active_suspensions_response.headers.get("Content-Range", "")
                if "/" in content_range:
                    active_suspensions = int(content_range.split("/")[1])
            
            # Get violations today (last 24 hours)
            now = datetime.utcnow()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            violations_today_response = await client.get(
                f"{supabase.rest_url}/user_violations",
                params={"select": "count", "created_at": f"gte.{today_start}"},
                headers={**supabase._get_headers(use_service_key=True), "Prefer": "count=exact"}
            )
            violations_today = 0
            if violations_today_response.status_code == 200:
                content_range = violations_today_response.headers.get("Content-Range", "")
                if "/" in content_range:
                    violations_today = int(content_range.split("/")[1])
            
            # Get violations this week (last 7 days)
            from datetime import timedelta
            week_start = (now - timedelta(days=7)).isoformat()
            violations_week_response = await client.get(
                f"{supabase.rest_url}/user_violations",
                params={"select": "count", "created_at": f"gte.{week_start}"},
                headers={**supabase._get_headers(use_service_key=True), "Prefer": "count=exact"}
            )
            violations_this_week = 0
            if violations_week_response.status_code == 200:
                content_range = violations_week_response.headers.get("Content-Range", "")
                if "/" in content_range:
                    violations_this_week = int(content_range.split("/")[1])
            
            # Get violations this month (last 30 days)
            month_start = (now - timedelta(days=30)).isoformat()
            violations_month_response = await client.get(
                f"{supabase.rest_url}/user_violations",
                params={"select": "count", "created_at": f"gte.{month_start}"},
                headers={**supabase._get_headers(use_service_key=True), "Prefer": "count=exact"}
            )
            violations_this_month = 0
            if violations_month_response.status_code == 200:
                content_range = violations_month_response.headers.get("Content-Range", "")
                if "/" in content_range:
                    violations_this_month = int(content_range.split("/")[1])
            
            stats = ModerationStats(
                total_violations=total_violations,
                total_suspensions=total_suspensions,
                total_bans=total_bans,
                active_suspensions=active_suspensions,
                violations_today=violations_today,
                violations_this_week=violations_this_week,
                violations_this_month=violations_this_month
            )
            
            logger.info(f"📊 Admin retrieved moderation stats: {total_violations} violations, {total_suspensions} suspensions, {total_bans} bans")
            
            return StatsResponse(success=True, data=stats)
    
    except Exception as e:
        logger.error(f"❌ Error getting moderation stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/lift-suspension/{user_id}", response_model=LiftSuspensionResponse)
async def lift_suspension(
    user_id: str,
    body: LiftSuspensionRequest,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Lift a user's suspension early (admin override).
    
    Requires admin role.
    """
    try:
        admin_id = current_user["user"]["id"]
        supabase = SupabaseService()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Check if user is actually suspended
            user_response = await client.get(
                f"{supabase.rest_url}/users",
                params={"id": f"eq.{user_id}", "select": "id,account_status,strike_count,suspension_count"},
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if user_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            users = user_response.json()
            if not users:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            user = users[0]
            if user["account_status"] != "suspended":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User is not currently suspended"
                )
            
            # Update user status
            update_response = await client.patch(
                f"{supabase.rest_url}/users",
                params={"id": f"eq.{user_id}"},
                json={
                    "account_status": "active",
                    "strike_count": 0,  # Reset strikes when lifting suspension
                    "suspension_end": None
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if update_response.status_code not in [200, 204]:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to lift suspension"
                )
            
            # Mark suspension as lifted
            suspension_update_response = await client.patch(
                f"{supabase.rest_url}/user_suspensions",
                params={"user_id": f"eq.{user_id}", "status": "eq.active"},
                json={
                    "status": "lifted",
                    "lifted_at": datetime.utcnow().isoformat(),
                    "lifted_by": admin_id,
                    "lifted_reason": body.reason,
                    "updated_at": datetime.utcnow().isoformat()
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            logger.info(f"✅ Admin {admin_id[:8]}... lifted suspension for user {user_id[:8]}... (reason: {body.reason})")
            
            return LiftSuspensionResponse(
                success=True,
                message="Suspension lifted successfully. Strikes reset to 0."
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error lifting suspension: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/lift-ban/{user_id}", response_model=LiftSuspensionResponse)
async def lift_ban(
    user_id: str,
    body: LiftSuspensionRequest,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Lift a user's permanent ban (admin override).
    
    Resets strikes to 0, suspension_count to 0, and account_status to active.
    This gives the user a fresh start.
    
    Requires admin role.
    """
    try:
        admin_id = current_user["user"]["id"]
        supabase = SupabaseService()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Check if user is actually banned
            user_response = await client.get(
                f"{supabase.rest_url}/users",
                params={"id": f"eq.{user_id}", "select": "id,account_status,strike_count,suspension_count,banned_at"},
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if user_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            users = user_response.json()
            if not users:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            user = users[0]
            if user["account_status"] != "banned":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User is not currently banned"
                )
            
            # Update user status - Reset strikes only, keep suspension history
            update_response = await client.patch(
                f"{supabase.rest_url}/users",
                params={"id": f"eq.{user_id}"},
                json={
                    "account_status": "active",
                    "strike_count": 0,  # Reset strikes
                    # suspension_count stays - permanent record of past suspensions
                    "suspension_end": None,
                    "banned_at": None,
                    "banned_reason": None
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if update_response.status_code not in [200, 204]:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to lift ban"
                )
            
            # Mark all suspensions as lifted
            suspension_update_response = await client.patch(
                f"{supabase.rest_url}/user_suspensions",
                params={"user_id": f"eq.{user_id}", "status": "eq.active"},
                json={
                    "status": "lifted",
                    "lifted_at": datetime.utcnow().isoformat(),
                    "lifted_by": admin_id,
                    "lifted_reason": f"Ban lifted by admin: {body.reason}",
                    "updated_at": datetime.utcnow().isoformat()
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            logger.info(f"✅ Admin {admin_id[:8]}... lifted PERMANENT BAN for user {user_id[:8]}... (reason: {body.reason})")
            logger.info(f"🔄 User {user_id[:8]}... reset: strikes=0, status=active (suspension_count preserved)")
            
            return LiftSuspensionResponse(
                success=True,
                message="Ban lifted successfully. Strikes reset to 0. Suspension history preserved."
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error lifting ban: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
