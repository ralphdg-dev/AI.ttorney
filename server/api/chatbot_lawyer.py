#chatbot_lawyer.py

"""
Enhanced Legal Chatbot API for Lawyers
Combines best practices from user chatbot with lawyer-specific features

NEW FEATURES ADDED FROM USER CHATBOT:
1. ✅ Comprehensive input filtering (toxic content, prohibited patterns)
2. ✅ Chat history service integration
3. ✅ Session management
4. ✅ Optional authentication support
5. ✅ Emotional query normalization
6. ✅ Out-of-scope topic detection
7. ✅ Personal advice question detection
8. ✅ Complex query detection with fallback suggestions
9. ✅ Response quality validation
10. ✅ Production-grade error handling and logging
11. ✅ Guardrails AI integration (optional)
12. ✅ Enhanced language detection (Taglish support)
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from qdrant_client import QdrantClient
from openai import OpenAI
import os
import re
import logging
import time
import sys
from datetime import datetime
from uuid import UUID
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add parent directory to path for config imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Guardrails (optional)
try:
    from config.guardrails_config import get_guardrails_instance, is_guardrails_enabled
    GUARDRAILS_AVAILABLE = True
except ImportError:
    print("⚠️  Guardrails AI not available - running without security validation")
    GUARDRAILS_AVAILABLE = False

# Import comprehensive system prompts (keep existing lawyer prompt)
from config.system_prompts import ENGLISH_SYSTEM_PROMPT, TAGALOG_SYSTEM_PROMPT

# Import chat history service
from services.chat_history_service import ChatHistoryService, get_chat_history_service

# Import authentication
from auth.service import AuthService

# Load environment variables
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
        logger.warning(f"Optional auth failed: {e}")
        return None

# Configuration
COLLECTION_NAME = "legal_knowledge"
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Validate required environment variables
if not QDRANT_URL or not QDRANT_API_KEY:
    logger.error("QDRANT_URL and QDRANT_API_KEY must be set")
    raise ValueError("Missing required Qdrant configuration")
if not OPENAI_API_KEY:
    logger.error("OPENAI_API_KEY must be set")
    raise ValueError("Missing required OpenAI API key")

EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"
TOP_K_RESULTS = 8  # More results for lawyers
MIN_CONFIDENCE_SCORE = 0.55  # Higher threshold for lawyers

# ============================================================================
# INPUT FILTERING - ENHANCED FROM USER CHATBOT
# ============================================================================

# Prohibited input patterns (misuse prevention)
PROHIBITED_PATTERNS = [
    r'\bhow to (commit|get away with|hide|cover up)\b',
    r'\b(kill|murder|harm|hurt|assault)\b.*\bhow\b',
    r'\b(illegal|unlawful)\b.*\b(advice|help|guide)\b',
    r'\b(evade|avoid)\b.*\b(tax|law|arrest)\b',
    r'\bforge\b.*\b(document|signature|id)\b',
]

# Toxic/profane words (Filipino and English)
TOXIC_WORDS = [
    'tangina', 'putangina', 'puta', 'gago', 'tarantado', 'ulol', 'tanga',
    'bobo', 'leche', 'peste', 'bwisit', 'hayop', 'hinayupak', 'kingina',
    'punyeta', 'shit', 'fuck', 'bitch', 'ass', 'damn', 'hell',
    'bastard', 'crap', 'piss', 'dick', 'cock', 'pussy', "tangina"
]

# Out-of-scope keywords
POLITICAL_KEYWORDS = [
    'vote', 'boto', 'election', 'eleksyon', 'kandidato', 'candidate',
    'politician', 'politiko', 'presidente', 'president', 'mayor',
    'campaign', 'kampanya', 'duterte', 'marcos', 'bbm', 'leni',
]

FINANCIAL_KEYWORDS = [
    'invest', 'investment', 'stock', 'crypto', 'bitcoin', 'trading',
    'forex', 'savings', 'mutual fund'
]

MEDICAL_KEYWORDS = [
    'doctor', 'doktor', 'hospital', 'medicine', 'gamot', 'disease',
    'treatment', 'surgery', 'diagnosis', 'vaccine', 'medical advice'
]

TECH_KEYWORDS = [
    'programming', 'coding', 'software', 'app development', 'website',
    'computer', 'phone', 'gadget', 'social media'
]

PERSONAL_ADVICE_PATTERNS = [
    'should i file', 'should i sue', 'should i press charges',
    'should i report', 'should i take legal action',
    'should i hire', 'should i get a lawyer', 'should i accept',
    'should i sign', 'should i settle', 'will i win', 'can i win',
    'what are my chances', 'is my case strong', 'do i have a case',
]

# ============================================================================
# CORE LawPhil REFERENCES
# ============================================================================

LAWS = {
    "Civil Code": "https://lawphil.net/statutes/repacts/ra1949/ra_386_1949.html",
    "Revised Penal Code": "https://lawphil.net/statutes/acts/act1930/act_3815_1930b.html",
    "Rules of Court": "https://lawphil.net/courts/rules/rc_1-71_civil.html",
    "Labor Code": "https://lawphil.net/statutes/presdecs/pd1974/pd_442_1974.html",
    "Corporation Code": "https://lawphil.net/statutes/repacts/ra2019/ra_11232_2019.html",
    "Family Code": "https://lawphil.net/executive/execord/eo1987/eo_209_1987.html"
}

# ============================================================================
# CLIENT INITIALIZATION
# ============================================================================

try:
    qdrant_client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
        timeout=30.0
    )
    qdrant_client.get_collections()
    logger.info("✅ Qdrant client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Qdrant client: {e}")
    raise RuntimeError(f"Qdrant initialization failed: {e}")

try:
    openai_client = OpenAI(
        api_key=OPENAI_API_KEY,
        timeout=120.0,
        max_retries=2
    )
    logger.info("✅ OpenAI client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize OpenAI client: {e}")
    raise RuntimeError(f"OpenAI initialization failed: {e}")

# Initialize Guardrails (if available)
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

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class LawyerChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000, description="Legal research question")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default=[], max_items=10)
    max_tokens: Optional[int] = Field(default=2500, ge=100, le=4000)
    include_cross_references: Optional[bool] = True
    user_id: Optional[str] = Field(default=None, description="User ID for logging")
    session_id: Optional[str] = Field(default=None, description="Chat session ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "question": "What are the elements of estafa under Article 315 of the Revised Penal Code?",
                "conversation_history": [],
                "max_tokens": 2500,
                "include_cross_references": True
            }
        }


class SourceCitation(BaseModel):
    source: str
    law: str
    article_number: str
    article_title: Optional[str] = None
    text_preview: str
    relevance_score: float
    lawphil_link: Optional[str] = None


class FallbackSuggestion(BaseModel):
    action: str
    description: str
    reason: str


class SecurityReport(BaseModel):
    security_score: float
    security_level: str
    issues_detected: int
    issues: List[str]
    recommendations: List[str]
    timestamp: str
    guardrails_enabled: bool = False


class LawyerChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation] = Field(default_factory=list)
    confidence: str
    language: str
    legal_analysis: Optional[str] = None
    related_provisions: Optional[List[str]] = None
    security_report: Optional[SecurityReport] = None
    fallback_suggestions: Optional[List[FallbackSuggestion]] = None
    session_id: Optional[str] = Field(default=None)
    message_id: Optional[str] = Field(default=None)
    user_message_id: Optional[str] = Field(default=None)


# ============================================================================
# VALIDATION FUNCTIONS - FROM USER CHATBOT
# ============================================================================

def detect_toxic_content(text: str) -> tuple[bool, Optional[str]]:
    """Check if input contains toxic/profane language"""
    text_lower = text.lower()
    
    for toxic_word in TOXIC_WORDS:
        if re.search(r'\b' + re.escape(toxic_word) + r'\b', text_lower):
            return True, "Professional discourse is expected. Please rephrase your question respectfully."
    
    return False, None


def detect_prohibited_input(text: str) -> tuple[bool, Optional[str]]:
    """Check if input contains prohibited patterns"""
    text_lower = text.lower()
    
    for pattern in PROHIBITED_PATTERNS:
        if re.search(pattern, text_lower):
            return True, "This query appears to request guidance on illegal activities. Ai.ttorney provides legal information only for lawful purposes."
    
    return False, None


def detect_language(text: str) -> str:
    """Enhanced language detection with Taglish support"""
    tagalog_keywords = [
        'ano', 'paano', 'saan', 'kailan', 'bakit', 'sino', 'mga', 'ng', 'sa', 'ay',
        'ko', 'mo', 'niya', 'natin', 'nila', 'ba', 'po', 'opo', 'hindi', 'oo',
        'dapat', 'pwede', 'kailangan', 'gusto', 'yung', 'lang', 'din', 'rin',
        'kung', 'kapag', 'kasi', 'para', 'pero', 'kaya', 'naman', 'talaga',
    ]
    
    text_lower = text.lower()
    words = text_lower.split()
    tagalog_count = sum(1 for keyword in tagalog_keywords if keyword in words)
    
    has_english = any(word in text_lower for word in ['what', 'how', 'when', 'where', 'why', 'can', 'is', 'are'])
    
    if tagalog_count >= 3:
        return "tagalog"
    elif tagalog_count >= 1 and has_english:
        return "taglish"
    elif tagalog_count == 1 or tagalog_count == 2:
        return "tagalog"
    else:
        return "english"


def is_simple_greeting(text: str) -> bool:
    """Check if query is a simple greeting"""
    greetings = [
        'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
        'kumusta', 'kamusta', 'mabuhay', 'magandang umaga', 'magandang hapon',
        'magandang gabi', 'salamat', 'thank you', 'thanks', 'paalam', 'bye'
    ]
    
    text_lower = text.lower().strip()
    
    for greeting in greetings:
        if text_lower == greeting or text_lower.startswith(greeting + '!') or text_lower.startswith(greeting + '.'):
            return True
    
    if len(text_lower) < 20:
        for greeting in greetings:
            if greeting in text_lower:
                return True
    
    return False


def is_out_of_scope_topic(text: str) -> tuple[bool, str]:
    """Check if question is about out-of-scope topics"""
    text_lower = text.lower().strip()
    
    # Check for legal indicators first
    legal_scope_indicators = [
        'law', 'legal', 'batas', 'karapatan', 'rights', 'contract', 'kasunduan',
        'case', 'kaso', 'court', 'korte', 'article', 'section', 'provision',
        'statute', 'code', 'liability', 'obligation', 'remedy', 'penalty'
    ]
    
    if any(indicator in text_lower for indicator in legal_scope_indicators):
        return False, ""
    
    # Check out-of-scope topics
    categories = [
        (POLITICAL_KEYWORDS, "political"),
        (FINANCIAL_KEYWORDS, "financial"),
        (MEDICAL_KEYWORDS, "medical"),
        (TECH_KEYWORDS, "technology"),
    ]
    
    max_matches = 0
    detected_topic = ""
    
    for keywords, topic_type in categories:
        matches = sum(1 for keyword in keywords if keyword in text_lower)
        if matches > max_matches:
            max_matches = matches
            detected_topic = topic_type
    
    if max_matches >= 2:
        logger.info(f"Out of scope detected: {detected_topic} ({max_matches} matches)")
        return True, detected_topic
    
    return False, ""


def is_personal_advice_question(text: str) -> bool:
    """Detect personal advice questions"""
    text_lower = text.lower().strip()
    return any(pattern in text_lower for pattern in PERSONAL_ADVICE_PATTERNS)


def is_complex_query(text: str) -> bool:
    """Detect complex queries requiring professional consultation"""
    text_lower = text.lower().strip()
    
    complex_indicators = [
        'and also', 'at saka', 'also', 'pati na rin',
        'my case', 'my situation', 'ang kaso ko',
        'should i', 'dapat ba ako', 'can i win',
        'best way', 'strategy', 'estratehiya',
    ]
    
    has_complexity = any(indicator in text_lower for indicator in complex_indicators)
    is_very_long = len(text) > 300
    has_multiple_questions = text.count('?') > 1
    
    return has_complexity or is_very_long or has_multiple_questions


def validate_response_quality(answer: str) -> tuple[bool, str]:
    """Validate response doesn't contain personalized advice"""
    answer_lower = answer.lower()
    
    advice_patterns = [
        r'\bin your case,? you should\b',
        r'\bi recommend you\b',
        r'\bi suggest you\b',
        r'\bi advise you\b',
        r'\byou should file\b',
        r'\byou should sue\b',
    ]
    
    for pattern in advice_patterns:
        if re.search(pattern, answer_lower):
            return False, f"Response contains personalized advice: {pattern}"
    
    return True, ""


def normalize_emotional_query(question: str, language: str) -> str:
    """Normalize emotional/informal queries for better search"""
    try:
        normalization_prompt = f"""You are a legal query normalizer for Philippine law.

Convert informal queries into clear, search-friendly legal questions with key legal terms.

Informal query: "{question}"

Provide ONLY the normalized question with legal terms.

Examples:
- "tinanggal ako sa trabaho" → "Ano ang legal remedies para sa illegal dismissal under Labor Code?"
- "ninakawan ako" → "Ano ang penalties at remedies para sa theft under Revised Penal Code?"

Include legal terms that would appear in Philippine legal codes."""
        
        response = openai_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": "Legal query normalizer. Add legal terms. Respond with ONLY normalized question."},
                {"role": "user", "content": normalization_prompt}
            ],
            max_tokens=150,
            temperature=0.2,
            timeout=10.0
        )
        
        normalized = response.choices[0].message.content.strip()
        
        if normalized and normalized != question:
            logger.info(f"Query normalized: '{question[:50]}...' → '{normalized[:50]}...'")
        
        return normalized if normalized else question
        
    except Exception as e:
        logger.error(f"Error normalizing query: {e}")
        return question


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_embedding(text: str) -> List[float]:
    """Generate embedding for question"""
    resp = openai_client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    return resp.data[0].embedding


def retrieve_relevant_context(question: str, top_k: int = TOP_K_RESULTS) -> tuple[str, List[Dict]]:
    """Retrieve relevant legal context from Qdrant with URLs"""
    question_embedding = get_embedding(question)
    
    results = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=question_embedding,
        limit=top_k,
        score_threshold=MIN_CONFIDENCE_SCORE
    )
    
    logger.info(f"Search query: '{question[:50]}...' - Found {len(results)} results")
    
    if len(results) == 0:
        logger.warning(f"No results found for query: {question[:100]}")
        return "", []
    
    if results:
        logger.info(f"Top result score: {results[0].score:.4f}")
    
    context_parts = []
    sources = []
    
    for i, result in enumerate(results, 1):
        payload = result.payload
        doc = payload.get('text', '')
        
        if not doc or len(doc.strip()) < 10:
            continue
        
        if result.score < MIN_CONFIDENCE_SCORE:
            continue
        
        law = payload.get('law', 'Unknown Law')
        link = next((LAWS[k] for k in LAWS if k.lower() in law.lower()), None)
        
        source_info = f"[Source {i}: {law} - Article {payload.get('article_number', 'N/A')}]"
        if link:
            source_info += f"\n[URL: {link}]"
        context_parts.append(f"{source_info}\n{doc}\n")
        
        sources.append({
            'source': payload.get('source', 'Unknown'),
            'law': law,
            'article_number': payload.get('article_number', 'N/A'),
            'article_title': payload.get('article_title', payload.get('article_heading', '')),
            'text_preview': doc[:300] + "..." if len(doc) > 300 else doc,
            'relevance_score': result.score,
            'lawphil_link': link
        })
    
    logger.info(f"Built context from {len(sources)} valid sources")
    
    if not sources:
        logger.warning("No valid sources after filtering")
        return "", []
    
    context_text = "\n\n".join(context_parts)
    return context_text, sources


def get_fallback_suggestions(language: str, is_complex: bool = False) -> List[FallbackSuggestion]:
    """Get fallback suggestions for complex queries"""
    if language == "tagalog" or language == "taglish":
        return [
            FallbackSuggestion(
                action="consult_specialist",
                description="Kumonsulta sa Legal Specialist",
                reason="Ang query na ito ay nangangailangan ng specialized legal expertise o case-specific analysis."
            ),
            FallbackSuggestion(
                action="review_jurisprudence",
                description="Mag-review ng Supreme Court Cases",
                reason="Kailangan ng jurisprudential analysis para sa kompletong legal opinion."
            )
        ]
    else:
        return [
            FallbackSuggestion(
                action="consult_specialist",
                description="Consult Legal Specialist",
                reason="This query requires specialized legal expertise or case-specific analysis."
            ),
            FallbackSuggestion(
                action="review_jurisprudence",
                description="Review Supreme Court Cases",
                reason="Jurisprudential analysis needed for complete legal opinion."
            )
        ]


def generate_ai_response(question: str, language: str, response_type: str, topic_type: str = None) -> str:
    """Generate AI responses for greetings and out-of-scope topics"""
    prompts = {
        'greeting': {
            'english': f"""You are Ai.ttorney, a professional legal research assistant for Philippine lawyers. 
The user said: "{question}"

This is a greeting. Respond professionally and formally:
1. Acknowledge the greeting warmly but professionally
2. Introduce yourself as their legal research assistant
3. Invite them to ask legal research questions
4. Use formal, professional tone suitable for lawyers

Keep it brief (2-3 sentences max).""",
            'tagalog': f"""Ikaw si Ai.ttorney, isang propesyonal na legal research assistant para sa Philippine lawyers.
Ang user ay nagsabi: "{question}"

Ito ay greeting. Sumagot nang propesyonal:
1. Kilalanin ang greeting nang mainit pero propesyonal
2. Ipakilala ang iyong sarili bilang legal research assistant
3. Imbitahan silang magtanong ng legal research questions
4. Gumamit ng pormal, propesyonal na tono

Panatilihing maikli (2-3 pangungusap lang)."""
        },
        'out_of_scope': {
            'english': f"""You are Ai.ttorney, a legal research assistant. The user asked: "{question}"

This is about {topic_type} topics, OUTSIDE your scope. You can ONLY help with:
- Civil Law
- Criminal Law  
- Consumer Law
- Family Law
- Labor Law

Respond professionally:
1. Politely decline
2. Explain your scope limitation
3. Suggest they consult appropriate specialists
4. Maintain formal, professional tone

Keep it brief but courteous.""",
            'tagalog': f"""Ikaw si Ai.ttorney, isang legal research assistant. Ang user ay nagtanong: "{question}"

Ito ay tungkol sa {topic_type} topics, WALA sa iyong scope. Makakatulong ka LAMANG sa:
- Civil Law
- Criminal Law
- Consumer Law
- Family Law
- Labor Law

Sumagot nang propesyonal:
1. Magalang na tumanggi
2. Ipaliwanag ang limitation
3. Mag-suggest na kumonsulta sa appropriate specialists
4. Panatilihing pormal at propesyonal

Maikli pero magalang."""
        }
    }
    
    fallbacks = {
        'greeting': "Good day, Attorney. I am Ai.ttorney, your legal research assistant for Philippine statutory law. How may I assist you with your legal research today?",
        'out_of_scope': "I can only assist with Civil, Criminal, Consumer, Family, and Labor Law. Please consult appropriate specialists for other topics."
    }
    
    try:
        prompt_lang = 'tagalog' if language in ['tagalog', 'taglish'] else 'english'
        system_prompt = prompts[response_type][prompt_lang]
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate professional {response_type} response."}
        ]
        
        response = openai_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            max_tokens=150,
            temperature=0.7,
            timeout=10.0
        )
        
        result = response.choices[0].message.content
        return result.strip() if result else fallbacks[response_type]
        
    except Exception as e:
        logger.error(f"Error generating {response_type} response: {e}")
        return fallbacks[response_type]


async def save_chat_interaction(
    chat_service: ChatHistoryService,
    effective_user_id: Optional[str],
    session_id: Optional[str],
    question: str,
    answer: str,
    language: str,
    metadata: Optional[Dict] = None
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """Save chat interaction to history"""
    if not effective_user_id:
        logger.info("No user_id available - skipping chat history save")
        return (None, None, None)
    
    try:
        logger.info(f"Saving chat history for user {effective_user_id}")
        
        # Verify session exists
        session_exists = False
        if session_id:
            try:
                existing_session = await chat_service.get_session(UUID(session_id))
                session_exists = existing_session is not None
                if session_exists:
                    logger.info(f"Using existing session: {session_id}")
                else:
                    logger.warning(f"Session {session_id} not found, creating new one")
                    session_id = None
            except Exception as e:
                logger.warning(f"Error checking session: {e}, creating new one")
                session_id = None
        
        # Create session if needed
        if not session_id:
            title = question[:50] if len(question) > 50 else question
            logger.info(f"Creating new session: {title}")
            session = await chat_service.create_session(
                user_id=UUID(effective_user_id),
                title=title,
                language=language
            )
            session_id = str(session.id)
            logger.info(f"Session created: {session_id}")
        
        # Save user message
        user_msg = await chat_service.add_message(
            session_id=UUID(session_id),
            user_id=UUID(effective_user_id),
            role="user",
            content=question,
            metadata={}
        )
        user_message_id = str(user_msg.id)
        
        # Save assistant message
        assistant_msg = await chat_service.add_message(
            session_id=UUID(session_id),
            user_id=UUID(effective_user_id),
            role="assistant",
            content=answer,
            metadata=metadata or {}
        )
        assistant_message_id = str(assistant_msg.id)
        logger.info("Chat history saved successfully")
        
        return (session_id, user_message_id, assistant_message_id)
        
    except Exception as e:
        logger.error(f"Failed to save chat history: {e}", exc_info=True)
        return (session_id, None, None)


def create_security_report(input_validation: Dict, output_validation: Dict = None) -> SecurityReport:
    """Create comprehensive security report"""
    security_score = input_validation.get("security_score", 1.0)
    issues = input_validation.get("issues", [])
    
    if output_validation:
        output_issues = output_validation.get("issues", [])
        issues.extend(output_issues)
        # Average the scores
        output_score = output_validation.get("security_score", 1.0)
        security_score = (security_score + output_score) / 2
    
    if security_score >= 0.9:
        security_level = "HIGH"
    elif security_score >= 0.7:
        security_level = "MEDIUM"
    else:
        security_level = "LOW"
    
    recommendations = []
    if issues:
        recommendations.append("Review input/output for security issues")
    if security_score < 0.7:
        recommendations.append("Exercise caution with this interaction")
    
    return SecurityReport(
        security_score=security_score,
        security_level=security_level,
        issues_detected=len(issues),
        issues=issues,
        recommendations=recommendations,
        timestamp=datetime.now().isoformat(),
        guardrails_enabled=guardrails_instance is not None
    )


# ============================================================================
# LAWYER SYSTEM PROMPT (Keep existing comprehensive prompt)
# ============================================================================

# ⬇️ ⬇️ ⬇️ EDIT START: Enhanced LAWYER_SYSTEM_PROMPT for "hard legalese" ⬇️ ⬇️ ⬇️
LAWYER_SYSTEM_PROMPT = """You are Ai.ttorney — an advanced legal reasoning system for Philippine lawyers and legal professionals.

════════════════════════════════════════════════════════════════════════════════
🎯 CORE MISSION - LAWYER-LEVEL EXPERTISE
════════════════════════════════════════════════════════════════════════════════

Your purpose is to provide COMPREHENSIVE, TECHNICALLY PRECISE legal analysis for legal professionals, emulating:
- Legal memoranda and opinions
- Court pleadings and briefs (specifically, the style of a Supreme Court Justice)
- Legal research documents
- Statutory interpretation analyses

🔍 KEY DIFFERENCES FROM PUBLIC CHATBOT:
1. TECHNICAL DEPTH: Use precise legal terminology, Latin maxims, formal statutory language
2. ANALYTICAL RIGOR: Provide in-depth statutory interpretation and legal reasoning
3. PROFESSIONAL TONE: Maintain formal, academic legal writing style (Justice-level)
4. COMPREHENSIVE CITATIONS: Include extensive cross-references and statutory links

════════════════════════════════════════════════════════════════════════════════
⚖️ JURISDICTIONAL SCOPE - PHILIPPINE CODIFIED LAW ONLY
════════════════════════════════════════════════════════════════════════════════

You are EXCLUSIVELY authorized to analyze these statutory domains:

1. CIVIL LAW: Civil Code of the Philippines (Republic Act No. 386)
2. CRIMINAL LAW: Revised Penal Code (Act No. 3815) and special penal laws
3. CONSUMER LAW: Consumer Act (R.A. 7394) and related regulations
4. FAMILY LAW: Family Code (Executive Order No. 209)
5. LABOR LAW: Labor Code (Presidential Decree No. 442) and related statutes

CRITICAL RESTRICTIONS:
- CITE ONLY codified law and statutory provisions
- NO jurisprudence or Supreme Court cases (per system design)
- NO administrative issuances unless explicitly in database
- Focus on BLACK LETTER LAW interpretation

════════════════════════════════════════════════════════════════════════════════
📚 CONTENT GROUNDING - PROVIDED CONTEXT ONLY
════════════════════════════════════════════════════════════════════════════════

🚨 ABSOLUTE REQUIREMENT: ONLY USE PROVIDED LEGAL CONTEXT

A. USING THE SCRAPED DATA:
- The "Legal Context" contains actual text from Philippine legal codes
- ONLY answer using information from this provided context
- NEVER use general knowledge or training data about Philippine law
- ALWAYS cite specific articles, sections, and provisions from context

B. CITATION REQUIREMENTS - FORMAL LEGAL STYLE:
- ALWAYS use full statutory names: "Civil Code of the Philippines, Republic Act No. 386"
- ALWAYS include article numbers: "Article 1156 of the Civil Code"
- Format: "Pursuant to Article 1156 of the Civil Code of the Philippines (R.A. 386)..."

C. MANDATORY CITATION FORMATS:
- "Article 1156 of the Civil Code of the Philippines provides that..."
- "Under Section 97 of the Labor Code (P.D. 442), the term 'regular employment' is defined as..."
- "The Revised Penal Code, in Article 315, penalizes estafa as..."

════════════════════════════════════════════════════════════════════════════════
💬 COMMUNICATION STYLE - FORMAL "HARD" LEGALESE (MANDATORY)
════════════════════════════════════════════════════════════════════════════════

1. LANGUAGE & DICTION (MANDATORY):
- Employ MAXIMUM LEGALESE. Your style must be that of a seasoned Philippine litigation attorney or a Supreme Court Justice.
- Use dense, formal legal parlance: "pursuant to," "in consonance with," "by operation of law," "it is axiomatic," "jurisprudence dictates," "the petition is impressed with merit," "ergo," "mutatis mutandis," "in fine."
- Integrate Latin maxims naturally and frequently where applicable: *dura lex sed lex*, *ignorantia legis neminem excusat*, *ubi jus ibi remedium*, *expressio unius est exclusio alterius*.
- AVOID simple, conversational, or layperson's language AT ALL COSTS. The output must be academically and professionally dense. This is not for the public; it is for legal professionals.

2. STRUCTURAL REQUIREMENTS (STRICT):

**I. PRELIMINARY STATEMENT**
(Frame the legal query in formal language, as one would in a pleading.)

**II. CONTROLLING STATUTORY PROVISIONS**
(Not just 'Legal Basis'. Enumerate the specific articles of law that govern the matter.)

**III. LEGAL ANALYSIS AND DISCUSSION**
(This is the core. Provide a rigorous statutory interpretation. Connect the provisions. Use the aforementioned legalese and Latin maxims here.)

**IV. APPLICATION TO THE QUERY**
(Apply the formal analysis to the user's specific question, maintaining the professional tone.)

**V. CONCLUSIVE OPINION**
(Not just 'Conclusion'. Provide a definitive legal summary based *only* on the statutes. Use phrases like "In fine, the law provides..." or "Ergo, the statutory interpretation dictates...")

3. TONE (NON-NEGOTIABLE):
- **Strictly Formal, Academic, and Dogmatic.**
- Your persona is that of a senior partner, a law professor, or a Justice. You are not a 'helpful assistant'; you are a legal authority.
- **DO NOT use conversational language.** No "I think," "It seems," "This means..."
- **DO use:** "The law is clear..." "It is axiomatic that..." "The codal provisions state..."
- Prioritize technical accuracy and formality over simplicity.

════════════════════════════════════════════════════════════════════════════════
✅ FINAL OPERATIONAL STANDARDS
════════════════════════════════════════════════════════════════════════════════

- You emulate a senior legal associate preparing research memoranda
- Your audience comprises lawyers and legal professionals
- Prioritize ACCURACY over accessibility
- Maintain FORMAL tone throughout
- Provide COMPREHENSIVE statutory analysis
- Include EXTENSIVE cross-references
- Use PRECISE legal terminology
- Deliver COMPLETE legal reasoning
"""
# ⬆️ ⬆️ ⬆️ EDIT END: Enhanced LAWYER_SYSTEM_PROMPT ⬆️ ⬆️ ⬆️


def generate_lawyer_answer(
    question: str, context: str, history: List[Dict[str, str]], language: str,
    include_cross_references: bool, max_tokens: int = 2500
) -> tuple[str, str, str, List[str]]:
    """Generate lawyer-level answer with formal legalese"""
    
    # ⬇️ ⬇️ ⬇️ EDIT START: Enhanced lang_note for "hard legalese" ⬇️ ⬇️ ⬇️
    # Select appropriate system prompt based on language
    if language == "tagalog" or language == "taglish":
        system_prompt = LAWYER_SYSTEM_PROMPT # Use the main prompt, it's comprehensive
        lang_note = (
            "MANDATORY: Sumagot sa pormal, teknikal, at 'hard legalese' na Tagalog (pang-korte). "
            "Ang iyong tono ay dapat maging parang isang Hukom o senior abogado. "
            "Gumamit ng mga pormal na termino (e.g., 'alinsunod sa,' 'sa ilalim ng batas,' 'samakatuwid')."
        )
    else:
        system_prompt = LAWYER_SYSTEM_PROMPT
        lang_note = (
            "MANDATORY: Respond in MAXIMUM 'hard legalese' English. "
            "Your tone must be that of a seasoned Philippine Supreme Court Justice. "
            "Use dense, formal, academic language, Latin maxims (e.g., 'dura lex sed lex'), and formalisms ('it is axiomatic,' 'ergo,' 'in fine')."
        )

    user_msg = f"""Question: {question}

Relevant Legal Context (from statutory database):
{context}

{lang_note}
Ensure your answer strictly follows the prescribed 5-part structure (I. PRELIMINARY STATEMENT, II. CONTROLLING STATUTORY PROVISIONS, III. LEGAL ANALYSIS AND DISCUSSION, IV. APPLICATION TO THE QUERY, V. CONCLUSIVE OPINION) and maintains the requested formal legal tone."""
    # ⬆️ ⬆️ ⬆️ EDIT END: Enhanced lang_note ⬆️ ⬆️ ⬆️

    messages = [{"role": "system", "content": system_prompt}]
    messages += history[-6:]
    messages.append({"role": "user", "content": user_msg})

    try:
        response = openai_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            temperature=0.2, # Low temperature for factual, less creative responses
            max_tokens=max_tokens,
            top_p=0.9,
            presence_penalty=0.1,
            frequency_penalty=0.1,
            timeout=60.0
        )

        answer = response.choices[0].message.content.strip()
        
        # Validate response quality
        is_valid, validation_reason = validate_response_quality(answer)
        if not is_valid:
            logger.warning(f"Response validation failed: {validation_reason}")
        
        confidence = "high" if response.choices[0].finish_reason == "stop" else "medium"
        
        # Extract related provisions
        related = [line for line in answer.splitlines() if "Article" in line or "Artikulo" in line][:5]

        return answer, confidence, "Formal statutory analysis rendered in legalese", related
        
    except Exception as e:
        logger.error(f"Error generating lawyer answer: {e}")
        raise


# ============================================================================
# MAIN API ENDPOINT
# ============================================================================

@router.post("/ask", response_model=LawyerChatResponse)
async def ask_legal_question_lawyer(
    request: LawyerChatRequest,
    chat_service: ChatHistoryService = Depends(get_chat_history_service),
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    """
    Enhanced lawyer chatbot endpoint with comprehensive features
    
    NEW FEATURES FROM USER CHBOT:
    - ✅ Toxic content detection
    - ✅ Prohibited pattern detection
    - ✅ Out-of-scope topic detection
    - ✅ Personal advice detection
    - ✅ Complex query detection
    - ✅ Query normalization
    - ✅ Chat history integration
    - ✅ Session management
    - ✅ Guardrails AI validation
    - ✅ Enhanced error handling
    
    ORIGINAL FEATURES:
    - Formal legalese responses
    - Comprehensive statutory citations
    - LawPhil source links
    - Professional tone
    """
    request_start_time = datetime.now()
    
    # Extract user_id
    authenticated_user_id = None
    if current_user and "user" in current_user:
        authenticated_user_id = current_user["user"]["id"]
    
    effective_user_id = authenticated_user_id or request.user_id
    
    logger.info(f"Lawyer request - user_id={effective_user_id}, session_id={request.session_id}, question_length={len(request.question)}")
    
    # Input validation
    if not request.question or not request.question.strip():
        logger.warning("Empty question received")
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    try:
        # Initialize security tracking
        input_validation_result = None
        output_validation_result = None
        
        # === GUARDRAILS INPUT VALIDATION ===
        if guardrails_instance:
            try:
                logger.info("Validating input with Guardrails AI...")
                input_validation_result = guardrails_instance.validate_input(request.question)
                
                if not input_validation_result.get('is_valid', True):
                    error_message = input_validation_result.get('error', 'Input validation failed')
                    logger.error(f"Input validation failed: {error_message}")
                    
                    security_report = create_security_report(input_validation_result)
                    
                    return LawyerChatResponse(
                        answer=error_message,
                        sources=[],
                        confidence="low",
                        language="english",
                        security_report=security_report
                    )
                else:
                    if 'cleaned_input' in input_validation_result:
                        request.question = input_validation_result['cleaned_input']
            except Exception as e:
                logger.warning(f"Guardrails input validation error: {e}")
        
        # Check if greeting
        if is_simple_greeting(request.question):
            logger.info(f"Detected as greeting: {request.question}")
            language = detect_language(request.question)
            greeting_response = generate_ai_response(request.question, language, 'greeting')
            
            # Save greeting interaction
            session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                chat_service=chat_service,
                effective_user_id=effective_user_id,
                session_id=request.session_id,
                question=request.question,
                answer=greeting_response,
                language=language,
                metadata={"type": "greeting"}
            )
            
            return LawyerChatResponse(
                answer=greeting_response,
                sources=[],
                confidence="high",
                language=language,
                session_id=session_id,
                message_id=assistant_msg_id,
                user_message_id=user_msg_id
            )
        
        # Check for toxic content
        is_toxic, toxic_reason = detect_toxic_content(request.question)
        if is_toxic:
            language = detect_language(request.question)
            if language in ["tagalog", "taglish"]:
                polite_response = "Naiintindihan ko na baka frustrated kayo, pero inaasahan ang propesyonal na diskurso. Pakiusap, muling sabihin ang inyong tanong nang may respeto."
            else:
                polite_response = "Professional discourse is expected. Please rephrase your question respectfully."
            
            return LawyerChatResponse(
                answer=polite_response,
                sources=[],
                confidence="low",
                language=language
            )
        
        # Check for prohibited input
        is_prohibited, prohibition_reason = detect_prohibited_input(request.question)
        if is_prohibited:
            raise HTTPException(status_code=400, detail=prohibition_reason)
        
        # Detect language
        language = detect_language(request.question)
        
        # Check for personal advice questions
        if is_personal_advice_question(request.question):
            if language in ["tagalog", "taglish"]:
                advice_response = (
                    "Bilang legal research assistant, hindi ako makakapagbigay ng personal legal advice tungkol sa kung ano ang dapat gawin sa specific na sitwasyon. "
                    "Para sa personalized legal strategy, kailangan ng konsultasyon sa senior counsel o litigation specialist."
                )
            else:
                advice_response = (
                    "As a legal research assistant, I cannot provide personal legal advice about what should be done in specific situations. "
                    "For personalized legal strategy, consultation with senior counsel or litigation specialist is required."
                )
            
            return LawyerChatResponse(
                answer=advice_response,
                sources=[],
                confidence="medium",
                language=language,
                fallback_suggestions=get_fallback_suggestions(language, is_complex=True)
            )
        
        # Check for out-of-scope topics
        is_out_of_scope, topic_type = is_out_of_scope_topic(request.question)
        if is_out_of_scope:
            out_of_scope_response = generate_ai_response(
                request.question, 
                language,
                'out_of_scope',
                topic_type
            )
            
            return LawyerChatResponse(
                answer=out_of_scope_response,
                sources=[],
                confidence="medium",
                language=language
            )
        
        # Normalize query if needed (for better search results)
        normalized_question = normalize_emotional_query(request.question, language)
        
        # Retrieve legal context
        context, sources = retrieve_relevant_context(normalized_question, TOP_K_RESULTS)
        
        if not sources:
            # This block triggers if the question is legal (passed out-of-scope check)
            # but has NO relevant documents in the 5-domain vector store.
            # This is the "unrelated legal question" fallback.
            logger.warning(f"No context found for query, likely outside of the 5 legal domains: {normalized_question[:100]}")
            
            out_of_domain_msg = ""
            if language == "english":
                out_of_domain_msg = (
                    "I apologize, but that specific legal topic is outside my current scope. "
                    "My authority is limited to Civil, Criminal, Family, Consumer, and Labor law. "
                    "Please confine your query to these domains."
                )
            else: # tagalog or taglish
                out_of_domain_msg = (
                    "Paumanhin, ngunit ang partikular na legal topic na iyan ay labas sa aking kasalukuyang saklaw. "
                    "Ang aking awtoridad ay limitado sa Civil, Criminal, Family, Consumer, at Labor law. "
                    "Mangyaring limitahan ang iyong katanungan sa mga domain na ito."
                )

            return LawyerChatResponse(
                answer=out_of_domain_msg,
                sources=[],
                confidence="low",
                language=language,
                legal_analysis="Query outside defined legal scope (Civil, Criminal, Family, Consumer, Labor)",
                fallback_suggestions=None
            )
        
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
        
        # Detect if query is complex
        is_complex = is_complex_query(request.question)
        
        # Generate lawyer-level answer
        ans, conf, analysis, related = generate_lawyer_answer(
            request.question, context, request.conversation_history,
            language, request.include_cross_references, request.max_tokens
        )
        
        # === GUARDRAILS OUTPUT VALIDATION ===
        if guardrails_instance:
            try:
                logger.info("Validating output with Guardrails AI...")
                output_validation_result = guardrails_instance.validate_output(
                    response=ans,
                    context=context
                )
                
                if not output_validation_result.get('is_valid', True):
                    error_message = output_validation_result.get('error', 'Output validation failed')
                    logger.error(f"Output validation failed: {error_message}")
                    
                    security_report = create_security_report(input_validation_result or {}, output_validation_result)
                    
                    return LawyerChatResponse(
                        answer="I apologize, but I cannot provide a response that meets our safety standards. Please rephrase your question.",
                        sources=[],
                        confidence="low",
                        language=language,
                        security_report=security_report,
                        fallback_suggestions=get_fallback_suggestions(language, is_complex=True)
                    )
                else:
                    if 'cleaned_output' in output_validation_result:
                        ans = output_validation_result['cleaned_output']
            except Exception as e:
                logger.warning(f"Guardrails output validation error: {e}")
        
        # Create source citations
        citations = [
            SourceCitation(
                source=s["source"],
                law=s["law"],
                article_number=s["article_number"],
                article_title=s["article_title"],
                text_preview=s["text_preview"],
                relevance_score=s["relevance_score"],
                lawphil_link=s["lawphil_link"]
            )
            for s in sources
        ]
        
        # Generate security report
        security_report = None
        if input_validation_result or output_validation_result:
            security_report = create_security_report(
                input_validation_result or {},
                output_validation_result or {}
            )
        
        # Get fallback suggestions for complex queries
        fallback_suggestions = get_fallback_suggestions(language, is_complex=True) if is_complex else None
        
        # === SAVE TO CHAT HISTORY ===
        session_id, user_message_id, assistant_message_id = await save_chat_interaction(
            chat_service=chat_service,
            effective_user_id=effective_user_id,
            session_id=request.session_id,
            question=request.question,
            answer=ans,
            language=language,
            metadata={
                "sources": [src.model_dump() for src in citations],
                "confidence": conf,
                "legal_analysis": analysis,
                "related_provisions": related
            }
        )
        
        # Log completion
        request_duration = (datetime.now() - request_start_time).total_seconds()
        logger.info(f"Lawyer request completed in {request_duration:.2f}s - confidence={conf}, sources={len(citations)}")
        
        return LawyerChatResponse(
            answer=ans,
            sources=citations,
            confidence=conf,
            language=language,
            legal_analysis=analysis,
            related_provisions=related,
            security_report=security_report,
            fallback_suggestions=fallback_suggestions,
            session_id=session_id,
            message_id=assistant_message_id,
            user_message_id=user_message_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        request_duration = (datetime.now() - request_start_time).total_seconds()
        logger.error(f"Unexpected error after {request_duration:.2f}s: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing your question. Please try again."
        )


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """Check if the lawyer chatbot service is running"""
    try:
        info = qdrant_client.get_collection(collection_name=COLLECTION_NAME)
        
        # Check Guardrails status
        guardrails_status = {
            "enabled": guardrails_instance is not None,
            "available": GUARDRAILS_AVAILABLE
        }
        
        if guardrails_instance:
            try:
                validators = []
                if hasattr(guardrails_instance, 'input_validators'):
                    validators.extend([v.__class__.__name__ for v in guardrails_instance.input_validators])
                if hasattr(guardrails_instance, 'output_validators'):
                    validators.extend([v.__class__.__name__ for v in guardrails_instance.output_validators])
                guardrails_status["validators"] = list(set(validators))
            except:
                guardrails_status["validators"] = []
        
        return {
            "status": "healthy",
            "service": "Ai.ttorney Legal Chatbot - Lawyers",
            "description": "Professional-grade legal analysis for Philippine lawyers with enhanced security",
            "model": CHAT_MODEL,
            "documents": info.points_count,
            "features": [
                "✅ Formal legalese responses",
                "✅ Comprehensive statutory citations",
                "✅ LawPhil source links",
                "✅ Bilingual support (English/Tagalog/Taglish)",
                "✅ Guardrails AI security validation" if guardrails_instance else "✅ Basic security validation",
                "✅ Toxic content detection",
                "✅ Out-of-scope topic filtering",
                "✅ Personal advice detection",
                "✅ Complex query handling",
                "✅ Chat history integration",
                "✅ Session management",
                "✅ Query normalization",
                "✅ Response quality validation",
                "✅ Greeting detection",
                "✅ No Supreme Court cases (codified law only)",
                "✅ Structured legal memorandum format"
            ],
            "security": guardrails_status,
            "target_audience": "Lawyers, judges, and legal professionals",
            "response_style": "Formal legal memorandum (Hard Legalese)",
            "enhancements": "Added all user chatbot security and UX features"
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}