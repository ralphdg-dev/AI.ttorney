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

# Import comprehensive system prompts
from config.system_prompts import (
    ENGLISH_SYSTEM_PROMPT, 
    TAGALOG_SYSTEM_PROMPT,
    LAWYER_ENGLISH_SYSTEM_PROMPT,
    LAWYER_TAGALOG_SYSTEM_PROMPT
)

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


def detect_explicit_language_preference(text: str) -> str:
    """Detect explicit language preference requests that override automatic detection"""
    text_lower = text.lower()
    
    # English preference indicators
    english_requests = [
        'answer this in english', 'respond in english', 'reply in english',
        'english please', 'in english', 'use english', 'english response',
        'answer in english', 'explain in english', 'sagot sa english',
        'english lang', 'english po', 'sa english'
    ]
    
    # Tagalog preference indicators  
    tagalog_requests = [
        'answer this in tagalog', 'respond in tagalog', 'reply in tagalog',
        'tagalog please', 'in tagalog', 'use tagalog', 'tagalog response',
        'answer in tagalog', 'explain in tagalog', 'sagot sa tagalog',
        'filipino please', 'in filipino', 'use filipino', 'filipino response',
        'sa tagalog', 'tagalog lang', 'filipino lang'
    ]
    
    # Check for explicit preferences
    for phrase in english_requests:
        if phrase in text_lower:
            logger.info(f"Explicit English preference detected: '{phrase}' in query")
            return "english"
    
    for phrase in tagalog_requests:
        if phrase in text_lower:
            logger.info(f"Explicit Tagalog preference detected: '{phrase}' in query")
            return "tagalog"
    
    return "auto"  # No explicit preference, use automatic detection


def detect_language(text: str) -> str:
    """Enhanced language detection with comprehensive Tagalog legal terms"""
    # First check for explicit language preference
    explicit_pref = detect_explicit_language_preference(text)
    if explicit_pref != "auto":
        return explicit_pref
    
    tagalog_keywords = [
        # Basic Tagalog words
        'ano', 'paano', 'saan', 'kailan', 'bakit', 'sino', 'mga', 'ng', 'sa', 'ay',
        'ko', 'mo', 'niya', 'natin', 'nila', 'ba', 'po', 'opo', 'hindi', 'oo',
        'dapat', 'pwede', 'kailangan', 'gusto', 'yung', 'lang', 'din', 'rin',
        'kung', 'kapag', 'kasi', 'para', 'pero', 'kaya', 'naman', 'talaga',
        # Legal and comparative terms
        'pagkumparahin', 'pagkakaiba', 'pagkakatulad', 'kaibahan', 'katulad',
        'annulment', 'hiwalayan', 'paghihiwalay', 'diborsyo', 'kasalan',
        'kasal', 'asawa', 'mag-asawa', 'pag-aasawa', 'pamilya',
        'batas', 'kodigo', 'artikulo', 'seksyon', 'probisyon',
        'alinsunod', 'ayon', 'batay', 'base', 'nakasaad',
        'mahalagang', 'importante', 'kailangan', 'kinakailangan',
        'proseso', 'pamamaraan', 'hakbang', 'paraan',
        'requirements', 'dokumento', 'papeles', 'sulat',
        'korte', 'hukuman', 'hukom', 'abogado', 'lawyer'
    ]
    
    text_lower = text.lower()
    words = text_lower.split()
    
    # Count exact word matches
    exact_tagalog_count = sum(1 for keyword in tagalog_keywords if keyword in words)
    
    # Count partial matches for compound words
    partial_tagalog_count = sum(1 for keyword in tagalog_keywords if keyword in text_lower)
    
    # Check for English indicators
    english_indicators = ['what', 'how', 'when', 'where', 'why', 'can', 'is', 'are', 'the', 'and', 'or', 'of', 'in', 'to']
    has_english = any(word in words for word in english_indicators)
    
    # Enhanced detection logic
    total_tagalog_score = exact_tagalog_count + (partial_tagalog_count * 0.5)
    
    if total_tagalog_score >= 2:
        if has_english:
            return "taglish"
        else:
            return "tagalog"
    elif total_tagalog_score >= 1:
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


def fix_markdown_headers(text: str) -> str:
    """Fix markdown headers to mobile-friendly bold format"""
    import re
    
    # Replace ### headers with bold format
    text = re.sub(r'^#{1,4}\s*(\d+\.?)\s*(.+)$', r'**\1** **\2**:', text, flags=re.MULTILINE)
    
    # Replace standalone ### headers without numbers
    text = re.sub(r'^#{1,4}\s*(.+)$', r'**\1**:', text, flags=re.MULTILINE)
    
    # Fix any remaining ### patterns in the middle of text
    text = re.sub(r'#{1,4}\s*(\d+\.?)\s*(.+)', r'**\1** **\2**:', text)
    
    return text


def validate_context_adherence(answer: str, provided_context: str) -> tuple[bool, str]:
    """Validate that the AI response only uses information from provided context"""
    import re
    
    # Extract article numbers from the answer
    article_pattern = r'Article\s+(\d+[A-Za-z]*(?:-\d+)?(?:\.\d+)?)'  
    section_pattern = r'Section\s+(\d+[A-Za-z]*(?:-\d+)?(?:\.\d+)?)'  
    
    answer_articles = set(re.findall(article_pattern, answer, re.IGNORECASE))
    answer_sections = set(re.findall(section_pattern, answer, re.IGNORECASE))
    
    # Extract article numbers from the provided context
    context_articles = set(re.findall(article_pattern, provided_context, re.IGNORECASE))
    context_sections = set(re.findall(section_pattern, provided_context, re.IGNORECASE))
    
    # Check for hallucinated articles
    hallucinated_articles = answer_articles - context_articles
    hallucinated_sections = answer_sections - context_sections
    
    if hallucinated_articles:
        return False, f"Response cites Article(s) {', '.join(hallucinated_articles)} not found in provided context"
    
    if hallucinated_sections:
        return False, f"Response cites Section(s) {', '.join(hallucinated_sections)} not found in provided context"
    
    # Check for suspicious phrases that might indicate hallucination
    hallucination_indicators = [
        r'according to philippine law',
        r'under philippine law',
        r'philippine law states',
        r'the law provides that',
        r'legal precedent shows',
        r'jurisprudence establishes',
        r'court decisions indicate',
        r'ayon sa batas ng pilipinas',
        r'sa ilalim ng batas ng pilipinas',
        r'ang batas ng pilipinas ay nagsasabing'
    ]
    
    for pattern in hallucination_indicators:
        if re.search(pattern, answer.lower()) and not re.search(pattern, provided_context.lower()):
            return False, f"Response contains general legal statements not supported by provided context"
    
    return True, ""


def validate_response_quality(answer: str) -> tuple[bool, str]:
    """Comprehensive validation to prevent personalized legal advice"""
    answer_lower = answer.lower()
    
    # Enhanced English advice patterns
    english_advice_patterns = [
        r'\bin your case,? you should\b',
        r'\bi recommend you\b',
        r'\bi suggest you\b',
        r'\bi advise you\b',
        r'\byou should file\b',
        r'\byou should sue\b',
        r'\byou must\b.*\b(file|sue|report|demand|claim)\b',
        r'\byou need to\b.*\b(file|sue|report|demand|claim)\b',
        r'\bmake sure you\b.*\b(file|sue|report|demand|claim)\b',
        r'\bmy advice is\b',
        r'\bi would recommend\b',
        r'\byou should definitely\b',
        r'\byou ought to\b',
        r'\bit would be best if you\b',
        r'\byou have to\b.*\b(file|sue|report|demand)\b',
        r'\byou should consider\b.*\b(filing|suing|reporting)\b',
        r'\bin your situation,? you should\b',
        r'\bfor your case,? i recommend\b',
        r'\byou should take legal action\b',
        r'\byou should hire\b.*\blawyer\b',
        r'\byou should contact\b.*\b(lawyer|attorney)\b',
        r'\byou should pursue\b.*\b(legal|case|claim)\b'
    ]
    
    # Tagalog/Filipino advice patterns
    tagalog_advice_patterns = [
        r'\bsa case mo,? dapat\b',
        r'\bkailangan mo\b.*\b(mag-file|kasuhan|ireport|demandahin)\b',
        r'\bdapat mo\b.*\b(kasuhan|ireport|demandahin|mag-file)\b',
        r'\binirerekomenda ko\b',
        r'\bpayo ko\b',
        r'\bsa tingin ko,? dapat\b',
        r'\bmas mabuti kung\b.*\b(kasuhan|ireport|mag-file)\b',
        r'\bsiguraduhin mo\b.*\b(kasuhan|ireport|mag-file)\b',
        r'\bkailangan mong\b.*\b(kumuha ng abogado|mag-file)\b',
        r'\bdapat kang\b.*\b(mag-file|kasuhan|ireport)\b',
        r'\bsa sitwasyon mo,? dapat\b',
        r'\bpara sa case mo,? inirerekomenda\b',
        r'\bkailangan mong mag-take ng legal action\b',
        r'\bkailangan mong kumuha ng\b.*\babogado\b',
        r'\bkailangan mong makipag-ugnayan sa\b.*\babogado\b',
        r'\bkailangan mong ituloy\b.*\b(legal|kaso|claim)\b'
    ]
    
    # Case assessment patterns (prohibited)
    case_assessment_patterns = [
        r'\byou have a strong case\b',
        r'\byour case looks\b.*\b(good|strong|favorable|promising)\b',
        r'\byou will likely win\b',
        r'\byou have good chances\b',
        r'\bthis case is winnable\b',
        r'\bmalakas ang case mo\b',
        r'\bmukhang maganda ang kaso mo\b',
        r'\bpanalo ka\b.*\b(dito|sa kaso)\b',
        r'\bmaganda ang tsansa mo\b',
        r'\bmananalo ka\b.*\b(sa kaso|dito)\b'
    ]
    
    # Directive language patterns (should be informational instead)
    directive_patterns = [
        r'\byou should immediately\b',
        r'\byou must act quickly\b',
        r'\bdon\'t wait\b.*\b(file|sue|report)\b',
        r'\bagad-agad mong\b.*\b(kasuhan|ireport|mag-file)\b',
        r'\bhuwag nang maghintay\b.*\b(kasuhan|ireport)\b',
        r'\bkailangan mo nang kumilos\b'
    ]
    
    # Combine all patterns
    all_patterns = english_advice_patterns + tagalog_advice_patterns + case_assessment_patterns + directive_patterns
    
    for pattern in all_patterns:
        match = re.search(pattern, answer_lower)
        if match:
            return False, f"Response contains personalized advice/directive language: '{match.group()}'"
    
    # Additional check for common advice phrases
    advice_phrases = [
        'in your case', 'sa case mo', 'para sa iyo', 'for you specifically',
        'my recommendation', 'ang rekomendasyon ko', 'i suggest that you',
        'inirerekomenda kong', 'you should do', 'dapat mong gawin'
    ]
    
    for phrase in advice_phrases:
        if phrase in answer_lower:
            return False, f"Response contains personalized advice phrase: '{phrase}'"
    
    return True, ""


def is_gibberish_input(text: str) -> tuple[bool, Optional[str]]:
    """
    Detect gibberish, nonsensical, or unclear input that cannot be processed
    
    Returns:
        tuple: (is_gibberish, reason)
    """
    text = text.strip()
    
    # Allow common short responses and basic words
    common_short_words = {
        'ok', 'no', 'yes', 'hi', 'hey', 'law', 'help', 'what', 'how', 'why', 'who', 'when', 'where',
        'ano', 'sino', 'saan', 'bakit', 'paano', 'kailan', 'oo', 'hindi', 'po', 'salamat', 'thanks'
    }
    
    # Check for extremely short input (less than 2 characters) or single character
    if len(text) < 2:
        return True, "Input too short to process"
    
    # Allow common short words
    if text.lower() in common_short_words:
        return False, None
    
    # Check for random character sequences
    if len(text) > 5:
        # Count vowels and consonants
        vowels = sum(1 for char in text.lower() if char in 'aeiouáéíóúàèìòù')
        consonants = sum(1 for char in text.lower() if char.isalpha() and char not in 'aeiouáéíóúàèìòù')
        total_letters = vowels + consonants
        
        # If there are letters but very few vowels (less than 10%), likely gibberish
        if total_letters > 5 and vowels / total_letters < 0.1:
            return True, "Input appears to contain random characters"
        
        # Additional check: Look for long sequences without recognizable patterns
        if len(text) > 20:
            # Check if text contains mostly unpronounceable consonant clusters
            consonant_clusters = 0
            i = 0
            while i < len(text) - 2:
                if (text[i].isalpha() and text[i].lower() not in 'aeiouáéíóúàèìòù' and
                    text[i+1].isalpha() and text[i+1].lower() not in 'aeiouáéíóúàèìòù' and
                    text[i+2].isalpha() and text[i+2].lower() not in 'aeiouáéíóúàèìòù'):
                    consonant_clusters += 1
                i += 1
            
            # If more than 30% of the text is unpronounceable consonant clusters
            if consonant_clusters > len(text) * 0.3:
                return True, "Input contains unpronounceable character sequences"
    
    # Check for excessive repetition of characters
    if len(text) > 10:
        # Count repeated character sequences
        repeated_chars = 0
        for i in range(len(text) - 2):
            if text[i] == text[i+1] == text[i+2]:
                repeated_chars += 1
        
        if repeated_chars > len(text) * 0.3:  # More than 30% repeated characters
            return True, "Input contains excessive character repetition"
    
    # Check for keyboard mashing patterns
    keyboard_patterns = [
        'qwerty', 'asdf', 'zxcv', 'qaz', 'wsx', 'edc', 'rfv', 'tgb', 'yhn', 'ujm',
        'aaaa', 'bbbb', 'cccc', 'dddd', 'eeee', 'ffff', 'gggg', 'hhhh', 'iiii', 'jjjj'
    ]
    
    text_lower = text.lower()
    for pattern in keyboard_patterns:
        if pattern in text_lower and len(pattern) >= 4:
            return True, "Input appears to be keyboard mashing"
    
    # Check for lack of meaningful words
    words = text.split()
    if len(words) > 2:
        # Check if most words are very short or contain no vowels
        meaningless_words = 0
        for word in words:
            word_clean = ''.join(char for char in word.lower() if char.isalpha())
            if len(word_clean) > 2:
                vowel_count = sum(1 for char in word_clean if char in 'aeiouáéíóúàèìòù')
                if vowel_count == 0:  # No vowels in word longer than 2 characters
                    meaningless_words += 1
        
        if meaningless_words > len(words) * 0.6:  # More than 60% meaningless words
            return True, "Input contains mostly unclear or meaningless words"
    
    # Check for excessive special characters or numbers without context
    special_char_count = sum(1 for char in text if not char.isalnum() and not char.isspace())
    if len(text) > 5 and special_char_count > len(text) * 0.5:
        return True, "Input contains excessive special characters"
    
    # Check for numbers-only input (but allow short numbers that might be legal references)
    if text.isdigit() and len(text) > 4:
        return True, "Input appears to be random numbers without context"
    
    # Check for very short input that's not in common words (like "xyz")
    if len(text) == 3 and text.lower() not in common_short_words:
        # Check if it's a meaningful 3-letter combination
        vowel_count = sum(1 for char in text.lower() if char in 'aeiouáéíóúàèìòù')
        if vowel_count == 0:  # No vowels in 3-letter word
            return True, "Input appears to be meaningless character combination"
    
    # Check for long random-looking strings (like the user's input)
    if len(text) > 15:
        # Check if the text lacks common English/Tagalog word patterns
        common_patterns = [
            'tion', 'ing', 'ed', 'er', 'ly', 'an', 'en', 'on', 'in', 'at', 'or', 'ar',
            'ang', 'mga', 'ung', 'ing', 'ong', 'ako', 'ito', 'yan', 'nag', 'mag', 'pag'
        ]
        
        pattern_matches = 0
        text_lower = text.lower()
        for pattern in common_patterns:
            if pattern in text_lower:
                pattern_matches += 1
        
        # If it's a long string with very few recognizable patterns and looks random
        if pattern_matches == 0 and len(text) > 25:
            # Additional randomness check: look for alternating consonant-vowel patterns that seem artificial
            artificial_score = 0
            for i in range(len(text) - 4):
                substring = text[i:i+5].lower()
                if substring.isalpha():
                    # Check for patterns like "vwxyz" or other suspicious sequences
                    consecutive_consonants = 0
                    for j in range(len(substring) - 1):
                        if (substring[j] not in 'aeiouáéíóúàèìòù' and 
                            substring[j+1] not in 'aeiouáéíóúàèìòù'):
                            consecutive_consonants += 1
                    if consecutive_consonants >= 3:
                        artificial_score += 1
            
            if artificial_score > 3:  # Multiple suspicious patterns
                return True, "Input appears to be random character sequence"
    
    return False, None


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


def get_fallback_suggestions(language: str, is_complex: bool = False, suggestion_type: str = "general") -> List[FallbackSuggestion]:
    """Get enhanced fallback suggestions with professional guidance"""
    
    if language == "tagalog" or language == "taglish":
        if suggestion_type == "insufficient_context":
            return [
                FallbackSuggestion(
                    action="consult_jurisprudence",
                    description="Mag-research ng Supreme Court decisions at jurisprudence",
                    reason="Ang statutory provisions ay maaaring mangailangan ng jurisprudential interpretation para sa kumpletong legal analysis."
                ),
                FallbackSuggestion(
                    action="specialized_databases",
                    description="Kumonsulta sa specialized legal databases (Lawphil, ChanRobles, etc.)",
                    reason="Ang topic na ito ay maaaring mangailangan ng mas malawak na legal resources lampas sa codified law."
                ),
                FallbackSuggestion(
                    action="expert_consultation",
                    description="Makipag-ugnayan sa subject matter experts o specialized practitioners",
                    reason="Para sa comprehensive analysis, kinakailangan ang expertise ng mga dalubhasa sa particular practice area."
                )
            ]
        elif suggestion_type == "personal_advice":
            return [
                FallbackSuggestion(
                    action="senior_counsel_consultation",
                    description="Kumonsulta sa senior counsel na may expertise sa relevant practice area",
                    reason="Ang strategic legal advice at case evaluation ay nangangailangan ng experienced practitioner judgment."
                ),
                FallbackSuggestion(
                    action="case_law_research",
                    description="Mag-conduct ng comprehensive case law research",
                    reason="Ang case-specific analysis ay nangangailangan ng precedential authority at jurisprudential guidance."
                ),
                FallbackSuggestion(
                    action="client_consultation",
                    description="Mag-conduct ng detailed client consultation",
                    reason="Ang personalized legal strategy ay nangangailangan ng comprehensive fact-gathering at client interview."
                )
            ]
        else:  # general
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
        if suggestion_type == "insufficient_context":
            return [
                FallbackSuggestion(
                    action="consult_jurisprudence",
                    description="Research Supreme Court decisions and jurisprudence",
                    reason="Statutory provisions may require jurisprudential interpretation for complete legal analysis."
                ),
                FallbackSuggestion(
                    action="specialized_databases",
                    description="Consult specialized legal databases (Lawphil, ChanRobles, etc.)",
                    reason="This topic may require broader legal resources beyond codified law."
                ),
                FallbackSuggestion(
                    action="expert_consultation",
                    description="Engage subject matter experts or specialized practitioners",
                    reason="Comprehensive analysis requires expertise from specialists in the particular practice area."
                )
            ]
        elif suggestion_type == "personal_advice":
            return [
                FallbackSuggestion(
                    action="senior_counsel_consultation",
                    description="Consult senior counsel with expertise in relevant practice area",
                    reason="Strategic legal advice and case evaluation require experienced practitioner judgment."
                ),
                FallbackSuggestion(
                    action="case_law_research",
                    description="Conduct comprehensive case law research",
                    reason="Case-specific analysis requires precedential authority and jurisprudential guidance."
                ),
                FallbackSuggestion(
                    action="client_consultation",
                    description="Conduct detailed client consultation",
                    reason="Personalized legal strategy requires comprehensive fact-gathering and client interview."
                )
            ]
        else:  # general
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

# Lawyer prompts are now imported from config/system_prompts.py


def determine_query_complexity(question: str, context: str) -> tuple[bool, int]:
    """Determine if query is complex and appropriate token limit"""
    # Simple query indicators
    simple_indicators = [
        'what is', 'ano ang', 'define', 'definition', 'meaning', 'kahulugan',
        'how much', 'magkano', 'when', 'kailan', 'where', 'saan'
    ]
    
    # Complex query indicators
    complex_indicators = [
        'analyze', 'compare', 'difference', 'pagkakaiba', 'relationship', 'ugnayan',
        'procedure', 'process', 'pamamaraan', 'requirements', 'kailangan',
        'elements', 'sangkap', 'grounds', 'batayan', 'remedies', 'lunas'
    ]
    
    question_lower = question.lower()
    
    # Check for simple patterns
    is_simple = any(indicator in question_lower for indicator in simple_indicators)
    
    # Check for complex patterns
    is_complex = any(indicator in question_lower for indicator in complex_indicators)
    
    # Additional complexity factors
    has_multiple_questions = question.count('?') > 1
    is_long_query = len(question) > 200
    has_rich_context = len(context) > 2000
    
    # Determine complexity and token limit
    if is_simple and not (has_multiple_questions or is_long_query):
        return False, 1000  # Simple: 800-1200 tokens
    elif is_complex or has_multiple_questions or is_long_query or has_rich_context:
        return True, 2000   # Complex: 1500-2000 tokens
    else:
        return False, 1500  # Medium: 1200-1500 tokens


def generate_lawyer_answer(
    question: str, context: str, history: List[Dict[str, str]], language: str,
    include_cross_references: bool, max_tokens: int = 2500
) -> tuple[str, str, str, List[str]]:
    """Generate comprehensive legal research analysis for lawyers with adaptive length"""
    
    # Determine query complexity and appropriate token limit
    is_complex, adaptive_tokens = determine_query_complexity(question, context)
    
    # Use adaptive token limit instead of fixed max_tokens
    effective_max_tokens = min(adaptive_tokens, max_tokens)
    
    # Select appropriate system prompt based on language
    if language == "tagalog" or language == "taglish":
        system_prompt = LAWYER_TAGALOG_SYSTEM_PROMPT
        if is_complex:
            lang_note = (
                "MANDATORY: Sumagot sa pormal na Tagalog na angkop para sa mga abogado. "
                "Gumamit ng comprehensive analysis para sa komplikadong query na ito. "
                "Magbigay ng detalyadong statutory interpretation at cross-references. "
                "CRITICAL: HUWAG gumamit ng markdown headers (####, ###, ##, #). Gamitin ang **bold** format: **1.** **Title**: Content"
            )
        else:
            lang_note = (
                "MANDATORY: Sumagot sa pormal na Tagalog na angkop para sa mga abogado. "
                "Gumamit ng concise pero comprehensive na sagot para sa simpleng query na ito. "
                "Focus sa direct statutory provision at clear explanation. "
                "CRITICAL: HUWAG gumamit ng markdown headers (####, ###, ##, #). Gamitin ang **bold** format: **1.** **Title**: Content"
            )
        fallback_msg = "Kulang ang impormasyon sa database para sa comprehensive analysis. Inirerekomenda ang konsultasyon sa specialized legal resources."
    else:
        system_prompt = LAWYER_ENGLISH_SYSTEM_PROMPT
        if is_complex:
            lang_note = (
                "MANDATORY: Respond in formal legal English appropriate for lawyers. "
                "Provide comprehensive analysis for this complex query. "
                "Include detailed statutory interpretation and cross-references. "
                "CRITICAL: NEVER use markdown headers (####, ###, ##, #). Use **bold** format: **1.** **Title**: Content"
            )
        else:
            lang_note = (
                "MANDATORY: Respond in formal legal English appropriate for lawyers. "
                "Provide concise but comprehensive answer for this straightforward query. "
                "Focus on direct statutory provision and clear explanation. "
                "CRITICAL: NEVER use markdown headers (####, ###, ##, #). Use **bold** format: **1.** **Title**: Content"
            )
        fallback_msg = "Insufficient information in database for comprehensive analysis. Recommend consultation with specialized legal resources."

    user_msg = f"""Legal Research Query: {question}

Statutory Context from Database:
{context}

🚨 ULTRA-STRICT MODE ACTIVE:
- ONLY use information from the above Statutory Context
- NEVER cite articles not explicitly mentioned above
- NEVER create or invent any legal provisions
- NEVER use general legal knowledge
- If information is missing, state "Not available in current database"

📱 CRITICAL FORMATTING REQUIREMENTS:
- ABSOLUTELY FORBIDDEN: Using markdown headers (####, ###, ##, #)
- MANDATORY: Use **bold text** for section titles and numbers
- MANDATORY: Format as **1.** **Title**: Content (not ### 1. Title)
- MANDATORY: Use plain text section titles, not markdown headers

{lang_note}
Target length: {'Comprehensive analysis' if is_complex else 'Focused response'} (~{effective_max_tokens} tokens)
Provide legal research analysis EXCLUSIVELY from the provided context above. Do NOT add any information not explicitly stated in the context."""

    messages = [{"role": "system", "content": system_prompt}]
    messages += history[-8:]  # More context for lawyers
    messages.append({"role": "user", "content": user_msg})

    try:
        response = openai_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            temperature=0.1,  # Very low for precise legal analysis
            max_tokens=effective_max_tokens,  # Adaptive based on complexity
            top_p=0.85,
            presence_penalty=0.0,
            frequency_penalty=0.0,
            timeout=60.0
        )

        answer = response.choices[0].message.content.strip()
        
        # Post-process to fix any remaining markdown headers
        answer = fix_markdown_headers(answer)
        
        # Comprehensive validation - both quality and context adherence
        is_valid_quality, quality_reason = validate_response_quality(answer)
        is_valid_context, context_reason = validate_context_adherence(answer, context)
        
        if not is_valid_quality:
            logger.error(f"Response quality validation failed: {quality_reason}")
            return fallback_msg, "low", "Response failed safety validation", []
        
        if not is_valid_context:
            logger.error(f"Response context validation failed: {context_reason}")
            return fallback_msg, "low", "Response failed context validation - potential hallucination detected", []
        
        confidence = "high" if response.choices[0].finish_reason == "stop" else "medium"
        
        # Extract related provisions with better parsing
        related = []
        for line in answer.splitlines():
            if any(keyword in line for keyword in ["Article", "Section", "Artikulo", "Seksyon"]):
                related.append(line.strip())
                if len(related) >= 5:
                    break

        analysis_type = "Professional legal research analysis" if language == "english" else "Propesyonal na legal research analysis"
        return answer, confidence, analysis_type, related
        
    except Exception as e:
        logger.error(f"Error generating lawyer answer: {e}")
        return fallback_msg, "low", "Error in response generation", []


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
        
        # Check for gibberish input
        is_gibberish, gibberish_reason = is_gibberish_input(request.question)
        if is_gibberish:
            language = detect_language(request.question)
            logger.info(f"Gibberish input detected: {gibberish_reason}")
            
            if language in ["tagalog", "taglish"]:
                clarification_response = (
                    "Paumanhin, ngunit hindi ko maintindihan ang inyong tanong. "
                    "Maaari po ba kayong magbigay ng mas malinaw na legal na katanungan? "
                    "Halimbawa: 'Ano ang mga karapatan ng empleyado sa illegal dismissal?' o "
                    "'Paano mag-file ng small claims case?'"
                )
            else:
                clarification_response = (
                    "I apologize, but I'm having difficulty understanding your question. "
                    "Could you please provide a clearer legal inquiry? "
                    "For example: 'What are the elements of breach of contract?' or "
                    "'How do I file a complaint for unfair labor practice?'"
                )
            
            return LawyerChatResponse(
                answer=clarification_response,
                sources=[],
                confidence="low",
                language=language,
                fallback_suggestions=get_fallback_suggestions(language, is_complex=False, suggestion_type="general")
            )
        
        # Detect language with debug logging
        explicit_pref = detect_explicit_language_preference(request.question)
        language = detect_language(request.question)
        
        if explicit_pref != "auto":
            logger.info(f"Explicit language preference detected: {explicit_pref} for query: {request.question[:50]}...")
        else:
            logger.info(f"Auto-detected language: {language} for query: {request.question[:50]}...")
        
        # Enhanced personal advice detection with professional guidance
        if is_personal_advice_question(request.question):
            if language in ["tagalog", "taglish"]:
                advice_response = (
                    "Bilang legal research tool, nagbibigay lamang ako ng statutory analysis at legal framework information. "
                    "Hindi ako makakapagbigay ng strategic legal advice, case assessment, o personalized recommendations. "
                    "Para sa client-specific legal strategy, case evaluation, at tactical decisions, "
                    "kinakailangan ang direct consultation sa senior counsel na may expertise sa relevant practice area."
                )
            else:
                advice_response = (
                    "As a legal research tool, I provide only statutory analysis and legal framework information. "
                    "I cannot provide strategic legal advice, case assessment, or personalized recommendations. "
                    "For client-specific legal strategy, case evaluation, and tactical decisions, "
                    "direct consultation with senior counsel having expertise in the relevant practice area is required."
                )
            
            enhanced_fallbacks = get_fallback_suggestions(language, is_complex=True, suggestion_type="personal_advice")
            
            return LawyerChatResponse(
                answer=advice_response,
                sources=[],
                confidence="medium",
                language=language,
                fallback_suggestions=enhanced_fallbacks
            )
        
        # Check for out-of-scope topics
        is_out_of_scope, topic_type = is_out_of_scope_topic(request.question)
        if is_out_of_scope:
            if language in ["tagalog", "taglish"]:
                out_of_scope_response = (
                    f"Ang tanong na ito ay tungkol sa {topic_type} topics na nasa labas ng aking legal research scope. "
                    "Makakapag-provide lamang ako ng statutory analysis para sa Civil, Criminal, Consumer, Family, at Labor Law. "
                    "Para sa {topic_type} matters, inirerekomenda ang konsultasyon sa appropriate specialists."
                )
            else:
                out_of_scope_response = (
                    f"This query pertains to {topic_type} matters outside my legal research scope. "
                    "I can only provide statutory analysis for Civil, Criminal, Consumer, Family, and Labor Law. "
                    f"For {topic_type} matters, consultation with appropriate specialists is recommended."
                )
            
            return LawyerChatResponse(
                answer=out_of_scope_response,
                sources=[],
                confidence="medium",
                language=language,
                fallback_suggestions=get_fallback_suggestions(language, is_complex=False, suggestion_type="general")
            )
        
        # Normalize query if needed (for better search results)
        normalized_question = normalize_emotional_query(request.question, language)
        
        # Retrieve legal context
        context, sources = retrieve_relevant_context(normalized_question, TOP_K_RESULTS)
        
        if not sources:
            # Enhanced fallback with explicit instructions for lawyers
            logger.warning(f"No context found for query, likely outside of the 5 legal domains: {normalized_question[:100]}")
            
            if language == "english":
                out_of_domain_msg = (
                    "Insufficient statutory context available in database for this legal research query. "
                    "My research scope is limited to codified provisions in Civil, Criminal, Family, Consumer, and Labor law. "
                    "For comprehensive analysis of this topic, consultation with specialized legal databases, "
                    "jurisprudential research, or subject matter experts may be necessary."
                )
            else: # tagalog or taglish
                out_of_domain_msg = (
                    "Kulang ang statutory context na available sa database para sa legal research query na ito. "
                    "Ang aking research scope ay limitado sa codified provisions sa Civil, Criminal, Family, Consumer, at Labor law. "
                    "Para sa comprehensive analysis ng topic na ito, maaaring kailangan ang konsultasyon sa specialized legal databases, "
                    "jurisprudential research, o subject matter experts."
                )

            fallback_suggestions = get_fallback_suggestions(language, is_complex=True, suggestion_type="insufficient_context")

            return LawyerChatResponse(
                answer=out_of_domain_msg,
                sources=[],
                confidence="low",
                language=language,
                legal_analysis="Insufficient statutory context in database",
                fallback_suggestions=fallback_suggestions
            )
        
        # Generate answer using OpenAI with language confirmation
        logger.info(f"Generating answer in {language} language")
        ans, conf, analysis, related = generate_lawyer_answer(
            normalized_question, context, history, language, 
            request.include_cross_references, request.max_tokens
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
            confidence = "low"
        
        # Guardrails output validation (if available)
        if GUARDRAILS_AVAILABLE and guardrails_instance:
            try:
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
                        fallback_suggestions=get_fallback_suggestions(language, is_complex=True, suggestion_type="general")
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
        
        # Verify data sources from Qdrant
        sample_search = qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=[0.1] * 1536,  # Dummy vector for sampling
            limit=3
        )
        
        data_sources = []
        for result in sample_search:
            if result.payload:
                law_name = result.payload.get('law', 'Unknown')
                if law_name not in data_sources:
                    data_sources.append(law_name)
        
        return {
            "status": "healthy",
            "service": "Ai.ttorney Legal Chatbot - Lawyers",
            "description": "ULTRA-STRICT MODE: Dataset-only legal analysis preventing AI hallucination",
            "model": CHAT_MODEL,
            "documents": info.points_count,
            "verified_data_sources": data_sources[:5],  # Show sample of actual data sources
            "features": [
                "✅ Formal legalese responses",
                "✅ Comprehensive statutory citations",
                "✅ LawPhil source links",
                "✅ Bilingual support (English/Tagalog/Taglish)",
                "✅ ULTRA-STRICT MODE: Dataset-only responses",
                "✅ Anti-hallucination validation (prevents fake articles)",
                "✅ Context adherence verification",
                "✅ Enhanced Tagalog language detection",
                "✅ Explicit language preference override",
                "✅ Mobile-friendly formatting (auto-fixes markdown headers)",
                "✅ Adaptive response length control",
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
            "response_style": "Formal legal memorandum (Dataset-only, No Hallucination)",
            "language_features": "Auto-detection + Explicit preference override (e.g., 'answer in english')",
            "data_source": "Webscrape datasets of Philippine legal codes only",
            "anti_hallucination": "ULTRA-STRICT MODE prevents citing non-existent articles",
            "enhancements": "Dataset-only responses with anti-hallucination + auto-formatting for mobile"
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}