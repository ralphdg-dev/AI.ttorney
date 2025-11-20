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
    lifted_acknowledged: Optional[bool] = None
    lifted_at: Optional[str] = None
    was_lifted_by_admin: bool = False
    most_recent_suspension_id: Optional[str] = None


@router.get("/moderation-status", response_model=ModerationStatusResponse)
async def get_moderation_status(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get current user's moderation status.
    
    Returns strike count, suspension count, account status, suspension end date,
    and information about the most recent suspension (including lifted_acknowledged status).
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
            
            if response.status_code != 200:
                logger.error(f"Failed to get user moderation status: {response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve moderation status"
                )
            
            users = response.json()
            if not users:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            user_data = users[0]
            
                                                                                   
            strike_count = user_data.get("strike_count") or 0
            suspension_count = user_data.get("suspension_count") or 0
            account_status = user_data.get("account_status") or "active"
            
                                                                            
            suspension_response = await client.get(
                f"{supabase.rest_url}/user_suspensions",
                params={
                    "user_id": f"eq.{user_id}",
                    "select": "id,lifted_acknowledged,lifted_at,lifted_by,status,ends_at",
                    "order": "created_at.desc",
                    "limit": "1"
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            lifted_acknowledged = None
            lifted_at = None
            was_lifted_by_admin = False
            most_recent_suspension_id = None
            
            if suspension_response.status_code == 200:
                suspensions = suspension_response.json()
                if suspensions:
                    most_recent = suspensions[0]
                    most_recent_suspension_id = most_recent.get("id")
                    lifted_acknowledged = most_recent.get("lifted_acknowledged")
                    lifted_at = most_recent.get("lifted_at")
                    was_lifted_by_admin = most_recent.get("lifted_by") is not None
            
            logger.info(f" User {user_id[:8]}... moderation status: strikes={strike_count}, status={account_status}, lifted_ack={lifted_acknowledged}")
            
            return ModerationStatusResponse(
                strike_count=strike_count,
                suspension_count=suspension_count,
                account_status=account_status,
                suspension_end=user_data.get("suspension_end"),
                last_violation_at=user_data.get("last_violation_at"),
                lifted_acknowledged=lifted_acknowledged,
                lifted_at=lifted_at,
                was_lifted_by_admin=was_lifted_by_admin,
                most_recent_suspension_id=most_recent_suspension_id
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f" Error getting moderation status: {str(e)}")
                                                                             
        logger.warning("Returning default moderation status (columns may not exist yet)")
        return ModerationStatusResponse(
            strike_count=0,
            suspension_count=0,
            account_status="active",
            suspension_end=None,
            last_violation_at=None,
            lifted_acknowledged=None,
            lifted_at=None,
            was_lifted_by_admin=False,
            most_recent_suspension_id=None
        )


@router.post("/acknowledge-suspension-lifted")
async def acknowledge_suspension_lifted(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Acknowledge that the user has seen the suspension lifted screen.
    
    Updates the lifted_acknowledged field to true for the most recent suspension.
    """
    try:
        user_id = current_user["user"]["id"]
        supabase = SupabaseService()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
                                            
            suspension_response = await client.get(
                f"{supabase.rest_url}/user_suspensions",
                params={
                    "user_id": f"eq.{user_id}",
                    "select": "id",
                    "order": "created_at.desc",
                    "limit": "1"
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if suspension_response.status_code != 200:
                logger.error(f"Failed to get user suspensions: {suspension_response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve suspension information"
                )
            
            suspensions = suspension_response.json()
            if not suspensions:
                logger.warning(f"No suspensions found for user {user_id[:8]}...")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No suspension found"
                )
            
            suspension_id = suspensions[0]["id"]
            
                                                
            update_response = await client.patch(
                f"{supabase.rest_url}/user_suspensions",
                params={
                    "id": f"eq.{suspension_id}"
                },
                json={
                    "lifted_acknowledged": True
                },
                headers=supabase._get_headers(use_service_key=True)
            )
            
            if update_response.status_code not in [200, 204]:
                logger.error(f"Failed to update lifted_acknowledged: {update_response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to acknowledge suspension lifted"
                )
            
            logger.info(f" User {user_id[:8]}... acknowledged suspension lifted for suspension {suspension_id[:8]}...")
            
            return {
                "success": True,
                "message": "Suspension lifted acknowledgment recorded"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f" Error acknowledging suspension lifted: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to acknowledge suspension lifted"
        )
