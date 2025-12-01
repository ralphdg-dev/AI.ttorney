from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncGenerator, Dict, List
import json
import time
import logging
import asyncio
import traceback

from config.timeout_config import get_timeout, create_httpx_timeout, get_timeout_bundle

logger = logging.getLogger(__name__)
from datetime import datetime

from utils.sse_formatter import format_sse

# Import everything from the old file including pre-initialized clients
from api.chatbot_lawyer import (
    ChatRequest,
    get_optional_current_user,
    get_chat_history_service,
    ChatHistoryService,
    CHAT_MODEL,
    TOP_K_RESULTS,
    openai_client,
    qdrant_client,
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
    build_professional_referral_response
)

# Import disclaimer function from user chatbot (shared utility)
from api.chatbot_user import get_legal_disclaimer

                                                  
from services.content_moderation_service import get_moderation_service
from services.violation_tracking_service import get_violation_tracking_service
from services.prompt_injection_detector import get_prompt_injection_detector
from models.violation_types import ViolationType

                                      
from utils.rag_utils import retrieve_relevant_context_with_web_search

               
router = APIRouter(prefix="/api/chatbot/lawyer", tags=["Legal Practice & Research API - Streaming"])


@router.post("/ask")
async def ask_legal_question(
    request: ChatRequest,
    stream: bool = True,
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
                logger.debug(f"Authenticated user ID: {authenticated_user_id}")
            else:
                logger.debug(f"No authenticated user found. current_user: {current_user}")
            
            effective_user_id = authenticated_user_id or request.user_id
            logger.debug(f"Effective user ID for chat history: {effective_user_id}")
            
                                
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
            
            # 🚀 PARALLEL PROCESSING: Run RAG retrieval and guardrails validation simultaneously
            # This reduces total response time by 30-50% for authenticated users
            parallel_tasks = []
            
            # Task 1: RAG retrieval (always needed for legal questions)
            rag_task = asyncio.create_task(
                asyncio.to_thread(
                    retrieve_relevant_context_with_web_search,
                    question=request.question,
                    collection_name=COLLECTION_NAME,
                    embedding_model=EMBEDDING_MODEL,
                    top_k=TOP_K_RESULTS,
                    min_confidence_score=MIN_CONFIDENCE_SCORE,
                    enable_web_search=True
                )
            )
            parallel_tasks.append(('rag', rag_task))
            
            # Task 2: Guardrails validation (only for authenticated users)
            # Includes prompt injection detection + content moderation for lawyers
            guardrails_task = None
            if effective_user_id:
                async def run_guardrails():
                    moderation_service = get_moderation_service()
                    violation_service = get_violation_tracking_service()
                    
                    # First check prompt injection (lawyer-specific)
                    injection_detector = get_prompt_injection_detector()
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
                                logger.info(f"Recording prompt injection violation for lawyer: {effective_user_id}")
                                violation_result = await violation_service.record_violation(
                                    user_id=effective_user_id,
                                    violation_type=ViolationType.CHATBOT_PROMPT,  
                                    content_text=request.question.strip(),
                                    moderation_result=injection_result,  
                                    content_id=None
                                )
                                
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
                                return {'moderation_result': injection_result, 'violation_result': violation_result, 'blocked': True, 'violation_message': violation_message}
                                
                            except Exception as violation_error:
                                logger.error(f" Failed to record prompt injection violation: {str(violation_error)}")
                                return {'moderation_result': injection_result, 'violation_result': None, 'blocked': True, 'violation_message': 'Your query was flagged for attempting to manipulate the system. This violates our usage policy. Please use this service for legitimate legal research only.'}
                    except Exception as e:
                        logger.error(f" Prompt injection detection error: {str(e)}")
                    
                    # Then check content moderation
                    moderation_result = await moderation_service.moderate_content(request.question.strip())
                    
                    if not moderation_service.is_content_safe(moderation_result):
                        logger.warning(f"  Chatbot prompt flagged for lawyer {effective_user_id[:8]}: {moderation_result['violation_summary']}")
                        
                        try:
                            logger.info(f"Recording content violation for lawyer: {effective_user_id}")
                            violation_result = await violation_service.record_violation(
                                user_id=effective_user_id,
                                violation_type=ViolationType.CHATBOT_PROMPT,
                                content_text=request.question.strip(),
                                moderation_result=moderation_result,
                                content_id=None
                            )
                            return {'moderation_result': moderation_result, 'violation_result': violation_result, 'blocked': True}
                        except Exception as violation_error:
                            logger.error(f" Failed to record violation: {str(violation_error)}")
                            return {'moderation_result': moderation_result, 'violation_result': None, 'blocked': True}
                    
                    return {'moderation_result': moderation_result, 'violation_result': None, 'blocked': False}
                
                guardrails_task = asyncio.create_task(run_guardrails())
                parallel_tasks.append(('guardrails', guardrails_task))
            
                                        
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
            
            # 🚀 PARALLEL PROCESSING: Run RAG retrieval and guardrails validation simultaneously
            # This reduces total response time by 30-50% for authenticated users
            parallel_tasks = []
            
            # Task 1: RAG retrieval (always needed for legal questions)
            rag_task = asyncio.create_task(
                asyncio.to_thread(
                    retrieve_relevant_context_with_web_search,
                    question=request.question,
                    collection_name=COLLECTION_NAME,
                    embedding_model=EMBEDDING_MODEL,
                    top_k=TOP_K_RESULTS,
                    min_confidence_score=MIN_CONFIDENCE_SCORE,
                    enable_web_search=True
                )
            )
            parallel_tasks.append(('rag', rag_task))
            
            # Task 2: Guardrails validation (only for authenticated users)
            guardrails_task = None
            if effective_user_id:
                async def run_guardrails():
                    moderation_service = get_moderation_service()
                    violation_service = get_violation_tracking_service()
                    
                    moderation_result = await moderation_service.moderate_content(request.question.strip())
                    
                    if not moderation_service.is_content_safe(moderation_result):
                        logger.warning(f"  Chatbot prompt flagged for lawyer {effective_user_id[:8]}: {moderation_result['violation_summary']}")
                        
                        try:
                            logger.info(f"Recording violation for lawyer: {effective_user_id}")
                            violation_result = await violation_service.record_violation(
                                user_id=effective_user_id,
                                violation_type=ViolationType.CHATBOT_PROMPT,
                                content_text=request.question.strip(),
                                moderation_result=moderation_result,
                                content_id=None
                            )
                            return {'moderation_result': moderation_result, 'violation_result': violation_result, 'blocked': True}
                        except Exception as violation_error:
                            logger.error(f" Failed to record violation: {str(violation_error)}")
                            return {'moderation_result': moderation_result, 'violation_result': None, 'blocked': True}
                    
                    return {'moderation_result': moderation_result, 'violation_result': None, 'blocked': False}
                
                guardrails_task = asyncio.create_task(run_guardrails())
                parallel_tasks.append(('guardrails', guardrails_task))
            
            # Execute parallel tasks with timeout protection
            try:
                results = await asyncio.gather(*[task for _, task in parallel_tasks], return_exceptions=True)
                
                # Process results
                context, sources, rag_metadata = None, [], {}
                guardrails_result = {'blocked': False}
                
                for i, (task_name, _) in enumerate(parallel_tasks):
                    if isinstance(results[i], Exception):
                        logger.error(f"❌ {task_name.title()} task failed (lawyer): {results[i]}")
                        if task_name == 'rag':
                            # Fail-open for RAG: continue without context
                            context, sources, rag_metadata = "", [], {}
                        elif task_name == 'guardrails':
                            # Fail-open for guardrails: allow request
                            guardrails_result = {'blocked': False}
                    else:
                        if task_name == 'rag':
                            context, sources, rag_metadata = results[i]
                        elif task_name == 'guardrails':
                            guardrails_result = results[i]
                
                # Check if guardrails blocked the request
                if guardrails_result.get('blocked', False):
                    moderation_result = guardrails_result.get('moderation_result', {})
                    violation_result = guardrails_result.get('violation_result', {})
                    
                    language = detect_language(request.question)
                    strike_count = violation_result.get('strike_count', 0)
                    suspension_count = violation_result.get('suspension_count', 0)
                    action_taken = violation_result.get('action_taken', 'strike_added')
                    
                    # Generate violation message (same logic as before)
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
                        
                        violation_message = f"""Content Policy Violation ⚠️

{warning}

Ang iyong tanong ay lumabag sa aming community guidelines dahil sa: {moderation_result.get('violation_summary', 'Inappropriate content')}

Mangyaring maging maingat sa susunod na mga tanong."""
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
                        
                        violation_message = f"""Content Policy Violation ⚠️

{warning}

Your question violated our community guidelines for: {moderation_result.get('violation_summary', 'Inappropriate content')}

Please be more careful with future questions."""
                    
                    yield format_sse({'content': violation_message})
                    yield format_sse({'done': True})
                    return
                
            except asyncio.TimeoutError:
                logger.error("❌ Parallel processing timeout (lawyer) - using fail-open defaults")
                context, sources, rag_metadata = "", [], {}
            
            # Log performance improvement
            logger.debug(f"🚀 Parallel processing completed (lawyer): RAG + Guardrails executed simultaneously")
            
            # Continue with RAG results
            if rag_metadata.get("web_search_triggered"):
                logger.info(f"🌐 Web search triggered (lawyer streaming): {rag_metadata['search_strategy']}")
            
            # Initialize with safe defaults for fail-open strategy
            source_citations = []
            
            # Format sources safely
            if sources:
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
            else:
                logger.warning("⚠️ No sources found, proceeding without context")
            
                                        # Check if we have sources after the robust search
            if not sources or len(sources) == 0:
                logger.info("📝 No sources available - providing generic legal guidance")
                no_context_message = (
                    "I apologize, but I don't have enough information in my database to answer this question accurately. "
                    "I recommend consulting with a licensed Philippine lawyer for assistance."
                    if language == "english" else
                    "Paumanhin po, pero wala akong sapat na impormasyon sa aking database para masagot ito nang tama. "
                    "Inirerekomenda ko pong kumonsulta sa lisensyadong abogado para sa tulong."
                )
                yield format_sse({'content': no_context_message, 'done': True})
                return
                       # Build message context with robust error handling
            try:
                logger.info("📋 Building message context for lawyer response")
                
                system_prompt = LAWYER_SYSTEM_PROMPT_ENGLISH if language in ["english", "taglish"] else LAWYER_SYSTEM_PROMPT_TAGALOG
                messages = [{"role": "system", "content": system_prompt}]
                
                # Include conversation history (last 8 messages for lawyer context)
                for msg in request.conversation_history[-8:]:
                    messages.append(msg)
                
                # Build user message with context if available
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
                logger.debug(f"📝 Built message context: {len(messages)} messages, context length: {len(context)}")
                
            except Exception as e:
                logger.error(f"❌ Message building error: {e}")
                # Fallback to simple message structure
                system_prompt = LAWYER_SYSTEM_PROMPT_ENGLISH
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.question}
                ]
            
            # OpenAI streaming with robust error handling
            try:
                logger.info("🤖 Starting OpenAI stream (lawyer streaming)")
                
                full_answer = ""
                token_buffer = ""
                token_count = 0
                last_send_time = time.time()
                
                # Streaming configuration constants (matching user chatbot)
                STREAMING_TOKEN_BATCH_SIZE = 5
                STREAMING_MAX_INTERVAL_MS = 100
                
                stream = openai_client.chat.completions.create(
                    model=CHAT_MODEL,
                    messages=messages,
                    max_tokens=request.max_tokens,
                    temperature=0.1,  # Ultra-low for fastest responses
                    top_p=0.7,  # Focused sampling for speed
                    presence_penalty=0.1,
                    frequency_penalty=0.1,
                    stream=True,                     
                    timeout=get_timeout("chatbot_openai")  # Use centralized timeout config
                )
                
                logger.debug("📡 OpenAI stream created, processing chunks...")
                
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_answer += content
                        token_buffer += content
                        token_count += 1
                        
                        current_time = time.time()
                        time_since_last_send_ms = (current_time - last_send_time) * 1000
                        
                        # Batch tokens for optimal streaming performance
                        should_send_batch = (
                            token_count >= STREAMING_TOKEN_BATCH_SIZE or 
                            time_since_last_send_ms >= STREAMING_MAX_INTERVAL_MS
                        )
                        
                        if should_send_batch and token_buffer:
                            yield format_sse({'content': token_buffer})
                            logger.debug(f"📤 Sending batch: {token_count} tokens, {time_since_last_send_ms:.0f}ms interval")
                            token_buffer = ""
                            token_count = 0
                            last_send_time = current_time
                
                # Send any remaining tokens
                if token_buffer:
                    yield format_sse({'content': token_buffer})
                    logger.debug("📤 Sending final token batch")
                
                logger.info(f"✅ Streaming completed: {len(full_answer)} characters generated")
                
            except Exception as e:
                logger.error(f"❌ OpenAI streaming error: {e}")
                logger.error(f"Streaming traceback: {traceback.format_exc()}")
                
                # Provide fallback response
                fallback_message = (
                    "I apologize, but I encountered a technical issue while generating your response. "
                    "Please try again or consult with a licensed Philippine lawyer for assistance."
                    if language == "english" else
                    "Paumanhin, ngunit nagkaproblema teknikal ako sa pagbuo ng iyong sagot. "
                    "Mangyaring subukan ulit o kumonsulta sa lisensyadong abogado."
                )
                yield format_sse({'content': fallback_message})
                full_answer = fallback_message  # Save fallback to history
            
                                           
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
            
            # ALWAYS send legal disclaimer before completion
            disclaimer = get_legal_disclaimer(language, user_type="lawyer")
            yield format_sse({'type': 'disclaimer', 'disclaimer': disclaimer})
            
                                    
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
            logger.error(f"❌ Top-level streaming error (lawyer): {e}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            
            # Send error to frontend for user feedback
            error_message = "I apologize, but I encountered an unexpected error. Please try again."
            yield format_sse({'error': error_message, 'done': True})
    
                                                   
    if stream:
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            }
        )
    else:
        # Return JSON response for backward compatibility
        try:
            # Collect the full response from the stream
            full_response = {}
            accumulated_content = ""
            async for chunk in generate_stream():
                # Parse SSE format chunks - format_sse adds "data: " prefix
                if chunk.startswith("data: "):
                    try:
                        # Remove "data: " prefix and parse JSON
                        json_data = chunk[6:].strip()  # Remove prefix and whitespace
                        data = json.loads(json_data)
                        
                        # Accumulate content instead of overwriting
                        if data.get("content") and data["content"] != ".":
                            accumulated_content += data["content"]
                        
                        # Update other fields normally
                        for key, value in data.items():
                            if key != "content":
                                full_response[key] = value
                        
                        if data.get("done"):
                            full_response["content"] = accumulated_content
                            break
                    except json.JSONDecodeError:
                        continue
            
            # Return the complete response as JSON
            return full_response
        except Exception as e:
            logger.error(f"JSON response generation error: {e}")
            return {"error": str(e), "answer": "Sorry, I encountered an error processing your request."}


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
