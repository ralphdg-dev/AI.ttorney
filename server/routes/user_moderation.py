"""
User Moderation Status Routes

Endpoints for users to view their own moderation status (strikes, suspensions).
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from middleware.auth import get_current_user
from services.supabase_service import SupabaseService
import httpx
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["user", "moderation"])


class ModerationStatusResponse(BaseModel):
    strike_count: int
    suspension_count: int
    account_status: str
    suspension_end: Optional[str] = None
    last_violation_at: Optional[str] = None


@router.get("/moderation-status", response_model=ModerationStatusResponse)
async def get_moderation_status(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get current user's moderation status.
    
    Returns strike count, suspension count, account status, and suspension end date.
    """
    try:
        user_id = current_user["user"]["id"]
        supabase = SupabaseService()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{supabase.rest_url}/users",
                params={
                    "id": f"eq.{user_id}",
                    "select": "strike_count,suspension_count,account_status,suspension_end,last_violation_at"
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if response.status_code == 200:
                users = response.json()
                if not users:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User not found"
                    )
                
                user_data = users[0]
                
                # Handle NULL values from database (for users created before migration)
                strike_count = user_data.get("strike_count") or 0
                suspension_count = user_data.get("suspension_count") or 0
                account_status = user_data.get("account_status") or "active"
                
                logger.info(f"📊 User {user_id[:8]}... moderation status: strikes={strike_count}, status={account_status}")
                
                return ModerationStatusResponse(
                    strike_count=strike_count,
                    suspension_count=suspension_count,
                    account_status=account_status,
                    suspension_end=user_data.get("suspension_end"),
                    last_violation_at=user_data.get("last_violation_at")
                )
            else:
                logger.error(f"Failed to get user moderation status: {response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve moderation status"
                )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting moderation status: {str(e)}")
        # Return default values if columns don't exist yet (before migration)
        logger.warning("Returning default moderation status (columns may not exist yet)")
        return ModerationStatusResponse(
            strike_count=0,
            suspension_count=0,
            account_status="active",
            suspension_end=None,
            last_violation_at=None
        )
