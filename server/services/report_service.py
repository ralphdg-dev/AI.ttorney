from typing import Dict, Any, List, Optional
import httpx
import logging
from .supabase_service import SupabaseService

logger = logging.getLogger(__name__)

class ReportService:
    """Service for handling forum post and comment reports"""
    
    def __init__(self):
        self.supabase = SupabaseService()
    
    async def submit_report(self, target_id: str, target_type: str, reason: str, reporter_id: str, reason_context: str = None) -> Dict[str, Any]:
        """Submit a report for a forum post or reply"""
        try:
            # Validate target type
            if target_type not in ['post', 'comment', 'reply']:
                return {"success": False, "error": "Invalid target type. Must be 'post', 'comment', or 'reply'"}
            
            # Normalize 'comment' to 'reply' for consistency
            normalized_type = 'reply' if target_type == 'comment' else target_type
            
            # Check if target exists
            table_name = "forum_posts" if normalized_type == "post" else "forum_replies"
            async with httpx.AsyncClient() as client:
                target_response = await client.get(
                    f"{self.supabase.rest_url}/{table_name}?select=id&id=eq.{target_id}",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
            
            if target_response.status_code != 200:
                return {"success": False, "error": f"Failed to verify {normalized_type} exists"}
            
            targets = target_response.json() if target_response.content else []
            if not targets:
                return {"success": False, "error": f"{normalized_type.capitalize()} not found"}
            
            # Determine which table to use for reports
            if normalized_type == "post":
                report_table = "forum_reports"
                # Check if user has already reported this post
                async with httpx.AsyncClient() as client:
                    existing_response = await client.get(
                        f"{self.supabase.rest_url}/forum_reports?select=id&target_id=eq.{target_id}&target_type=eq.post&reporter_id=eq.{reporter_id}",
                        headers=self.supabase._get_headers(use_service_key=True)
                    )
                
                if existing_response.status_code == 200:
                    existing = existing_response.json() if existing_response.content else []
                    if existing:
                        return {"success": False, "error": "You have already reported this post"}
                
                # Create new post report
                report_data = {
                    "target_id": target_id,
                    "target_type": "post",
                    "reason": reason,
                    "reporter_id": reporter_id,
                    "reason_context": reason_context
                }
            else:
                # Use reported_replies table for replies
                report_table = "reported_replies"
                # Check if user has already reported this reply
                async with httpx.AsyncClient() as client:
                    existing_response = await client.get(
                        f"{self.supabase.rest_url}/reported_replies?select=id&reply_id=eq.{target_id}&reporter_id=eq.{reporter_id}",
                        headers=self.supabase._get_headers(use_service_key=True)
                    )
                
                if existing_response.status_code == 200:
                    existing = existing_response.json() if existing_response.content else []
                    if existing:
                        return {"success": False, "error": "You have already reported this reply"}
                
                # Create new reply report
                report_data = {
                    "reply_id": target_id,
                    "reporter_id": reporter_id,
                    "reason": reason,
                    "reason_context": reason_context,
                    "status": "pending"
                }
            
            headers = self.supabase._get_headers(use_service_key=True)
            headers["Prefer"] = "return=representation"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.supabase.rest_url}/{report_table}",
                    json=report_data,
                    headers=headers
                )
            
            if response.status_code not in (200, 201):
                details = {}
                try:
                    details = response.json() if response.content else {}
                except Exception:
                    details = {"raw": response.text}
                logger.error(f"Submit report failed: {response.status_code} - {details}")
                return {"success": False, "error": details.get("message", "Failed to submit report")}
            
            created = response.json() if response.content else []
            if isinstance(created, list) and created:
                return {"success": True, "data": created[0]}
            
            return {"success": True, "data": {}}
            
        except Exception as e:
            logger.error(f"Submit report error: {str(e)}")
            return {"success": False, "error": "Internal server error"}
    
    async def check_user_report(self, target_id: str, target_type: str, reporter_id: str) -> Dict[str, Any]:
        """Check if a user has already reported a specific target"""
        try:
            # Normalize 'comment' to 'reply' for consistency
            normalized_type = 'reply' if target_type == 'comment' else target_type
            
            logger.info(f"🔍 Checking if user {reporter_id} has reported {normalized_type} {target_id}")
            
            if normalized_type == "post":
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.supabase.rest_url}/forum_reports?select=id&target_id=eq.{target_id}&target_type=eq.post&reporter_id=eq.{reporter_id}",
                        headers=self.supabase._get_headers(use_service_key=True)
                    )
            else:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.supabase.rest_url}/reported_replies?select=id&reply_id=eq.{target_id}&reporter_id=eq.{reporter_id}",
                        headers=self.supabase._get_headers(use_service_key=True)
                    )
            
            if response.status_code != 200:
                details = {}
                try:
                    details = response.json() if response.content else {}
                except Exception:
                    details = {"raw": response.text}
                logger.error(f"Check user report failed: {response.status_code} - {details}")
                return {"success": False, "error": details.get("message", "Failed to check report")}
            
            reports = response.json() if response.content else []
            has_reported = len(reports) > 0
            
            logger.info(f"✅ Check result: Found {len(reports)} existing report(s), hasReported={has_reported}")
            
            return {"success": True, "data": {"hasReported": has_reported}}
            
        except Exception as e:
            logger.error(f"Check user report error: {str(e)}")
            return {"success": False, "error": "Internal server error"}
    
    async def get_reports_for_target(self, target_id: str, target_type: str) -> Dict[str, Any]:
        """Get all reports for a specific target"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase.rest_url}/forum_reports?select=*&target_id=eq.{target_id}&target_type=eq.{target_type}&order=submitted_at.desc",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
            
            if response.status_code != 200:
                details = {}
                try:
                    details = response.json() if response.content else {}
                except Exception:
                    details = {"raw": response.text}
                logger.error(f"Get reports for target failed: {response.status_code} - {details}")
                return {"success": False, "error": details.get("message", "Failed to get reports")}
            
            reports = response.json() if response.content else []
            return {"success": True, "data": reports}
            
        except Exception as e:
            logger.error(f"Get reports for target error: {str(e)}")
            return {"success": False, "error": "Internal server error"}
    
    async def get_reports_by_user(self, reporter_id: str) -> Dict[str, Any]:
        """Get all reports submitted by a specific user"""
        try:
            # Get reports with related post/comment data
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase.rest_url}/forum_reports?select=*&reporter_id=eq.{reporter_id}&order=submitted_at.desc",
                    headers=self.supabase._get_headers(use_service_key=True)
                )
            
            if response.status_code != 200:
                details = {}
                try:
                    details = response.json() if response.content else {}
                except Exception:
                    details = {"raw": response.text}
                logger.error(f"Get reports by user failed: {response.status_code} - {details}")
                return {"success": False, "error": details.get("message", "Failed to get user reports")}
            
            reports = response.json() if response.content else []
            
            # Enrich reports with target data
            enriched_reports = []
            for report in reports:
                enriched_report = report.copy()
                target_id = report.get("target_id")
                target_type = report.get("target_type")
                
                if target_id and target_type:
                    table_name = "forum_posts" if target_type == "post" else "forum_replies"
                    try:
                        async with httpx.AsyncClient() as client:
                            target_response = await client.get(
                                f"{self.supabase.rest_url}/{table_name}?select=*&id=eq.{target_id}",
                                headers=self.supabase._get_headers(use_service_key=True)
                            )
                        
                        if target_response.status_code == 200:
                            targets = target_response.json() if target_response.content else []
                            if targets:
                                enriched_report["target_data"] = targets[0]
                    except Exception as e:
                        logger.warning(f"Failed to enrich report {report.get('id')} with target data: {str(e)}")
                
                enriched_reports.append(enriched_report)
            
            return {"success": True, "data": enriched_reports}
            
        except Exception as e:
            logger.error(f"Get reports by user error: {str(e)}")
            return {"success": False, "error": "Internal server error"}
