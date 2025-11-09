from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
from config.dependencies import get_current_user, get_supabase
from services.notification_service import NotificationService
from supabase import Client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    data: Dict[str, Any]
    read: bool
    created_at: str
    read_at: str | None


class NotificationsListResponse(BaseModel):
    success: bool
    data: List[NotificationResponse]
    unread_count: int


class UnreadCountResponse(BaseModel):
    success: bool
    count: int


class MarkReadResponse(BaseModel):
    success: bool
    message: str


@router.get("/", response_model=NotificationsListResponse)
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get user notifications with pagination"""
    try:
        user_id = current_user.id
        service = NotificationService(supabase)
        
        notifications = await service.get_user_notifications(
            user_id=user_id,
            unread_only=unread_only,
            limit=limit,
            offset=offset
        )
        
        unread_count = await service.get_unread_count(user_id)
        
        return NotificationsListResponse(
            success=True,
            data=notifications,
            unread_count=unread_count
        )
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch notifications")


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get count of unread notifications"""
    try:
        user_id = current_user.id
        service = NotificationService(supabase)
        
        count = await service.get_unread_count(user_id)
        
        return UnreadCountResponse(success=True, count=count)
        
    except Exception as e:
        logger.error(f"Error fetching unread count: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch unread count")


@router.post("/{notification_id}/read", response_model=MarkReadResponse)
async def mark_notification_read(
    notification_id: str,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Mark single notification as read"""
    try:
        user_id = current_user.id
        service = NotificationService(supabase)
        
        success = await service.mark_as_read(notification_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return MarkReadResponse(success=True, message="Notification marked as read")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")


@router.post("/mark-all-read", response_model=MarkReadResponse)
async def mark_all_notifications_read(
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Mark all user notifications as read"""
    try:
        user_id = current_user.id
        service = NotificationService(supabase)
        
        await service.mark_all_as_read(user_id)
        
        return MarkReadResponse(success=True, message="All notifications marked as read")
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark all notifications as read")


@router.delete("/{notification_id}", response_model=MarkReadResponse)
async def delete_notification(
    notification_id: str,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Delete notification"""
    try:
        user_id = current_user.id
        service = NotificationService(supabase)
        
        success = await service.delete_notification(notification_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return MarkReadResponse(success=True, message="Notification deleted")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete notification")
