from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncGenerator
import json
import time
import logging

                                                                       
from api.chatbot_user import (
            
    ChatRequest,
    
              
    get_optional_current_user,
    get_chat_history_service,
    ChatHistoryService,
    
                        
    is_simple_greeting,
    is_conversation_context_question,
    is_app_information_question,
    is_translation_request,
    is_legal_category_request,
    get_legal_category_response,
    
                   
    CHAT_MODEL,
    TOP_K_RESULTS,
    STREAMING_TIMEOUT_SECONDS,
    STREAMING_TOKEN_BATCH_SIZE,
    STREAMING_MAX_INTERVAL_MS,
    ENGLISH_SYSTEM_PROMPT,
    TAGALOG_SYSTEM_PROMPT,
    openai_client,
    
                       
    detect_language,
    is_legal_question,
    generate_ai_response,
    normalize_emotional_query,
    get_legal_disclaimer,
    save_chat_interaction,
    is_professional_advice_roleplay_request,
    build_professional_referral_response,
    
                
    get_moderation_service,
    get_violation_tracking_service,
    ViolationType
)

                                              
from utils.sse_formatter import format_sse

                                  
from services.prompt_injection_detector import get_prompt_injection_detector

                                      
from utils.rag_utils import retrieve_relevant_context_with_web_search

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
                             
            authenticated_user_id = None
            if current_user and "user" in current_user:
                authenticated_user_id = current_user["user"]["id"]
            effective_user_id = authenticated_user_id or request.user_id
            guest_session_token = None
            
                                                                                          
                                                                     
                                                                                          
                                                              
                                                                          
            if not effective_user_id:                                  
                from middleware.guest_rate_limiter import GuestRateLimiter
                
                                                                                         
                rate_limit_result = await GuestRateLimiter.validate_guest_request(
                    request=None,                                            
                    session_id=request.guest_session_id,
                    client_prompt_count=request.guest_prompt_count
                )
                
                if not rate_limit_result["allowed"]:
                    logger.warning(
                        f"🚫 Guest rate limit exceeded: {rate_limit_result['reason']} - "
                        f"Message: {rate_limit_result.get('message', 'Rate limit reached')}"
                    )
                    yield format_sse({
                        'content': rate_limit_result["message"],
                        'type': 'error',
                        'done': True
                    })
                    return
                
                                                                      
                guest_session_token = rate_limit_result.get("session_id")
                logger.info(f" Guest rate limit check passed - Server count: {rate_limit_result['server_count']}/15")
                                                                                          
            
                                                                            
            if effective_user_id:
                violation_service = get_violation_tracking_service()
                user_status = await violation_service.check_user_status(effective_user_id)
                
                if not user_status["is_allowed"]:
                    logger.warning(f"🚫 User {effective_user_id[:8]}... blocked from chatbot: {user_status['account_status']}")
                    yield format_sse({'content': user_status["reason"], 'done': True})
                    return
            
                              
            if not request.question or not request.question.strip():
                yield format_sse({'error': 'Question cannot be empty'})
                return
            
                                   
            language = detect_language(request.question)
            
                                                              
            new_session_id = None
            if not effective_user_id and rate_limit_result.get("session_id") != request.guest_session_id:
                new_session_id = rate_limit_result.get("session_id")
                print(f" Guest session refreshed: {request.guest_session_id} -> {new_session_id}")
            
            yield format_sse({
                'type': 'metadata', 
                'language': language,
                'new_session_id': new_session_id
            })
            
                                                                          
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
                            metadata={"type": "referral", "reason": "professional_roleplay_block", "streaming": True}
                        )
                    except Exception as e:
                        logger.error(f"Failed to save referral to history: {e}")
                
                                        
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
            
                                                                    
                                                                                    
            if effective_user_id:
                moderation_service = get_moderation_service()
                violation_service = get_violation_tracking_service()
                
                try:
                    moderation_result = await moderation_service.moderate_content(request.question.strip())
                    
                                                                                
                    if not moderation_service.is_content_safe(moderation_result):
                        logger.warning(f"  Chatbot prompt flagged for user {effective_user_id[:8]}: {moderation_result['violation_summary']}")
                        
                                                               
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
                            import traceback
                            print(f"Violation error traceback: {traceback.format_exc()}")
                                                                              
                            violation_result = {
                                "action_taken": "error",
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
                        
                                                                                
                        violation_metadata = {
                            'violation_detected': True,
                            'action_taken': violation_result['action_taken'],
                            'strike_count': violation_result['strike_count'],
                            'suspension_count': violation_result['suspension_count'],
                            'message': violation_result['message']
                        }
                        yield format_sse({'type': 'violation', 'violation': violation_metadata})
                        
                                                                                 
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
                        
                                                           
                        yield format_sse({'done': True})
                        return
                        
                except Exception as e:
                    logger.error(f" Content moderation error: {str(e)}")
                                                                             
            
                                                                              
                                                                                            
            if is_simple_greeting(request.question):
                print(f" Detected as greeting: {request.question}")
                greeting_response = generate_ai_response(request.question, language, 'greeting')
                
                                                           
                                                                                                       
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
                
                                                              
                yield format_sse({'content': greeting_response})
                
                                                                                          
                yield format_sse({
                    'type': 'metadata',
                    'language': language,
                    'session_id': session_id,
                    'user_message_id': user_msg_id,
                    'assistant_message_id': assistant_msg_id
                })
                
                yield format_sse({'done': True})
                return
            
                                                                             
            if is_app_information_question(request.question):
                print(f"\n📱 [APP INFO] Detected app information question: {request.question}")
                
                                                                 
                if language == "tagalog":
                    app_response = (
                        "Ako si **Ai.ttorney** - ang inyong AI legal assistant para sa Philippine law! 🏛⚖\n\n"
                        "**Ano ang Ai.ttorney?**\n"
                        "Ako ay isang advanced na AI chatbot na specially designed para sa mga Pilipinong nangangailangan ng legal na tulong at impormasyon. Hindi ako abogado, pero may access ako sa comprehensive database ng Philippine laws.\n\n"
                        "**Mga Features ko:**\n"
                        "• **📚 Legal Knowledge Base** - May access ako sa Family Code, Labor Code, Revised Penal Code, at iba pang Philippine laws\n"
                        "• **🗣 Bilingual Support** - Makakausap ninyo ako sa English, Tagalog, o Taglish\n"
                        "• ** Conversation Memory** - Naaalala ko ang lahat ng aming mga usapan\n"
                        "• **📖 Source Citations** - Nagbibigay ako ng mga links sa actual na legal documents\n"
                        "• ** Smart Search** - Hinahanap ko ang pinaka-relevant na legal information para sa inyong tanong\n\n"
                        "**Ano ang pwede ninyong itanong?**\n"
                        "• **Family Law** - Kasal, annulment, child custody, inheritance\n"
                        "• **Labor Law** - Employment rights, termination, wages, benefits\n"
                        "• **Consumer Law** - Product warranties, refunds, consumer rights\n"
                        "• **Criminal Law** - Crimes, penalties, arrest procedures\n"
                        "• **Civil Law** - Contracts, property, obligations\n\n"
                        "** Important:** Ang mga sagot ko ay para sa general information lang. Para sa specific legal advice, kailangan pa rin ninyong makipag-consult sa licensed lawyer."
                    )
                else:
                    app_response = (
                        "I'm **Ai.ttorney** - your AI legal assistant for Philippine law! 🏛⚖\n\n"
                        "**What is Ai.ttorney?**\n"
                        "I'm an advanced AI chatbot specifically designed to help Filipinos who need legal information and guidance. While I'm not a lawyer, I have access to a comprehensive database of Philippine laws.\n\n"
                        "**My Features:**\n"
                        "• **📚 Legal Knowledge Base** - I have access to the Family Code, Labor Code, Revised Penal Code, and other Philippine laws\n"
                        "• **🗣 Bilingual Support** - You can talk to me in English, Tagalog, or Taglish\n"
                        "• ** Conversation Memory** - I remember all our conversations\n"
                        "• **📖 Source Citations** - I provide links to actual legal documents\n"
                        "• ** Smart Search** - I find the most relevant legal information for your questions\n\n"
                        "**What can you ask me about?**\n"
                        "• **Family Law** - Marriage, annulment, child custody, inheritance\n"
                        "• **Labor Law** - Employment rights, termination, wages, benefits\n"
                        "• **Consumer Law** - Product warranties, refunds, consumer rights\n"
                        "• **Criminal Law** - Crimes, penalties, arrest procedures\n"
                        "• **Civil Law** - Contracts, property, obligations\n\n"
                        "** Important:** My responses are for general information only. For specific legal advice, you still need to consult with a licensed lawyer."
                    )
                
                                                  
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
                            answer=app_response,
                            language=language,
                            metadata={"type": "app_information", "streaming": True}
                        )
                    except Exception as e:
                        logger.error(f"Failed to save app info to history: {e}")
                
                                               
                yield format_sse({'content': app_response})
                
                                                 
                yield format_sse({
                    'type': 'metadata',
                    'language': language,
                    'session_id': session_id,
                    'user_message_id': user_msg_id,
                    'assistant_message_id': assistant_msg_id
                })
                
                yield format_sse({'done': True})
                return
            
                                                           
            if is_translation_request(request.question):
                print(f"\n [TRANSLATION] Detected translation/repeat request: {request.question}")
                
                                        
                text_lower = request.question.lower()
                target_language = "english" if "english" in text_lower else "tagalog" if "tagalog" in text_lower else "english"
                
                                                                          
                last_response = None
                if request.conversation_history:
                    for msg in reversed(request.conversation_history):
                                                             
                        msg_role = msg.role if hasattr(msg, 'role') else msg.get('role')
                        msg_content = msg.content if hasattr(msg, 'content') else msg.get('content')
                        
                        if msg_role == "assistant":
                            last_response = msg_content
                            break
                
                if not last_response:
                                                                                  
                    if effective_user_id and request.session_id:
                        try:
                            recent_messages = await chat_service.get_recent_messages(
                                user_id=effective_user_id,
                                session_id=request.session_id,
                                limit=2
                            )
                            if recent_messages:
                                                                        
                                for msg in reversed(recent_messages):
                                    if msg.get('role') == 'assistant':
                                        last_response = msg.get('content', '')
                                        break
                        except Exception as e:
                            print(f"Failed to get recent messages for translation: {e}")
                
                if last_response:
                                                          
                    if target_language == "tagalog":
                                                                                            
                        if "Family Law" in last_response and "Main Topics" in last_response:
                            translation_response = (
                                "**Batas ng Pamilya** - Mga Legal na Usapin Tungkol sa Pamilya 👨‍👩‍👧‍👦\n\n"
                                "Ang Batas ng Pamilya ay sumasaklaw sa lahat ng legal na isyu na may kaugnayan sa mga relasyon ng pamilya sa Pilipinas:\n\n"
                                "** Mga Pangunahing Paksa:**\n"
                                "• **Kasal** - Mga legal na pangangailangan, sibil at relihiyosong seremonya\n"
                                "• **Annulment** - Pagdedeklara na ang kasal ay walang bisa\n"
                                "• **Legal Separation** - Pormal na paghihiwalay ng mag-asawa\n"
                                "• **Custody ng Anak** - Pag-aalaga at guardianship ng mga anak\n"
                                "• **Inheritance** - Estate planning at mga karapatan sa succession\n"
                                "• **Adoption** - Mga legal na pamamaraan sa pag-adopt\n"
                                "• **VAWC** - Proteksyon laban sa Violence Against Women and Children\n\n"
                                "**⚖ Mga Governing Laws:**\n"
                                "• Family Code of the Philippines\n"
                                "• Anti-VAWC Act (RA 9262)\n"
                                "• Domestic Adoption Act\n"
                                "• Rules on Custody of Minors\n\n"
                                "Alin sa mga paksang ito ang gusto ninyong malaman pa?\n\n"
                                "Kung may iba pa kayong tanong, huwag mag-atubiling magtanong!"
                            )
                        else:
                                                                          
                            translation_response = (
                                f"Narito ang sagot ko sa Tagalog:\n\n{last_response}\n\n"
                                "Kung may iba pa kayong tanong, huwag mag-atubiling magtanong!"
                            )
                    else:
                        translation_response = (
                            f"Here's my response in English:\n\n{last_response}\n\n"
                            "If you have any other questions, feel free to ask!"
                        )
                else:
                                                
                    translation_response = (
                        "I don't see a previous response to repeat. Could you please ask your legal question again?" 
                        if target_language == "english" else
                        "Wala akong nakitang nakaraang sagot na pwedeng ulitin. Maaari ba ninyong itanong ulit ang inyong legal na katanungan?"
                    )
                
                                              
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
                            answer=translation_response,
                            language=target_language,
                            metadata={"type": "translation_repeat", "streaming": True}
                        )
                    except Exception as e:
                        logger.error(f"Failed to save translation to history: {e}")
                
                                           
                yield format_sse({'content': translation_response})
                
                                                 
                yield format_sse({
                    'type': 'metadata',
                    'language': target_language,
                    'session_id': session_id,
                    'user_message_id': user_msg_id,
                    'assistant_message_id': assistant_msg_id
                })
                
                yield format_sse({'done': True})
                return
            
                                                                                       
            if is_legal_category_request(request.question):
                print(f"\n⚖ [LEGAL CATEGORY] Detected legal category request: {request.question}")
                
                                                                
                category_response, category_followups = get_legal_category_response(request.question, language)
                
                                                 
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
                            answer=category_response,
                            language=language,
                            metadata={"type": "legal_category", "streaming": True}
                        )
                    except Exception as e:
                        logger.error(f"Failed to save legal category to history: {e}")
                
                                              
                yield format_sse({'content': category_response})
                
                                                 
                yield format_sse({
                    'type': 'metadata',
                    'language': language,
                    'session_id': session_id,
                    'user_message_id': user_msg_id,
                    'assistant_message_id': assistant_msg_id
                })
                
                yield format_sse({'done': True})
                return
            
                                                                                 
            if is_conversation_context_question(request.question):
                print(f"\n [CONVERSATION CONTEXT] Detected conversation context question")
                
                                                                             
                past_conversations_summary = ""
                if effective_user_id:
                    try:
                        print(f"    Retrieving past conversations for user {effective_user_id[:8]}...")
                        
                                                      
                        user_sessions = await chat_service.get_user_sessions(
                            user_id=effective_user_id,
                            include_archived=False,
                            page=1,
                            page_size=5
                        )
                        
                        if user_sessions and user_sessions.sessions:
                            print(f"    Found {len(user_sessions.sessions)} recent conversations")
                            
                                                                 
                            conversation_summaries = []
                            for session in user_sessions.sessions[:3]:                             
                                                                                  
                                session_with_messages = await chat_service.get_session_with_messages(
                                    session_id=session.id,
                                    message_limit=4                                            
                                )
                                
                                if session_with_messages and session_with_messages.messages:
                                    messages = session_with_messages.messages
                                                                 
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
                            print(f"   ℹ No past conversations found for user")
                            
                    except Exception as e:
                        print(f"    Error retrieving past conversations: {e}")
                        logger.error(f"Error retrieving past conversations: {e}")
                
                                                                                
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
                
                                                    
                yield format_sse({'content': context_response})
                
                                                 
                yield format_sse({
                    'type': 'metadata',
                    'language': language,
                    'session_id': session_id,
                    'user_message_id': user_msg_id,
                    'assistant_message_id': assistant_msg_id
                })
                
                yield format_sse({'done': True})
                return
            
                                     
            if not is_legal_question(request.question):
                casual_response = generate_ai_response(request.question, language, 'casual')
                
                                                                                            
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
                            answer=casual_response,
                            language=language,
                            metadata={"type": "casual", "streaming": True}
                        )
                    except Exception as e:
                        logger.error(f"Failed to save casual message to history: {e}")
                
                               
                yield format_sse({'content': casual_response})
                
                                                                 
                yield format_sse({
                    'type': 'metadata',
                    'language': language,
                    'session_id': session_id,
                    'user_message_id': user_msg_id,
                    'assistant_message_id': assistant_msg_id
                })
                
                      
                yield format_sse({'done': True})
                return
            
                                 
            search_query = request.question
            informal_patterns = ['tangina', 'puta', 'gago', 'walang dahilan', 'nambabae', 'nanlalaki']
            if any(pattern in request.question.lower() for pattern in informal_patterns):
                search_query = normalize_emotional_query(request.question, language)
            
                                          
            from api.chatbot_user import (
                qdrant_client, COLLECTION_NAME, 
                EMBEDDING_MODEL, MIN_CONFIDENCE_SCORE
            )
            
            context, sources, rag_metadata = retrieve_relevant_context_with_web_search(
                question=search_query,
                qdrant_client=qdrant_client,
                openai_client=openai_client,
                collection_name=COLLECTION_NAME,
                embedding_model=EMBEDDING_MODEL,
                top_k=TOP_K_RESULTS,
                min_confidence_score=MIN_CONFIDENCE_SCORE,
                enable_web_search=True
            )
            
                              
            if rag_metadata.get("web_search_triggered"):
                logger.info(f" Web search triggered (user streaming): {rag_metadata['search_strategy']}")
            
            if not sources:
                no_context = "I apologize, but I don't have enough information in my database." if language == "english" else "Paumanhin po, pero wala akong sapat na impormasyon."
                yield format_sse({'content': no_context, 'done': True})
                return
            
                                            
            source_citations = [{
                'source': src['source'],
                'law': src['law'],
                'article_number': src['article_number'],
                'article_title': src.get('article_title', ''),
                'source_url': src.get('source_url', ''),
                'relevance_score': src.get('relevance_score', 0.0)
            } for src in sources]
            yield format_sse({'type': 'sources', 'sources': source_citations})
            
                            
            system_prompt = ENGLISH_SYSTEM_PROMPT if language == "english" else TAGALOG_SYSTEM_PROMPT
            messages = [{"role": "system", "content": system_prompt}]
            for msg in request.conversation_history[-6:]:
                messages.append(msg)
            
            user_message = f"Legal Context:\n{context}\n\nUser Question: {request.question}\n\nProvide an informational response."
            messages.append({"role": "user", "content": user_message})
            
                                                                    
            full_answer = ""
            token_buffer = ""                              
            token_count = 0
            last_send_time = time.time()
            
            stream = openai_client.chat.completions.create(
                model=CHAT_MODEL,
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=0.5,
                stream=True,                     
                timeout=STREAMING_TIMEOUT_SECONDS
            )
            
                                                                   
                                                                                         
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_answer += content
                    token_buffer += content
                    token_count += 1
                    
                    current_time = time.time()
                    time_since_last_send_ms = (current_time - last_send_time) * 1000
                    
                                                                                         
                    should_send_batch = (
                        token_count >= STREAMING_TOKEN_BATCH_SIZE or 
                        time_since_last_send_ms >= STREAMING_MAX_INTERVAL_MS
                    )
                    
                    if should_send_batch and token_buffer:
                        yield format_sse({'content': token_buffer})
                        token_buffer = ""
                        token_count = 0
                        last_send_time = current_time
            
                                                 
            if token_buffer:
                yield format_sse({'content': token_buffer})
            
                                                                        
            legal_disclaimer = get_legal_disclaimer(language, request.question, full_answer)
            if legal_disclaimer:
                yield format_sse({'type': 'disclaimer', 'disclaimer': legal_disclaimer})
            
                                                                           
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
                        answer=full_answer,
                        language=language,
                        metadata={"sources": source_citations, "streaming": True}
                    )
                except Exception as e:
                    print(f"Failed to save: {e}")
            
                                                                                                
            metadata_response = {
                'type': 'metadata',
                'language': language,
                'session_id': session_id,
                'user_message_id': user_msg_id,
                'assistant_message_id': assistant_msg_id
            }
            
                                                                 
            if guest_session_token:
                metadata_response['guest_session_token'] = guest_session_token
            
            yield format_sse(metadata_response)
            
                  
            yield format_sse({'done': True})
            
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
