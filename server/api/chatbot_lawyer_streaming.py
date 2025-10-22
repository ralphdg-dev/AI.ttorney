# chatbot_lawyer_streaming.py
"""
Streaming endpoint for Legal Practice & Research API (Philippine Bar)

Industry-standard streaming implementation for real-time response generation.
Optimized for low latency and efficient token delivery.

Features:
- Server-Sent Events (SSE) for real-time streaming
- Chunked response delivery for immediate user feedback
- Optimized for mobile and web clients
- Full integration with existing validation and security layers
- Chat history persistence
- Performance monitoring and logging

Endpoint: POST /api/chatbot/lawyer/ask/stream
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncGenerator, Dict, List
import json
import time
import logging
from datetime import datetime

# Import all dependencies from main chatbot_lawyer module
from api.chatbot_lawyer import (
    # Models
    ChatRequest,
    
    # Services
    get_optional_current_user,
    get_chat_history_service,
    ChatHistoryService,
    
    # Configuration
    CHAT_MODEL,
    TOP_K_RESULTS,
    openai_client,
    guardrails_instance,
    LAWYER_SYSTEM_PROMPT_ENGLISH,
    LAWYER_SYSTEM_PROMPT_TAGALOG,
    
    # Validation functions
    detect_toxic_content,
    detect_prohibited_input,
    is_gibberish_input,
    detect_language,
    is_simple_greeting,
    is_personal_advice_question,
    is_out_of_scope_topic,
    is_legal_question,
    is_complex_query,
    
    # Utility functions
    retrieve_relevant_context,
    generate_ai_response,
    save_chat_interaction,
    
    # Logging
    logger
)

# Create router
router = APIRouter(prefix="/api/chatbot/lawyer", tags=["Legal Practice & Research API - Streaming"])


@router.post("/ask/stream")
async def ask_legal_question_stream(
    request: ChatRequest,
    chat_service: ChatHistoryService = Depends(get_chat_history_service),
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    """
    Streaming version of the lawyer chatbot - responses appear word-by-word like ChatGPT.
    
    Industry-standard implementation:
    - Server-Sent Events (SSE) for real-time delivery
    - Chunked token streaming for immediate feedback
    - Full validation and security integration
    - Optimized for low latency and mobile clients
    - Comprehensive error handling
    
    Response format (SSE):
    - data: {"type": "metadata", "language": "english"}
    - data: {"type": "sources", "sources": [...]}
    - data: {"content": "token"}  (multiple chunks)
    - data: {"done": true, "total_time": 2.5}
    
    Example request:
    {
        "question": "Delineate the requisites for a valid extrajudicial foreclosure...",
        "conversation_history": [],
        "max_tokens": 1500,
        "session_id": "optional-uuid"
    }
    """
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        """
        Generator function for streaming responses.
        Industry best practice: Async generator with proper error handling.
        """
        try:
            # Performance monitoring
            perf_start = time.time()
            request_start_time = datetime.now()
            
            # Extract user_id from authentication
            authenticated_user_id = None
            if current_user and "user" in current_user:
                authenticated_user_id = current_user["user"]["id"]
                print(f"✅ Authenticated user ID: {authenticated_user_id}")
            else:
                print(f"⚠️  No authenticated user found. current_user: {current_user}")
            
            effective_user_id = authenticated_user_id or request.user_id
            print(f"📝 Effective user ID for chat history: {effective_user_id}")
            
            # Production logging
            logger.info(f"Streaming request - user_id={effective_user_id}, session_id={request.session_id}, question_length={len(request.question)}")
            
            # ===== INPUT VALIDATION =====
            # Basic validation
            if not request.question or not request.question.strip():
                yield f"data: {json.dumps({'error': 'Question cannot be empty'})}\n\n"
                return
            
            # Initialize security tracking
            input_validation_result = None
            
            # Guardrails input validation
            if guardrails_instance:
                try:
                    logger.info("Validating input with Guardrails AI...")
                    input_validation_result = guardrails_instance.validate_input(request.question)
                    
                    if not input_validation_result.get('is_valid', True):
                        error_message = input_validation_result.get('error', 'Input validation failed')
                        logger.warning(f"Input validation failed: {error_message}")
                        yield f"data: {json.dumps({'content': error_message, 'done': True})}\n\n"
                        return
                    
                    # Use cleaned input if available
                    if 'cleaned_input' in input_validation_result:
                        request.question = input_validation_result['cleaned_input']
                except Exception as e:
                    logger.warning(f"Guardrails input validation error: {e}")
            
            # Check for simple greeting
            if is_simple_greeting(request.question):
                language = detect_language(request.question)
                greeting_response = generate_ai_response(request.question, language, 'greeting')
                yield f"data: {json.dumps({'content': greeting_response, 'done': True})}\n\n"
                
                # Save to chat history (async, don't block)
                if effective_user_id:
                    try:
                        await save_chat_interaction(
                            chat_service=chat_service,
                            effective_user_id=effective_user_id,
                            session_id=request.session_id,
                            question=request.question,
                            answer=greeting_response,
                            language=language,
                            metadata={"type": "greeting", "streaming": True}
                        )
                    except Exception as e:
                        logger.error(f"Failed to save greeting history: {e}")
                return
            
            # Check for toxic content
            is_toxic, toxic_reason = detect_toxic_content(request.question)
            if is_toxic:
                language = detect_language(request.question)
                if language == "tagalog":
                    response = "Naiintindihan ko na baka frustrated ka, pero nandito ako para magbigay ng helpful legal information. Pakiusap, magtanong nang may respeto. 😊"
                else:
                    response = "I understand you may be frustrated, but I'm here to provide helpful legal information. Please rephrase your question respectfully. 😊"
                yield f"data: {json.dumps({'content': response, 'done': True})}\n\n"
                return
            
            # Check for prohibited input
            is_prohibited, prohibition_reason = detect_prohibited_input(request.question)
            if is_prohibited:
                yield f"data: {json.dumps({'error': prohibition_reason, 'done': True})}\n\n"
                return
            
            # Check for gibberish
            is_gibberish, gibberish_reason = is_gibberish_input(request.question)
            if is_gibberish:
                language = detect_language(request.question)
                if language in ["tagalog", "taglish"]:
                    clarification = (
                        "Paumanhin, ngunit hindi ko maintindihan ang inyong tanong. "
                        "Maaari po ba kayong magbigay ng mas malinaw na legal na katanungan?"
                    )
                else:
                    clarification = (
                        "I apologize, but I'm having difficulty understanding your question. "
                        "Could you please provide a clearer legal inquiry?"
                    )
                yield f"data: {json.dumps({'content': clarification, 'done': True})}\n\n"
                return
            
            # Detect language
            language = detect_language(request.question)
            
            # Send initial metadata
            yield f"data: {json.dumps({'type': 'metadata', 'language': language})}\n\n"
            
            # Check for unsupported language
            if language == "unsupported":
                unsupported_response = (
                    "I. PRELIMINARY STATEMENT\n"
                    "This Counsel acknowledges receipt of your query.\n\n"
                    "**II. ANALYSIS**\n"
                    "Upon review, the query presented is rendered in a linguistic format that falls outside the operational parameters of this service. "
                    "This service is constrained to processing legal interrogatories in **English** or **Filipino**.\n\n"
                    "**III. CONCLUSION**\n"
                    "Regrettably, no substantive analysis can be furnished. You are respectfully advised to re-submit your query in English or Filipino."
                )
                yield f"data: {json.dumps({'content': unsupported_response, 'done': True})}\n\n"
                return
            
            # Check for personal advice questions
            if is_personal_advice_question(request.question):
                if language == "tagalog":
                    response = (
                        "Naiintindihan ko na kailangan mo ng tulong sa desisyon mo, pero hindi ako makakapagbigay ng personal na legal advice. "
                        "Para sa ganitong mga tanong, kailangan mo ng konsultasyon sa isang lisensyadong abogado."
                    )
                else:
                    response = (
                        "I understand you need help with a decision, but I cannot provide personal legal advice about what you should do in your specific situation. "
                        "For questions like this, you need a consultation with a licensed lawyer."
                    )
                yield f"data: {json.dumps({'content': response, 'done': True})}\n\n"
                return
            
            # Check for out-of-scope topics
            is_out_of_scope, topic_type = is_out_of_scope_topic(request.question)
            if is_out_of_scope:
                out_of_scope_response = generate_ai_response(
                    request.question,
                    language,
                    'out_of_scope',
                    topic_type
                )
                yield f"data: {json.dumps({'content': out_of_scope_response, 'done': True})}\n\n"
                return
            
            # Check if legal question
            if not is_legal_question(request.question):
                casual_response = generate_ai_response(request.question, language, 'casual')
                yield f"data: {json.dumps({'content': casual_response, 'done': True})}\n\n"
                
                # Save to chat history
                if effective_user_id:
                    try:
                        await save_chat_interaction(
                            chat_service=chat_service,
                            effective_user_id=effective_user_id,
                            session_id=request.session_id,
                            question=request.question,
                            answer=casual_response,
                            language=language,
                            metadata={"type": "casual", "streaming": True}
                        )
                    except Exception as e:
                        logger.error(f"Failed to save casual history: {e}")
                return
            
            # ===== VECTOR SEARCH =====
            context, sources = retrieve_relevant_context(request.question, TOP_K_RESULTS)
            
            # Check if we have sufficient context
            if not sources or len(sources) == 0:
                no_context_message = (
                    "I apologize, but I don't have enough information in my database to answer this question accurately. "
                    "I recommend consulting with a licensed Philippine lawyer for assistance."
                    if language == "english" else
                    "Paumanhin po, pero wala akong sapat na impormasyon sa aking database para masagot ito nang tama. "
                    "Inirerekomenda ko pong kumonsulta sa lisensyadong abogado para sa tulong."
                )
                yield f"data: {json.dumps({'content': no_context_message, 'done': True})}\n\n"
                return
            
            # Send sources
            source_citations = [
                {
                    'source': src['source'],
                    'law': src['law'],
                    'article_number': src['article_number'],
                    'article_title': src['article_title'],
                    'text_preview': src['text_preview'],
                    'source_url': src.get('source_url', ''),
                    'relevance_score': src.get('relevance_score', 0.0)
                }
                for src in sources
            ]
            yield f"data: {json.dumps({'type': 'sources', 'sources': source_citations})}\n\n"
            
            # ===== BUILD MESSAGES FOR STREAMING =====
            # Use hardcore legalese prompts
            system_prompt = LAWYER_SYSTEM_PROMPT_ENGLISH if language in ["english", "taglish"] else LAWYER_SYSTEM_PROMPT_TAGALOG
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history (last 3 exchanges for context awareness)
            for msg in request.conversation_history[-3:]:
                messages.append(msg)
            
            # Add current question with context
            if context and context.strip():
                user_message = f"""HEREIN ARE THE CONTROLLING STATUTES AND JURISPRUDENCE (CONTEXT):
{context}

THE LEGAL QUERY IS AS FOLLOWS:
{request.question}

Proceed with the analysis as mandated."""
            else:
                user_message = f"""THE LEGAL QUERY IS AS FOLLOWS:
{request.question}

Note: No specific context was retrieved from the vector database. Proceed with the analysis based on general knowledge of controlling Philippine law, adhering strictly to the mandated 5-part format."""
            
            messages.append({"role": "user", "content": user_message})
            
            # ===== STREAMING: Generate response with OpenAI streaming =====
            full_answer = ""
            stream = openai_client.chat.completions.create(
                model=CHAT_MODEL,
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=0.2,  # Low temperature for formal, strict tone
                top_p=0.9,
                presence_penalty=0.1,
                frequency_penalty=0.1,
                stream=True,  # Enable streaming!
                timeout=60.0  # Increased timeout for longer generation
            )
            
            # Stream tokens as they arrive
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_answer += content
                    yield f"data: {json.dumps({'content': content})}\n\n"
            
            # ===== OUTPUT VALIDATION =====
            if guardrails_instance:
                try:
                    logger.info("Validating output with Guardrails AI...")
                    output_validation_result = guardrails_instance.validate_output(
                        response=full_answer,
                        context=context
                    )
                    
                    if not output_validation_result.get('is_valid', True):
                        error_message = output_validation_result.get('error', 'Output validation failed')
                        logger.warning(f"Output validation failed: {error_message}")
                        # Note: Output already streamed, so we can only log this
                        yield f"data: {json.dumps({'warning': 'Response may not meet all safety standards'})}\n\n"
                except Exception as e:
                    logger.warning(f"Guardrails output validation error: {e}")
            
            # Send completion signal
            total_time = time.time() - perf_start
            yield f"data: {json.dumps({'done': True, 'total_time': total_time})}\n\n"
            
            # ===== SAVE TO CHAT HISTORY (async, don't block) =====
            if effective_user_id:
                try:
                    # Calculate confidence
                    if sources and len(sources) > 0:
                        avg_score = sum(src.get('relevance_score', 0.0) for src in sources[:3]) / min(3, len(sources))
                        if avg_score >= 0.7:
                            confidence = "high"
                        elif avg_score >= 0.5:
                            confidence = "medium"
                        else:
                            confidence = "low"
                    else:
                        confidence = "medium"
                    
                    await save_chat_interaction(
                        chat_service=chat_service,
                        effective_user_id=effective_user_id,
                        session_id=request.session_id,
                        question=request.question,
                        answer=full_answer,
                        language=language,
                        metadata={
                            "sources": source_citations,
                            "confidence": confidence,
                            "streaming": True,
                            "response_time": total_time
                        }
                    )
                except Exception as e:
                    logger.error(f"Failed to save chat history: {e}")
            
            # Production logging
            request_duration = (datetime.now() - request_start_time).total_seconds()
            logger.info(f"Streaming request completed in {request_duration:.2f}s - sources={len(source_citations)}")
            
        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"
    
    # Return streaming response with proper headers
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Access-Control-Allow-Origin": "*",  # CORS support
        }
    )


@router.get("/stream/health")
async def streaming_health_check():
    """Health check for streaming endpoint"""
    return {
        "status": "healthy",
        "service": "Ai.ttorney Legal Practice API - Streaming Module",
        "description": "Real-time streaming endpoint for lawyer chatbot",
        "model": CHAT_MODEL,
        "features": [
            "Server-Sent Events (SSE)",
            "Real-time token streaming",
            "Full validation integration",
            "Optimized for mobile clients",
            "Chat history persistence"
        ],
        "target_audience": "Members of the Philippine Bar"
    }
