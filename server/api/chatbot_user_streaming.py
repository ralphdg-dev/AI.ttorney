"""
User Chatbot Streaming Endpoint

Streaming version of the user chatbot for real-time responses (ChatGPT-style).
Separated from main chatbot_user.py for better maintainability.
"""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncGenerator
import json
import time
import logging

# Import all dependencies from main chatbot_user module (DRY principle)
from api.chatbot_user import (
    # Models
    ChatRequest,
    
    # Services
    get_optional_current_user,
    get_chat_history_service,
    ChatHistoryService,
    
    # Greeting detection
    is_simple_greeting,
    is_conversation_context_question,
    
    # Configuration
    CHAT_MODEL,
    TOP_K_RESULTS,
    STREAMING_TIMEOUT_SECONDS,
    STREAMING_TOKEN_BATCH_SIZE,
    STREAMING_MAX_INTERVAL_MS,
    ENGLISH_SYSTEM_PROMPT,
    TAGALOG_SYSTEM_PROMPT,
    openai_client,
    
    # Utility functions
    detect_language,
    is_legal_question,
    generate_ai_response,
    normalize_emotional_query,
    retrieve_relevant_context,
    get_legal_disclaimer,
    save_chat_interaction,
    
    # Moderation
    get_moderation_service,
    get_violation_tracking_service,
    ViolationType
)

# Shared SSE formatter utility (DRY principle)
from utils.sse_formatter import format_sse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chatbot/user", tags=["User Chatbot"])


@router.post("/ask")
async def ask_legal_question(
    request: ChatRequest,
    chat_service: ChatHistoryService = Depends(get_chat_history_service),
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    """
    User chatbot endpoint with Server-Sent Events (SSE) streaming.
    
    Industry standard (ChatGPT/Claude pattern):
    - Real-time word-by-word streaming
    - Immediate user feedback
    - Better perceived performance
    - Modern chat UX
    
    Returns:
        StreamingResponse with text/event-stream content
    """
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            # Extract user_id
            authenticated_user_id = None
            if current_user and "user" in current_user:
                authenticated_user_id = current_user["user"]["id"]
            effective_user_id = authenticated_user_id or request.user_id
            
            # Check if user is allowed to use chatbot (not suspended/banned)
            if effective_user_id:
                violation_service = get_violation_tracking_service()
                user_status = await violation_service.check_user_status(effective_user_id)
                
                if not user_status["is_allowed"]:
                    logger.warning(f"🚫 User {effective_user_id[:8]}... blocked from chatbot: {user_status['account_status']}")
                    yield format_sse({'content': user_status["reason"], 'done': True})
                    return
            
            # Basic validation
            if not request.question or not request.question.strip():
                yield format_sse({'error': 'Question cannot be empty'})
                return
            
            # Detect language first
            language = detect_language(request.question)
            yield format_sse({'type': 'metadata', 'language': language})
            
            # Content Moderation using OpenAI omni-moderation-latest
            # STRICT APPROACH: Show violation message and DO NOT answer the question
            if effective_user_id:
                moderation_service = get_moderation_service()
                violation_service = get_violation_tracking_service()
                
                try:
                    moderation_result = await moderation_service.moderate_content(request.question.strip())
                    
                    # If content is flagged, record violation and block response
                    if not moderation_service.is_content_safe(moderation_result):
                        logger.warning(f"⚠️  Chatbot prompt flagged for user {effective_user_id[:8]}: {moderation_result['violation_summary']}")
                        
                        # Record violation and get action taken
                        try:
                            print(f"📝 Recording violation for user: {effective_user_id}")
                            violation_result = await violation_service.record_violation(
                                user_id=effective_user_id,
                                violation_type=ViolationType.CHATBOT_PROMPT,
                                content_text=request.question.strip(),
                                moderation_result=moderation_result,
                                content_id=None
                            )
                            print(f"✅ Violation recorded: {violation_result}")
                        except Exception as violation_error:
                            logger.error(f"❌ Failed to record violation: {str(violation_error)}")
                            import traceback
                            print(f"Violation error traceback: {traceback.format_exc()}")
                            # Use generic message if violation recording fails
                            violation_result = {
                                "action_taken": "error",
                                "strike_count": 0,
                                "suspension_count": 0,
                                "message": "Your content violated our community guidelines. Please be mindful of your language."
                            }
                        
                        # Detect language for appropriate response
                        language = detect_language(request.question)
                        
                        # Get contextual warning based on strike count and suspension history
                        strike_count = violation_result.get('strike_count', 0)
                        suspension_count = violation_result.get('suspension_count', 0)
                        action_taken = violation_result.get('action_taken', 'strike_added')
                        
                        # Build contextual warning message
                        if language == "tagalog":
                            # Tagalog messages
                            if action_taken == 'banned':
                                warning = "Ang iyong account ay permanenteng na-ban dahil sa paulit-ulit na paglabag. Hindi ka na makakapag-chat."
                            elif action_taken == 'suspended':
                                if suspension_count == 1:
                                    warning = f"Ang iyong account ay na-suspend ng 7 araw. Ito ang iyong unang suspensyon. Dalawa pang suspensyon ay magreresulta sa permanenteng ban."
                                elif suspension_count == 2:
                                    warning = f"Ang iyong account ay na-suspend ng 7 araw. Ito ang iyong ikalawang suspensyon. Isa pang suspensyon ay magreresulta sa permanenteng ban."
                                else:
                                    warning = f"Ang iyong account ay na-suspend ng 7 araw dahil sa paulit-ulit na paglabag."
                            else:
                                # Strike warnings
                                if strike_count == 1:
                                    warning = "Mayroon ka nang 1 strike. Dalawa pang paglabag ay magreresulta sa 7-araw na suspensyon."
                                elif strike_count == 2:
                                    warning = "Mayroon ka nang 2 strikes. Isa pang paglabag ay magreresulta sa 7-araw na suspensyon."
                                else:
                                    warning = f"Mayroon ka nang {strike_count} strikes. Mangyaring sumunod sa aming mga patakaran."
                            
                            violation_message = f"""Content Policy Violation

{moderation_service.get_violation_message(moderation_result, context="chatbot")}

{warning}"""
                        else:
                            # English messages
                            if action_taken == 'banned':
                                warning = "Your account has been permanently banned due to repeated violations. You can no longer use the chatbot."
                            elif action_taken == 'suspended':
                                if suspension_count == 1:
                                    warning = f"Your account has been suspended for 7 days. This is your first suspension. Two more suspensions will result in a permanent ban."
                                elif suspension_count == 2:
                                    warning = f"Your account has been suspended for 7 days. This is your second suspension. One more suspension will result in a permanent ban."
                                else:
                                    warning = f"Your account has been suspended for 7 days due to repeated violations."
                            else:
                                # Strike warnings
                                if strike_count == 1:
                                    warning = "You now have 1 strike. Two more violations will result in a 7-day suspension."
                                elif strike_count == 2:
                                    warning = "You now have 2 strikes. One more violation will result in a 7-day suspension."
                                else:
                                    warning = f"You now have {strike_count} strikes. Please follow our community guidelines."
                            
                            violation_message = f"""Content Policy Violation

{moderation_service.get_violation_message(moderation_result, context="chatbot")}

{warning}"""
                        
                        # Send violation message
                        yield format_sse({'content': violation_message})
                        
                        # Send violation metadata so frontend can refresh status
                        violation_metadata = {
                            'violation_detected': True,
                            'action_taken': violation_result['action_taken'],
                            'strike_count': violation_result['strike_count'],
                            'suspension_count': violation_result['suspension_count'],
                            'message': violation_result['message']
                        }
                        yield format_sse({'type': 'violation', 'violation': violation_metadata})
                        
                        # Save violated message to chat history (for audit trail)
                        if effective_user_id:
                            try:
                                await save_chat_interaction(
                                    chat_service=chat_service,
                                    effective_user_id=effective_user_id,
                                    session_id=request.session_id,
                                    question=request.question,
                                    answer=violation_message,
                                    language=language,
                                    metadata={
                                        "violation": True,
                                        "action_taken": violation_result['action_taken'],
                                        "strike_count": violation_result['strike_count'],
                                        "streaming": True
                                    }
                                )
                            except Exception as e:
                                logger.error(f"Failed to save violation to history: {e}")
                        
                        # Done - do NOT answer the question
                        yield format_sse({'done': True})
                        return
                        
                except Exception as e:
                    logger.error(f"❌ Content moderation error: {str(e)}")
                    # Fail-open: Continue without moderation if service fails
            
            # CRITICAL: Check for greeting FIRST (before legal question check)
            # This ensures "hi", "hello", etc. get friendly responses, not formal rejections
            if is_simple_greeting(request.question):
                print(f"✅ Detected as greeting: {request.question}")
                greeting_response = generate_ai_response(request.question, language, 'greeting')
                
                # Save greeting interaction to chat history
                # Note: For guests, this will still work - save_chat_interaction handles guest sessions
                session_id = None
                user_msg_id = None
                assistant_msg_id = None
                
                if effective_user_id:
                    try:
                        session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                            chat_service=chat_service,
                            effective_user_id=effective_user_id,
                            session_id=request.session_id,
                            question=request.question,
                            answer=greeting_response,
                            language=language,
                            metadata={"type": "greeting", "streaming": True}
                        )
                    except Exception as e:
                        logger.error(f"Failed to save greeting to history: {e}")
                
                # Send greeting response with session metadata
                yield format_sse({'content': greeting_response})
                
                # Send metadata with session info (for both authenticated and guest users)
                yield format_sse({
                    'type': 'metadata',
                    'language': language,
                    'session_id': session_id,
                    'user_message_id': user_msg_id,
                    'assistant_message_id': assistant_msg_id
                })
                
                yield format_sse({'done': True})
                return
            
            # Check if this is a conversation context question (handle specially)
            if is_conversation_context_question(request.question):
                print(f"\n💬 [CONVERSATION CONTEXT] Detected conversation context question")
                
                # Try to retrieve past conversations if user is authenticated
                past_conversations_summary = ""
                if effective_user_id:
                    try:
                        print(f"   🔍 Retrieving past conversations for user {effective_user_id[:8]}...")
                        
                        # Get recent sessions (last 5)
                        user_sessions = await chat_service.get_user_sessions(
                            user_id=effective_user_id,
                            include_archived=False,
                            page=1,
                            page_size=5
                        )
                        
                        if user_sessions and user_sessions.sessions:
                            print(f"   ✅ Found {len(user_sessions.sessions)} recent conversations")
                            
                            # Build summary of past conversations
                            conversation_summaries = []
                            for session in user_sessions.sessions[:3]:  # Show last 3 conversations
                                # Get a few messages from each session for context
                                session_with_messages = await chat_service.get_session_with_messages(
                                    session_id=session.id,
                                    message_limit=4  # Get first 2 exchanges (user + assistant)
                                )
                                
                                if session_with_messages and session_with_messages.messages:
                                    messages = session_with_messages.messages
                                    # Get the first user question
                                    user_questions = [msg for msg in messages if msg.role == 'user']
                                    if user_questions:
                                        first_question = user_questions[0].content[:100]
                                        conversation_summaries.append(
                                            f"• **{session.title}**: {first_question}{'...' if len(user_questions[0].content) > 100 else ''}"
                                        )
                            
                            if conversation_summaries:
                                if language == "tagalog":
                                    past_conversations_summary = f"\n\n**Mga Nakaraang Usapan Natin:**\n" + "\n".join(conversation_summaries)
                                else:
                                    past_conversations_summary = f"\n\n**Our Recent Conversations:**\n" + "\n".join(conversation_summaries)
                        else:
                            print(f"   ℹ️ No past conversations found for user")
                            
                    except Exception as e:
                        print(f"   ⚠️ Error retrieving past conversations: {e}")
                        logger.error(f"Error retrieving past conversations: {e}")
                
                # Generate intelligent response with actual conversation history
                if language == "tagalog":
                    context_response = (
                        "Ako si Ai.ttorney, ang inyong legal assistant para sa Philippine law! 😊\n\n"
                        "Naaalala ko ang aming mga nakaraang usapan! Narito ang ilang sa mga pinag-usapan natin:"
                        f"{past_conversations_summary}\n\n" if past_conversations_summary else 
                        "Wala pa tayong nakaraang usapan sa sistema, pero handa akong tumulong sa anumang legal na tanong!\n\n"
                        "Maaari ninyong itanong ang tungkol sa:\n"
                        "• Family Law (kasal, annulment, child custody)\n"
                        "• Labor Law (trabaho, sahod, termination)\n"
                        "• Consumer Law (produkto, serbisyo, warranty)\n"
                        "• Criminal Law (krimen, arrest, bail)\n"
                        "• Civil Law (kontrata, property, utang)\n\n"
                        "Ano pong legal na tanong ang mayroon kayo ngayon?"
                    )
                else:
                    context_response = (
                        "I'm Ai.ttorney, your legal assistant for Philippine law! 😊\n\n"
                        "I can remember our past conversations! Here are some topics we've discussed:"
                        f"{past_conversations_summary}\n\n" if past_conversations_summary else 
                        "We don't have any previous conversations in the system yet, but I'm ready to help with any legal questions!\n\n"
                        "You can ask me about:\n"
                        "• Family Law (marriage, annulment, child custody)\n"
                        "• Labor Law (employment, wages, termination)\n"
                        "• Consumer Law (products, services, warranties)\n"
                        "• Criminal Law (crimes, arrest, bail)\n"
                        "• Civil Law (contracts, property, debts)\n\n"
                        "What legal question can I help you with today?"
                    )
                
                # Save conversation context interaction
                session_id = None
                user_msg_id = None
                assistant_msg_id = None
                
                if effective_user_id:
                    try:
                        session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                            chat_service=chat_service,
                            effective_user_id=effective_user_id,
                            session_id=request.session_id,
                            question=request.question,
                            answer=context_response,
                            language=language,
                            metadata={"type": "conversation_context", "streaming": True, "past_conversations_found": len(past_conversations_summary) > 0}
                        )
                    except Exception as e:
                        logger.error(f"Failed to save conversation context to history: {e}")
                
                # Send conversation context response
                yield format_sse({'content': context_response})
                
                # Send metadata with session info
                yield format_sse({
                    'type': 'metadata',
                    'language': language,
                    'session_id': session_id,
                    'user_message_id': user_msg_id,
                    'assistant_message_id': assistant_msg_id
                })
                
                yield format_sse({'done': True})
                return
            
            # Check if legal question
            if not is_legal_question(request.question):
                casual_response = generate_ai_response(request.question, language, 'casual')
                yield format_sse({'content': casual_response, 'done': True})
                return
            
            # Query normalization
            search_query = request.question
            informal_patterns = ['tangina', 'puta', 'gago', 'walang dahilan', 'nambabae', 'nanlalaki']
            if any(pattern in request.question.lower() for pattern in informal_patterns):
                search_query = normalize_emotional_query(request.question, language)
            
            # Vector search
            context, sources = retrieve_relevant_context(search_query, TOP_K_RESULTS)
            
            if not sources:
                no_context = "I apologize, but I don't have enough information in my database." if language == "english" else "Paumanhin po, pero wala akong sapat na impormasyon."
                yield format_sse({'content': no_context, 'done': True})
                return
            
            # Send sources with full details
            source_citations = [{
                'source': src['source'],
                'law': src['law'],
                'article_number': src['article_number'],
                'article_title': src.get('article_title', ''),
                'source_url': src.get('source_url', ''),
                'relevance_score': src.get('relevance_score', 0.0)
            } for src in sources]
            yield format_sse({'type': 'sources', 'sources': source_citations})
            
            # Build messages
            system_prompt = ENGLISH_SYSTEM_PROMPT if language == "english" else TAGALOG_SYSTEM_PROMPT
            messages = [{"role": "system", "content": system_prompt}]
            for msg in request.conversation_history[-1:]:
                messages.append(msg)
            
            user_message = f"Legal Context:\n{context}\n\nUser Question: {request.question}\n\nProvide an informational response."
            messages.append({"role": "user", "content": user_message})
            
            # STREAMING: Generate with OpenAI (ChatGPT/Claude style)
            full_answer = ""
            token_buffer = ""  # Buffer for batching tokens
            token_count = 0
            last_send_time = time.time()
            
            stream = openai_client.chat.completions.create(
                model=CHAT_MODEL,
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=0.5,
                stream=True,  # Enable streaming!
                timeout=STREAMING_TIMEOUT_SECONDS
            )
            
            # Stream tokens with batching for natural reading speed
            # Industry standard: 3-5 tokens per batch, 50-80ms intervals (ChatGPT/Claude)
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_answer += content
                    token_buffer += content
                    token_count += 1
                    
                    current_time = time.time()
                    time_since_last_send_ms = (current_time - last_send_time) * 1000
                    
                    # Send batch when: minimum tokens accumulated OR max interval elapsed
                    should_send_batch = (
                        token_count >= STREAMING_TOKEN_BATCH_SIZE or 
                        time_since_last_send_ms >= STREAMING_MAX_INTERVAL_MS
                    )
                    
                    if should_send_batch and token_buffer:
                        yield format_sse({'content': token_buffer})
                        token_buffer = ""
                        token_count = 0
                        last_send_time = current_time
            
            # Send any remaining tokens in buffer
            if token_buffer:
                yield format_sse({'content': token_buffer})
            
            # Send legal disclaimer (only if needed for legal questions)
            legal_disclaimer = get_legal_disclaimer(language, request.question, full_answer)
            if legal_disclaimer:
                yield format_sse({'type': 'disclaimer', 'disclaimer': legal_disclaimer})
            
            # Done
            yield format_sse({'done': True})
            
            # Save to history (async)
            if effective_user_id:
                try:
                    await save_chat_interaction(
                        chat_service=chat_service,
                        effective_user_id=effective_user_id,
                        session_id=request.session_id,
                        question=request.question,
                        answer=full_answer,
                        language=language,
                        metadata={"sources": source_citations, "streaming": True}
                    )
                except Exception as e:
                    print(f"Failed to save: {e}")
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield format_sse({'error': str(e), 'done': True})
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )
