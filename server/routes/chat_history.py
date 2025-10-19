"""
Chat History Routes for AI.ttorney
RESTful API for managing chat sessions and messages
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from uuid import UUID
import logging

from models.chat_models import (
    CreateSessionRequest,
    UpdateSessionRequest,
    ChatSessionResponse,
    SessionListResponse,
    SessionWithMessagesResponse,
    SessionStatistics,
    UserChatStatistics
)
from services.chat_history_service import get_chat_history_service, ChatHistoryService
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat-history", tags=["chat-history"])


# ============================================================================
# Session Endpoints
# ============================================================================

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    request: CreateSessionRequest,
    current_user: dict = Depends(get_current_user),
    service: ChatHistoryService = Depends(get_chat_history_service)
):
    """
    Create a new chat session
    
    - **title**: Optional session title (default: "New Conversation")
    - **language**: Session language ('en' or 'fil')
    """
    try:
        user_id = UUID(current_user["user"]["id"])
        
        session = await service.create_session(
            user_id=user_id,
            title=request.title or "New Conversation",
            language=request.language or "en"
        )
        
        return ChatSessionResponse.from_db(session)
        
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create session")


@router.get("/sessions", response_model=SessionListResponse)
async def get_user_sessions(
    include_archived: bool = Query(False, description="Include archived sessions"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user),
    service: ChatHistoryService = Depends(get_chat_history_service)
):
    """
    Get all chat sessions for the current user
    
    - **include_archived**: Include archived sessions (default: false)
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    """
    try:
        # Debug logging
        logger.info(f"Current user structure: {current_user}")
        logger.info(f"Current user keys: {current_user.keys() if current_user else 'None'}")
        
        user_id = UUID(current_user["user"]["id"])
        
        return await service.get_user_sessions(
            user_id=user_id,
            include_archived=include_archived,
            page=page,
            page_size=page_size
        )
        
    except KeyError as e:
        logger.error(f"KeyError accessing user data: {str(e)}, current_user structure: {current_user}")
        raise HTTPException(status_code=500, detail=f"Invalid user data structure: {str(e)}")
    except Exception as e:
        logger.error(f"Error getting sessions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions")


@router.get("/sessions/{session_id}", response_model=SessionWithMessagesResponse)
async def get_session_with_messages(
    session_id: UUID,
    message_limit: Optional[int] = Query(None, ge=1, le=500, description="Limit messages"),
    current_user: dict = Depends(get_current_user),
    service: ChatHistoryService = Depends(get_chat_history_service)
):
    """
    Get a specific session with all its messages
    
    - **session_id**: UUID of the session
    - **message_limit**: Optional limit on number of messages (default: all)
    """
    try:
        # Verify session belongs to user
        session = await service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if str(session.user_id) != current_user["user"]["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        result = await service.get_session_with_messages(
            session_id=session_id,
            message_limit=message_limit
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session with messages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve session")


@router.patch("/sessions/{session_id}", response_model=ChatSessionResponse)
async def update_session(
    session_id: UUID,
    request: UpdateSessionRequest,
    current_user: dict = Depends(get_current_user),
    service: ChatHistoryService = Depends(get_chat_history_service)
):
    """
    Update session metadata
    
    - **title**: Update session title
    - **is_archived**: Archive/unarchive session
    """
    try:
        # Verify session belongs to user
        session = await service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if str(session.user_id) != current_user["user"]["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        updated_session = await service.update_session(
            session_id=session_id,
            title=request.title,
            is_archived=request.is_archived
        )
        
        if not updated_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return ChatSessionResponse.from_db(updated_session)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update session")


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    service: ChatHistoryService = Depends(get_chat_history_service)
):
    """
    Delete a session (hard delete - removes all messages)
    
    - **session_id**: UUID of the session to delete
    """
    try:
        # Verify session belongs to user
        session = await service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if str(session.user_id) != current_user["user"]["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        success = await service.delete_session(session_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete session")
        
        return {"message": "Session deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete session")


@router.post("/sessions/{session_id}/archive")
async def archive_session(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    service: ChatHistoryService = Depends(get_chat_history_service)
):
    """
    Archive a session (soft delete - keeps data but hides from active list)
    
    - **session_id**: UUID of the session to archive
    """
    try:
        # Verify session belongs to user
        session = await service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if str(session.user_id) != current_user["user"]["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        success = await service.archive_session(session_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to archive session")
        
        return {"message": "Session archived successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error archiving session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to archive session")


# ============================================================================
# Statistics Endpoints
# ============================================================================

@router.get("/sessions/{session_id}/statistics", response_model=SessionStatistics)
async def get_session_statistics(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    service: ChatHistoryService = Depends(get_chat_history_service)
):
    """
    Get statistics for a specific session
    
    - **session_id**: UUID of the session
    """
    try:
        # Verify session belongs to user
        session = await service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if str(session.user_id) != current_user["user"]["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        stats = await service.get_session_statistics(session_id)
        
        if not stats:
            raise HTTPException(status_code=404, detail="Statistics not found")
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")


@router.get("/statistics", response_model=UserChatStatistics)
async def get_user_statistics(
    current_user: dict = Depends(get_current_user),
    service: ChatHistoryService = Depends(get_chat_history_service)
):
    """
    Get overall chat statistics for the current user
    
    Returns total sessions, messages, tokens, and other metrics
    """
    try:
        user_id = UUID(current_user["user"]["id"])
        
        stats = await service.get_user_statistics(user_id)
        
        if not stats:
            raise HTTPException(status_code=404, detail="Statistics not found")
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")


# ============================================================================
# Search Endpoint
# ============================================================================

@router.get("/search")
async def search_messages(
    query: str = Query(..., min_length=1, max_length=200, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
    current_user: dict = Depends(get_current_user),
    service: ChatHistoryService = Depends(get_chat_history_service)
):
    """
    Search through chat messages
    
    - **query**: Search term
    - **limit**: Maximum number of results (default: 20, max: 100)
    """
    try:
        user_id = UUID(current_user["user"]["id"])
        
        results = await service.search_messages(
            user_id=user_id,
            query=query,
            limit=limit
        )
        
        # Format results
        formatted_results = []
        for session, message in results:
            formatted_results.append({
                "session_id": str(session.id),
                "session_title": session.title,
                "message_id": str(message.id),
                "message_content": message.content,
                "message_role": message.role,
                "created_at": message.created_at.isoformat()
            })
        
        return {
            "query": query,
            "results": formatted_results,
            "count": len(formatted_results)
        }
        
    except Exception as e:
        logger.error(f"Error searching messages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search messages")


# ============================================================================
# Health Check
# ============================================================================

@router.get("/health")
async def health_check():
    """Check if chat history service is operational"""
    try:
        service = get_chat_history_service()
        return {
            "status": "healthy",
            "service": "chat_history",
            "database": "supabase"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }
