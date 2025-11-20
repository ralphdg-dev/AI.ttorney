from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncGenerator, Dict, List
import json
import time
import logging
from datetime import datetime

                                              
from utils.sse_formatter import format_sse

                                                         
from api.chatbot_lawyer import (
            
    ChatRequest,
    
              
    get_optional_current_user,
    get_chat_history_service,
    ChatHistoryService,
    
                   
    CHAT_MODEL,
    TOP_K_RESULTS,
    openai_client,
    guardrails_instance,
    LAWYER_SYSTEM_PROMPT_ENGLISH,
    LAWYER_SYSTEM_PROMPT_TAGALOG,
    
                          
    detect_prohibited_input,
    is_gibberish_input,
    detect_language,
    is_simple_greeting,
    is_personal_advice_question,
    is_out_of_scope_topic,
    is_legal_question,
    is_complex_query,
    
                       
    generate_ai_response,
    save_chat_interaction,
                                       
    is_professional_advice_roleplay_request,
    build_professional_referral_response,
    
             
    logger
)

                                                  
from services.content_moderation_service import get_moderation_service
from services.violation_tracking_service import get_violation_tracking_service
from services.prompt_injection_detector import get_prompt_injection_detector
from models.violation_types import ViolationType

                                      
from utils.rag_utils import retrieve_relevant_context_with_web_search

               
router = APIRouter(prefix="/api/chatbot/lawyer", tags=["Legal Practice & Research API - Streaming"])


@router.post("/ask")
async def ask_legal_question(
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
                                    
            perf_start = time.time()
            request_start_time = datetime.now()
            
                                                 
            authenticated_user_id = None
            if current_user and "user" in current_user:
                authenticated_user_id = current_user["user"]["id"]
                print(f" Authenticated user ID: {authenticated_user_id}")
            else:
                print(f"  No authenticated user found. current_user: {current_user}")
            
            effective_user_id = authenticated_user_id or request.user_id
            print(f" Effective user ID for chat history: {effective_user_id}")
            
                                
            logger.info(f"Streaming request - user_id={effective_user_id}, session_id={request.session_id}, question_length={len(request.question)}")
            
                                          
                              
            if not request.question or not request.question.strip():
                yield format_sse({'error': 'Question cannot be empty'})
                return
            
                                          
            input_validation_result = None
            
                                         
            if guardrails_instance:
                try:
                    logger.info("Validating input with Guardrails AI...")
                    input_validation_result = guardrails_instance.validate_input(request.question)
                    
                    if not input_validation_result.get('is_valid', True):
                        error_message = input_validation_result.get('error', 'Input validation failed')
                        logger.warning(f"Input validation failed: {error_message}")
                        yield format_sse({'content': error_message, 'done': True})
                        return
                    
                                                    
                    if 'cleaned_input' in input_validation_result:
                        request.question = input_validation_result['cleaned_input']
                except Exception as e:
                    logger.warning(f"Guardrails input validation error: {e}")
            
                                       
            if is_simple_greeting(request.question):
                language = detect_language(request.question)
                greeting_response = generate_ai_response(request.question, language, 'greeting')
                yield format_sse({'content': greeting_response, 'done': True})
                
                                                           
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
            
                                                                       
                                                                                     
                                                                    
            if effective_user_id:
                print(f"\n [STEP 1] Prompt injection detection (streaming)...")
                injection_detector = get_prompt_injection_detector()
                violation_service = get_violation_tracking_service()
                
                try:
                    injection_result = injection_detector.detect(request.question.strip())
                    
                                                                              
                    if injection_result["is_injection"]:
                        logger.warning(
                            f" Prompt injection detected for lawyer {effective_user_id[:8]}: "
                            f"category={injection_result['category']}, "
                            f"severity={injection_result['severity']:.2f}, "
                            f"risk={injection_result['risk_level']}"
                        )
                        
                                                               
                        try:
                            print(f" Recording prompt injection violation for lawyer: {effective_user_id}")
                            violation_result = await violation_service.record_violation(
                                user_id=effective_user_id,
                                violation_type=ViolationType.CHATBOT_PROMPT,  
                                content_text=request.question.strip(),
                                moderation_result=injection_result,  
                                content_id=None
                            )
                            print(f" Prompt injection violation recorded: {violation_result}")
                            
                                                                                         
                            violation_message = (
                                f"**I. PRELIMINARY STATEMENT**\n\n"
                                f"This Counsel has detected an attempt to manipulate or compromise the operational parameters of this legal analytical service.\n\n"
                                f"**II. SECURITY VIOLATION DETECTED**\n\n"
                                f"{injection_result['description']}\n\n"
                                f"**III. CONSEQUENCE**\n\n"
                                f" {violation_result['message']}\n\n"
                                f"**IV. ADVISORY**\n\n"
                                f"You are advised to utilize this service solely for legitimate legal research and analysis. Any further attempts to compromise system security may result in permanent account suspension."
                            )
                            
                            yield format_sse({'content': violation_message, 'done': True})
                            return
                            
                        except Exception as violation_error:
                            logger.error(f" Failed to record prompt injection violation: {str(violation_error)}")
                            import traceback
                            print(f"Violation error traceback: {traceback.format_exc()}")
                            
                                                                                       
                            yield format_sse({'content': 'Your query was flagged for attempting to manipulate the system. This violates our usage policy. Please use this service for legitimate legal research only.', 'done': True})
                            return
                    else:
                        print(f" No prompt injection detected (streaming)")
                        
                except Exception as e:
                    logger.error(f" Prompt injection detection error: {str(e)}")
                                                                                      
            
                                                                            
                                                                           
            print(f"\n [STEP 2] Content moderation check (streaming)...")
            moderation_service = get_moderation_service()
            violation_service = get_violation_tracking_service()
            
            try:
                moderation_result = await moderation_service.moderate_content(request.question.strip())
                
                                                                          
                if not moderation_service.is_content_safe(moderation_result):
                    user_id_log = effective_user_id[:8] if effective_user_id else "unauthenticated"
                    logger.warning(f"  Chatbot prompt flagged for user {user_id_log}: {moderation_result['violation_summary']}")
                    
                                                                   
                    violation_result = None
                    if effective_user_id:
                        try:
                            print(f" Recording violation for user: {effective_user_id}")
                            violation_result = await violation_service.record_violation(
                                user_id=effective_user_id,
                                violation_type=ViolationType.CHATBOT_PROMPT,
                                content_text=request.question.strip(),
                                moderation_result=moderation_result,
                                content_id=None
                            )
                            print(f" Violation recorded: {violation_result}")
                        except Exception as violation_error:
                            logger.error(f" Failed to record violation: {str(violation_error)}")
                            violation_result = None
                    
                                                                                                   
                    if not violation_result:
                        violation_result = {
                            "action_taken": "warning",
                            "strike_count": 0,
                            "suspension_count": 0,
                            "message": "Your content violated our community guidelines. Please be mindful of your language."
                        }
                    
                                                              
                    language = detect_language(request.question)
                    
                                                                                         
                    strike_count = violation_result.get('strike_count', 0)
                    suspension_count = violation_result.get('suspension_count', 0)
                    action_taken = violation_result.get('action_taken', 'strike_added')
                    
                                                      
                    if language == "tagalog":
                                          
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
                                             
                            if strike_count == 1:
                                warning = "You now have 1 strike. Two more violations will result in a 7-day suspension."
                            elif strike_count == 2:
                                warning = "You now have 2 strikes. One more violation will result in a 7-day suspension."
                            else:
                                warning = f"You now have {strike_count} strikes. Please follow our community guidelines."
                        
                        violation_message = f"""Content Policy Violation

{moderation_service.get_violation_message(moderation_result, context="chatbot")}

{warning}"""
                    
                                            
                    yield format_sse({'content': violation_message})
                    
                                                                            
                    if effective_user_id and violation_result:
                        violation_metadata = {
                            'violation_detected': True,
                            'action_taken': violation_result['action_taken'],
                            'strike_count': violation_result['strike_count'],
                            'suspension_count': violation_result['suspension_count'],
                            'message': violation_result['message']
                        }
                        yield format_sse({'type': 'violation', 'violation': violation_metadata})
                        
                                                                                 
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
                                    "streaming": True,
                                    "user_type": "lawyer"
                                }
                            )
                        except Exception as e:
                            logger.error(f"Failed to save violation to history: {e}")
                    
                          
                    yield format_sse({'done': True})
                    return
                else:
                    print(f" Content moderation passed (streaming)")
                    
            except Exception as e:
                logger.error(f" Content moderation error: {str(e)}")
                                                                         
                print(f"  Content moderation failed, continuing without moderation: {e}")
            
                                        
            is_prohibited, prohibition_reason = detect_prohibited_input(request.question)
            if is_prohibited:
                yield format_sse({'error': prohibition_reason, 'done': True})
                return
            
                                 
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
                yield format_sse({'content': clarification, 'done': True})
                return
            
                             
            language = detect_language(request.question)
            
                                   
            yield format_sse({'type': 'metadata', 'language': language})
            
                                                                          
            if is_professional_advice_roleplay_request(request.question):
                referral_response, referral_followups = build_professional_referral_response(language)
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
                            answer=referral_response,
                            language=language,
                            metadata={"type": "referral", "reason": "professional_roleplay_block", "streaming": True, "user_type": "lawyer"}
                        )
                    except Exception as e:
                        logger.error(f"Failed to save referral to history (lawyer): {e}")
                
                                        
                yield format_sse({'content': referral_response})
                
                                                 
                yield format_sse({
                    'type': 'metadata',
                    'language': language,
                    'session_id': session_id,
                    'user_message_id': user_msg_id,
                    'assistant_message_id': assistant_msg_id
                })
                
                yield format_sse({'done': True})
                return
            
                                            
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
                yield format_sse({'content': unsupported_response, 'done': True})
                return
            
                                                 
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
                yield format_sse({'content': response, 'done': True})
                return
            
                                           
            is_out_of_scope, topic_type = is_out_of_scope_topic(request.question)
            if is_out_of_scope:
                out_of_scope_response = generate_ai_response(
                    request.question,
                    language,
                    'out_of_scope',
                    topic_type
                )
                yield format_sse({'content': out_of_scope_response, 'done': True})
                return
            
                                     
            if not is_legal_question(request.question):
                casual_response = generate_ai_response(request.question, language, 'casual')
                yield format_sse({'content': casual_response, 'done': True})
                
                                      
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
            
                                                      
            from api.chatbot_lawyer import (
                qdrant_client, openai_client, COLLECTION_NAME, 
                EMBEDDING_MODEL, MIN_CONFIDENCE_SCORE
            )
            
            context, sources, rag_metadata = retrieve_relevant_context_with_web_search(
                question=request.question,
                qdrant_client=qdrant_client,
                openai_client=openai_client,
                collection_name=COLLECTION_NAME,
                embedding_model=EMBEDDING_MODEL,
                top_k=TOP_K_RESULTS,
                min_confidence_score=MIN_CONFIDENCE_SCORE,
                enable_web_search=True
            )
            
                              
            if rag_metadata.get("web_search_triggered"):
                logger.info(f" Web search triggered (streaming): {rag_metadata['search_strategy']}")
            
                                                 
            if not sources or len(sources) == 0:
                no_context_message = (
                    "I apologize, but I don't have enough information in my database to answer this question accurately. "
                    "I recommend consulting with a licensed Philippine lawyer for assistance."
                    if language == "english" else
                    "Paumanhin po, pero wala akong sapat na impormasyon sa aking database para masagot ito nang tama. "
                    "Inirerekomenda ko pong kumonsulta sa lisensyadong abogado para sa tulong."
                )
                yield format_sse({'content': no_context_message, 'done': True})
                return
            
                          
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
            yield format_sse({'type': 'sources', 'sources': source_citations})
            
                                                      
                                           
            system_prompt = LAWYER_SYSTEM_PROMPT_ENGLISH if language in ["english", "taglish"] else LAWYER_SYSTEM_PROMPT_TAGALOG
            messages = [{"role": "system", "content": system_prompt}]
            
                                                                                        
            for msg in request.conversation_history[-8:]:
                messages.append(msg)
            
                                               
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
            
                                                                            
            full_answer = ""
            stream = openai_client.chat.completions.create(
                model=CHAT_MODEL,
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=0.2,                                           
                top_p=0.9,
                presence_penalty=0.1,
                frequency_penalty=0.1,
                stream=True,                     
                timeout=60.0                                           
            )
            
                                          
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_answer += content
                    yield format_sse({'content': content})
            
                                           
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
                                                                                
                        yield format_sse({'warning': 'Response may not meet all safety standards'})
                except Exception as e:
                    logger.warning(f"Guardrails output validation error: {e}")
            
                                    
            total_time = time.time() - perf_start
            yield format_sse({'done': True, 'total_time': total_time})
            
                                                                   
            if effective_user_id:
                try:
                                          
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
            
                                
            request_duration = (datetime.now() - request_start_time).total_seconds()
            logger.info(f"Streaming request completed in {request_duration:.2f}s - sources={len(source_citations)}")
            
        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            yield format_sse({'error': str(e), 'done': True})
    
                                                   
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",                           
            "Access-Control-Allow-Origin": "*",                
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
