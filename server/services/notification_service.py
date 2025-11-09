from typing import Dict, Any, Optional, List
from datetime import datetime
from supabase import Client
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Industry-grade notification service with hybrid delivery (real-time + polling fallback)
    Follows FAANG patterns: Facebook notifications, Slack real-time, Discord hybrid
    """
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def create_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Create notification with automatic real-time broadcast"""
        try:
            notification_data = {
                "user_id": user_id,
                "type": notification_type,
                "title": title,
                "message": message,
                "data": data or {},
                "read": False
            }
            
            result = self.supabase.table("notifications")\
                .insert(notification_data)\
                .execute()
            
            if result.data:
                notification_id = result.data[0]["id"]
                logger.info(f"✅ Notification created: {notification_type} for user {user_id[:8]}...")
                return notification_id
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
            return None
    
    async def get_user_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get notifications with pagination"""
        try:
            query = self.supabase.table("notifications")\
                .select("*")\
                .eq("user_id", user_id)
            
            if unread_only:
                query = query.eq("read", False)
            
            result = query.order("created_at", desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to fetch notifications: {e}")
            return []
    
    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark single notification as read"""
        try:
            result = self.supabase.table("notifications")\
                .update({"read": True, "read_at": datetime.utcnow().isoformat()})\
                .eq("id", notification_id)\
                .eq("user_id", user_id)\
                .execute()
            
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Failed to mark notification as read: {e}")
            return False
    
    async def mark_all_as_read(self, user_id: str) -> bool:
        """Mark all user notifications as read"""
        try:
            result = self.supabase.table("notifications")\
                .update({"read": True, "read_at": datetime.utcnow().isoformat()})\
                .eq("user_id", user_id)\
                .eq("read", False)\
                .execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to mark all notifications as read: {e}")
            return False
    
    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications"""
        try:
            result = self.supabase.table("notifications")\
                .select("id", count="exact")\
                .eq("user_id", user_id)\
                .eq("read", False)\
                .execute()
            
            return result.count if hasattr(result, "count") else 0
            
        except Exception as e:
            logger.error(f"Failed to get unread count: {e}")
            return 0
    
    async def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """Delete notification"""
        try:
            result = self.supabase.table("notifications")\
                .delete()\
                .eq("id", notification_id)\
                .eq("user_id", user_id)\
                .execute()
            
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Failed to delete notification: {e}")
            return False
    
    async def notify_consultation_booked(
        self,
        lawyer_id: str,
        user_name: str,
        consultation_date: str,
        consultation_time: str,
        consultation_id: str
    ):
        """Notify lawyer of new consultation booking"""
        logger.info(f"📬 Creating consultation_booked notification for lawyer {lawyer_id[:8]}...")
        result = await self.create_notification(
            user_id=lawyer_id,
            notification_type="consultation_booked",
            title="New Consultation Request",
            message=f"{user_name} requested a consultation on {consultation_date} at {consultation_time}",
            data={
                "consultation_id": consultation_id,
                "consultation_date": consultation_date,
                "consultation_time": consultation_time
            }
        )
        return result
    
    async def notify_consultation_accepted(
        self,
        user_id: str,
        lawyer_name: str,
        consultation_date: str,
        consultation_time: str,
        consultation_id: str
    ):
        """Notify user their consultation was accepted"""
        await self.create_notification(
            user_id=user_id,
            notification_type="consultation_accepted",
            title="Consultation Accepted",
            message=f"{lawyer_name} accepted your consultation for {consultation_date} at {consultation_time}",
            data={
                "consultation_id": consultation_id,
                "consultation_date": consultation_date,
                "consultation_time": consultation_time
            }
        )
    
    async def notify_consultation_rejected(
        self,
        user_id: str,
        lawyer_name: str,
        consultation_id: str
    ):
        """Notify user their consultation was rejected"""
        await self.create_notification(
            user_id=user_id,
            notification_type="consultation_rejected",
            title="Consultation Declined",
            message=f"{lawyer_name} declined your consultation request",
            data={"consultation_id": consultation_id}
        )
    
    async def notify_consultation_completed(
        self,
        user_id: str,
        lawyer_name: str,
        consultation_id: str
    ):
        """Notify user their consultation was marked complete"""
        await self.create_notification(
            user_id=user_id,
            notification_type="consultation_completed",
            title="Consultation Completed",
            message=f"{lawyer_name} marked your consultation as completed",
            data={"consultation_id": consultation_id}
        )
    
    async def notify_consultation_cancelled(
        self,
        lawyer_id: str,
        user_name: str,
        consultation_id: str
    ):
        """Notify lawyer that user cancelled consultation"""
        await self.create_notification(
            user_id=lawyer_id,
            notification_type="consultation_cancelled",
            title="Consultation Cancelled",
            message=f"{user_name} cancelled their consultation",
            data={"consultation_id": consultation_id}
        )
    
    async def notify_forum_reply(
        self,
        user_id: str,
        commenter_name: str,
        post_title: str,
        post_id: str,
        reply_id: str
    ):
        """Notify user of new reply on their post or a post they commented on"""
        await self.create_notification(
            user_id=user_id,
            notification_type="forum_reply",
            title="New Reply",
            message=f"{commenter_name} replied to: {post_title[:50]}{'...' if len(post_title) > 50 else ''}",
            data={
                "post_id": post_id,
                "reply_id": reply_id
            }
        )
    
    async def notify_content_published(
        self,
        user_ids: List[str],
        content_type: str,
        title: str,
        content_id: str
    ):
        """Notify users of new article or guide"""
        notification_type = f"{content_type}_published"
        content_label = "Article" if content_type == "article" else "Guide"
        
        for user_id in user_ids:
            await self.create_notification(
                user_id=user_id,
                notification_type=notification_type,
                title=f"New {content_label} Published",
                message=f"Check out: {title[:80]}{'...' if len(title) > 80 else ''}",
                data={
                    f"{content_type}_id": content_id
                }
            )
    
    async def notify_content_updated(
        self,
        user_ids: List[str],
        content_type: str,
        title: str,
        content_id: str
    ):
        """Notify users of updated article or guide"""
        notification_type = f"{content_type}_updated"
        content_label = "Article" if content_type == "article" else "Guide"
        
        for user_id in user_ids:
            await self.create_notification(
                user_id=user_id,
                notification_type=notification_type,
                title=f"{content_label} Updated",
                message=f"Updated: {title[:80]}{'...' if len(title) > 80 else ''}",
                data={
                    f"{content_type}_id": content_id
                }
            )


def get_notification_service(supabase: Client) -> NotificationService:
    """Factory function for dependency injection"""
    return NotificationService(supabase)
