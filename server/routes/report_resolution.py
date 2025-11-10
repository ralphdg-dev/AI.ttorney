from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
from middleware.auth import get_current_user, require_role
from services.supabase_service import SupabaseService
from services.violation_tracking_service import get_violation_tracking_service
from services.notification_service import NotificationService
from models.violation_types import ViolationType
from routes.forum import clear_posts_cache, clear_reply_counts_cache
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
        notification_service = NotificationService(supabase.supabase)
        
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
                    "updated_at": __import__('datetime').datetime.utcnow().isoformat()
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
            # Prepare moderation_result based on report reason
            reason = report.get('reason', 'other')
            moderation_result = {
                "categories": {reason: True},
                "category_scores": {reason: 1.0},
                "violation_summary": f"Reply reported for {reason}"
            }

            try:
                # 4. Create user_violations record and apply action via service
                violation_outcome = await violation_service.record_violation(
                    user_id=violating_user_id,
                    violation_type=ViolationType.FORUM_REPLY,
                    content_text=reply.get('reply_body', ''),
                    moderation_result=moderation_result,
                    content_id=reply_id
                )

                if not violation_outcome or not violation_outcome.get('action_taken'):
                    logger.error("Failed to record violation via ViolationTrackingService")
                    raise Exception("Failed to record violation")

                # 5. Hide the reply
                async with httpx.AsyncClient() as client:
                    hide_response = await client.patch(
                        f"{supabase.rest_url}/forum_replies?id=eq.{reply_id}",
                        headers=supabase._get_headers(use_service_key=True),
                        json={"hidden": True}
                    )

                if hide_response.status_code not in [200, 204]:
                    logger.error(f"Failed to hide reply {reply_id}")
                else:
                    # Clear caches so hidden replies are not served from cache
                    try:
                        clear_posts_cache()
                        clear_reply_counts_cache()
                    except Exception as cache_err:
                        logger.warning(f"Failed to clear forum caches after hiding reply: {cache_err}")

                # 6. Send notification to the violating user (non-critical)
                try:
                    action_taken = violation_outcome.get("action_taken")
                    strike_count = violation_outcome.get("strike_count")
                    suspension_count = violation_outcome.get("suspension_count")
                    suspension_end = violation_outcome.get("suspension_end")

                    if action_taken == "banned":
                        title = "Account Banned"
                        message = f"Your reply has been removed and your account has been permanently banned for violating community guidelines: {reason}."
                    elif action_taken == "suspended":
                        title = "Account Suspended"
                        message = f"Your reply has been removed and your account has been suspended for 7 days for violating community guidelines: {reason}. This is suspension #{suspension_count}."
                    else:
                        title = "Content Violation Warning"
                        message = f"Your reply has been removed for violating community guidelines: {reason}. A strike has been added to your account ({strike_count} total)."

                    await notification_service.create_notification(
                        user_id=violating_user_id,
                        notification_type="violation_warning",
                        title=title,
                        message=message,
                        data={
                            "violation_type": reason,
                            "content_id": reply_id,
                            "strike_count": strike_count,
                            "action_taken": action_taken
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
                        "strike_count": violation_outcome.get('strike_count', 1),
                        "notification_sent": True
                    }
                }
            except Exception as critical_error:
                # Rollback report status to pending on critical failure
                try:
                    async with httpx.AsyncClient() as client:
                        await client.patch(
                            f"{supabase.rest_url}/reported_replies?id=eq.{report_id}",
                            headers=supabase._get_headers(use_service_key=True),
                            json={
                                "status": "pending",
                                "updated_at": __import__('datetime').datetime.utcnow().isoformat()
                            }
                        )
                except Exception as rollback_err:
                    logger.error(f"Failed to rollback report {report_id} to pending: {rollback_err}")
                logger.error(f"Critical error during sanction flow for report {report_id}: {critical_error}")
                raise HTTPException(status_code=500, detail="Failed to approve report; changes rolled back")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving reply report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve report: {str(e)}")
