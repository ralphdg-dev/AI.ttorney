from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


                                                                              
                                    
                                                                              

class ChatSessionDB(BaseModel):
    """Chat session as stored in database"""
    id: UUID
    user_id: Optional[UUID] = None
    title: str = "New Conversation"
    created_at: datetime
    updated_at: datetime
    last_message_at: datetime
    message_count: int = 0
    is_archived: bool = False
    language: str = "en"                 
    
    class Config:
        from_attributes = True


class ChatMessageDB(BaseModel):
    """Chat message as stored in database"""
    id: UUID
    session_id: UUID
    user_id: Optional[UUID] = None
    role: str                         
    content: str
    metadata: Dict[str, Any] = {}
    tokens_used: Optional[int] = None
    response_time_ms: Optional[int] = None
    model_version: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


                                                                              
                    
                                                                              

class CreateSessionRequest(BaseModel):
    """Request to create a new chat session"""
    title: Optional[str] = "New Conversation"
    language: Optional[str] = "en"


class SendMessageRequest(BaseModel):
    """Request to send a message in a session"""
    session_id: Optional[UUID] = None                                
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_history: Optional[List[Dict[str, str]]] = []                              


class UpdateSessionRequest(BaseModel):
    """Request to update session metadata"""
    title: Optional[str] = None
    is_archived: Optional[bool] = None


                                                                              
                     
                                                                              

class ChatMessageResponse(BaseModel):
    """Response model for a single message"""
    id: str
    role: str
    content: str
    created_at: datetime
    metadata: Dict[str, Any] = {}
    tokens_used: Optional[int] = None
    response_time_ms: Optional[int] = None
    
                                   
    fromUser: bool = False                      
    timestamp: str = ""                     
    sources: Optional[List[Dict[str, Any]]] = None
    confidence: Optional[str] = None
    
    @classmethod
    def from_db(cls, db_message: ChatMessageDB) -> "ChatMessageResponse":
        """Convert database model to response model"""
        return cls(
            id=str(db_message.id),
            role=db_message.role,
            content=db_message.content,
            created_at=db_message.created_at,
            metadata=db_message.metadata,
            tokens_used=db_message.tokens_used,
            response_time_ms=db_message.response_time_ms,
            fromUser=db_message.role == "user",
            timestamp=db_message.created_at.isoformat(),
            sources=db_message.metadata.get("sources"),
            confidence=db_message.metadata.get("confidence")
        )


class ChatSessionResponse(BaseModel):
    """Response model for a chat session"""
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    last_message_at: datetime
    message_count: int
    is_archived: bool
    language: str
    preview: Optional[str] = None                        
    
    @classmethod
    def from_db(cls, db_session: ChatSessionDB, preview: Optional[str] = None) -> "ChatSessionResponse":
        """Convert database model to response model"""
        return cls(
            id=str(db_session.id),
            title=db_session.title,
            created_at=db_session.created_at,
            updated_at=db_session.updated_at,
            last_message_at=db_session.last_message_at,
            message_count=db_session.message_count,
            is_archived=db_session.is_archived,
            language=db_session.language,
            preview=preview
        )


class ChatResponse(BaseModel):
    """Response from chatbot (backward compatible)"""
    response: str
    sources: List[Dict[str, Any]] = []
    language: str = "en"
    
                                               
    session_id: Optional[str] = None
    message_id: Optional[str] = None
    tokens_used: Optional[int] = None
    response_time_ms: Optional[int] = None


class SessionWithMessagesResponse(BaseModel):
    """Full session with all messages"""
    session: ChatSessionResponse
    messages: List[ChatMessageResponse]


class SessionListResponse(BaseModel):
    """List of sessions with pagination"""
    sessions: List[ChatSessionResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


                                                                              
                   
                                                                              

class SessionStatistics(BaseModel):
    """Statistics for a chat session"""
    session_id: str
    message_count: int
    total_tokens: int
    avg_response_time_ms: float
    created_at: datetime
    last_message_at: datetime


class UserChatStatistics(BaseModel):
    """Overall chat statistics for a user"""
    total_sessions: int
    total_messages: int
    total_tokens: int
    avg_response_time_ms: float
    most_used_language: str
    active_sessions: int
    archived_sessions: int
