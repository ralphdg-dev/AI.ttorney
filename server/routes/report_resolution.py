from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
from middleware.auth import get_current_user, require_role
from services.supabase_service import SupabaseService
from services.violation_tracking_service import get_violation_tracking_service
from services.notification_service import NotificationService
from models.violation_types import ViolationType
import httpx
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])

class ResolveReportRequest(BaseModel):
    action: str  # 'sanctioned' or 'dismissed'

@router.put("/replies/{report_id}/resolve")
async def resolve_reply_report(
    report_id: str,
    request: ResolveReportRequest,
    current_user: Dict[str, Any] = Depends(require_role(["admin", "superadmin"]))
):
    """
    Resolve a reply report by approving (sanctioned) or dismissing it.
    When approved:
    - Updates report status to 'sanctioned'
    - Creates user_violations record
    - Adds strike to the violating user
    - Hides the reported reply
    - Sends notification to the violating user
    """
    try:
        supabase = SupabaseService()
        violation_service = get_violation_tracking_service()
        notification_service = NotificationService()
        
        # 1. Get the report details
        async with httpx.AsyncClient() as client:
            report_response = await client.get(
                f"{supabase.rest_url}/reported_replies?select=*,reply:forum_replies(*,user:users(*)),reporter:users!reported_replies_reporter_id_fkey(*)&id=eq.{report_id}",
                headers=supabase._get_headers(use_service_key=True)
            )
        
        if report_response.status_code != 200:
            raise HTTPException(status_code=404, detail="Report not found")
        
        reports = report_response.json()
        if not reports:
            raise HTTPException(status_code=404, detail="Report not found")
        
        report = reports[0]
        reply = report.get('reply')
        
        if not reply:
            raise HTTPException(status_code=404, detail="Reported reply not found")
        
        reply_id = reply.get('id')
        violating_user_id = reply.get('user_id')
        
        if not violating_user_id:
            raise HTTPException(status_code=400, detail="Cannot identify violating user")
        
        # 2. Update report status
        async with httpx.AsyncClient() as client:
            update_response = await client.patch(
                f"{supabase.rest_url}/reported_replies?id=eq.{report_id}",
                headers=supabase._get_headers(use_service_key=True),
                json={
                    "status": request.action,
                    "updated_at": "now()"
                }
            )
        
        if update_response.status_code not in [200, 204]:
            raise HTTPException(status_code=500, detail="Failed to update report status")
        
        # If dismissed, just return success
        if request.action == "dismissed":
            logger.info(f"Report {report_id} dismissed by admin {current_user['user']['id']}")
            return {
                "success": True,
                "message": "Report dismissed successfully"
            }
        
        # 3. If sanctioned (approved), perform additional actions
        if request.action == "sanctioned":
            # Map report reason to violation type
            reason = report.get('reason', 'other')
            violation_type_map = {
                'spam': ViolationType.SPAM,
                'harassment': ViolationType.HARASSMENT,
                'hate_speech': ViolationType.HATE_SPEECH,
                'misinformation': ViolationType.MISINFORMATION,
                'inappropriate': ViolationType.INAPPROPRIATE_CONTENT,
                'other': ViolationType.OTHER
            }
            violation_type = violation_type_map.get(reason, ViolationType.OTHER)
            
            # 4. Create user_violations record and add strike
            violation_result = await violation_service.record_violation(
                user_id=violating_user_id,
                violation_type=violation_type,
                content_text=reply.get('reply_body', ''),
                content_id=reply_id,
                violation_summary=f"Reply reported for {reason} and approved by admin",
                action_taken="strike_added"
            )
            
            if not violation_result.get('success'):
                logger.error(f"Failed to record violation: {violation_result.get('error')}")
                raise HTTPException(status_code=500, detail="Failed to record violation")
            
            # 5. Hide the reply
            async with httpx.AsyncClient() as client:
                hide_response = await client.patch(
                    f"{supabase.rest_url}/forum_replies?id=eq.{reply_id}",
                    headers=supabase._get_headers(use_service_key=True),
                    json={"hidden": True}
                )
            
            if hide_response.status_code not in [200, 204]:
                logger.error(f"Failed to hide reply {reply_id}")
            
            # 6. Send notification to the violating user
            try:
                await notification_service.create_notification(
                    user_id=violating_user_id,
                    notification_type="violation_warning",
                    title="Content Violation Warning",
                    message=f"Your reply has been removed for violating community guidelines: {reason}. A strike has been added to your account.",
                    data={
                        "violation_type": reason,
                        "content_id": reply_id,
                        "strike_count": violation_result.get('data', {}).get('strike_count_after', 1)
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send notification: {str(e)}")
            
            logger.info(f"Report {report_id} approved by admin {current_user['user']['id']}. Violation recorded for user {violating_user_id}")
            
            return {
                "success": True,
                "message": "Report approved successfully",
                "data": {
                    "violation_recorded": True,
                    "content_hidden": True,
                    "strike_count": violation_result.get('data', {}).get('strike_count_after', 1),
                    "notification_sent": True
                }
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving reply report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve report: {str(e)}")
