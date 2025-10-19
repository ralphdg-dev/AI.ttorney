"""
Enhanced Legal Chatbot API for Lawyers
Detailed + Contextual Answers with LawPhil Links (No Supreme Court Cases)
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from qdrant_client import QdrantClient
from openai import OpenAI
import os
import logging
import time
from datetime import datetime
from dotenv import load_dotenv
import sys
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Setup logging for security events (must be before imports that use logger)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add parent directory to path for config imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import unified guardrails configuration
try:
    from config.guardrails_config import get_guardrails_instance, is_guardrails_enabled, get_guardrails_config
    GUARDRAILS_AVAILABLE = True
    GUARDRAILS_CONFIG = get_guardrails_config()
except ImportError:
    logger.warning("⚠️  Guardrails AI not available - running without security validation")
    GUARDRAILS_AVAILABLE = False
    GUARDRAILS_CONFIG = {}

# Import chat history service
from services.chat_history_service import ChatHistoryService, get_chat_history_service

# Import authentication (optional for chatbot)
from auth.service import AuthService

# --- Load configuration ---
load_dotenv()

# Optional authentication helper
security = HTTPBearer(auto_error=False)

async def get_optional_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    """Get current user if authenticated, otherwise return None"""
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        user_data = await AuthService.get_user(token)
        return user_data
    except Exception as e:
        logger.warning(f"⚠️  Optional auth failed: {e}")
        return None

COLLECTION_NAME = "legal_knowledge"
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"
TOP_K_RESULTS = 8

# --- Initialize clients ---
qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

# Initialize OpenAI client with timeout settings (industry standard)
try:
    openai_client = OpenAI(
        api_key=OPENAI_API_KEY,
        timeout=120.0,  # Total timeout in seconds
        max_retries=2   # Automatic retry for transient failures
    )
    logger.info("✅ OpenAI client initialized for lawyer chatbot")
except Exception as e:
    logger.error(f"Failed to initialize OpenAI client: {e}")
    raise RuntimeError(f"OpenAI initialization failed: {e}")

# Initialize Guardrails (if available) - Unified configuration
if GUARDRAILS_AVAILABLE and is_guardrails_enabled():
    try:
        guardrails_instance = get_guardrails_instance(user_type="lawyer")
        logger.info("✅ Guardrails AI enabled for lawyer chatbot")
    except Exception as e:
        logger.warning(f"⚠️  Failed to initialize Guardrails: {e}")
        guardrails_instance = None
else:
    guardrails_instance = None
    logger.info("ℹ️  Guardrails AI disabled for lawyer chatbot")

router = APIRouter(prefix="/api/chatbot/lawyer", tags=["Legal Chatbot - Lawyer"])

# --- Core LawPhil References ---
LAWS = {
    "Civil Code": "https://lawphil.net/statutes/repacts/ra1949/ra_386_1949.html",
    "Revised Penal Code": "https://lawphil.net/statutes/acts/act1930/act_3815_1930b.html",
    "Rules of Court": "https://lawphil.net/courts/rules/rc_1-71_civil.html",
    "Labor Code": "https://lawphil.net/statutes/presdecs/pd1974/pd_442_1974.html",
    "Corporation Code": "https://lawphil.net/statutes/repacts/ra2019/ra_11232_2019.html",
    "Family Code": "https://lawphil.net/executive/execord/eo1987/eo_209_1987.html"
}

# --- Models ---
class LawyerChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000, description="Lawyer's legal question")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default=[], max_items=10, description="Previous conversation (max 10 messages)")
    max_tokens: Optional[int] = Field(default=2000, ge=500, le=3000, description="Max response tokens")
    include_cross_references: Optional[bool] = Field(default=True, description="Include cross-references")
    user_id: Optional[str] = Field(default=None, description="User ID for logging")
    session_id: Optional[str] = Field(default=None, description="Chat session ID for history tracking")


class SourceCitation(BaseModel):
    source: str
    law: str
    article_number: str
    article_title: Optional[str] = None
    text_preview: str
    relevance_score: float
    source_url: Optional[str] = Field(default=None, alias="lawphil_link")  # Use source_url to match frontend


class SecurityReport(BaseModel):
    security_score: float
    security_level: str
    issues_detected: int
    issues: List[str]
    recommendations: List[str]
    timestamp: str
    guardrails_enabled: bool


class LawyerChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    confidence: str
    language: str
    legal_analysis: Optional[str] = None
    related_provisions: Optional[List[str]] = None
    security_report: Optional[SecurityReport] = None
    session_id: Optional[str] = Field(default=None, description="Chat session ID for tracking conversation")
    message_id: Optional[str] = Field(default=None, description="Message ID for the assistant's response")
    user_message_id: Optional[str] = Field(default=None, description="Message ID for the user's question")


# --- Helper Functions ---
def detect_language(text: str) -> str:
    tagalog_keywords = ['ano', 'paano', 'saan', 'kailan', 'bakit', 'sino', 'mga', 'ng', 'sa', 'ay', 'ko', 'mo', 'niya', 'natin', 'nila', 'ba', 'po', 'opo', 'hindi', 'oo']
    text_lower = text.lower()
    tagalog_count = sum(1 for keyword in tagalog_keywords if keyword in text_lower.split())
    if tagalog_count >= 2:
        return "tagalog"
    elif tagalog_count == 1:
        return "mixed"
    return "english"


def is_greeting_or_casual(text: str) -> bool:
    greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
                 'kumusta', 'kamusta', 'musta', 'magandang umaga', 'magandang hapon',
                 'magandang gabi', 'how are you', 'kamusta ka', 'salamat', 'thanks']
    text_lower = text.lower().strip()
    return any(g in text_lower for g in greetings) or len(text_lower.split()) <= 3


def get_embedding(text: str) -> List[float]:
    resp = openai_client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    return resp.data[0].embedding


def basic_input_validation(question: str) -> Dict[str, any]:
    """
    Basic input validation without external validators
    Performs simple checks for security and appropriateness
    """
    issues = []
    warnings = []
    
    # Check for obvious prompt injection attempts
    injection_patterns = [
        "ignore previous instructions",
        "ignore all previous",
        "system:",
        "assistant:",
        "you are now",
        "pretend to be",
        "act as if",
        "forget everything"
    ]
    
    question_lower = question.lower()
    for pattern in injection_patterns:
        if pattern in question_lower:
            issues.append(f"Potential prompt injection detected: {pattern}")
    
    # Check for inappropriate content
    inappropriate_terms = [
        "hack", "exploit", "bypass", "illegal", "unethical",
        "bribe", "corrupt", "fraud", "scam", "cheat", "lie",
        "hide assets", "tax evasion", "money laundering"
    ]
    
    for term in inappropriate_terms:
        if term in question_lower:
            if term in ["bribe", "corrupt", "fraud", "illegal", "unethical"]:
                issues.append(f"Inappropriate request detected: {term}")
            else:
                warnings.append(f"Potentially inappropriate content: {term}")
    
    # Check length
    if len(question) > 2000:
        issues.append("Question too long (max 2000 characters)")
    
    if len(question.strip()) < 5:
        issues.append("Question too short")
    
    is_valid = len(issues) == 0
    
    return {
        "is_valid": is_valid,
        "cleaned_input": question if is_valid else None,
        "validation_passed": is_valid,
        "issues": issues,
        "warnings": warnings,
        "security_score": 0.8 if is_valid else 0.3
    }

def validate_input_security(question: str) -> Dict[str, any]:
    """
    Validate user input using available security system
    Falls back to basic validation if Guardrails unavailable
    """
    # Try Guardrails first if available (use already initialized instance)
    if guardrails_instance:
        try:
            validation_result = guardrails_instance.validate_input(question)
            
            # Log security events
            logger.info(f"Guardrails input validation: {validation_result['is_valid']} - {question[:50]}...")
            if not validation_result["is_valid"]:
                logger.warning(f"Guardrails security issue: {validation_result.get('error', 'Unknown')}")
            
            return validation_result
        except Exception as e:
            logger.error(f"Guardrails validation error: {e}")
            # Fall through to basic validation
    
    # Use basic validation as fallback
    basic_result = basic_input_validation(question)
    
    # Log basic validation events
    logger.info(f"Basic input validation: {basic_result['is_valid']} - {question[:50]}...")
    if not basic_result["is_valid"]:
        logger.warning(f"Basic security issues: {basic_result.get('issues', [])}")
    
    return basic_result


def basic_output_validation(response: str, context: str = "") -> Dict[str, any]:
    """
    Basic output validation without external validators
    Performs simple checks for response quality and safety
    """
    issues = []
    warnings = []
    
    # Check for obvious hallucinations or made-up content
    hallucination_indicators = [
        "article 999",  # Non-existent article numbers
        "section 9999",
        "republic act 99999",
        "presidential decree 9999",
        "supreme court case xyz-2024"  # Obviously fake case citations
    ]
    
    response_lower = response.lower()
    for indicator in hallucination_indicators:
        if indicator in response_lower:
            issues.append(f"Potential hallucination detected: {indicator}")
    
    # Check for inappropriate disclaimers or responses
    inappropriate_responses = [
        "i am not a lawyer",
        "this is not legal advice",
        "consult a real lawyer",
        "i cannot provide legal advice"
    ]
    
    for inappropriate in inappropriate_responses:
        if inappropriate in response_lower:
            warnings.append(f"Inappropriate disclaimer: {inappropriate}")
    
    # Check response length and quality
    if len(response.strip()) < 50:
        issues.append("Response too short")
    
    if len(response) > 5000:
        warnings.append("Response very long")
    
    # Check for proper legal structure
    has_legal_structure = any(term in response_lower for term in [
        "article", "section", "code", "law", "provision", "statute"
    ])
    
    if not has_legal_structure and len(response) > 100:
        warnings.append("Response lacks legal structure")
    
    is_valid = len(issues) == 0
    confidence_score = 0.9 if is_valid and len(warnings) == 0 else 0.7 if is_valid else 0.4
    
    return {
        "is_valid": is_valid,
        "cleaned_output": response if is_valid else None,
        "validation_passed": is_valid,
        "confidence_score": confidence_score,
        "issues": issues,
        "warnings": warnings
    }

def validate_output_security(response: str, context: str = "") -> Dict[str, any]:
    """
    Validate AI output using available security system
    Falls back to basic validation if Guardrails unavailable
    """
    # Try Guardrails first if available (use already initialized instance)
    if guardrails_instance:
        try:
            validation_result = guardrails_instance.validate_output(response, context)
            
            # Log security events
            logger.info(f"Guardrails output validation: {validation_result['is_valid']}")
            if not validation_result["is_valid"]:
                logger.warning(f"Guardrails output issue: {validation_result.get('error', 'Unknown')}")
            
            return validation_result
        except Exception as e:
            logger.error(f"Guardrails output validation error: {e}")
            # Fall through to basic validation
    
    # Use basic validation as fallback
    basic_result = basic_output_validation(response, context)
    
    # Log basic validation events
    logger.info(f"Basic output validation: {basic_result['is_valid']}")
    if not basic_result["is_valid"]:
        logger.warning(f"Basic output issues: {basic_result.get('issues', [])}")
    
    return basic_result


def create_security_report(input_validation: Dict, output_validation: Dict) -> SecurityReport:
    """
    Create comprehensive security report
    Uses Guardrails if available, otherwise creates basic report
    """
    # Try Guardrails report first if available (use already initialized instance)
    if guardrails_instance:
        try:
            report_data = guardrails_instance.get_security_report(input_validation, output_validation)
            report_data["timestamp"] = datetime.now().isoformat()
            report_data["guardrails_enabled"] = True
            return SecurityReport(**report_data)
        except Exception as e:
            logger.error(f"Guardrails security report error: {e}")
            # Fall through to basic report
    
    # Create basic security report
    security_score = 1.0
    issues = []
    recommendations = []
    
    # Analyze input validation
    if not input_validation.get("is_valid", True):
        security_score -= 0.3
        input_issues = input_validation.get("issues", [])
        issues.extend(input_issues)
        if input_issues:
            recommendations.append("Review user input for security issues")
    
    # Analyze output validation
    if not output_validation.get("is_valid", True):
        security_score -= 0.4
        output_issues = output_validation.get("issues", [])
        issues.extend(output_issues)
        if output_issues:
            recommendations.append("Review AI response for accuracy and safety")
    
    # Add warnings as lower-priority issues
    input_warnings = input_validation.get("warnings", [])
    output_warnings = output_validation.get("warnings", [])
    if input_warnings or output_warnings:
        security_score -= 0.1
        issues.extend([f"Warning: {w}" for w in input_warnings + output_warnings])
    
    # Calculate security level
    if security_score >= 0.9:
        security_level = "HIGH"
    elif security_score >= 0.7:
        security_level = "MEDIUM"
    else:
        security_level = "LOW"
    
    return SecurityReport(
        security_score=max(0.0, security_score),
        security_level=security_level,
        issues_detected=len(issues),
        issues=issues,
        recommendations=recommendations,
        timestamp=datetime.now().isoformat(),
        guardrails_enabled=GUARDRAILS_AVAILABLE and is_guardrails_enabled()
    )


def retrieve_relevant_context(question: str, top_k: int = TOP_K_RESULTS):
    """Pulls most relevant legal provisions from Qdrant."""
    embedding = get_embedding(question)
    results = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=embedding,
        limit=top_k,
        score_threshold=0.6
    )
    context_parts, sources = [], []
    for i, res in enumerate(results, 1):
        p = res.payload
        law = p.get('law', 'Unknown Law')
        link = next((LAWS[k] for k in LAWS if k.lower() in law.lower()), None)
        text = p.get('text', '')
        article = p.get('article_number', 'N/A')
        context_parts.append(f"[{law} - Article {article}]\n{text}")
        sources.append({
            "source": p.get("source", ""),
            "law": law,
            "article_number": article,
            "article_title": p.get("article_title", p.get("article_heading", "")),
            "text_preview": text[:300] + "..." if len(text) > 300 else text,
            "relevance_score": res.score,
            "lawphil_link": link
        })
    return "\n\n".join(context_parts), sources


def generate_lawyer_answer(
    question: str, context: str, history: List[Dict[str, str]], language: str,
    include_cross_references: bool, max_tokens: int = 2000
):
    """
    Generate lawyer-level, highly formal legalese answers contextualized to Philippine statutory law.
    The tone must emulate that of a legal memorandum, opinion, or pleading, avoiding layman's terms.
    """

    system_prompt = f"""
You are Ai.ttorney — an advanced legal reasoning system emulating a Philippine counsel’s written opinion.
Your diction and syntax must reflect **Philippine legalese** — characterized by long, precise, statute-based exposition.

🧾 Style Rules:
- Use *legal parlance* and formal syntax. Avoid plain English.
- Employ expressions like “pursuant to,” “in consonance with,” “by operation of law,” “as contemplated under,” “the governing provision,” “invoking Article ___ of the Civil Code,” etc.
- Write in the manner of a legal memorandum or commentary, not a summary for laypersons.
- Cite only codified law (no jurisprudence or Supreme Court cases).
- Where appropriate, include Latin maxims (e.g., *ubi jus ibi remedium*, *expressio unius est exclusio alterius*).
- Each reference must link to the corresponding LawPhil source (in blue, underlined, clickable).
- Organize your answer as follows:

---
**I. Preliminary Statement**

A brief framing of the legal question.

**II. Legal Basis**

Enumerate applicable statutory provisions with links:
- Civil Code → {LAWS['Civil Code']}
- Revised Penal Code → {LAWS['Revised Penal Code']}
- Rules of Court → {LAWS['Rules of Court']}
- Labor Code → {LAWS['Labor Code']}
- Corporation Code → {LAWS['Corporation Code']}
- Family Code → {LAWS['Family Code']}

**III. Discussion**

Perform statutory interpretation — explain how the cited Articles govern the query. Use legalese, formal syntax, and analytic tone.

**IV. Application**

Apply the interpreted rule to the factual context implied by the question. Use expressions like “Applying the foregoing provisions…” or “Corollarily, it follows that…”

**V. Conclusion**

Summarize in one formal, definitive paragraph, e.g., “Hence, under prevailing statutory norms, it is evident that…”

---

Do *not* simplify or paraphrase for public comprehension.
Your audience comprises lawyers, judges, and legal academics.

Answer exclusively based on codified law and standard legal doctrine. Do not cite case law, administrative issuances, or unofficial commentary.
"""

    lang_note = "If question is in Tagalog, respond in formal, legal Tagalog (court-style), otherwise respond in English legalese."

    user_msg = f"""
Question: {question}

Relevant Legal Context (from retrieved statutory database):
{context}

{lang_note}
Ensure your answer follows the prescribed structure and tone.
"""

    messages = [{"role": "system", "content": system_prompt}]
    messages += history[-6:]
    messages.append({"role": "user", "content": user_msg})

    response = openai_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=max_tokens
    )

    answer = response.choices[0].message.content.strip()
    confidence = "high" if response.choices[0].finish_reason == "stop" else "medium"
    related = [line for line in answer.splitlines() if "Article" in line or "Artikulo" in line][:5]

    return answer, confidence, "Formal statutory analysis rendered in legalese (no jurisprudence).", related


# --- Chat History Helper (Same as User Chatbot) ---
async def save_chat_interaction(
    chat_service: ChatHistoryService,
    effective_user_id: Optional[str],
    session_id: Optional[str],
    question: str,
    answer: str,
    language: str,
    metadata: Optional[Dict] = None
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Helper function to save chat interaction (user message + assistant response)
    Returns: (session_id, user_message_id, assistant_message_id)
    
    Industry-standard approach (like ChatGPT/Claude):
    - Session is created ONLY when first message is sent
    - If session_id is provided but doesn't exist, create new one
    - Backend is source of truth for session existence
    """
    from uuid import UUID
    
    if not effective_user_id:
        logger.info("ℹ️  No user_id available - skipping chat history save")
        return (None, None, None)
    
    try:
        logger.info(f"💾 Saving lawyer chat history for user {effective_user_id}")
        
        # Verify session exists if session_id is provided
        session_exists = False
        if session_id:
            try:
                existing_session = await chat_service.get_session(UUID(session_id))
                session_exists = existing_session is not None
                if session_exists:
                    logger.info(f"   ✅ Using existing session: {session_id}")
                else:
                    logger.info(f"   ⚠️  Session {session_id} not found, creating new one")
                    session_id = None  # Force creation of new session
            except Exception as e:
                logger.warning(f"   ⚠️  Error checking session: {e}, creating new one")
                session_id = None
        
        # Create session if needed (first message or invalid session_id)
        if not session_id:
            title = question[:50] if len(question) > 50 else question
            logger.info(f"   Creating new session: {title}")
            session = await chat_service.create_session(
                user_id=UUID(effective_user_id),
                title=title,
                language=language
            )
            session_id = str(session.id)
            logger.info(f"   ✅ Session created: {session_id}")
        
        # Save user message
        logger.info(f"   Saving user message...")
        user_msg = await chat_service.add_message(
            session_id=UUID(session_id),
            user_id=UUID(effective_user_id),
            role="user",
            content=question,
            metadata={}
        )
        user_message_id = str(user_msg.id)
        logger.info(f"   ✅ User message saved: {user_message_id}")
        
        # Save assistant message
        logger.info(f"   Saving assistant message...")
        assistant_msg = await chat_service.add_message(
            session_id=UUID(session_id),
            user_id=UUID(effective_user_id),
            role="assistant",
            content=answer,
            metadata=metadata or {}
        )
        assistant_message_id = str(assistant_msg.id)
        logger.info(f"   ✅ Assistant message saved: {assistant_message_id}")
        logger.info(f"💾 Lawyer chat history saved successfully!")
        
        return (session_id, user_message_id, assistant_message_id)
        
    except Exception as e:
        import traceback
        logger.error(f"⚠️  Failed to save lawyer chat history: {e}")
        logger.error(f"   Traceback: {traceback.format_exc()}")
        return (session_id, None, None)


# --- Main API Endpoint ---
@router.post("/ask", response_model=LawyerChatResponse)
async def ask_legal_question_lawyer(
    request: LawyerChatRequest,
    chat_service: ChatHistoryService = Depends(get_chat_history_service),
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    start_time = time.time()
    input_validation = None
    output_validation = None
    
    # Get authenticated user ID if available
    authenticated_user_id = None
    if current_user and "user" in current_user:
        authenticated_user_id = current_user["user"]["id"]
    
    # Use authenticated user_id, fallback to request.user_id for backward compatibility
    effective_user_id = authenticated_user_id or request.user_id
    
    # Production logging with request ID for tracing
    logger.info(f"Lawyer request received - user_id={effective_user_id}, session_id={request.session_id}, question_length={len(request.question)}")
    
    try:
        if not openai_client:
            raise HTTPException(status_code=503, detail="OpenAI unavailable")
        if not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")

        # Step 1: Input Security Validation
        logger.info(f"Processing lawyer chatbot request: {request.question[:100]}...")
        input_validation = validate_input_security(request.question)
        
        # Check if input validation failed in strict mode
        if GUARDRAILS_CONFIG.get("strict_mode", True) and not input_validation.get("is_valid", True):
            logger.error(f"Input validation failed in strict mode: {input_validation.get('error', 'Unknown')}")
            raise HTTPException(
                status_code=400, 
                detail=f"Security validation failed: {input_validation.get('error', 'Invalid input detected')}"
            )
        
        # Use cleaned input if available
        cleaned_question = input_validation.get("cleaned_input", request.question)
        if cleaned_question is None:
            cleaned_question = request.question
            
        language = detect_language(cleaned_question)
        
        # Handle greetings with minimal processing
        if is_greeting_or_casual(cleaned_question):
            ans, conf, _, _ = generate_lawyer_answer(cleaned_question, "", request.conversation_history, language, False, 500)
            
            # Validate greeting response
            output_validation = validate_output_security(ans, "")
            if GUARDRAILS_CONFIG.get("strict_mode", True) and not output_validation.get("is_valid", True):
                ans = "I apologize, but I cannot provide a response at this time due to security constraints. Please rephrase your question."
                conf = "low"
            else:
                ans = output_validation.get("cleaned_output", ans)
            
            # Create security report
            security_report = create_security_report(input_validation, output_validation or {})
            
            # Save greeting interaction to chat history (using helper function)
            session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                chat_service=chat_service,
                effective_user_id=effective_user_id,
                session_id=request.session_id,
                question=cleaned_question,
                answer=ans,
                language=language,
                metadata={"type": "greeting", "user_type": "lawyer"}
            )
            
            return LawyerChatResponse(
                answer=ans, 
                sources=[], 
                confidence=conf, 
                language=language,
                security_report=security_report,
                session_id=session_id,
                message_id=assistant_msg_id,
                user_message_id=user_msg_id
            )

        # Step 2: Retrieve Legal Context
        context, sources = retrieve_relevant_context(cleaned_question)
        
        # Step 3: Generate AI Response
        ans, conf, analysis, related = generate_lawyer_answer(
            cleaned_question, context, request.conversation_history,
            language, request.include_cross_references, request.max_tokens
        )

        # Step 4: Output Security Validation
        output_validation = validate_output_security(ans, context)
        
        # Handle output validation failure in strict mode
        if GUARDRAILS_CONFIG.get("strict_mode", True) and not output_validation.get("is_valid", True):
            logger.error(f"Output validation failed: {output_validation.get('error', 'Unknown')}")
            
            # Retry with more conservative approach if retries are enabled
            max_retries = GUARDRAILS_CONFIG.get("max_retries", 2)
            for retry in range(max_retries):
                logger.info(f"Retrying response generation (attempt {retry + 1}/{max_retries})")
                
                # Generate more conservative response
                conservative_ans, conservative_conf, conservative_analysis, conservative_related = generate_lawyer_answer(
                    cleaned_question, context, request.conversation_history,
                    language, False, min(request.max_tokens, 1000)  # Reduce token limit
                )
                
                # Validate conservative response
                retry_validation = validate_output_security(conservative_ans, context)
                if retry_validation.get("is_valid", False):
                    ans = retry_validation.get("cleaned_output", conservative_ans)
                    conf = conservative_conf
                    analysis = conservative_analysis
                    related = conservative_related
                    output_validation = retry_validation
                    break
            else:
                # All retries failed, return safe fallback
                ans = "I apologize, but I cannot provide a complete response to your question at this time due to security constraints. Please rephrase your question or contact support for assistance."
                conf = "low"
                analysis = "Response filtered for security reasons"
                related = []
        else:
            # Use cleaned output if available
            ans = output_validation.get("cleaned_output", ans)

        # Step 5: Create Source Citations
        citations = [
            SourceCitation(
                source=s["source"],
                law=s["law"],
                article_number=s["article_number"],
                article_title=s["article_title"],
                text_preview=s["text_preview"],
                relevance_score=s["relevance_score"],
                source_url=s.get("lawphil_link") or s.get("source_url")  # Support both field names
            )
            for s in sources
        ]

        # Step 6: Generate Security Report
        security_report = create_security_report(input_validation, output_validation)
        
        # Step 7: Save chat interaction to history (using helper function - same as user chatbot)
        session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
            chat_service=chat_service,
            effective_user_id=effective_user_id,
            session_id=request.session_id,
            question=cleaned_question,
            answer=ans,
            language=language,
            metadata={
                "user_type": "lawyer",
                "legal_analysis": analysis,
                "related_provisions": related,
                "security_level": security_report.security_level,
                "sources": [s.dict() for s in citations],
                "confidence": conf
            }
        )
        
        # Log processing time and security metrics
        processing_time = time.time() - start_time
        logger.info(f"Request processed in {processing_time:.2f}s - Security Level: {security_report.security_level}")

        return LawyerChatResponse(
            answer=ans,
            sources=citations,
            confidence=conf,
            language=language,
            legal_analysis=analysis,
            related_provisions=related,
            security_report=security_report,
            session_id=session_id,
            message_id=assistant_msg_id,
            user_message_id=user_msg_id
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in lawyer chatbot: {e}")
        
        # Create error security report
        error_security_report = SecurityReport(
            security_score=0.0,
            security_level="ERROR",
            issues_detected=1,
            issues=[f"System error: {str(e)}"],
            recommendations=["Contact system administrator"],
            timestamp=datetime.now().isoformat(),
            guardrails_enabled=GUARDRAILS_AVAILABLE and is_guardrails_enabled()
        )
        
        print("❌ Error:", e)
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


# --- Health Check ---
@router.get("/health")
async def health_check():
    try:
        info = qdrant_client.get_collection(collection_name=COLLECTION_NAME)
        
        # Check guardrails status
        guardrails_status = {
            "available": GUARDRAILS_AVAILABLE,
            "enabled": is_guardrails_enabled() if GUARDRAILS_AVAILABLE else False,
            "strict_mode": GUARDRAILS_CONFIG.get("strict_mode", False) if GUARDRAILS_AVAILABLE else False,
            "security_features": [
                "Hallucination Detection",
                "Prompt Injection Protection", 
                "PII Detection & Filtering",
                "Toxic Language Detection",
                "Bias Detection",
                "Sensitive Topics Filtering",
                "Competitor Check",
                "LlamaGuard Content Safety",
                "Grounded AI Validation"
            ] if GUARDRAILS_AVAILABLE else []
        }
        
        return {
            "status": "healthy",
            "service": "Enhanced Legal Chatbot (Codified Philippine Law) with Guardrails AI",
            "model": CHAT_MODEL,
            "documents": info.points_count,
            "features": [
                "LawPhil Links",
                "No Supreme Court Cases", 
                "Formal Legal Analysis",
                "English & Tagalog Support",
                "Structured Answer Format",
                "Advanced Security Validation",
                "Real-time Threat Detection",
                "Content Safety Filtering"
            ],
            "security": guardrails_status,
            "guardrails_config": {
                "input_validation": GUARDRAILS_CONFIG.get("enable_input_validation", True),
                "output_validation": GUARDRAILS_CONFIG.get("enable_output_validation", True), 
                "security_reporting": GUARDRAILS_CONFIG.get("enable_security_reporting", True),
                "max_retries": GUARDRAILS_CONFIG.get("max_retries", 2),
                "timeout_seconds": GUARDRAILS_CONFIG.get("timeout_seconds", 30)
            } if GUARDRAILS_AVAILABLE else {}
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
