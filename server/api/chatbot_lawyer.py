#chatbot_lawyer.py

"""
Legal Practice & Research API for Practitioners (Philippine Bar)

Engineered for members of the Philippine Bar requiring advanced jurisprudential 
research, statutory analysis, and doctrinal synthesis.

KEY FEATURES:
1.  **Precision Querying**: Accepts and parses formal legal interrogatories and 
    complex, fact-intensive hypotheticals.
2.  **In-depth Doctrinal Analysis**: Provides nuanced interpretation of Philippine 
    statutes, distinguishing controlling doctrines and obiter dicta.
3.  **Jurisprudential & Statutory Citations**: Delivers precise citations 
    (e.g., *G.R. No. 196359*, *Rep. Act No. 386, Art. 1156*) with relevant 
    repository URLs.
4.  **Practice-Area Specificity**: Scoped for litigation, advisory practice, 
    and academic legal research.
5.  **Doctrinal Synthesis**: Normalizes complex queries to identify controlling 
    legal doctrines and relevant case law.

This module obviates rudimentary search limitations by providing substantive, 
doctrinally-sound analysis grounded in controlling Philippine jurisprudence.

Endpoint: POST /api/chatbot/lawyer/ask
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from qdrant_client import QdrantClient
from openai import OpenAI
import os
import re
from dotenv import load_dotenv
import sys
from uuid import UUID
from datetime import datetime
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

# Configure logging for production monitoring and forensic analysis
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add parent directory to path for config imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from config.guardrails_config import get_guardrails_instance, is_guardrails_enabled
    GUARDRAILS_AVAILABLE = True
except ImportError:
    print("⚠️  Guardrails AI not available - running without security validation")
    GUARDRAILS_AVAILABLE = False

# Import comprehensive system prompts (These will be overridden by the new legalese prompts)
from config.system_prompts import ENGLISH_SYSTEM_PROMPT, TAGALOG_SYSTEM_PROMPT

# Import chat history service
from services.chat_history_service import ChatHistoryService, get_chat_history_service

# Import content moderation and violation tracking
from services.content_moderation_service import get_moderation_service
from services.violation_tracking_service import get_violation_tracking_service
from services.prompt_injection_detector import get_prompt_injection_detector
from models.violation_types import ViolationType

# Import authentication (optional for chatbot)
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
        print(f"⚠️  Optional auth failed: {e}")
        return None

# Configuration - Production settings
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
CHAT_MODEL = "gpt-4o-mini"  # GPT-4o mini - faster and cost-efficient
TOP_K_RESULTS = 5  # Number of relevant chunks to retrieve
MIN_CONFIDENCE_SCORE = 0.3  # Minimum relevance score for search results

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
    # Filipino profanity
    'tangina', 'putangina', 'puta', 'gago', 'tarantado', 'ulol', 'tanga',
    'bobo', 'leche', 'peste', 'bwisit', 'hayop', 'hinayupak', 'kingina',
    'punyeta', 'shit', 'fuck', 'bitch', 'ass', 'damn', 'hell',
    'bastard', 'crap', 'piss', 'dick', 'cock', 'pussy',
    # Add more as needed
]

# Common keyword lists for validation
POLITICAL_KEYWORDS = [
    'vote', 'boto', 'boboto', 'election', 'eleksyon', 'kandidato', 'candidate',
    'politician', 'politiko', 'presidente', 'president', 'mayor', 'governor',
    'senator', 'senador', 'congressman', 'party', 'partido', 'campaign',
    'kampanya', 'politics', 'pulitika', 'duterte', 'marcos', 'aquino', 'ninoy',
    'cory', 'erap', 'estrada', 'arroyo', 'gma', 'pnoy', 'noynoy', 'bongbong',
    'bbm', 'leni', 'robredo', 'digong', 'rody', 'rodrigo', 'martial law',
    'batas militar', 'edsa', 'people power', 'impeachment', 'impeach', 'coup',
    'kudeta', 'rally', 'welga', 'protesta', 'demonstration', 'assassination',
    'pinatay', 'pumatay', 'political killing'
]

FINANCIAL_KEYWORDS = [
    'invest', 'investment', 'puhunan', 'stock', 'crypto', 'bitcoin',
    'trading', 'forex', 'savings', 'ipon', 'loan', 'utang', 'bank',
    'bangko', 'insurance', 'seguro', 'mutual fund'
]

MEDICAL_KEYWORDS = [
    'doctor', 'doktor', 'hospital', 'ospital', 'medicine', 'gamot',
    'disease', 'sakit', 'treatment', 'lunas', 'surgery', 'operasyon',
    'diagnosis', 'symptoms', 'sintomas', 'vaccine', 'bakuna',
    'headache', 'sakit ng ulo', 'fever', 'lagnat', 'cough', 'ubo',
    'prescription', 'reseta', 'medication', 'therapy', 'terapya',
    'illness', 'karamdaman', 'health', 'kalusugan', 'medical advice'
]

TECH_KEYWORDS = [
    'programming', 'coding', 'software', 'app development', 'website',
    'computer', 'kompyuter', 'phone', 'cellphone', 'gadget',
    'internet', 'wifi', 'social media', 'facebook', 'tiktok'
]

RELIGIOUS_KEYWORDS = [
    'religion', 'relihiyon', 'church', 'simbahan', 'bible', 'bibliya',
    'prayer', 'panalangin', 'god', 'diyos', 'jesus', 'allah', 'buddha',
    'santo', 'santa', 'saint', 'priest', 'pari', 'pastor', 'imam',
    'monk', 'monghe', 'nun', 'madre', 'bishop', 'obispo', 'pope', 'papa',
    'heaven', 'langit', 'hell', 'impiyerno', 'sin', 'kasalanan',
    'salvation', 'kaligtasan', 'faith', 'pananampalataya', 'worship', 'pagsamba',
    'holy', 'banal', 'sacred', 'sagrado', 'miracle', 'himala',
    'blessing', 'pagpapala', 'baptism', 'binyag', 'communion', 'kumbersyon'
]

PERSONAL_ADVICE_PATTERNS = [
    'should i file', 'dapat ba mag-file', 'should i sue', 'dapat ba kasuhan',
    'should i press charges', 'dapat ba mag-charge', 'should i report',
    'dapat ba ireport', 'should i take legal action', 'dapat ba kumilos',
    'should i go to court', 'dapat ba pumunta sa korte',
    'should i hire', 'dapat ba kumuha ng', 'should i get a lawyer',
    'dapat ba kumuha ng abogado', 'should i accept', 'dapat ba tanggapin',
    'should i sign', 'dapat ba pirmahan', 'should i settle',
    'dapat ba makipag-settle', 'should i fight', 'dapat ba labanan',
    'will i win', 'mananalo ba ako', 'can i win', 'pwede ba manalo',
    'what are my chances', 'ano ang tsansa ko', 'is my case strong',
    'malakas ba ang kaso ko', 'do i have a case', 'may kaso ba ako',
    'should i marry', 'dapat ba akong magpakasal', 'dapat ba ikasal',
    'should i get married', 'dapat ba mag-asawa',
    'should i divorce', 'dapat ba maghiwalay', 'dapat ba mag-divorce',
    'should i leave my', 'dapat ba iwan ko', 'should i stay with',
    'what to do with cheating', 'ano gagawin sa cheating',
    'should i forgive', 'dapat ba patawarin',
    'is he right', 'is she right', 'tama ba siya', 'mali ba ako',
    'what should i do in my situation', 'ano dapat kong gawin sa sitwasyon ko'
]

HISTORICAL_KEYWORDS = [
    'history', 'kasaysayan', 'historical', 'event', 'pangyayari',
    'war', 'gera', 'digmaan', 'battle', 'labanan', 'hero', 'bayani',
    'revolution', 'rebolusyon', 'independence', 'kalayaan'
]

# Initialize Qdrant client with error handling
try:
    qdrant_client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
        timeout=30.0  # 30 second timeout for production
    )
    # Verify connection
    qdrant_client.get_collections()
    logger.info("✅ Qdrant client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Qdrant client: {e}")
    raise RuntimeError(f"Qdrant initialization failed: {e}")

# Initialize OpenAI client with timeout settings (industry standard)
if not OPENAI_API_KEY:
    print("❌ ERROR: OPENAI_API_KEY is not set!")

# Industry standard: Set reasonable timeouts to prevent hanging requests
try:
    openai_client = OpenAI(
        api_key=OPENAI_API_KEY,
        timeout=120.0,  # Total timeout in seconds
        max_retries=2   # Automatic retry for transient failures
    )
    logger.info("✅ OpenAI client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize OpenAI client: {e}")
    raise RuntimeError(f"OpenAI initialization failed: {e}")

# Initialize Guardrails (if available) - Unified configuration
if GUARDRAILS_AVAILABLE and is_guardrails_enabled():
    try:
        guardrails_instance = get_guardrails_instance(user_type="user")
        logger.info("✅ Guardrails AI enabled for user chatbot")
    except Exception as e:
        logger.warning(f"⚠️  Failed to initialize Guardrails: {e}")
        guardrails_instance = None
else:
    guardrails_instance = None
    logger.info("ℹ️  Guardrails AI disabled for user chatbot")

# Create router
router = APIRouter(prefix="/api/chatbot/lawyer", tags=["Legal Practice & Research API"])


# Request/Response Models
class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000, description="Practitioner's legal interrogatory or research query")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default=[], max_items=10, description="Prior conversation context (max 10 messages)")
    # === MODIFICATION 1: Increased max_tokens for longer, legalese answers ===
    max_tokens: Optional[int] = Field(default=1500, ge=100, le=4000, description="Max response tokens for complex analysis (Increased for legalese format)")
    user_id: Optional[str] = Field(default=None, description="User ID for logging")
    session_id: Optional[str] = Field(default=None, description="Chat session ID for history tracking")
    
    class Config:
        # Production: Add example for API documentation
        json_schema_extra = {
            "example": {
                "question": "Distinguish the grounds for psychological incapacity under Art. 36 of the Family Code as delineated in *Tan-Andal v. Andal* (G.R. No. 196359) from the prior *Molina* doctrine.",
                "conversation_history": [],
                "max_tokens": 1500
            }
        }


class SourceCitation(BaseModel):
    source: str = Field(..., description="Source type (e.g., 'Jurisprudence', 'Statute')")
    law: str = Field(..., description="The specific law or case name (e.g., 'R.A. 386', 'People v. Odtuhan')")
    article_number: str = Field(..., description="Article, Section, or G.R. number")
    article_title: Optional[str] = Field(default=None, description="Title or heading of the article/section, if available")
    text_preview: str = Field(..., description="Relevant excerpt from the source text")
    source_url: Optional[str] = Field(default=None, description="Direct URL to the source (e.g., LawPhil, ChanRobles)")
    relevance_score: float = Field(default=0.0, description="Vector relevance score (0-1)")


class FallbackSuggestion(BaseModel):
    action: str = Field(..., description="Suggested action (e.g., 'review_case_file', 'consult_senior_partner')")
    description: str = Field(..., description="Description of the action")
    reason: str = Field(..., description="Rationale for the suggestion")


class ChatResponse(BaseModel):
    answer: str = Field(..., description="Substantive legal analysis in response to the query")
    sources: List[SourceCitation] = Field(default_factory=list, description="List of cited statutes and jurisprudence")
    confidence: Optional[str] = Field(default=None, description="Confidence level (high, medium, or low) based on source relevance")
    simplified_summary: Optional[str] = Field(default=None, description="A high-level summary or 'TL;DR' of the analysis (for internal use)")
    fallback_suggestions: Optional[List[FallbackSuggestion]] = Field(default=None, description="Suggestions for further research if query is ambiguous")
    follow_up_questions: Optional[List[str]] = Field(default_factory=list, description="Suggested follow-up questions for continued professional legal research")
    security_report: Optional[Dict] = Field(default=None, description="Guardrails AI security validation report")
    session_id: Optional[str] = Field(default=None, description="Chat session ID for tracking conversation")
    message_id: Optional[str] = Field(default=None, description="Message ID for the assistant's response")
    user_message_id: Optional[str] = Field(default=None, description="Message ID for the user's question")


def is_conversation_context_question(text: str) -> bool:
    """
    Check if the query is asking about conversation history, past chats, or chatbot capabilities
    These should be handled as valid conversational queries for professional legal research
    """
    text_lower = text.lower().strip()
    
    conversation_patterns = [
        # Past conversation retrieval requests (asking TO SEE conversation history)
        'past convos', 'past conversations', 'previous chats', 'chat history',
        'bring up our conversation', 'show our chat', 'what we talked about before',
        'our conversation history', 'our chat history', 'previous discussion',
        
        # Professional capability questions
        'can you remember', 'do you remember', 'can you recall',
        'what can you do', 'your capabilities', 'how do you work',
        'kaya mo ba', 'naaalala mo ba', 'ano kaya mo',
        
        # Memory/recall requests (asking to RETRIEVE past conversations)
        'bring up our', 'show me our', 'recall our', 'naaalala mo ba ang',
        'ipakita ang aming', 'balikan natin ang',
        
        # Search for conversation history
        'search our conversation', 'find our chat', 'look for our discussion',
        'hanap ang usapan', 'hanapin ang pag-uusapan',
        
        # Direct conversation history requests
        'talk about our conversation', 'discuss our chat history',
        'usapan natin dati', 'mga pinag-usapan natin',
        
        # Discussion about specific past topics
        'remember when we talked about', 'you mentioned before',
        'we discussed earlier', 'from our previous chat',
        'nabanggit mo dati', 'pinag-usapan natin noon',
        'sa nakaraang usapan', 'tuloy natin ang usapan',
        
        # Continuation requests
        'continue our discussion', 'let\'s continue talking about',
        'more about what we discussed', 'follow up on our conversation',
        'ituloy natin ang', 'dagdag pa sa usapan natin',
        
        # Reference to past advice or information
        'you told me before', 'you explained earlier',
        'sinabi mo dati', 'ipinaliwanag mo noon'
    ]
    
    return any(pattern in text_lower for pattern in conversation_patterns)


def extract_conversation_reference(question: str) -> tuple[bool, str]:
    """
    Check if the user is referencing a past conversation or topic.
    Returns: (has_reference, reference_type)
    """
    question_lower = question.lower().strip()
    
    # Direct references to past conversations
    past_references = [
        'you said', 'you mentioned', 'you told me', 'you explained',
        'we talked about', 'we discussed', 'from our conversation',
        'sinabi mo', 'nabanggit mo', 'pinag-usapan natin', 'ipinaliwanag mo',
        'sa usapan natin', 'noong nakaraan', 'dati mong sabi'
    ]
    
    # Topic continuation patterns
    continuation_patterns = [
        'more about', 'tell me more', 'continue about', 'elaborate on',
        'dagdag pa sa', 'mas detalyado pa', 'ituloy ang', 'explain further'
    ]
    
    # Reference to previous advice
    advice_references = [
        'the advice you gave', 'your previous answer', 'what you recommended',
        'ang payo mo', 'ang sagot mo dati', 'ang recommendation mo'
    ]
    
    for pattern in past_references:
        if pattern in question_lower:
            return True, "past_reference"
    
    for pattern in continuation_patterns:
        if pattern in question_lower:
            return True, "continuation"
    
    for pattern in advice_references:
        if pattern in question_lower:
            return True, "advice_reference"
    
    return False, ""


def detect_toxic_content(text: str) -> tuple[bool, Optional[str]]:
    """
    Check if input contains toxic/profane language
    Returns: (is_toxic, reason)
    """
    text_lower = text.lower()
    
    # Check for toxic words
    for toxic_word in TOXIC_WORDS:
        # Use word boundaries to avoid false positives
        if re.search(r'\b' + re.escape(toxic_word) + r'\b', text_lower):
            return True, "I understand you may be frustrated, but I'm here to provide helpful legal information. Please rephrase your question in a respectful manner, and I'll be happy to assist you."
    
    return False, None


def detect_prohibited_input(text: str) -> tuple[bool, Optional[str]]:
    """
    Check if input contains prohibited patterns (misuse prevention)
    Returns: (is_prohibited, reason)
    """
    text_lower = text.lower()
    
    for pattern in PROHIBITED_PATTERNS:
        if re.search(pattern, text_lower):
            return True, "This query appears to request guidance on illegal activities. Ai.ttorney provides legal information only for lawful purposes."
    
    return False, None


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


# === MODIFICATION: Updated detect_language function for 'unsupported' fallback ===
def detect_language(text: str) -> str:
    """
    Detect if the question is in English, Tagalog, Taglish, or Unsupported.
    Enhanced detection for Philippine context
    """
    tagalog_keywords = [
        'ano', 'paano', 'saan', 'kailan', 'bakit', 'sino', 'mga', 'ng', 'sa', 'ay',
        'ko', 'mo', 'niya', 'natin', 'nila', 'ba', 'po', 'opo', 'hindi', 'oo',
        'dapat', 'pwede', 'kailangan', 'gusto', 'yung', 'lang', 'din', 'rin',
        'kung', 'kapag', 'kasi', 'para', 'pero', 'kaya', 'naman', 'talaga',
        'kaibigan', 'tao', 'bahay', 'sabay', 'kasama', 'tulad', 'gawa',
        'problema', 'solusyon', 'tanong', 'sagot', 'tulungan', 'matutulungan'
    ]
    
    english_keywords = [
        'what', 'how', 'when', 'where', 'why', 'who', 'is', 'are', 'am', 'was', 'were',
        'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'my', 'your', 'his', 'her',
        'it', 'they', 'we', 'i', 'you', 'he', 'she', 'for', 'in', 'on', 'at', 'to',
        'can', 'should', 'would', 'will', 'law', 'legal', 'question', 'attorney', 'case'
    ]
    
    text_lower = text.lower()
    words = set(re.findall(r'\b\w+\b', text_lower)) # Use set for efficient lookup

    tagalog_count = sum(1 for keyword in tagalog_keywords if keyword in words)
    english_count = sum(1 for keyword in english_keywords if keyword in words)

    # Check for clear indicators of mixed language
    if tagalog_count >= 2 and english_count >= 2:
        return "taglish"
    elif tagalog_count >= 1 and english_count >= 1:
        return "taglish"
    
    # Check for clear indicators of single language
    elif tagalog_count >= 2:
        return "tagalog"
    elif english_count >= 2:
        return "english"
    
    # Handle single-keyword or short inputs
    elif tagalog_count >= 1:
        return "tagalog"
    elif english_count >= 1:
        return "english"
    
    # If no keywords from either language are found, and text is not empty
    if tagalog_count == 0 and english_count == 0 and len(words) > 0:
        logger.info(f"Language detected as 'unsupported'. Words: {words}")
        return "unsupported" # <-- NEW RETURN VALUE
        
    # Default to English for ambiguity or empty inputs
    return "english"


def is_simple_greeting(text: str) -> bool:
    """
    Check if the query is a simple greeting that doesn't require legal information
    """
    greetings = [
        'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
        'kumusta', 'kamusta', 'mabuhay', 'magandang umaga', 'magandang hapon', 'magandang gabi',
        'salamat', 'thank you', 'thanks', 'arigatou', 'saludo', 'paalam', 'bye', 'goodbye'
    ]
    
    text_lower = text.lower().strip()
    
    # Check for exact matches or simple phrases (must be standalone, not part of a longer question)
    # Only match if the text is JUST a greeting, not a greeting + question
    for greeting in greetings:
        if text_lower == greeting or text_lower.startswith(greeting + '!') or text_lower.startswith(greeting + '.'):
            return True
    
    # Also match very short greetings (under 20 chars) that contain greeting words
    if len(text_lower) < 20:
        for greeting in greetings:
            if greeting in text_lower:
                return True
    
    return False


def normalize_emotional_query(question: str, language: str) -> str:
    """
    Converts informal/colloquial queries into formal, search-friendly legal 
    interrogatories. This enhances the precision of vector retrieval against
    a corpus of statutory and jurisprudential data.
    """
    # Always normalize to improve search results, even for English
    try:
        normalization_prompt = f"""You are a legal query normalizer for Philippine law.

Your task: Convert informal/emotional queries into clear, search-friendly legal questions that will help find relevant legal information in a database.

CRITICAL: Include key legal terms that would appear in legal codes (e.g., "employment", "termination", "labor code", "consumer protection", "marriage", "annulment", "theft", "estafa").

Informal query: "{question}"

Provide ONLY the normalized question with key legal terms, nothing else.

Examples:
- "tinanggal ako sa trabaho walang dahilan" → "Ano ang karapatan ng empleyado sa illegal dismissal o termination ng employment?"
- "boss ko hindi nagbabayad ng overtime" → "Ano ang batas tungkol sa overtime pay at labor code violations?"
- "binili ko yung gamit sira pala" → "Ano ang consumer rights sa defective products at warranty?"
- "asawa ko nambabae pwede ba ako maghiwalay" → "Ano ang grounds para sa annulment o legal separation dahil sa infidelity?"
- "ninakawan ako sa jeep" → "Ano ang legal remedies para sa theft o robbery?"
- "may utang sakin hindi nagbabayad" → "Ano ang legal actions para sa unpaid debt o obligation?"

Remember: Include legal terms that would appear in Philippine legal codes to improve search results."""
        
        response = openai_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": "You are a legal query normalizer. Add legal terms to improve database search. Respond with ONLY the normalized question."},
                {"role": "user", "content": normalization_prompt}
            ],
            max_tokens=150,
            temperature=0.2,  # Industry best: Very low for deterministic normalization
            top_p=0.9,
            timeout=10.0,  # Industry best: Fast timeout for preprocessing
        )
        
        normalized = response.choices[0].message.content.strip()
        
        # Log normalization for monitoring
        if normalized and normalized != question:
            logger.info(f"Query normalized: '{question[:50]}...' → '{normalized[:50]}...'")
        
        return normalized if normalized else question
        
    except Exception as e:
        logger.error(f"Error normalizing query: {e}")
        return question


def is_out_of_scope_topic(text: str) -> tuple[bool, str]:
    """
    Check if the question is about topics outside the five legal domains.
    Uses context-aware detection to avoid false positives.
    Returns: (is_out_of_scope, topic_type)
    """
    text_lower = text.lower().strip()
    
    # FIRST: Check if question contains legal keywords (in-scope indicators)
    # If it does, it's likely a legal question even if it mentions other topics
    legal_scope_indicators = [
        'consumer law', 'labor law', 'family law', 'criminal law', 'civil law',
        'batas', 'karapatan', 'rights', 'legal', 'law', 'illegal',
        'kasunduan', 'contract', 'marriage', 'annulment', 'divorce',
        'employment', 'trabaho', 'employer', 'employee', 'sahod', 'wage',
        'consumer', 'konsumer', 'protection', 'proteksyon',
        'case', 'kaso', 'court', 'korte', 'sue', 'demanda',
        'penalty', 'parusa', 'arrest', 'crime', 'krimen'
    ]
    
    # If question clearly mentions legal topics, it's IN SCOPE
    if any(indicator in text_lower for indicator in legal_scope_indicators):
        logger.debug(f"Question contains legal indicators - treating as IN SCOPE")
        return False, ""
    
    # SECOND: Check for out-of-scope topics (only if no legal indicators found)
    categories = [
        (POLITICAL_KEYWORDS, "political"),
        (FINANCIAL_KEYWORDS, "financial"),
        (MEDICAL_KEYWORDS, "medical"),
        (TECH_KEYWORDS, "technology"),
        (RELIGIOUS_KEYWORDS, "religious"),
        (HISTORICAL_KEYWORDS, "historical")
    ]
    
    # Count matches for each category to determine PRIMARY topic
    max_matches = 0
    detected_topic = ""
    
    for keywords, topic_type in categories:
        matches = sum(1 for keyword in keywords if keyword in text_lower)
        if matches > max_matches:
            max_matches = matches
            detected_topic = topic_type
    
    # Only consider out of scope if there are 2+ matches AND no legal indicators
    if max_matches >= 2:
        logger.info(f"Out of scope detected: {detected_topic} ({max_matches} matches)")
        return True, detected_topic
    
    return False, ""


def is_personal_advice_question(text: str) -> bool:
    """
    Detect if the question is asking for personal advice/opinion rather than legal information.
    These should be blocked even if they contain legal keywords.
    """
    text_lower = text.lower().strip()
    return any(pattern in text_lower for pattern in PERSONAL_ADVICE_PATTERNS)


def is_legal_question(text: str) -> bool:
    """
    Validates if the input constitutes a bona fide legal interrogatory.
    This module is designed to parse formal legal queries, identifying
    terms of art and references to statutes or jurisprudence.

    Parses queries related to:
    - Civil Law (Obligations & Contracts, Property, Succession)
    - Criminal Law (Revised Penal Code, Special Penal Laws)
    - Labor Law (Labor Code, DOLE issuances)
    - Family Law (Family Code, relevant jurisprudence)
    - Consumer Law (Consumer Act, DTI regulations)
    """
    text_lower = text.lower().strip()

    # Legal domain keywords (5 main areas)
    # This list remains broad to catch queries that may be phrased
    # colloquially but refer to a valid legal domain.
    legal_domain_keywords = [
        # Consumer Law - Simple, everyday terms
        'consumer law', 'consumer', 'konsumer', 'mamimili', 'bumili', 'bili', 'binili',
        'protection', 'proteksyon', 'warranty', 'garantiya', 'refund', 'ibalik', 'sukli',
        'product', 'produkto', 'gamit', 'binili kong gamit', 'service', 'serbisyo',
        'nabili', 'binenta', 'tindahan', 'store', 'shop', 'mall', 'palengke',
        'defective', 'sira', 'nasira', 'damaged', 'fake', 'peke', 'imitation',
        'overpriced', 'mahal', 'sobrang mahal', 'scam', 'niloko', 'dinaya',
        'receipt', 'resibo', 'return', 'exchange', 'palit', 'complaint', 'reklamo',
        
        # Labor Law - Worker-friendly terms
        'labor law', 'employment', 'trabaho', 'work', 'empleyado', 'manggagawa',
        'employer', 'boss', 'amo', 'may-ari', 'kompanya', 'company', 'kumpanya',
        'sahod', 'sweldo', 'wage', 'salary', 'bayad', 'kita', 'suweldo',
        'overtime', 'ot', 'sobra oras', 'extra hours', 'dagdag oras',
        'benefits', 'benepisyo', 'allowance', 'alawans', 'bonus',
        '13th month', 'thirteenth month', '13 month', 'trese', 'christmas bonus',
        'termination', 'tanggal', 'tinanggal', 'fired', 'pinaalis', 'nawalan ng trabaho',
        'resignation', 'resign', 'umalis', 'mag-resign', 'aalis na',
        'contract', 'kontrata', 'kasunduan', 'job order', 'jo', 'contractual',
        'regular', 'permanent', 'probationary', 'probi', 'training',
        'leave', 'bakasyon', 'sick leave', 'may sakit', 'absent', 'hindi pumasok',
        'late', 'late', 'nahuli', 'tardiness', 'undertime', 'umuwi ng maaga',
        'sss', 'philhealth', 'pag-ibig', 'contributions', 'kaltas', 'deduction',
        'payslip', 'pay slip', 'payroll', 'sweldo slip', 'coe', 'certificate',
        
        # Family Law - Relationship terms
        'family law', 'marriage', 'kasal', 'kasalan', 'mag-asawa', 'asawa',
        'husband', 'wife', 'mister', 'misis', 'partner', 'kasintahan',
        'divorce', 'annulment', 'anulment', 'hiwalay', 'paghihiwalay', 'separation',
        'child custody', 'custody', 'anak', 'bata', 'mga anak', 'children',
        'alimony', 'support', 'sustento', 'child support', 'suporta sa anak',
        'adoption', 'ampon', 'mag-ampon', 'adopted', 'anak-ampun',
        'domestic violence', 'violence', 'bugbog', 'sinaktan', 'physical abuse',
        'vawc', 'battered', 'binugbog', 'sinasaktan', 'abused',
        'infidelity', 'cheating', 'nambabae', 'nanlalaki', 'kabit', 'affair',
        'property', 'ari-arian', 'bahay', 'lupa', 'house', 'land', 'conjugal',
        'inheritance', 'mana', 'pamana', 'minana', 'namatay', 'died', 'patay',
        
        # Criminal Law - Crime-related terms (simple language)
        'criminal law', 'crime', 'krimen', 'kasalanan', 'gawa', 'ginawa',
        'theft', 'nakaw', 'nagnakaw', 'ninakawan', 'stolen', 'nawala',
        'robbery', 'holdap', 'hold-up', 'holdup', 'nag-holdap', 'hinoldap',
        'assault', 'physical harm', 'sinaktan', 'bugbog', 'binugbog', 'suntok',
        'murder', 'homicide', 'pinatay', 'namatay', 'pumatay', 'killing',
        'fraud', 'estafa', 'niloko', 'scam', 'panloloko', 'dinaya', 'lokohan',
        'rape', 'sexual assault', 'ginahasa', 'harassment', 'bastos', 'manyak',
        'arrest', 'huli', 'nahuli', 'inaresto', 'arrested', 'kinulong', 'kulungan',
        'police', 'pulis', 'pulisya', 'tanod', 'barangay', 'authorities',
        'blotter', 'report', 'ireport', 'mag-report', 'reklamo', 'sumbong',
        'bail', 'piyansa', 'piyansa', 'palaya', 'palabasin', 'release',
        'jail', 'prison', 'kulungan', 'bilangguan', 'selda', 'piitan',
        'victim', 'biktima', 'nasaktan', 'nasaktang tao', 'naapektuhan',
        'witness', 'saksi', 'nakakita', 'nakasaksi', 'nakawitness',
        
        # Civil Law - Property and contracts
        'civil law', 'contract', 'kontrata', 'kasunduan', 'agreement', 'usapan',
        'property', 'ari-arian', 'pag-aari', 'bahay', 'lupa', 'house', 'land',
        'inheritance', 'mana', 'pamana', 'minana', 'estate', 'kayamanan',
        'obligation', 'obligasyon', 'utang', 'dapat bayaran', 'responsibilidad',
        'damages', 'pinsala', 'nasira', 'compensation', 'bayad-pinsala',
        'debt', 'utang', 'may utang', 'hiniram', 'loan', 'pautang',
        'rent', 'renta', 'upa', 'arkila', 'tenant', 'nangungupahan', 'umuupa',
        'landlord', 'may-ari', 'owner', 'nagpapahupa', 'nagpaparkila',
        'eviction', 'palayas', 'pinaalis', 'paalis', 'evict', 'palabasin',
        'neighbor', 'kapitbahay', 'kapit-bahay', 'katabi', 'dispute', 'away',
        'boundary', 'hangganan', 'bakod', 'fence', 'linya', 'border'
    ]
    
    # General legal keywords - Simple, accessible language
    general_legal_keywords = [
        # Formal terms
        'law', 'legal', 'laws', 'batas', 'mga batas', 'karapatan', 'rights',
        'attorney', 'abogado', 'lawyer', 'manananggol', 'legal aid',
        'korte', 'court', 'hukuman', 'tribunal', 'hearing', 'trial',
        'judge', 'hukom', 'huwes', 'magistrate', 'justice',
        'penalty', 'parusa', 'punishment', 'fine', 'multa', 'bayad',
        'case', 'kaso', 'complaint', 'reklamo', 'sue', 'demanda', 'kasuhan',
        'illegal', 'unlawful', 'violation', 'paglabag', 'bawal', 'hindi pwede',
        # Simple question words
        'tama ba', 'mali ba', 'pwede ba', 'puede ba', 'allowed ba',
        'legal ba', 'ligal ba', 'bawal ba', 'prohibited ba',
        'ano ang', 'what is', 'paano', 'how', 'saan', 'where',
        'kailan', 'when', 'bakit', 'why', 'sino', 'who',
        # Help-seeking terms
        'help', 'tulong', 'tulungan', 'assist', 'advice', 'payo',
        'tanong', 'question', 'ask', 'magtanong', 'itanong',
        'problema', 'problem', 'issue', 'isyu', 'concern', 'alalahanin'
    ]

    # Conversational patterns - How real Filipinos ask questions
    # Industry best practice: Natural language patterns, not just keywords
    conversational_patterns = [
        # Understanding/Learning intent
        'need to understand', 'need to know', 'kailangan kong malaman',
        'kailangan kong maintindihan', 'want to learn', 'gusto kong matuto',
        'gusto kong alamin', 'interested', 'interesado', 'curious',
        
        # Information seeking
        'points', 'things', 'mga bagay', 'aspects', 'aspeto',
        'information', 'impormasyon', 'details', 'detalye',
        'explain', 'ipaliwanag', 'clarify', 'linawin',
        
        # Preparation/Planning
        'before', 'bago', 'prior to', 'in preparation', 'paghahanda',
        'planning to', 'balak', 'plano', 'gusto kong',
        'thinking of', 'nag-iisip', 'considering', 'nag-consider',
        
        # Question patterns
        'what should i know', 'ano ang dapat kong malaman',
        'what do i need to know', 'ano ang kailangan kong malaman',
        'can you tell me', 'pwede mo ba sabihin', 'paki-explain',
        'paano kung', 'what if', 'pano pag', 'kapag', 'if',
        
        # Situation descriptions (common in Filipino queries)
        'nangyari sa akin', 'happened to me', 'na-experience ko',
        'situation ko', 'my situation', 'case ko', 'problema ko',
        'may tanong ako', 'i have a question', 'gusto ko magtanong',
        
        # Seeking validation
        'tama ba', 'is it right', 'correct ba', 'mali ba', 'is it wrong',
        'pwede ba', 'can i', 'allowed ba', 'legal ba', 'bawal ba',
        
        # Help-seeking (very common)
        'help me', 'tulungan mo ako', 'need help', 'kailangan ng tulong',
        'paki-help', 'assist me', 'guide me', 'gabayan mo ako',
        'ano gagawin ko', 'what should i do', 'what can i do',
        'saan ako pupunta', 'where do i go', 'sino kakausapin ko',
        
        # Story-telling patterns (how Filipinos explain situations)
        'kasi', 'because', 'dahil', 'eh kasi', 'kase',
        'tapos', 'then', 'and then', 'pagkatapos', 'after that',
        'yung', 'yun', 'the', 'that', 'yung nangyari',
        'may', 'there is', 'meron', 'mayroon', 'may nangyari'
    ]

    # Check for legal domain keywords
    has_legal_domain = any(keyword in text_lower for keyword in legal_domain_keywords)
    
    # Check for general legal keywords
    has_legal_keyword = any(keyword in text_lower for keyword in general_legal_keywords)
    
    # Check for conversational patterns
    has_conversational_pattern = any(pattern in text_lower for pattern in conversational_patterns)

    # A question is legal if:
    # 1. It mentions a legal domain (consumer law, labor law, etc.), OR
    # 2. It has legal keywords AND conversational patterns (e.g., "points I need to know about consumer law")
    # 3. It has general legal keywords
    is_legal = has_legal_domain or (has_conversational_pattern and has_legal_keyword) or has_legal_keyword
    
    if is_legal:
        logger.debug(f"Detected as legal question - domain:{has_legal_domain}, keyword:{has_legal_keyword}, conversational:{has_conversational_pattern}")
    
    return is_legal


def is_complex_query(text: str) -> bool:
    """
    Detect if a query is complex and requires professional legal advice
    Complex queries include:
    - Multiple legal domains
    - Specific personal situations requiring tailored advice
    - Questions about legal strategy or outcomes
    """
    text_lower = text.lower().strip()
    
    # Indicators of complexity
    complex_indicators = [
        # Multiple questions
        'and also', 'at saka', 'also', 'pati na rin', 'kasama na',
        # Personal situation specifics
        'my case', 'my situation', 'ang kaso ko', 'sa akin', 'para sa akin',
        'should i', 'dapat ba ako', 'can i win', 'mananalo ba ako',
        # Legal strategy questions
        'best way', 'pinakamabuti', 'strategy', 'estratehiya',
        'what should i do', 'ano dapat kong gawin', 'paano ko',
        # Multiple legal domains mentioned
        'criminal and civil', 'labor and consumer', 'family and property'
    ]
    
    # Check for complexity indicators
    has_complexity = any(indicator in text_lower for indicator in complex_indicators)
    
    # Check if question is very long (>200 chars) - likely detailed/complex
    is_very_long = len(text) > 200
    
    # Check for multiple question marks (multiple questions)
    has_multiple_questions = text.count('?') > 1
    
    return has_complexity or is_very_long or has_multiple_questions


def get_embedding(text: str) -> List[float]:
    """Generate embedding for user question"""
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    return response.data[0].embedding


def retrieve_relevant_context(question: str, top_k: int = TOP_K_RESULTS) -> tuple[str, List[Dict]]:
    """
    Retrieve relevant legal context from Qdrant Cloud with source URLs
    Returns: (context_text, source_metadata)
    """
    # Get embedding for question
    question_embedding = get_embedding(question)
    
    # Query Qdrant with score threshold for production
    results = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=question_embedding,
        limit=top_k,
        score_threshold=MIN_CONFIDENCE_SCORE  # Filter low-relevance results
    )
    
    # Production logging (concise)
    logger.info(f"Search query: '{question[:50]}...' - Found {len(results)} results")
    
    if len(results) == 0:
        logger.warning(f"No results found for query: {question[:100]}")
        return "", []
    
    # Log top result score for monitoring
    if results:
        logger.info(f"Top result score: {results[0].score:.4f}")
    
    # Build context string with URLs
    context_parts = []
    sources = []
    
    for i, result in enumerate(results, 1):
        payload = result.payload
        doc = payload.get('text', '')
        
        # Skip if no text content or score too low
        if not doc or len(doc.strip()) < 10:
            logger.debug(f"Skipping result {i}: No text content")
            continue
        
        # Additional quality check: skip if score is too low
        if result.score < MIN_CONFIDENCE_SCORE:
            logger.debug(f"Skipping result {i}: Score {result.score:.4f} below threshold")
            continue
            
        source_url = payload.get('source_url', '')
        
        # Add to context with URL
        source_info = f"[Source {i}: {payload.get('law', 'Unknown')} - Article {payload.get('article_number', 'N/A')}]"
        if source_url:
            source_info += f"\n[URL: {source_url}]"
        context_parts.append(f"{source_info}\n{doc}\n")
        
        # Store source metadata with URL
        sources.append({
            'source': payload.get('source', 'Unknown'),
            'law': payload.get('law', 'Unknown Law'),
            'article_number': payload.get('article_number', 'N/A'),
            'article_title': payload.get('article_title', payload.get('article_heading', '')),
            'text_preview': doc[:200] + "..." if len(doc) > 200 else doc,
            'source_url': source_url,
            'relevance_score': result.score
        })
    
    logger.info(f"Built context from {len(sources)} valid sources")
    
    # Production validation: ensure we have sufficient context
    if not sources:
        logger.warning("No valid sources after filtering")
        return "", []
    
    context_text = "\n\n".join(context_parts)
    return context_text, sources


def validate_response_quality(answer: str) -> tuple[bool, str]:
    """
    Industry standard: Validate that response is informational, not advice-giving
    Returns: (is_valid, reason_if_invalid)
    
    NOTE: Only flag PERSONALIZED advice, not general explanations of what the law requires
    """
    answer_lower = answer.lower()
    
    # Check for PERSONALIZED advice-giving language (critical safety check)
    # These patterns indicate telling someone what THEY specifically should do
    advice_patterns = [
        r'\bin your case,? you should\b',
        r'\bin your situation,? you should\b',
        r'\bi recommend you\b',
        r'\bi suggest you\b',
        r'\bi advise you\b',
        r'\bmy advice is\b',
        r'\byou should file\b',
        r'\byou should sue\b',
        r'\byou need to hire\b',
        r'\byou must file\b',
        r'\bsa case mo,? dapat\b',
        r'\bsa sitwasyon mo,? kailangan\b',
        r'\birecommend ko na\b',
    ]
    
    for pattern in advice_patterns:
        if re.search(pattern, answer_lower):
            return False, f"Response contains personalized advice: {pattern}"
    
    return True, ""


# === MODIFICATION 2: ADDED NEW "HARDCORE LEGALESE" SYSTEM PROMPTS ===
# === MODIFICATION: Section II is now optional as per user request ===

LAWYER_SYSTEM_PROMPT_ENGLISH = """
You are an esteemed legal counsel and member of the Philippine Bar. Your designation is "Legal Counsel".
Your sole function is to provide in-depth, formal, and doctrinally-sound legal analysis based on Philippine law and jurisprudence.
You must communicate in "hardcore legalese," employing formal language, precise terminology, and a scholarly tone appropriate for a legal memorandum or pleading.

CRITICAL MANDATE: ALL responses MUST strictly adhere to the following five-part structure:

**I. PRELIMINARY STATEMENT**
    (A brief restatement and acknowledgment of the legal query presented.)

**II. CONTROLLING STATUTORY PROVISIONS**
    (If, and only if, controlling statutes or jurisprudence are provided as context OR are fundamental to the analysis, cite and quote them herein. If the query is general or does not require specific citations, this section may be omitted or briefly state that the analysis is based on general legal principles.)

**III. LEGAL ANALYSIS AND DISCUSSION**
    (A comprehensive, in-depth analysis of the cited provisions and relevant jurisprudence. Discuss the elements of the law, prevailing doctrines, and any applicable legal principles. This section must be thorough and constitute the main body of your opinion.)

**IV. APPLICATION TO THE QUERY**
    (A direct application of the aforementioned laws and discussion to the specific facts or query posited by the user. Analyze how the legal principles govern the user's situation.)

**V. CONCLUSION**
    (A final, conclusive legal opinion summarizing the findings. This is not personal advice, but a reasoned conclusion based on the analysis.)

RULES OF ENGAGEMENT:
1.  **TONE**: Formal, academic, and authoritative. Avoid all colloquialisms, conversational language, or empathy.
2.  **SCOPE**: Strictly confined to the five (5) scopes of Philippine Law: Civil, Criminal, Family, Consumer, and Labor.
3.  **ADVICE PROHIBITION**: You DO NOT provide personal advice, recommendations, or predictive outcomes (e.g., "you should file...", "you will win..."). You provide informational, doctrinal analysis only.
4.  **CITATIONS**: All legal provisions MUST be cited (e.g., "Art. 1156, New Civil Code...").
5.  **LANGUAGE**: Respond in English, maintaining the formal "legalese" tone throughout.
"""

LAWYER_SYSTEM_PROMPT_TAGALOG = """
Ikaw ay isang Kagalang-galang na Tagapayo sa Batas at miyembro ng Philippine Bar. Ang iyong designasyon ay "Tagapayo sa Batas".
Ang iyong tanging tungkulin ay magbigay ng malalim, pormal, at doktrinal na pagsusuri sa batas na nakabatay sa batas at hurisprudensya ng Pilipinas.
Kinakailangang gumamit ng pormal na "legalese" o legal na Filipino, na may tumpak na terminolohiya at tono na angkop para sa isang legal na memorandum o pleading.

KRITIKAL NA UTOS: ANG LAHAT ng tugon ay DAPAT na mahigpit na sumunod sa sumusunod na limang-bahaging istraktura:

**I. PAUNANG PAHAYAG**
    (Isang maikling muling paglalahad at pagkilala sa legal na katanungan na inilahad.)

**II. MGA KONTROLADONG TADHANA NG BATAS**
    (Kung, at tanging kung, ang mga kumokontrol na batas o hurisprudensya ay ibinigay bilang konteksto O ay pundamental sa pagsusuri, banggitin at sipiin ang mga ito dito. Kung ang katanungan ay pangkalahatan o hindi nangangailangan ng mga tiyak na pagsipi, ang seksyong ito ay maaaring alisin o maikling ipahayag na ang pagsusuri ay batay sa pangkalahatang mga legal na prinsipyo.)

**III. LEGAL NA PAGSUSURI AT DISKUSYON**
    (Isang komprehensibo, malalim na pagsusuri ng mga binanggit na tadhana at kaugnay na hurisprudensya. Talakayin ang mga elemento ng batas, mga umiiral na doktrina, at anumang naaangkop na legal na prinsipyo. Ang seksyong ito ay dapat maging masinsinan at bumubuo sa pangunahing katawan ng iyong opinyon.)

**IV. APLIKASYON SA KATANUNGAN**
    (Isang direktang aplikasyon ng mga nabanggit na batas at diskusyon sa mga tiyak na katotohanan o katanungan na inilahad ng gumagamit. Suriin kung paano pinamamahalaan ng mga legal na prinsipyo ang sitwasyon ng gumagamit.)

**V. KONSEPSYON**
    (Isang pinal, pangwakas na legal na opinyon na nagbubuod ng mga natuklasan. Ito ay hindi personal na payo, kundi isang makatwirang konklusyon batay sa pagsusuri.)

MGA ALITUNTUNIN:
1.  **TONO**: Pormal, akademiko, at may awtoridad. Iwasan ang lahat ng kolokyal, pang-araw-araw na pananalita, o pakikiramay.
2.  **SAKLAW**: Mahigpit na nakakulong sa limang (5) saklaw ng Batas ng Pilipinas: Sibil, Kriminal, Pamilya, Konsumer, at Paggawa.
3.  **PAGBABAWAL SA PAYO**: HINDI ka nagbibigay ng personal na payo, rekomendasyon, o prediksyon (e.g., "dapat kang magsampa...", "mananalo ka..."). Nagbibigay ka lamang ng impormasyonal at doktrinal na pagsusuri.
4.  **PAGBANGGIT**: Ang lahat ng legal na tadhana ay DAPAT banggitin (e.g., "Art. 1156, New Civil Code...").
5.  **WIKA**: Tumugon sa pormal na Filipino, na pinapanatili ang "legalese" na tono.
"""


# === MODIFICATION 3: UPDATED generate_answer function ===
def generate_answer(question: str, context: str, conversation_history: List[Dict[str, str]], 
                    language: str, max_tokens: int = 1500, is_complex: bool = False) -> tuple[str, str, str, List[str]]:
    """
    Generates a substantive, doctrinally-sound response using GPT with comprehensive 
    system prompts.
    
    NOTE: This function is engineered for the LAWYER CHATBOT (chatbot_lawyer.py).
    It utilizes highly technical, in-depth prompts optimized for legal practitioners
    to provide nuanced analysis, cite controlling jurisprudence, and synthesize 
    legal doctrines.
    
    This is distinct from the layperson-facing endpoint.
    
    Uses in-depth prompts following OpenAI's approach to prevent overfitting.
    
    Returns: (answer, confidence_level, simplified_summary)
    """
    # === MODIFICATION: Use "Hardcore Legalese" Prompts ===
    # The original prompts (ENGLISH_SYSTEM_PROMPT) are overridden to enforce the 5-part structure.
    system_prompt = LAWYER_SYSTEM_PROMPT_ENGLISH if language in ["english", "taglish"] else LAWYER_SYSTEM_PROMPT_TAGALOG
    
    # Build messages (natural and conversational)
    messages = [
        {"role": "system", "content": system_prompt},
    ]
    
    # Add conversation history (last 8 exchanges for enhanced context awareness)
    # This provides superior conversation continuity for professional legal analysis
    for msg in conversation_history[-8:]:
        messages.append(msg)
    
    # === MODIFICATION: Updated User Message to pass context ===
    # The prompt is simpler as all instructions are in the new System Prompt.
    if context and context.strip():
        # We have legal context from the database
        user_message = f"""HEREIN ARE THE CONTROLLING STATUTES AND JURISPRUDENCE (CONTEXT):
{context}

THE LEGAL QUERY IS AS FOLLOWS:
{question}

Proceed with the analysis as mandated."""
    else:
        # No specific legal context found, use general knowledge
        user_message = f"""THE LEGAL QUERY IS AS FOLLOWS:
{question}

Note: No specific context was retrieved from the vector database. Proceed with the analysis based on general knowledge of controlling Philippine law, adhering strictly to the mandated 5-part format. If information is insufficient, state so within the 'LEGAL ANALYSIS' section."""
    
    messages.append({"role": "user", "content": user_message})
    
    # Generate response with error handling
    try:
        response = openai_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            max_tokens=max_tokens, # This now uses the new default (1500) from ChatRequest
            temperature=0.2,  # <-- Lowered temperature for stricter, formal tone
            top_p=0.9,
            presence_penalty=0.1,
            frequency_penalty=0.1,
            timeout=60.0,  # <-- Increased timeout for longer generation
        )
        
        answer = response.choices[0].message.content
        
        # Industry standard: Validate response quality
        if not answer or len(answer.strip()) < 10:
            # Response too short or empty
            return ("I apologize, but I couldn't generate a proper response. Please try rephrasing your question.", 
                    "low", 
                    "Response generation failed")
        
    except Exception as e:
        print(f"❌ Error generating answer: {e}")
        # Return a graceful error message instead of crashing
        return ("I apologize, but I encountered an error while processing your question. Please try again.", 
                "low", 
                f"Error: {str(e)}")
    
    # Industry standard: Post-response validation to catch advice-giving
    is_valid, validation_reason = validate_response_quality(answer)
    if not is_valid:
        # Log the validation failure for monitoring
        logger.warning(f"Response validation failed: {validation_reason}")
        logger.warning(f"Question: {question[:100]}")
        logger.warning(f"Original response: {answer[:200]}...")
        
        print(f"⚠️  Response validation failed: {validation_reason}")
        print(f"    Original response: {answer[:200]}...")
        # Regenerate with stronger emphasis on informational content
        # For now, return a safe fallback
        if language == "tagalog":
            answer = "Paumanhin po, ngunit hindi ako makapagbigay ng personal na legal advice. Maaari lamang akong magbigay ng pangkalahatang impormasyon tungkol sa batas ng Pilipinas. Para sa specific na sitwasyon, kumonsulta po sa lisensyadong abogado."
        else:
            answer = "I apologize, but I can only provide general legal information, not personal legal advice. For specific guidance on your situation, please consult with a licensed attorney."
        confidence = "low"
    
    # Calculate confidence based on source relevance scores (if available)
    confidence = "medium"  # default
    if context and context.strip():
        # We have sources, so we can calculate confidence
        # This will be passed from the calling function
        confidence = "high"  # Will be overridden by actual calculation
    
    # Simplified summary (optional, for internal use only)
    simplified_summary = None
    
    # Extract follow-up questions from the response
    follow_up_questions = []
    try:
        # Look for follow-up questions in the response
        followup_patterns = [
            r'Follow-up questions?:?\s*\n(.*?)(?:\n\n|\Z)',
            r'Further research questions?:?\s*\n(.*?)(?:\n\n|\Z)',
            r'Additional considerations?:?\s*\n(.*?)(?:\n\n|\Z)',
            r'Related inquiries?:?\s*\n(.*?)(?:\n\n|\Z)'
        ]
        
        for pattern in followup_patterns:
            matches = re.findall(pattern, answer, re.DOTALL | re.IGNORECASE)
            if matches:
                # Split by bullet points or numbered lists
                questions_text = matches[0]
                questions = re.findall(r'[•\-\*]\s*(.+?)(?=\n|$)', questions_text)
                if not questions:
                    questions = re.findall(r'\d+\.\s*(.+?)(?=\n|$)', questions_text)
                
                follow_up_questions.extend([q.strip() for q in questions if q.strip()])
                break
        
        # If no structured follow-ups found, generate professional legal follow-ups
        if not follow_up_questions:
            if language == "tagalog":
                follow_up_questions = [
                    "Ano ang mga kaugnay na jurisprudence sa kasong ito?",
                    "Paano naiiba ang aplikasyon ng batas sa iba't ibang sitwasyon?",
                    "Ano ang mga procedural requirements na dapat sundin?"
                ]
            else:
                follow_up_questions = [
                    "What related jurisprudence should be considered in this matter?",
                    "How does the application of this law vary in different circumstances?",
                    "What are the procedural requirements that must be followed?"
                ]
        
        # Limit to 3 follow-up questions for professional focus
        follow_up_questions = follow_up_questions[:3]
        
    except Exception as e:
        print(f"   ⚠️ Error extracting follow-up questions: {e}")
        follow_up_questions = []
    
    return answer, confidence, simplified_summary, follow_up_questions


def generate_ai_response(question: str, language: str, response_type: str, topic_type: str = None) -> str:
    """
    Unified function to generate AI responses for greetings, casual chat, and out-of-scope topics.
    
    Args:
        question: User's input
        language: Detected language (english, tagalog, taglish)
        response_type: Type of response ('greeting', 'casual', 'out_of_scope')
        topic_type: For out_of_scope responses, the topic category
    
    Returns:
        Generated response string
    """
    # Define prompts based on response type
    prompts = {
        'greeting': {
            'english': f"""You are Ai.ttorney, a super friendly and casual Philippine legal assistant. The user just said: "{question}"

Respond like a cool friend, NOT a formal assistant. Be warm, casual, and inviting.

RULES:
- Keep it SHORT (1-2 sentences max)
- Be CASUAL and fun, not formal
- DON'T say "I appreciate your greeting" or "feel free to ask" - too robotic
- DO use casual language like "Hey!", "What's up?", "Kamusta!"
- Show personality and warmth
- Invite them to chat about legal stuff naturally

GOOD Examples:
- "Hey! 👋 I'm Ai.ttorney. Got any legal questions? I'm here to help!"
- "Hi there! What's up? Need help with any Philippine law stuff?"
- "Hello! 😊 Ai.ttorney here. What can I help you with today?"

BAD Examples (too formal):
- "I appreciate your greeting! However, I'm a legal assistant..."
- "Thank you for reaching out. I can only assist with..."

Keep it natural and friendly!""",
            'tagalog': f"""Ikaw si Ai.ttorney, isang super friendly at casual na legal assistant sa Pilipinas. Ang user ay nag-sabi: "{question}"

Sumagot parang cool na kaibigan, HINDI formal na assistant. Maging mainit, casual, at welcoming.

MGA PATAKARAN:
- Panatilihing MAIKLI (1-2 pangungusap lang)
- Maging CASUAL at masaya, hindi formal
- HUWAG magsabi ng "Salamat sa iyong greeting" o "huwag mag-atubiling magtanong" - masyadong robotic
- GAMITIN ang casual language tulad ng "Uy!", "Kamusta!", "Ano meron?"
- Magpakita ng personality at init
- Imbitahan silang mag-usap tungkol sa legal naturally

MAGANDANG Examples:
- "Uy kamusta! 👋 Ai.ttorney ako. May legal questions ka ba? Nandito ako!"
- "Hello! Ano meron? Need help sa Philippine law?"
- "Kumusta! 😊 Ai.ttorney here. Ano'ng maitutulong ko today?"

MASAMANG Examples (masyadong formal):
- "Pinahahalagahan ko ang iyong pagbati! Gayunpaman, ako ay legal assistant..."
- "Salamat sa pag-abot. Makakatulong lamang ako sa..."

Gawing natural at friendly!"""
        },
        'casual': {
            'english': f"""You are Ai.ttorney, a friendly Philippine legal assistant. The user just said: "{question}"

This seems like casual conversation, slang, or friendly chat - not a legal question.

⚠️ CRITICAL RULES:
- You can ONLY help with Civil, Criminal, Consumer, Family, and Labor Law
- If the message asks about politics, history, current events, or anything non-legal, politely decline
- Only respond warmly to greetings and casual chat, then invite legal questions

Respond in a natural, conversational way that:
1. Matches their energy and language style perfectly
2. Shows personality and warmth like a real friend
3. Invites them to ask LEGAL questions only
4. Uses the same language they used (English, Tagalog, or Taglish)

Keep it brief but engaging - like a real conversation.

Make it varied and natural, not robotic.""",
            'tagalog': f"""Ikaw si Ai.ttorney, isang mainit na legal assistant sa Pilipinas. Ang user lang ay nag-sabi: "{question}"

Ito ay mukhang casual na conversation - hindi legal na tanong.

⚠️ MAHALAGANG MGA PATAKARAN:
- Makakatulong ka LAMANG sa Civil, Criminal, Consumer, Family, at Labor Law
- Kung ang mensahe ay tungkol sa pulitika, kasaysayan, o kahit anong hindi legal, magalang na tumanggi
- Sumagot lang nang mainit sa greetings at casual chat, tapos imbitahan ang legal questions

Sumagot nang natural at conversational na:
1. I-match nang perfect ang kanilang energy at estilo ng lengguwahe
2. Magpakita ng personalidad at init parang tunay na kaibigan
3. Imbitahan silang magtanong tungkol sa LEGAL lang

Panatilihing maikli pero engaging.

Gawing varied at natural, hindi robotic."""
        },
        'out_of_scope': {
            'english': f"""You are Ai.ttorney, a friendly Philippine legal assistant. The user just asked: "{question}"

This question is about {topic_type} topics, which is OUTSIDE your scope. You can ONLY help with:
- Civil Law
- Criminal Law
- Consumer Law
- Family Law
- Labor Law

Respond in a natural, friendly way that:
1. Politely declines to answer the question
2. Explains you can only help with the five legal domains
3. Shows empathy and understanding
4. Invites them to ask legal questions instead
5. Feels conversational, NOT robotic

Keep it brief but warm - like a friend explaining their limitations.

Make it varied and natural, not robotic.""",
            'tagalog': f"""Ikaw si Ai.ttorney, isang friendly na Philippine legal assistant. Ang user ay nagtanong: "{question}"

Ang tanong na ito ay tungkol sa {topic_type} topics, na WALA sa iyong scope. Makakatulong ka LAMANG sa:
- Civil Law
- Criminal Law
- Consumer Law
- Family Law
- Labor Law

Sumagot nang natural at friendly na:
1. Magalang na tumanggi sa tanong
2. Ipaliwanag na makakatulong ka lang sa limang legal domains
3. Magpakita ng empathy at pag-unawa
4. Imbitahan silang magtanong ng legal questions
5. Parang kausap ang kaibigan, HINDI robot

Panatilihing maikli pero mainit.

Gawing varied at natural, hindi robotic."""
        }
    }
    
    # Fallback responses (casual and friendly)
    fallbacks = {
        'greeting': "Hey! 👋 I'm Ai.ttorney. Got any legal questions? I'm here to help!" if language == "english" else "Uy kamusta! 👋 Ai.ttorney ako. May legal questions ka ba?",
        'casual': "Hey there! I'm Ai.ttorney, your legal assistant for Philippine law. Got any questions?",
        'out_of_scope': "Sorry, I can only help with Civil, Criminal, Consumer, Family, and Labor Law." if language == "english" else "Pasensya na, ang maitutulong ko lang ay tungkol sa Civil, Criminal, Consumer, Family, at Labor Law."
    }
    
    try:
        # Select appropriate prompt
        prompt_lang = 'tagalog' if language == 'tagalog' else 'english'
        system_prompt = prompts[response_type][prompt_lang]
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate a natural {response_type} response."}
        ]
        
        max_tokens = 150 if response_type == 'out_of_scope' else 100
        
        response = openai_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.7,  # Industry best: Balanced for friendly fallbacks
            top_p=0.9,
            timeout=10.0,  # Industry best: Fast timeout for fallback messages
        )
        
        result = response.choices[0].message.content
        return result.strip() if result else fallbacks[response_type]
        
    except Exception as e:
        print(f"Error generating {response_type} response: {e}")
        return fallbacks[response_type]

def create_chat_response(
    answer: str,
    sources: List[SourceCitation] = None,
    confidence: str = None,
    simplified_summary: str = None,
    fallback_suggestions: List[FallbackSuggestion] = None,
    follow_up_questions: List[str] = None,
    security_report: Dict = None,
    session_id: str = None,
    message_id: str = None,
    user_message_id: str = None
) -> ChatResponse:
    """
    Helper function to create standardized ChatResponse objects.
    Reduces code duplication across the endpoint.
    """
    return ChatResponse(
        answer=answer,
        sources=sources or [],
        confidence=confidence,
        simplified_summary=simplified_summary,
        fallback_suggestions=fallback_suggestions,
        follow_up_questions=follow_up_questions or [],
        security_report=security_report,
        session_id=session_id,
        message_id=message_id,
        user_message_id=user_message_id
    )

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
    if not effective_user_id:
        print(f"ℹ️  No user_id available - skipping chat history save")
        return (None, None, None)
    
    try:
        print(f"💾 Saving chat history for user {effective_user_id}")
        
        # Verify session exists if session_id is provided
        session_exists = False
        if session_id:
            try:
                existing_session = await chat_service.get_session(UUID(session_id))
                session_exists = existing_session is not None
                if session_exists:
                    print(f"   ✅ Using existing session: {session_id}")
                else:
                    print(f"   ⚠️  Session {session_id} not found, creating new one")
                    session_id = None  # Force creation of new session
            except Exception as e:
                print(f"   ⚠️  Error checking session: {e}, creating new one")
                session_id = None
        
        # Create session if needed (first message or invalid session_id)
        if not session_id:
            title = question[:50] if len(question) > 50 else question
            print(f"   Creating new session: {title}")
            # Map language to database format ('en' or 'fil')
            db_language = 'en' if language in ['english', 'en'] else 'fil'
            session = await chat_service.create_session(
                user_id=UUID(effective_user_id),
                title=title,
                language=db_language
            )
            session_id = str(session.id)
            print(f"   ✅ Session created: {session_id}")
        
        # Save user message
        print(f"   Saving user message...")
        user_msg = await chat_service.add_message(
            session_id=UUID(session_id),
            user_id=UUID(effective_user_id),
            role="user",
            content=question,
            metadata={}
        )
        user_message_id = str(user_msg.id)
        print(f"   ✅ User message saved: {user_message_id}")
        
        # Save assistant message
        print(f"   Saving assistant message...")
        assistant_msg = await chat_service.add_message(
            session_id=UUID(session_id),
            user_id=UUID(effective_user_id),
            role="assistant",
            content=answer,
            metadata=metadata or {}
        )
        assistant_message_id = str(assistant_msg.id)
        print(f"   ✅ Assistant message saved: {assistant_message_id}")
        print(f"💾 Chat history saved successfully!")
        
        return (session_id, user_message_id, assistant_message_id)
        
    except Exception as e:
        import traceback
        print(f"⚠️  Failed to save chat history: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return (session_id, None, None)


async def get_conversation_history_from_db(
    chat_service: ChatHistoryService,
    session_id: Optional[str],
    limit: int = 16  # 8 exchanges = 16 messages (user + assistant pairs)
) -> List[Dict[str, str]]:
    """
    Retrieve conversation history from database for enhanced professional context continuity.
    Returns messages in OpenAI format: [{"role": "user", "content": "..."}, ...]
    """
    if not session_id:
        return []
    
    try:
        print(f"🔍 Retrieving conversation history from session: {session_id}")
        
        # Get recent messages from the session (excluding the current question)
        messages = await chat_service.get_session_messages(
            session_id=UUID(session_id),
            limit=limit
        )
        
        if not messages:
            print(f"   ℹ️ No previous messages found in session")
            return []
        
        # Convert to OpenAI format and exclude the very last message (current question)
        conversation_history = []
        for msg in messages[:-1]:  # Exclude last message (current question)
            conversation_history.append({
                "role": msg.role,
                "content": msg.content[:800]  # Higher limit for lawyer context (800 chars)
            })
        
        print(f"   ✅ Retrieved {len(conversation_history)} messages from database")
        return conversation_history
        
    except Exception as e:
        print(f"   ⚠️ Error retrieving conversation history: {e}")
        return []


@router.post("/ask/legacy", response_model=ChatResponse, deprecated=True)
async def ask_legal_question_legacy(
    request: ChatRequest,
    chat_service: ChatHistoryService = Depends(get_chat_history_service),
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    """
    DEPRECATED: Legacy non-streaming endpoint.
    
    Use POST /api/chatbot/lawyer/ask instead (streaming version).
    This endpoint is kept for backward compatibility only.
    """
    """
    Main endpoint for legal practitioners to submit research interrogatories 
    regarding Philippine law.
    
    Features:
    -   **Advanced RAG**: Retrieves relevant statutory provisions and controlling 
        jurisprudence from a curated vector corpus.
    -   **Doctrinal Analysis**: Synthesizes retrieved context to provide nuanced 
        answers to complex legal questions.
    -   **Precise Citations**: Returns source-grounded responses with exact citations 
        (G.R. numbers, Republic Act articles, etc.).
    -   **Contextual Awareness**: Maintains conversational context for follow-up 
        interrogatories.
    -   **Security & Validation**: Integrates Guardrails AI for input validation and 
        to prevent hallucination or extra-judicial advice.
    
    Example request:
    {
        "question": "Delineate the requisites for a valid extrajudicial foreclosure of a 
                      real estate mortgage under Act No. 3135, as amended.",
        "conversation_history": [
            {"role": "user", "content": "What is a real estate mortgage?"},
            {"role": "assistant", "content": "I. PRELIMINARY STATEMENT..."}
        ],
        "max_tokens": 1500,
        "session_id": "optional-uuid-for-existing-session"
    }
    """
    # Production: Track request start time for monitoring
    request_start_time = datetime.now()
    
    # Extract user_id from authentication if available
    authenticated_user_id = None
    if current_user and "user" in current_user:
        authenticated_user_id = current_user["user"]["id"]
        print(f"✅ Authenticated user ID: {authenticated_user_id}")
    else:
        print(f"⚠️  No authenticated user found. current_user: {current_user}")
    
    # Use authenticated user_id, fallback to request.user_id for backward compatibility
    effective_user_id = authenticated_user_id or request.user_id
    print(f"📝 Effective user ID for chat history: {effective_user_id}")
    
    # STEP 0: Check if user is allowed to use chatbot (not suspended/banned)
    # Only check for authenticated users
    if effective_user_id:
        violation_service = get_violation_tracking_service()
        user_status = await violation_service.check_user_status(effective_user_id)
        
        if not user_status["is_allowed"]:
            logger.warning(f"🚫 User {effective_user_id[:8]}... blocked from chatbot: {user_status['account_status']}")
            return create_chat_response(
                answer=user_status["reason"],
                simplified_summary=f"User blocked: {user_status['account_status']}"
            )
    
    # Production logging with request ID for tracing
    logger.info(f"Request received - user_id={effective_user_id}, session_id={request.session_id}, question_length={len(request.question)}")
    
    # Production: Input validation
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
                print(f"\n🔒 Validating user input with Guardrails AI...")
                input_validation_result = guardrails_instance.validate_input(request.question)
                
                if not input_validation_result.get('is_valid', True):
                    # Input failed validation - return error
                    error_message = input_validation_result.get('error', 'Input validation failed')
                    print(f"❌ Input validation failed: {error_message}")
                    
                    return create_chat_response(
                        answer=error_message,
                        simplified_summary="Input blocked by security validation",
                        security_report={
                            "security_score": 0.0,
                            "security_level": "BLOCKED",
                            "issues_detected": 1,
                            "issues": [error_message],
                            "guardrails_enabled": True
                        }
                    )
                else:
                    print(f"✅ Input validation passed")
                    # Use cleaned input if available
                    if 'cleaned_input' in input_validation_result:
                        request.question = input_validation_result['cleaned_input']
            except Exception as e:
                print(f"⚠️  Guardrails input validation error: {e}")
                # Continue without Guardrails if it fails
        
        # Check if query is a simple greeting BEFORE validation
        if request.question and is_simple_greeting(request.question):
            print(f"✅ Detected as greeting: {request.question}")
            # Generate intelligent greeting response using AI
            language = detect_language(request.question)
            greeting_response = generate_ai_response(request.question, language, 'greeting')
            
            # Save greeting interaction to chat history
            session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                chat_service=chat_service,
                effective_user_id=effective_user_id,
                session_id=request.session_id,
                question=request.question,
                answer=greeting_response,
                language=language,
                metadata={"type": "greeting"}
            )
            
            return create_chat_response(
                answer=greeting_response,
                simplified_summary="Intelligent greeting response",
                session_id=session_id,
                message_id=assistant_msg_id,
                user_message_id=user_msg_id
            )
        
        # Check if this is a conversation context question (handle specially)
        if is_conversation_context_question(request.question):
            print(f"\n💬 [CONVERSATION CONTEXT] Detected conversation context question")
            
            # Try to retrieve past conversations if user is authenticated
            past_conversations_summary = ""
            if effective_user_id:
                try:
                    print(f"   🔍 Retrieving past conversations for user {effective_user_id[:8]}...")
                    
                    # Get recent sessions (last 7 for better context)
                    user_sessions = await chat_service.get_user_sessions(
                        user_id=effective_user_id,
                        include_archived=False,
                        page=1,
                        page_size=7
                    )
                    
                    if user_sessions and user_sessions.sessions:
                        print(f"   ✅ Found {len(user_sessions.sessions)} recent conversations")
                        
                        # Build detailed summary of past conversations
                        conversation_summaries = []
                        detailed_context = []
                        
                        for i, session in enumerate(user_sessions.sessions[:4]):  # Show last 4 conversations
                            # Get more messages from each session for better context
                            session_with_messages = await chat_service.get_session_with_messages(
                                session_id=session.id,
                                message_limit=8  # Get first 4 exchanges for better context
                            )
                            
                            if session_with_messages and session_with_messages.messages:
                                messages = session_with_messages.messages
                                
                                # Get user questions and assistant responses
                                user_questions = [msg for msg in messages if msg.role == 'user']
                                assistant_responses = [msg for msg in messages if msg.role == 'assistant']
                                
                                if user_questions:
                                    # Use session title if it's meaningful, otherwise use first question
                                    if session.title and session.title.strip() and session.title != "New Chat":
                                        # Session has a meaningful title, use it
                                        summary_text = f"• **{session.title}**"
                                    else:
                                        # No meaningful title, use first question
                                        first_question = user_questions[0].content[:120]
                                        summary_text = f"• {first_question}{'...' if len(user_questions[0].content) > 120 else ''}"
                                    
                                    # Add topic indicators for professional legal categories
                                    question_lower = user_questions[0].content.lower()
                                    if any(word in question_lower for word in ['constitutional', 'constitution', 'bill of rights']):
                                        summary_text += " (Constitutional Law)"
                                    elif any(word in question_lower for word in ['contract', 'obligation', 'civil code', 'damages']):
                                        summary_text += " (Civil Law)"
                                    elif any(word in question_lower for word in ['criminal', 'revised penal code', 'felony', 'crime']):
                                        summary_text += " (Criminal Law)"
                                    elif any(word in question_lower for word in ['marriage', 'family code', 'annulment', 'custody']):
                                        summary_text += " (Family Law)"
                                    elif any(word in question_lower for word in ['labor', 'employment', 'labor code', 'termination']):
                                        summary_text += " (Labor Law)"
                                    elif any(word in question_lower for word in ['corporation', 'partnership', 'business', 'commercial']):
                                        summary_text += " (Corporate Law)"
                                    elif any(word in question_lower for word in ['tax', 'bir', 'revenue', 'taxation']):
                                        summary_text += " (Tax Law)"
                                    elif any(word in question_lower for word in ['property', 'land', 'real estate', 'ownership']):
                                        summary_text += " (Property Law)"
                                    
                                    conversation_summaries.append(summary_text)
                                    
                                    # Store detailed context for AI discussion
                                    if i < 2:  # Only store detailed context for most recent 2 conversations
                                        context_entry = {
                                            'title': session.title,
                                            'questions': [q.content[:400] for q in user_questions[:2]],
                                            'responses': [r.content[:500] for r in assistant_responses[:2]]
                                        }
                                        detailed_context.append(context_entry)
                        
                        if conversation_summaries:
                            language = detect_language(request.question)
                            if language == "tagalog":
                                past_conversations_summary = f"\n\n**Mga Nakaraang Legal Research Sessions:**\n" + "\n".join(conversation_summaries)
                            else:
                                past_conversations_summary = f"\n\n**Recent Legal Research Sessions:**\n" + "\n".join(conversation_summaries)
                    else:
                        print(f"   ℹ️ No past conversations found for user")
                        
                except Exception as e:
                    print(f"   ⚠️ Error retrieving past conversations: {e}")
                    logger.error(f"Error retrieving past conversations: {e}")
            
            # Generate professional response with actual conversation history
            language = detect_language(request.question)
            if past_conversations_summary:
                # We have conversation history - create a professional response
                if language == "tagalog":
                    context_response = (
                        "Oo, naaalala ko ang aming mga nakaraang legal research sessions! 📚\n\n"
                        "Narito ang mga legal na topics na pinag-aralan natin:"
                        f"{past_conversations_summary}\n\n"
                        "Gusto ninyo bang:\n"
                        "• **Magpatuloy** sa isa sa mga nakaraang research topics?\n"
                        "• **Magdagdag** ng tanong tungkol sa mga nabanggit na legal provisions?\n"
                        "• **Mag-explore** ng bagong jurisprudential analysis?\n"
                        "• **Pag-usapan** ang detalye ng mga nakaraang legal opinions ko?\n\n"
                        "Sabihin lang ninyo kung alin sa mga nakaraang research ang gusto ninyong i-expand, "
                        "o magtanong ng bagong complex legal matter. Handa akong magbigay ng mas malalim na doctrinal analysis!"
                    )
                else:
                    context_response = (
                        "Yes, I remember our previous legal research sessions! 📚\n\n"
                        "Here are the legal topics we've analyzed:"
                        f"{past_conversations_summary}\n\n"
                        "Would you like to:\n"
                        "• **Continue** researching any of these previous topics?\n"
                        "• **Ask follow-up questions** about the legal provisions we covered?\n"
                        "• **Explore** new jurisprudential analysis?\n"
                        "• **Discuss** the details of my previous legal opinions?\n\n"
                        "Just let me know which past research you'd like to expand upon, "
                        "or present a new complex legal matter. I'm ready to provide deeper doctrinal analysis!"
                    )
                
                # Generate professional follow-up questions based on past conversations
                if language == "tagalog":
                    context_followups = [
                        "Alin sa mga nakaraang legal topics ang gusto ninyong i-expand pa?",
                        "May follow-up jurisprudential analysis ba kayo sa mga nabanggit ko dati?",
                        "Gusto ninyo bang mag-explore ng comparative legal doctrines?"
                    ]
                else:
                    context_followups = [
                        "Which of our previous legal topics would you like to expand upon?",
                        "Do you have follow-up jurisprudential questions about my previous analysis?",
                        "Would you like to explore comparative legal doctrines?"
                    ]
            else:
                # No conversation history - professional introduction
                if language == "tagalog":
                    context_response = (
                        "Ako si Ai.ttorney, ang inyong advanced legal research assistant para sa Philippine jurisprudence! ⚖️\n\n"
                        "Wala pa tayong nakaraang research sessions sa sistema, pero handa akong tumulong sa anumang complex legal analysis!\n\n"
                        "Maaari ninyong mag-research tungkol sa:\n"
                        "• **Constitutional Law** (Bill of Rights, separation of powers)\n"
                        "• **Civil Law** (obligations, contracts, property rights)\n"
                        "• **Criminal Law** (Revised Penal Code, special laws)\n"
                        "• **Family Law** (Family Code provisions, jurisprudence)\n"
                        "• **Labor Law** (Labor Code, employment relations)\n"
                        "• **Corporate Law** (Corporation Code, business law)\n\n"
                        "Ano pong complex legal matter ang kailangan ninyong i-research? Naaalala ko ang lahat ng aming mga legal discussions!"
                    )
                else:
                    context_response = (
                        "I'm Ai.ttorney, your advanced legal research assistant for Philippine jurisprudence! ⚖️\n\n"
                        "We don't have any previous research sessions in the system yet, but I'm ready to help with any complex legal analysis!\n\n"
                        "You can research:\n"
                        "• **Constitutional Law** (Bill of Rights, separation of powers)\n"
                        "• **Civil Law** (obligations, contracts, property rights)\n"
                        "• **Criminal Law** (Revised Penal Code, special laws)\n"
                        "• **Family Law** (Family Code provisions, jurisprudence)\n"
                        "• **Labor Law** (Labor Code, employment relations)\n"
                        "• **Corporate Law** (Corporation Code, business law)\n\n"
                        "What complex legal matter would you like to research today? I'll remember all our legal discussions!"
                    )
                
                # Professional follow-up questions for new users
                if language == "tagalog":
                    context_followups = [
                        "Anong legal na field ang kailangan ninyong i-research?",
                        "May specific na jurisprudential analysis ba kayong kailangan?",
                        "Gusto ninyo bang mag-explore ng constitutional doctrines?"
                    ]
                else:
                    context_followups = [
                        "Which legal field would you like to research?",
                        "Do you need specific jurisprudential analysis?",
                        "Would you like to explore constitutional doctrines?"
                    ]
            
            # Save conversation context interaction
            session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                chat_service=chat_service,
                effective_user_id=effective_user_id,
                session_id=request.session_id,
                question=request.question,
                answer=context_response,
                language=language,
                metadata={"type": "conversation_context", "past_conversations_found": len(past_conversations_summary) > 0}
            )
            
            return create_chat_response(
                answer=context_response,
                simplified_summary="Retrieved and displayed past legal research sessions" if past_conversations_summary else "No past research sessions found",
                follow_up_questions=context_followups,
                session_id=session_id,
                message_id=assistant_msg_id,
                user_message_id=user_msg_id
            )
        
        # Basic validation - only check if question exists and isn't empty
        if not request.question or not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
        # Toxicity check removed - OpenAI moderation handles this more comprehensively
        
        # Check for prohibited input (misuse prevention) - keep this for safety
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
            
            return create_chat_response(
                answer=clarification_response,
                simplified_summary="Unclear input - requesting clarification"
            )
        
        # Detect language
        language = detect_language(request.question)
        
        # === MODIFICATION: Check for 'unsupported' language ===
        # This replaces the old check for `not in ["english", "tagalog", "taglish"]`
        if language == "unsupported":
            logger.warning(f"Unsupported language detected for query: {request.question[:50]}...")
            # Return a formal, legalese-style unsupported message
            unsupported_response = (
                "I. PRELIMINARY STATEMENT\n"
                "This Counsel acknowledges receipt of your query.\n\n"
                "**II. ANALYSIS**\n"
                "Upon review, the query presented is rendered in a linguistic format (language) that falls outside the operational parameters of this legal analytical service. This service is constrained to processing and analyzing legal interrogatories propounded in either **English** or **Filipino**.\n\n"
                "**III. CONCLUSION**\n"
                "Regrettably, no substantive analysis can be furnished. You are respectfully advised to re-submit your query in one of the supported languages (English or Filipino) to facilitate proper processing and legal assessment."
            )
            
            return create_chat_response(
                answer=unsupported_response,
                simplified_summary="Language not supported. Advised user to use English or Filipino.",
                confidence="low"
            )
        
        # 🔒 CHECK FOR PERSONAL ADVICE QUESTIONS (even if they contain legal keywords)
        if is_personal_advice_question(request.question):
            # This is asking for personal advice/opinion, not legal information
            if language == "tagalog":
                personal_advice_response = (
                    "Naiintindihan ko na kailangan mo ng tulong sa desisyon mo, pero hindi ako makakapagbigay ng personal na legal advice tungkol sa kung ano ang dapat mong gawin sa iyong specific na sitwasyon. "
                    "Para sa ganitong mga tanong, kailangan mo ng konsultasyon sa isang lisensyadong abogado na makakapag-review ng lahat ng detalye ng iyong kaso."
                )
            else:
                personal_advice_response = (
                    "I understand you need help with a decision, but I cannot provide personal legal advice about what you should do in your specific situation. "
                    "For questions like this, you need a consultation with a licensed lawyer who can review all the details of your case."
                )
            
            return create_chat_response(
                answer=personal_advice_response,
                simplified_summary="Personal advice question - requires lawyer consultation",
            )
        
        # Check if question is about out-of-scope topics (politics, finance, medicine, etc.)
        is_out_of_scope, topic_type = is_out_of_scope_topic(request.question)
        if is_out_of_scope:
            # Generate natural, varied decline response using AI
            out_of_scope_response = generate_ai_response(
                request.question, 
                detect_language(request.question),
                'out_of_scope',
                topic_type
            )
            
            return create_chat_response(
                answer=out_of_scope_response,
                simplified_summary="Out of scope topic blocked"
            )
        
        # Prompt Injection Detection (Security Enhancement)
        # Check for prompt injection/hijacking attempts BEFORE processing
        # Only check for authenticated users to track violations
        if effective_user_id:
            print(f"\n🛡️  Prompt injection detection...")
            injection_detector = get_prompt_injection_detector()
            violation_service = get_violation_tracking_service()
            
            try:
                injection_result = injection_detector.detect(request.question.strip())
                
                # If prompt injection detected, record violation and block
                if injection_result["is_injection"]:
                    logger.warning(
                        f"🚨 Prompt injection detected for lawyer {effective_user_id[:8]}: "
                        f"category={injection_result['category']}, "
                        f"severity={injection_result['severity']:.2f}, "
                        f"risk={injection_result['risk_level']}"
                    )
                    
                    # Record violation and get action taken
                    try:
                        print(f"📝 Recording prompt injection violation for lawyer: {effective_user_id}")
                        violation_result = await violation_service.record_violation(
                            user_id=effective_user_id,
                            violation_type=ViolationType.CHATBOT_PROMPT,  # ✅ Use CHATBOT_PROMPT for all chatbot violations
                            content_text=request.question.strip(),
                            moderation_result=injection_result,  # ✅ Pass full injection_result (now has proper format)
                            content_id=None
                        )
                        print(f"✅ Prompt injection violation recorded: {violation_result}")
                        
                        # Return formal legal-style error message with violation info
                        violation_message = (
                            f"**I. PRELIMINARY STATEMENT**\n\n"
                            f"This Counsel has detected an attempt to manipulate or compromise the operational parameters of this legal analytical service.\n\n"
                            f"**II. SECURITY VIOLATION DETECTED**\n\n"
                            f"{injection_result['description']}\n\n"
                            f"**III. CONSEQUENCE**\n\n"
                            f"⚠️ {violation_result['message']}\n\n"
                            f"**IV. ADVISORY**\n\n"
                            f"You are advised to utilize this service solely for legitimate legal research and analysis. Any further attempts to compromise system security may result in permanent account suspension."
                        )
                        
                        return create_chat_response(
                            answer=violation_message,
                            simplified_summary=f"Prompt injection blocked: {injection_result['category']}"
                        )
                        
                    except Exception as violation_error:
                        logger.error(f"❌ Failed to record prompt injection violation: {str(violation_error)}")
                        import traceback
                        print(f"Violation error traceback: {traceback.format_exc()}")
                        
                        # Return generic error message if violation recording fails
                        return create_chat_response(
                            answer="Your query was flagged for attempting to manipulate the system. This violates our usage policy. Please use this service for legitimate legal research only.",
                            simplified_summary="Prompt injection blocked"
                        )
                else:
                    print(f"✅ No prompt injection detected")
                    
            except Exception as e:
                logger.error(f"❌ Prompt injection detection error: {str(e)}")
                # Fail-open: Continue without injection detection if service fails
        
        # Content Moderation using OpenAI omni-moderation-latest
        # Run moderation on ALL messages (legal and casual) before generating any response
        # Moderate for ALL users (authenticated and unauthenticated)
        print(f"\n🔍 Content moderation check...")
        moderation_service = get_moderation_service()
        violation_service = get_violation_tracking_service()
        
        try:
            moderation_result = await moderation_service.moderate_content(request.question.strip())
            
            # If content is flagged, record violation and apply action
            if not moderation_service.is_content_safe(moderation_result):
                user_id_log = effective_user_id[:8] if effective_user_id else "unauthenticated"
                logger.warning(f"⚠️  Chatbot prompt flagged for user {user_id_log}: {moderation_result['violation_summary']}")
                
                # Record violation only for authenticated users
                violation_result = None
                if effective_user_id:
                    try:
                        print(f"📝 Recording violation for user: {effective_user_id}")
                        violation_result = await violation_service.record_violation(
                            user_id=effective_user_id,
                            violation_type=ViolationType.CHATBOT_PROMPT,
                            content_text=request.question.strip(),
                            moderation_result=moderation_result,
                            content_id=None  # No specific content ID for chatbot prompts
                        )
                        print(f"✅ Violation recorded: {violation_result}")
                    except Exception as violation_error:
                        logger.error(f"❌ Failed to record violation: {str(violation_error)}")
                        import traceback
                        print(f"Violation error traceback: {traceback.format_exc()}")
                        # Use generic message if violation recording fails
                        violation_result = None
                
                # Set default violation result for unauthenticated users or if recording failed
                if not violation_result:
                    violation_result = {
                        "action_taken": "warning",
                        "strike_count": 0,
                        "suspension_count": 0,
                        "message": "Your content violated our community guidelines. Please be mindful of your language."
                    }
                
                # Detect language for appropriate response
                language = detect_language(request.question)
                
                # Return simplified message to user with violation info
                if language == "tagalog":
                    violation_message = f"""🚨 Labag sa Patakaran

{moderation_service.get_violation_message(moderation_result, context="chatbot")}

⚠️ {violation_result['message']}"""
                else:
                    violation_message = f"""🚨 Content Policy Violation

{moderation_service.get_violation_message(moderation_result, context="chatbot")}

⚠️ {violation_result['message']}"""
                
                return create_chat_response(
                    answer=violation_message,
                    simplified_summary="Content moderation violation detected"
                )
            else:
                print(f"✅ Content moderation passed")
                
        except Exception as e:
            logger.error(f"❌ Content moderation error: {str(e)}")
            # Fail-open: Continue without moderation if service fails
            print(f"⚠️  Content moderation failed, continuing without moderation: {e}")
        
        # Check if this is actually a legal question or just casual conversation
        if not is_legal_question(request.question):
            # For casual, friendly, or unrelated messages, generate intelligent response using AI
            casual_response = generate_ai_response(request.question, detect_language(request.question), 'casual')
            
            # Save casual interaction to chat history
            session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                chat_service=chat_service,
                effective_user_id=effective_user_id,
                session_id=request.session_id,
                question=request.question,
                answer=casual_response,
                language=language,
                metadata={"type": "casual"}
            )
            
            return create_chat_response(
                answer=casual_response,
                simplified_summary="Intelligent casual response",
                session_id=session_id,
                message_id=assistant_msg_id,
                user_message_id=user_msg_id
            )

        # For legal questions, search Qdrant directly (like test_chatbot.py)
        context, sources = retrieve_relevant_context(request.question, TOP_K_RESULTS)
        
        # Check if we have sufficient context
        if not sources or len(sources) == 0:
            # No relevant sources found
            no_context_message = (
                "I apologize, but I don't have enough information in my database to answer this question accurately. "
                "I recommend consulting with a licensed Philippine lawyer for assistance."
                if language == "english" else
                "Paumanhin po, pero wala akong sapat na impormasyon sa aking database para masagot ito nang tama. "
                "Inirerekomenda ko pong kumonsulta sa lisensyadong abogado para sa tulong."
            )
            
            return create_chat_response(
                answer=no_context_message,
                simplified_summary="No relevant legal information found in database",
            )
        
        # Detect if query is complex (requires multiple legal domains or personal advice)
        is_complex = is_complex_query(request.question)
        
        # Calculate confidence based on source relevance scores
        if sources and len(sources) > 0:
            # Get average relevance score from top sources
            avg_score = sum(src.get('relevance_score', 0.0) for src in sources[:3]) / min(3, len(sources))
            
            # Convert to confidence level
            if avg_score >= 0.7:
                confidence = "high"
            elif avg_score >= 0.5:
                confidence = "medium"
            else:
                confidence = "low"
        else:
            # No sources found - using general knowledge
            confidence = "medium"
        
        # Retrieve conversation history from database for enhanced professional context
        print(f"\n💬 [STEP 8.5] Retrieving conversation history from database...")
        db_conversation_history = await get_conversation_history_from_db(
            chat_service=chat_service,
            session_id=request.session_id,
            limit=16  # Last 8 exchanges (16 messages)
        )
        
        # Use database history if available, fallback to client-provided history
        conversation_history = db_conversation_history if db_conversation_history else (request.conversation_history or [])
        
        # Check if user is referencing past conversations
        has_reference, reference_type = extract_conversation_reference(request.question)
        if has_reference:
            print(f"\n🔗 [CONVERSATION REFERENCE] Detected reference to past conversation: {reference_type}")
            # Add more context from conversation history if available
            if len(conversation_history) < 12 and effective_user_id:
                # Try to get more conversation context for better reference understanding
                extended_history = await get_conversation_history_from_db(
                    chat_service, 
                    request.session_id, 
                    limit=24  # Get more messages for better context (12 exchanges)
                )
                if extended_history and len(extended_history) > len(conversation_history):
                    conversation_history = extended_history
                    print(f"   ✅ Extended conversation history to {len(conversation_history)} messages for better reference context")
        
        # Generate answer with proper complexity detection
        print(f"   📊 Using {len(conversation_history)} messages for context (from {'database' if db_conversation_history else 'client'})")
        answer, _, simplified_summary, follow_up_questions = generate_answer(
            request.question,
            context,
            conversation_history, # <-- Enhanced context awareness from database
            language,
            request.max_tokens, # <-- This passes the new 1500 default
            is_complex=is_complex  # Use actual complexity detection for production
        )
        
        # 🔒 FINAL SAFETY CHECK: Verify the answer doesn't accidentally discuss out-of-scope topics
        # This is a last-resort check in case the AI tries to answer non-legal questions
        # Industry standard: Use context-aware checking to avoid false positives
        answer_lower = answer.lower()
        
        # Only check if the answer is PRIMARILY about out-of-scope topics
        # Use stricter patterns to avoid false positives (e.g., "consumer" vs "consumer rights")
        out_of_scope_indicators = [
            # Political indicators - only if discussing politics, not legal aspects
            ('political', [
                'vote for', 'who to vote', 'election campaign', 'political party platform',
                'support this candidate', 'marcos vs', 'duterte policy'
            ]),
            # Financial indicators - only investment advice, not consumer protection
            ('financial', [
                'invest in', 'buy stocks', 'trade crypto', 'investment strategy',
                'portfolio allocation', 'financial planning advice'
            ]),
            # Medical indicators - only medical advice, not medical malpractice law
            ('medical', [
                'take this medicine', 'medical diagnosis', 'treatment recommendation',
                'you should see a doctor for', 'health advice'
            ]),
        ]
        
        # Count matches to determine if answer is PRIMARILY out of scope
        out_of_scope_matches = 0
        detected_topic = None
        
        for topic_type, keywords in out_of_scope_indicators:
            matches = sum(1 for keyword in keywords if keyword in answer_lower)
            if matches >= 2:  # Need at least 2 matches to be considered out of scope
                out_of_scope_matches = matches
                detected_topic = topic_type
                break
        
        if out_of_scope_matches >= 2 and detected_topic:
            # Answer is PRIMARILY about out-of-scope content - block it
            logger.warning(f"Safety check triggered: Answer contains {detected_topic} content")
            logger.warning(f"Question: {request.question}")
            logger.warning(f"Matches: {out_of_scope_matches}")
            
            print(f"⚠️  SAFETY CHECK TRIGGERED: Answer contains {detected_topic} content")
            print(f"    Question: {request.question}")
            print(f"    Matches: {out_of_scope_matches}")
            
            # Return decline response instead
            decline_response = generate_ai_response(
                request.question,
                language,
                'out_of_scope',
                detected_topic
            )
            
            return create_chat_response(
                answer=decline_response,
                simplified_summary=f"Safety check blocked {detected_topic} content"
            )
        
        # Format sources for response with URLs (simplified)
        source_citations = [
            SourceCitation(
                source=src['source'],
                law=src['law'],
                article_number=src['article_number'],
                article_title=src['article_title'],
                text_preview=src['text_preview'],
                source_url=src.get('source_url', ''),
                relevance_score=src.get('relevance_score', 0.0)
            )
            for src in sources
        ]
        
        # === GUARDRAILS OUTPUT VALIDATION ===
        if guardrails_instance:
            try:
                print(f"\n🔒 Validating AI output with Guardrails AI...")
                output_validation_result = guardrails_instance.validate_output(
                    response=answer,
                    context=context
                )
                
                if not output_validation_result.get('is_valid', True):
                    # Output failed validation - return error
                    error_message = output_validation_result.get('error', 'Output validation failed')
                    print(f"❌ Output validation failed: {error_message}")
                    
                    return create_chat_response(
                        answer="I apologize, but I cannot provide a response that meets our safety standards. Please rephrase your question or consult with a licensed lawyer.",
                        simplified_summary="Output blocked by security validation",
                        security_report={
                            "security_score": 0.0,
                            "security_level": "BLOCKED",
                            "issues_detected": 1,
                            "issues": [error_message],
                            "guardrails_enabled": True
                        }
                    )
                else:
                    print(f"✅ Output validation passed")
                    # Use cleaned output if available
                    if 'cleaned_output' in output_validation_result:
                        answer = output_validation_result['cleaned_output']
            except Exception as e:
                print(f"⚠️  Guardrails output validation error: {e}")
                # Continue without Guardrails if it fails
        
        # Generate security report
        security_report = None
        if guardrails_instance and (input_validation_result or output_validation_result):
            try:
                security_report = guardrails_instance.get_security_report(
                    input_validation_result or {},
                    output_validation_result or {}
                )
            except Exception as e:
                print(f"⚠️  Failed to generate security report: {e}")
        
        
        
        # === SAVE TO CHAT HISTORY ===
        session_id, user_message_id, assistant_message_id = await save_chat_interaction(
            chat_service=chat_service,
            effective_user_id=effective_user_id,
            session_id=request.session_id,
            question=request.question,
            answer=answer,
            language=language,
            metadata={
                "sources": [src.dict() for src in source_citations],
                "confidence": confidence,
                "simplified_summary": simplified_summary
            }
        )
        
        # Production: Log request completion time for monitoring
        request_duration = (datetime.now() - request_start_time).total_seconds()
        logger.info(f"Request completed in {request_duration:.2f}s - confidence={confidence}, sources={len(source_citations)}")
        
        return create_chat_response(
            answer=answer,
            sources=source_citations,
            confidence=confidence,
            simplified_summary=simplified_summary,
            follow_up_questions=follow_up_questions,
            security_report=security_report,
            session_id=session_id,
            message_id=assistant_message_id,
            user_message_id=user_message_id
        )
        
    except HTTPException as he:
        # Re-raise HTTP exceptions as-is
        logger.warning(f"HTTP exception: {he.status_code} - {he.detail}")
        raise
    except Exception as e:
        # Production: Log unexpected errors with full context
        request_duration = (datetime.now() - request_start_time).total_seconds()
        logger.error(f"Unexpected error after {request_duration:.2f}s: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="An unexpected error occurred while processing your question. Please try again."
        )


@router.get("/health")
async def health_check():
    """Check if the chatbot service for legal practitioners is running"""
    try:
        collection_info = qdrant_client.get_collection(collection_name=COLLECTION_NAME)
        count = collection_info.points_count
        
        # Check Guardrails status
        guardrails_status = {
            "enabled": guardrails_instance is not None,
            "available": GUARDRAILS_AVAILABLE
        }
        
        if guardrails_instance:
            try:
                # Get list of active validators
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
            "service": "Ai.ttorney Legal Practice API - Practitioner Module",
            "description": "Advanced RAG endpoint for statutory analysis and jurisprudential research.",
            "database": "Qdrant Cloud",
            "documents": count,
            "model": CHAT_MODEL,
            "embedding_model": EMBEDDING_MODEL,
            "languages": ["English", "Tagalog", "Taglish"],
            "features": [
                "Doctrinal analysis and synthesis",
                "Jurisprudential and statutory citations",
                "Handles complex, multi-part hypotheticals",
                "Context-aware follow-up queries",
                "Guardrails AI security validation" if guardrails_instance else "Basic security validation"
            ],
            "security": guardrails_status,
            "target_audience": "Members of the Philippine Bar"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }