import logging
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime
from supabase import create_client, Client
import os
from dotenv import load_dotenv

from models.chat_models import (
    ChatSessionDB,
    ChatMessageDB,
    ChatSessionResponse,
    ChatMessageResponse,
    SessionWithMessagesResponse,
    SessionListResponse,
    SessionStatistics,
    UserChatStatistics
)

load_dotenv()
logger = logging.getLogger(__name__)


class ChatHistoryService:
    """Service for managing chat sessions and messages"""
    
    def __init__(self):
        """Initialize Supabase client"""
        self.url = os.getenv("SUPABASE_URL")
                                                                   
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.url or not self.key:
            logger.error("Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
            raise ValueError("Missing Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
        
        self.supabase: Client = create_client(self.url, self.key)
        logger.info("ChatHistoryService initialized with SERVICE_ROLE_KEY")
    
                                                                              
                        
                                                                              
    
    async def create_session(
        self, 
        user_id: Optional[UUID] = None,
        title: str = "New Conversation",
        language: str = "en"
    ) -> ChatSessionDB:
        """Create a new chat session"""
        try:
            data = {
                "title": title,
                "language": language
            }
            
            if user_id:
                data["user_id"] = str(user_id)
            
            response = self.supabase.table("chat_sessions").insert(data).execute()
            
            if not response.data:
                raise Exception("Failed to create session")
            
            session_data = response.data[0]
            logger.info(f"Created session {session_data['id']} for user {user_id}")
            
            return ChatSessionDB(**session_data)
            
        except Exception as e:
            logger.error(f"Error creating session: {str(e)}")
            raise
    
    async def get_session(self, session_id: UUID) -> Optional[ChatSessionDB]:
        """Get a session by ID"""
        try:
            response = self.supabase.table("chat_sessions")\
                .select("*")\
                .eq("id", str(session_id))\
                .execute()
            
            if not response.data:
                return None
            
            return ChatSessionDB(**response.data[0])
            
        except Exception as e:
            logger.error(f"Error getting session {session_id}: {str(e)}")
            return None
    
    async def get_user_sessions(
        self,
        user_id: UUID,
        include_archived: bool = False,
        page: int = 1,
        page_size: int = 20
    ) -> SessionListResponse:
        """Get all sessions for a user with pagination"""
        try:
                         
            query = self.supabase.table("chat_sessions")\
                .select("*", count="exact")\
                .eq("user_id", str(user_id))
            
            if not include_archived:
                query = query.eq("is_archived", False)
            
                            
            offset = (page - 1) * page_size
            query = query.order("last_message_at", desc=True)\
                .range(offset, offset + page_size - 1)
            
            response = query.execute()
            
                                                       
            sessions = []
            for session_data in response.data:
                session = ChatSessionDB(**session_data)
                
                                             
                preview = await self._get_last_message_preview(session.id)
                
                sessions.append(
                    ChatSessionResponse.from_db(session, preview=preview)
                )
            
            total = response.count or 0
            has_more = (offset + page_size) < total
            
            return SessionListResponse(
                sessions=sessions,
                total=total,
                page=page,
                page_size=page_size,
                has_more=has_more
            )
            
        except Exception as e:
            logger.error(f"Error getting user sessions: {str(e)}")
            raise
    
    async def update_session(
        self,
        session_id: UUID,
        title: Optional[str] = None,
        is_archived: Optional[bool] = None
    ) -> Optional[ChatSessionDB]:
        """Update session metadata"""
        try:
            update_data = {}
            
            if title is not None:
                update_data["title"] = title
            
            if is_archived is not None:
                update_data["is_archived"] = is_archived
            
            if not update_data:
                return await self.get_session(session_id)
            
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.supabase.table("chat_sessions")\
                .update(update_data)\
                .eq("id", str(session_id))\
                .execute()
            
            if not response.data:
                return None
            
            logger.info(f"Updated session {session_id}")
            return ChatSessionDB(**response.data[0])
            
        except Exception as e:
            logger.error(f"Error updating session {session_id}: {str(e)}")
            raise
    
    async def delete_session(self, session_id: UUID) -> bool:
        """
        Delete a session (hard delete, CASCADE will delete messages)
        
        Industry standard implementation:
        - Validates session exists before deletion
        - Uses CASCADE to automatically delete related messages
        - Comprehensive error logging
        - Returns success/failure status
        """
        try:
            logger.info(f"Attempting to delete session {session_id}")
            
                                         
            session = await self.get_session(session_id)
            if not session:
                logger.warning(f"Cannot delete non-existent session {session_id}")
                return False
            
                                                                         
            response = self.supabase.table("chat_sessions")\
                .delete()\
                .eq("id", str(session_id))\
                .execute()
            
                                            
            if response.data is not None:
                logger.info(f"Successfully deleted session {session_id} and all related messages")
                return True
            else:
                logger.error(f"Delete operation returned no data for session {session_id}")
                return False
            
        except Exception as e:
            logger.error(f"Error deleting session {session_id}: {str(e)}", exc_info=True)
            return False
    
    async def archive_session(self, session_id: UUID) -> bool:
        """Archive a session (soft delete)"""
        try:
            result = await self.update_session(session_id, is_archived=True)
            return result is not None
        except Exception as e:
            logger.error(f"Error archiving session {session_id}: {str(e)}")
            return False
    
                                                                              
                        
                                                                              
    
    async def save_message(
        self,
        session_id: UUID,
        role: str,
        content: str,
        user_id: Optional[UUID] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tokens_used: Optional[int] = None,
        response_time_ms: Optional[int] = None,
        model_version: Optional[str] = None
    ) -> ChatMessageDB:
        """Save a message to a session"""
        try:
            data = {
                "session_id": str(session_id),
                "role": role,
                "content": content,
                "metadata": metadata or {}
            }
            
            if user_id:
                data["user_id"] = str(user_id)
            
            if tokens_used is not None:
                data["tokens_used"] = tokens_used
            
            if response_time_ms is not None:
                data["response_time_ms"] = response_time_ms
            
            if model_version:
                data["model_version"] = model_version
            
            response = self.supabase.table("chat_messages").insert(data).execute()
            
            if not response.data:
                raise Exception("Failed to save message")
            
            message_data = response.data[0]
            logger.info(f"Saved {role} message to session {session_id}")
            
            return ChatMessageDB(**message_data)
            
        except Exception as e:
            logger.error(f"Error saving message: {str(e)}")
            raise
    
    async def add_message(
        self,
        session_id: UUID,
        user_id: UUID,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ChatMessageDB:
        """
        Add a message to a session (alias for save_message with simplified signature)
        This method provides backward compatibility for chatbot endpoints
        """
        return await self.save_message(
            session_id=session_id,
            role=role,
            content=content,
            user_id=user_id,
            metadata=metadata
        )
    
    async def get_session_messages(
        self,
        session_id: UUID,
        limit: Optional[int] = None
    ) -> List[ChatMessageDB]:
        """Get all messages in a session"""
        try:
            query = self.supabase.table("chat_messages")\
                .select("*")\
                .eq("session_id", str(session_id))\
                .order("created_at", desc=False)
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            
            messages = [ChatMessageDB(**msg) for msg in response.data]
            logger.info(f"Retrieved {len(messages)} messages from session {session_id}")
            
            return messages
            
        except Exception as e:
            logger.error(f"Error getting messages for session {session_id}: {str(e)}")
            return []
    
    async def get_session_with_messages(
        self,
        session_id: UUID,
        message_limit: Optional[int] = None
    ) -> Optional[SessionWithMessagesResponse]:
        """Get a session with all its messages"""
        try:
            session = await self.get_session(session_id)
            if not session:
                return None
            
            messages_db = await self.get_session_messages(session_id, limit=message_limit)
            
                                        
            messages = [ChatMessageResponse.from_db(msg) for msg in messages_db]
            
                                           
            preview = messages[-1].content[:100] if messages else None
            
            return SessionWithMessagesResponse(
                session=ChatSessionResponse.from_db(session, preview=preview),
                messages=messages
            )
            
        except Exception as e:
            logger.error(f"Error getting session with messages: {str(e)}")
            return None
    
                                                                              
                            
                                                                              
    
    async def get_session_statistics(self, session_id: UUID) -> Optional[SessionStatistics]:
        """Get statistics for a session"""
        try:
                                               
            response = self.supabase.table("v_session_statistics")\
                .select("*")\
                .eq("session_id", str(session_id))\
                .execute()
            
            if not response.data:
                return None
            
            data = response.data[0]
            return SessionStatistics(
                session_id=str(data["session_id"]),
                message_count=data["message_count"],
                total_tokens=data["total_tokens"] or 0,
                avg_response_time_ms=data["avg_response_time_ms"] or 0.0,
                created_at=data["created_at"],
                last_message_at=data["last_message_at"]
            )
            
        except Exception as e:
            logger.error(f"Error getting session statistics: {str(e)}")
            return None
    
    async def get_user_statistics(self, user_id: UUID) -> Optional[UserChatStatistics]:
        """Get overall chat statistics for a user"""
        try:
                                
            sessions_response = self.supabase.table("chat_sessions")\
                .select("id, is_archived, language", count="exact")\
                .eq("user_id", str(user_id))\
                .execute()
            
            total_sessions = sessions_response.count or 0
            active_sessions = sum(1 for s in sessions_response.data if not s["is_archived"])
            archived_sessions = total_sessions - active_sessions
            
                                       
            language_counts = {}
            for session in sessions_response.data:
                lang = session["language"]
                language_counts[lang] = language_counts.get(lang, 0) + 1
            
            most_used_language = max(language_counts, key=language_counts.get) if language_counts else "en"
            
                                    
            messages_response = self.supabase.table("chat_messages")\
                .select("tokens_used, response_time_ms", count="exact")\
                .eq("user_id", str(user_id))\
                .execute()
            
            total_messages = messages_response.count or 0
            
                                
            total_tokens = sum(m.get("tokens_used", 0) or 0 for m in messages_response.data)
            response_times = [m.get("response_time_ms") for m in messages_response.data if m.get("response_time_ms")]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0.0
            
            return UserChatStatistics(
                total_sessions=total_sessions,
                total_messages=total_messages,
                total_tokens=total_tokens,
                avg_response_time_ms=avg_response_time,
                most_used_language=most_used_language,
                active_sessions=active_sessions,
                archived_sessions=archived_sessions
            )
            
        except Exception as e:
            logger.error(f"Error getting user statistics: {str(e)}")
            return None
    
                                                                              
                    
                                                                              
    
    async def _get_last_message_preview(self, session_id: UUID) -> Optional[str]:
        """Get preview of last message in session"""
        try:
            response = self.supabase.table("chat_messages")\
                .select("content")\
                .eq("session_id", str(session_id))\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if response.data:
                content = response.data[0]["content"]
                return content[:100] + "..." if len(content) > 100 else content
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting last message preview: {str(e)}")
            return None
    
    async def search_messages(
        self,
        user_id: UUID,
        query: str,
        limit: int = 20
    ) -> List[Tuple[ChatSessionDB, ChatMessageDB]]:
        """Search messages by content (requires full-text search setup)"""
        try:
                                           
                                                                        
            response = self.supabase.table("chat_messages")\
                .select("*, chat_sessions!inner(*)")\
                .eq("user_id", str(user_id))\
                .ilike("content", f"%{query}%")\
                .limit(limit)\
                .execute()
            
            results = []
            for item in response.data:
                message = ChatMessageDB(**item)
                session = ChatSessionDB(**item["chat_sessions"])
                results.append((session, message))
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching messages: {str(e)}")
            return []


                    
_chat_history_service: Optional[ChatHistoryService] = None


def get_chat_history_service() -> ChatHistoryService:
    """Get or create ChatHistoryService singleton"""
    global _chat_history_service
    
    if _chat_history_service is None:
        _chat_history_service = ChatHistoryService()
    
    return _chat_history_service
