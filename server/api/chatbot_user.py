#chatbot_user.py

"""
Legal Chatbot API for General Public (Philippine Legal Seekers)

Designed for non-lawyer users in the Philippines who need legal guidance.

KEY FEATURES:
1. Bilingual support (English, Tagalog, Taglish)
2. Plain-language explanations of Philippine law
3. Source citations with URLs (e.g., "Ayon sa Family Code, Art. 36 (Tingnan: https://lawphil.net/...)")
4. Legal disclaimers on every response
5. Input filtering to prevent misuse
6. Fallback suggestions for complex queries requiring professional consultation
7. Emotional query normalization (converts Taglish/emotional queries to formal legal questions)

Unlike traditional searches that return confusing links, Ai.ttorney delivers direct,
conversational answers grounded in Philippine law with proper citations.

Endpoint: POST /api/chatbot/user/ask
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, model_validator
from typing import List, Dict, Optional, AsyncGenerator
import json
import time
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
import time

# Industry standard: Configure logging for monitoring and debugging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Streaming constants (DRY principle - ChatGPT/Claude style)
STREAMING_TOKEN_BATCH_SIZE = 3  # Minimum tokens to accumulate before sending
STREAMING_MAX_INTERVAL_MS = 80  # Maximum time (ms) between updates
STREAMING_TIMEOUT_SECONDS = 10.0  # Timeout for OpenAI streaming requests

# Add parent directory to path for config imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from config.guardrails_config import get_guardrails_instance, is_guardrails_enabled
    GUARDRAILS_AVAILABLE = True
except ImportError:
    print("⚠️  Guardrails AI not available - running without security validation")
    GUARDRAILS_AVAILABLE = False

# Import comprehensive system prompts
from config.system_prompts import ENGLISH_SYSTEM_PROMPT, TAGALOG_SYSTEM_PROMPT

# Import chat history service
from services.chat_history_service import ChatHistoryService, get_chat_history_service

# Import content moderation and violation tracking
from services.content_moderation_service import get_moderation_service
from services.violation_tracking_service import get_violation_tracking_service
from services.prompt_injection_detector import get_prompt_injection_detector
from models.violation_types import ViolationType

# Import guest rate limiting (OpenAI/Anthropic security pattern)
from middleware.guest_rate_limiter import GuestRateLimiter

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
TOP_K_RESULTS = 3  # Number of relevant chunks to retrieve (reduced for speed)
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
    # Increase timeout to handle slow connections
    qdrant_client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
        timeout=30.0,  # Increased timeout to 30 seconds
        prefer_grpc=False  # Use HTTP instead of gRPC for better compatibility
    )
    
    # Verify connection with retry logic
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            qdrant_client.get_collections()
            logger.info("✅ Qdrant client initialized successfully")
            break
        except Exception as retry_error:
            if attempt < max_retries - 1:
                logger.warning(f"Qdrant connection attempt {attempt+1} failed: {retry_error}. Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                raise
except Exception as e:
    logger.error(f"Failed to initialize Qdrant client after multiple attempts: {e}")
    # Create a mock client for development/testing that won't block server startup
    # This allows the server to start even if Qdrant is unavailable
    class MockQdrantClient:
        def __getattr__(self, name):
            def method(*args, **kwargs):
                logger.warning(f"Using mock Qdrant client. Method {name} called but not implemented.")
                return None
            return method
    
    qdrant_client = MockQdrantClient()
    logger.warning("⚠️ Using mock Qdrant client. Vector search functionality will be limited.")

# Initialize OpenAI client with timeout settings (industry standard)
if not OPENAI_API_KEY:
    print("❌ ERROR: OPENAI_API_KEY is not set!")

# Industry standard: Set reasonable timeouts to prevent hanging requests
try:
    openai_client = OpenAI(
        api_key=OPENAI_API_KEY,
        timeout=30.0,  # Total timeout in seconds (reduced for speed)
        max_retries=1   # Automatic retry for transient failures (reduced for speed)
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
router = APIRouter(prefix="/api/chatbot/user", tags=["Legal Chatbot - User"])


# Request/Response Models
class ConversationMessage(BaseModel):
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500, description="User's legal question or greeting")
    conversation_history: Optional[List[ConversationMessage]] = Field(default=[], description="Previous conversation (unlimited for registered users, limited for guests)")
    max_tokens: Optional[int] = Field(default=400, ge=100, le=1500, description="Max response tokens (reduced for speed)")
    user_id: Optional[str] = Field(default=None, description="User ID for authenticated users")
    session_id: Optional[str] = Field(default=None, description="Session ID for conversation tracking")
    guest_session_id: Optional[str] = Field(default=None, description="Cryptographic guest session token")
    guest_prompt_count: Optional[int] = Field(default=None, description="Client-reported prompt count (advisory only)")
    
    @model_validator(mode='after')
    def validate_conversation_history_limit(self):
        """Dynamic validation based on user type"""
        conversation_history = self.conversation_history
        
        if not conversation_history:
            return self
            
        # Check if this is a guest user (has guest_session_id but no user_id)
        is_guest = self.guest_session_id and not self.user_id
        
        if is_guest:
            # Guest users: limit to 10 messages to manage resources
            if len(conversation_history) > 10:
                print(f"🎫 Guest user: Trimming conversation history from {len(conversation_history)} to 10 messages")
                # Automatically trim to last 10 messages for guests
                self.conversation_history = conversation_history[-10:]
        # Registered users and lawyers: unlimited conversation history
        
        return self
    
    class Config:
        # Production: Add example for API documentation
        json_schema_extra = {
            "example": {
                "question": "What is the legal age for marriage in the Philippines?",
                "conversation_history": [],
                "max_tokens": 1200
            }
        }


class SourceCitation(BaseModel):
    source: str
    law: str
    article_number: str
    article_title: Optional[str] = None
    text_preview: str
    source_url: Optional[str] = Field(default=None, description="URL to the legal source")
    relevance_score: float = Field(default=0.0, description="Relevance score (0-1)")


class FallbackSuggestion(BaseModel):
    action: str = Field(..., description="Suggested action (e.g., 'consult_lawyer', 'visit_pao')")
    description: str = Field(..., description="Description of the action")
    reason: str = Field(..., description="Why this action is suggested")


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation] = Field(default_factory=list)
    confidence: Optional[str] = Field(default=None, description="Confidence level: high, medium, or low")
    simplified_summary: Optional[str] = None
    legal_disclaimer: str
    fallback_suggestions: Optional[List[FallbackSuggestion]] = None
    follow_up_questions: Optional[List[str]] = Field(default_factory=list, description="Suggested follow-up questions for continued conversation")
    security_report: Optional[Dict] = Field(default=None, description="Guardrails AI security validation report")
    session_id: Optional[str] = Field(default=None, description="Chat session ID for tracking conversation")
    message_id: Optional[str] = Field(default=None, description="Message ID for the assistant's response")
    user_message_id: Optional[str] = Field(default=None, description="Message ID for the user's question")
    metadata: Optional[Dict] = Field(default=None, description="Additional metadata (guest tokens, rate limits, etc)")


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


def detect_language(text: str) -> str:
    """
    Detect if the question is in English, Tagalog, or Taglish (mixed)
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
    
    text_lower = text.lower()
    words = text_lower.split()
    tagalog_count = sum(1 for keyword in tagalog_keywords if keyword in words)
    
    # Check for Taglish (mixed English and Tagalog)
    has_english = any(word in text_lower for word in ['what', 'how', 'when', 'where', 'why', 'can', 'is', 'are'])
    
    if tagalog_count >= 3:
        return "tagalog"
    elif tagalog_count >= 1 and has_english:
        return "taglish"
    elif tagalog_count == 1 or tagalog_count == 2:
        return "tagalog"
    else:
        return "english"  # Default to English for non-Tagalog content


def is_conversation_context_question(text: str) -> bool:
    """
    Check if the query is asking about conversation history, past chats, or chatbot capabilities
    These should be handled as valid conversational queries, not rejected as non-legal
    """
    text_lower = text.lower().strip()
    
    conversation_patterns = [
        # Past conversation retrieval requests (asking TO SEE conversation history)
        'past convos', 'past conversations', 'past convo', 'previous chats', 'chat history',
        'bring up our conversation', 'bring up the past', 'bring up past', 'show our chat', 
        'what we talked about before', 'our conversation history', 'our chat history', 
        'previous discussion', 'show me past', 'show past',
        # More Tagalog variations
        'ano usapan natin dati', 'ano pag-uusapan natin dati', 'nakaraan nating usapan',
        'mga naging usapan natin', 'dating pag-uusapan natin',
        
        # Chatbot capability questions
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
        'pinag-usapan natin', 'pinag-usapan natin nung nakaraan',
        'ano pinag-usapan natin', 'ano ba pinag-usapan natin',
        
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


def is_translation_request(text: str) -> bool:
    """
    Check if the query is asking to translate or repeat the previous response
    """
    text_lower = text.lower().strip()
    
    translation_patterns = [
        # English translation requests
        'repeat that in english', 'can you repeat that in english', 'translate to english',
        'say that in english', 'in english please', 'english version',
        'repeat in english', 'can you say that in english',
        
        # Tagalog translation requests  
        'ulitin mo sa tagalog', 'sabihin mo sa tagalog', 'tagalog naman',
        'sa tagalog please', 'tagalog version', 'translate sa tagalog',
        'paki sagot yan ng tagalog', 'sagot mo sa tagalog', 'paki ulit sa tagalog',
        'paki translate sa tagalog', 'pwede sa tagalog', 'tagalog po',
        'sa tagalog po', 'paki tagalog', 'tagalog lang',
        
        # General repeat requests
        'repeat that', 'can you repeat', 'say that again', 'ulitin mo',
        'repeat please', 'can you say that again'
    ]
    
    return any(pattern in text_lower for pattern in translation_patterns)


def is_legal_category_request(text: str) -> bool:
    """
    Check if the query is asking about a specific legal category
    These should provide comprehensive information about that area of law
    """
    text_lower = text.lower().strip()
    
    # Single word or simple category requests
    category_patterns = [
        # English categories
        'family', 'family law', 'labor', 'labor law', 'labour', 'labour law',
        'consumer', 'consumer law', 'criminal', 'criminal law', 'civil', 'civil law',
        
        # Filipino categories  
        'pamilya', 'family law', 'trabaho', 'labor law', 'empleyado',
        'consumer', 'mamimili', 'krimen', 'criminal law', 'civil law'
    ]
    
    # Check if it's exactly one of these categories or very close
    return text_lower in category_patterns or any(
        text_lower == pattern or text_lower == pattern + '?' 
        for pattern in category_patterns
    )


def get_legal_category_response(text: str, language: str) -> tuple[str, list[str]]:
    """
    Generate comprehensive response for legal category requests
    Returns (response_text, follow_up_questions)
    """
    text_lower = text.lower().strip()
    
    if 'family' in text_lower or 'pamilya' in text_lower:
        if language == "tagalog":
            response = (
                "**Family Law** - Mga Batas Tungkol sa Pamilya 👨‍👩‍👧‍👦\n\n"
                "Ang Family Law ay sumasaklaw sa lahat ng legal na usapin ng pamilya sa Pilipinas:\n\n"
                "**📋 Mga Pangunahing Paksa:**\n"
                "• **Kasal** - Legal requirements, civil at religious marriage\n"
                "• **Annulment** - Pagpapawalang-bisa ng kasal\n"
                "• **Legal Separation** - Paghihiwalay ng mag-asawa\n"
                "• **Child Custody** - Pag-aalaga sa mga anak\n"
                "• **Inheritance** - Pamana at estate planning\n"
                "• **Adoption** - Legal na pag-aampon\n"
                "• **VAWC** - Violence Against Women and Children\n\n"
                "**⚖️ Mga Batas na Ginagamit:**\n"
                "• Family Code of the Philippines\n"
                "• Anti-VAWC Act (RA 9262)\n"
                "• Domestic Adoption Act\n"
                "• Rules on Custody of Minors\n\n"
                "Ano sa mga topics na ito ang gusto ninyong malaman nang detalyado?"
            )
            followups = [
                "Paano mag-file ng annulment case?",
                "Ano ang requirements para sa kasal?",
                "Paano makakuha ng child custody?",
                "Ano ang karapatan ko sa inheritance?"
            ]
        else:
            response = (
                "**Family Law** - Legal Matters Concerning Family 👨‍👩‍👧‍👦\n\n"
                "Family Law covers all legal issues related to family relationships in the Philippines:\n\n"
                "**📋 Main Topics:**\n"
                "• **Marriage** - Legal requirements, civil and religious ceremonies\n"
                "• **Annulment** - Declaring a marriage null and void\n"
                "• **Legal Separation** - Formal separation of spouses\n"
                "• **Child Custody** - Care and guardianship of children\n"
                "• **Inheritance** - Estate planning and succession rights\n"
                "• **Adoption** - Legal adoption procedures\n"
                "• **VAWC** - Violence Against Women and Children protection\n\n"
                "**⚖️ Governing Laws:**\n"
                "• Family Code of the Philippines\n"
                "• Anti-VAWC Act (RA 9262)\n"
                "• Domestic Adoption Act\n"
                "• Rules on Custody of Minors\n\n"
                "Which of these topics would you like to know more about?"
            )
            followups = [
                "How to file for annulment?",
                "What are the requirements for marriage?",
                "How to get child custody?",
                "What are my inheritance rights?"
            ]
    
    elif 'labor' in text_lower or 'labour' in text_lower or 'trabaho' in text_lower or 'empleyado' in text_lower:
        if language == "tagalog":
            response = (
                "**Labor Law** - Mga Batas sa Trabaho 👷‍♂️👷‍♀️\n\n"
                "Ang Labor Law ay nangangalaga sa karapatan ng mga manggagawa sa Pilipinas:\n\n"
                "**📋 Mga Pangunahing Paksa:**\n"
                "• **Employment Rights** - Karapatan ng empleyado\n"
                "• **Wages & Benefits** - Sahod, overtime, 13th month pay\n"
                "• **Termination** - Legal na pagtatanggal sa trabaho\n"
                "• **Illegal Dismissal** - Walang-katarungang pagtanggal\n"
                "• **Resignation** - Tamang paraan ng pag-resign\n"
                "• **SSS, PhilHealth, Pag-IBIG** - Mandatory contributions\n"
                "• **Workplace Safety** - Kaligtasan sa trabaho\n\n"
                "**⚖️ Mga Batas na Ginagamit:**\n"
                "• Labor Code of the Philippines\n"
                "• Social Security Act\n"
                "• Occupational Safety and Health Standards\n"
                "• Anti-Sexual Harassment Act\n\n"
                "Ano sa mga topics na ito ang kailangan ninyong malaman?"
            )
            followups = [
                "Paano mag-file ng illegal dismissal case?",
                "Ano ang tamang proseso ng resignation?",
                "Magkano ang overtime pay ko?",
                "Ano ang mga mandatory benefits?"
            ]
        else:
            response = (
                "**Labor Law** - Employment and Workers' Rights 👷‍♂️👷‍♀️\n\n"
                "Labor Law protects the rights of workers and employees in the Philippines:\n\n"
                "**📋 Main Topics:**\n"
                "• **Employment Rights** - Worker protections and entitlements\n"
                "• **Wages & Benefits** - Salary, overtime, 13th month pay\n"
                "• **Termination** - Legal grounds for dismissal\n"
                "• **Illegal Dismissal** - Wrongful termination cases\n"
                "• **Resignation** - Proper resignation procedures\n"
                "• **SSS, PhilHealth, Pag-IBIG** - Mandatory contributions\n"
                "• **Workplace Safety** - Occupational health and safety\n\n"
                "**⚖️ Governing Laws:**\n"
                "• Labor Code of the Philippines\n"
                "• Social Security Act\n"
                "• Occupational Safety and Health Standards\n"
                "• Anti-Sexual Harassment Act\n\n"
                "Which of these topics would you like to learn more about?"
            )
            followups = [
                "How to file an illegal dismissal case?",
                "What's the proper resignation process?",
                "How much should my overtime pay be?",
                "What are the mandatory employee benefits?"
            ]
    
    elif 'consumer' in text_lower or 'mamimili' in text_lower:
        if language == "tagalog":
            response = (
                "**Consumer Law** - Mga Batas para sa Mamimili 🛒\n\n"
                "Ang Consumer Law ay nagpoprotekta sa karapatan ng mga mamimili:\n\n"
                "**📋 Mga Pangunahing Paksa:**\n"
                "• **Product Warranties** - Warranty ng mga produkto\n"
                "• **Refunds & Returns** - Pagbabalik ng bayad\n"
                "• **False Advertising** - Maling pag-advertise\n"
                "• **Defective Products** - Sirang produkto\n"
                "• **Service Complaints** - Reklamo sa serbisyo\n"
                "• **Online Shopping** - E-commerce protection\n"
                "• **Credit & Loans** - Utang at credit cards\n\n"
                "**⚖️ Mga Batas na Ginagamit:**\n"
                "• Consumer Act of the Philippines (RA 7394)\n"
                "• E-Commerce Act\n"
                "• Truth in Lending Act\n"
                "• Lemon Law (RA 10642)\n\n"
                "Ano sa mga consumer issues na ito ang problema ninyo?"
            )
            followups = [
                "Paano mag-file ng complaint sa DTI?",
                "Ano ang karapatan ko sa warranty?",
                "Paano makakuha ng refund?",
                "Ano ang pwede kong gawin sa defective product?"
            ]
        else:
            response = (
                "**Consumer Law** - Consumer Rights and Protection 🛒\n\n"
                "Consumer Law protects the rights of buyers and consumers:\n\n"
                "**📋 Main Topics:**\n"
                "• **Product Warranties** - Manufacturer and seller guarantees\n"
                "• **Refunds & Returns** - Getting your money back\n"
                "• **False Advertising** - Misleading marketing claims\n"
                "• **Defective Products** - Faulty or dangerous items\n"
                "• **Service Complaints** - Poor service quality\n"
                "• **Online Shopping** - E-commerce consumer protection\n"
                "• **Credit & Loans** - Lending and credit card issues\n\n"
                "**⚖️ Governing Laws:**\n"
                "• Consumer Act of the Philippines (RA 7394)\n"
                "• E-Commerce Act\n"
                "• Truth in Lending Act\n"
                "• Lemon Law (RA 10642)\n\n"
                "Which consumer issue would you like help with?"
            )
            followups = [
                "How to file a complaint with DTI?",
                "What are my warranty rights?",
                "How to get a refund for defective products?",
                "What can I do about false advertising?"
            ]
    
    elif 'criminal' in text_lower or 'krimen' in text_lower:
        if language == "tagalog":
            response = (
                "**Criminal Law** - Mga Batas sa Krimen ⚖️\n\n"
                "Ang Criminal Law ay tumutukoy sa mga krimen at parusa sa Pilipinas:\n\n"
                "**📋 Mga Pangunahing Paksa:**\n"
                "• **Crimes & Penalties** - Mga krimen at parusa\n"
                "• **Arrest Procedures** - Tamang proseso ng pag-aresto\n"
                "• **Bail & Detention** - Piyansa at pagkakakulong\n"
                "• **Self-Defense** - Pagtatanggol sa sarili\n"
                "• **Cybercrime** - Krimen sa internet\n"
                "• **Drug Cases** - Kaso tungkol sa droga\n"
                "• **Theft & Robbery** - Pagnanakaw at holdap\n\n"
                "**⚖️ Mga Batas na Ginagamit:**\n"
                "• Revised Penal Code\n"
                "• Cybercrime Prevention Act\n"
                "• Comprehensive Dangerous Drugs Act\n"
                "• Anti-Carnapping Act\n\n"
                "Ano sa mga criminal law topics na ito ang kailangan ninyong malaman?"
            )
            followups = [
                "Ano ang mga karapatan ko kapag naaresto?",
                "Paano mag-file ng criminal case?",
                "Ano ang self-defense sa batas?",
                "Magkano ang bail para sa case ko?"
            ]
        else:
            response = (
                "**Criminal Law** - Crimes and Criminal Justice ⚖️\n\n"
                "Criminal Law defines crimes and punishments in the Philippines:\n\n"
                "**📋 Main Topics:**\n"
                "• **Crimes & Penalties** - Types of crimes and their punishments\n"
                "• **Arrest Procedures** - Legal arrest and detention procedures\n"
                "• **Bail & Detention** - Getting released from custody\n"
                "• **Self-Defense** - Legal justification for protecting yourself\n"
                "• **Cybercrime** - Internet-related criminal offenses\n"
                "• **Drug Cases** - Drug-related criminal charges\n"
                "• **Theft & Robbery** - Property crimes and penalties\n\n"
                "**⚖️ Governing Laws:**\n"
                "• Revised Penal Code\n"
                "• Cybercrime Prevention Act\n"
                "• Comprehensive Dangerous Drugs Act\n"
                "• Anti-Carnapping Act\n\n"
                "Which criminal law topic do you need help with?"
            )
            followups = [
                "What are my rights when arrested?",
                "How to file a criminal case?",
                "What constitutes self-defense under law?",
                "How much is bail for my case?"
            ]
    
    elif 'civil' in text_lower:
        if language == "tagalog":
            response = (
                "**Civil Law** - Mga Batas sa Civil Cases 📋\n\n"
                "Ang Civil Law ay sumasaklaw sa mga pribadong usapin at karapatan:\n\n"
                "**📋 Mga Pangunahing Paksa:**\n"
                "• **Contracts** - Mga kasunduan at kontrata\n"
                "• **Property Rights** - Karapatan sa ari-arian\n"
                "• **Obligations** - Mga tungkulin at responsibilidad\n"
                "• **Damages** - Bayad-pinsala\n"
                "• **Torts** - Civil wrongs at negligence\n"
                "• **Debt Collection** - Pagsingil ng utang\n"
                "• **Small Claims** - Maliliit na kaso\n\n"
                "**⚖️ Mga Batas na Ginagamit:**\n"
                "• Civil Code of the Philippines\n"
                "• Rules of Court\n"
                "• Small Claims Rules\n"
                "• Property Registration Decree\n\n"
                "Ano sa mga civil law matters na ito ang kailangan ninyong tulong?"
            )
            followups = [
                "Paano mag-file ng small claims case?",
                "Ano ang pwede kong gawin sa breach of contract?",
                "Paano makakuha ng damages?",
                "Ano ang proseso sa debt collection?"
            ]
        else:
            response = (
                "**Civil Law** - Private Rights and Civil Matters 📋\n\n"
                "Civil Law covers private disputes and individual rights:\n\n"
                "**📋 Main Topics:**\n"
                "• **Contracts** - Agreements and contractual obligations\n"
                "• **Property Rights** - Real estate and personal property\n"
                "• **Obligations** - Legal duties and responsibilities\n"
                "• **Damages** - Compensation for losses\n"
                "• **Torts** - Civil wrongs and negligence\n"
                "• **Debt Collection** - Recovering money owed\n"
                "• **Small Claims** - Minor civil disputes\n\n"
                "**⚖️ Governing Laws:**\n"
                "• Civil Code of the Philippines\n"
                "• Rules of Court\n"
                "• Small Claims Rules\n"
                "• Property Registration Decree\n\n"
                "Which civil law matter do you need assistance with?"
            )
            followups = [
                "How to file a small claims case?",
                "What can I do about breach of contract?",
                "How to claim damages for losses?",
                "What's the process for debt collection?"
            ]
    
    else:
        # Default response if category not recognized
        if language == "tagalog":
            response = (
                "Salamat sa inyong tanong! Ako ay tumutulong sa mga legal na usapin sa Pilipinas. "
                "Maaari ninyong itanong ang tungkol sa Family Law, Labor Law, Consumer Law, Criminal Law, o Civil Law. "
                "Ano sa mga ito ang kailangan ninyong tulong?"
            )
            followups = [
                "Family Law - kasal, annulment, custody",
                "Labor Law - trabaho, sahod, termination", 
                "Consumer Law - warranty, refund, complaints",
                "Criminal Law - krimen, arrest, bail"
            ]
        else:
            response = (
                "Thank you for your question! I help with legal matters in the Philippines. "
                "You can ask me about Family Law, Labor Law, Consumer Law, Criminal Law, or Civil Law. "
                "Which area would you like help with?"
            )
            followups = [
                "Family Law - marriage, annulment, custody",
                "Labor Law - employment, wages, termination",
                "Consumer Law - warranties, refunds, complaints", 
                "Criminal Law - crimes, arrest, bail"
            ]
    
    return response, followups


def is_app_information_question(text: str) -> bool:
    """
    Check if the query is asking about the app itself, its features, or general information
    These should be handled with built-in app knowledge, not legal database search
    """
    text_lower = text.lower().strip()
    
    app_patterns = [
        # Direct app questions
        'this app', 'about this app', 'what is this app', 'tell me about this app',
        'about the app', 'what does this app do', 'how does this app work',
        'app features', 'app capabilities', 'what can this app do',
        
        # AI.ttorney specific
        'ai.ttorney', 'ai ttorney', 'ai attorney', 'what is ai.ttorney',
        'about ai.ttorney', 'ai.ttorney features',
        
        # General app info
        'how to use this', 'how to use the app', 'app instructions',
        'what is this for', 'what is this platform', 'about this platform',
        'how does this work', 'what can i do here', 'app guide',
        
        # Filipino equivalents
        'ano ang app na ito', 'tungkol sa app', 'paano gamitin ang app',
        'ano ang ai.ttorney', 'para saan ang app na ito',
        'paano gumagana ang app', 'mga feature ng app',
        'ano purpose ng app', 'purpose ng app na to', 'ano purpose ng app na ito',
        'para saan ito', 'para saan ang app', 'ano ginagawa ng app',
        'ano function ng app', 'ano trabaho ng app',
        # More specific patterns
        'ano ang purpose ng app', 'purpose ng app', 'layunin ng app',
        'ano ang layunin ng app', 'bakit ginawa ang app', 'para saan ginawa ang app'
    ]
    
    return any(pattern in text_lower for pattern in app_patterns)


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
    Convert emotional/informal queries into search-friendly legal questions.
    This helps retrieve relevant scraped data from the vector database.
    
    Industry best practice: Normalize queries to improve vector search accuracy
    while preserving the original intent.
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
            max_tokens=100,
            temperature=0.2,  # Industry best: Very low for deterministic normalization
            top_p=0.9,
            timeout=5.0,  # Fast timeout for preprocessing (reduced for speed)
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


def needs_clarification(question: str) -> tuple[bool, str]:
    """
    Detect if a question is too vague or needs clarification.
    Returns: (needs_clarification, clarification_type)
    """
    question_lower = question.lower().strip()
    
    # Very short or vague questions
    if len(question_lower) < 10:
        return True, "too_short"
    
    # Questions with only pronouns or vague terms
    vague_patterns = [
        r'^(what|how|when|where|why|can|is|are|do|does|will|would|should)\s+(this|that|it|they|them|he|she)\b',
        r'^(tell me about|explain|what about)\s+(this|that|it)\b',
        r'^(how to|what is|what are)\s*$',
        r'^(yes|no|ok|okay|sure|maybe)\s*$'
    ]
    
    for pattern in vague_patterns:
        if re.search(pattern, question_lower):
            return True, "vague_pronouns"
    
    # Questions without specific legal context
    general_patterns = [
        r'^(what|how)\s+(can|should|do)\s+i\s*$',
        r'^(help|advice|suggestion)\s*$',
        r'^(what|how)\s+(about|with)\s*$'
    ]
    
    for pattern in general_patterns:
        if re.search(pattern, question_lower):
            return True, "too_general"
    
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
    Check if the input is asking for legal information, advice, or is a valid conversational query.
    Made more permissive to handle legitimate user interactions.
    
    UPDATED: Now includes conversation context questions and general inquiries as valid.
    """
    text_lower = text.lower().strip()
    
    # FIRST: Check if it's a conversation context question (always valid)
    if is_conversation_context_question(text):
        logger.debug(f"Detected as conversation context question - treating as valid")
        return True
    
    # SECOND: Check for explicitly non-legal topics (medical, tech, etc.) - but be more lenient
    # Only exclude if there are STRONG indicators (3+ matches) and NO legal context
    non_legal_topics = {
        'medical': [
            'gamot', 'medicine', 'medication', 'lunas', 'treatment',
            'sakit', 'illness', 'disease', 'sintomas', 'symptoms',
            'doctor', 'doktor', 'hospital', 'ospital', 'clinic', 'klinika',
            'sugat', 'wound', 'injury', 'pinsala sa katawan',
            'lagnat', 'fever', 'sipon', 'cold', 'ubo', 'cough',
            'trangkaso', 'flu', 'covid', 'virus', 'bacteria',
            'surgery', 'operasyon', 'operation', 'medical procedure',
            'prescription', 'reseta', 'diagnosis', 'check-up',
            'vaccine', 'bakuna', 'injection', 'iniksyon',
            'maggamot', 'gumaling', 'healing', 'paggaling',
            'health', 'kalusugan', 'wellness', 'fitness',
            'therapy', 'terapya', 'rehabilitation', 'rehab'
        ],
        'technology': [
            'computer', 'kompyuter', 'laptop', 'phone', 'cellphone',
            'software', 'app', 'application', 'program',
            'internet', 'wifi', 'website', 'online',
            'facebook', 'tiktok', 'instagram', 'social media',
            'hack', 'hacker', 'virus', 'malware',
            'install', 'download', 'upload', 'i-download',
            'password', 'account', 'login', 'mag-login',
            'gadget', 'device', 'smartphone', 'tablet'
        ],
        'religious': [
            'prayer', 'panalangin', 'dasal', 'rosary',
            'church', 'simbahan', 'chapel', 'kapilya',
            'priest', 'pari', 'pastor', 'imam', 'monk',
            'bible', 'bibliya', 'quran', 'scripture',
            'god', 'diyos', 'allah', 'jesus', 'maria',
            'santo', 'santa', 'saint', 'angel', 'anghel',
            'blessing', 'pagpapala', 'miracle', 'himala',
            'sin', 'kasalanan', 'confession', 'kumpisal',
            'mass', 'misa', 'worship', 'pagsamba'
        ]
    }
    
    # Check each non-legal category - INCREASED threshold to 3+ matches
    for category, keywords in non_legal_topics.items():
        matches = sum(1 for keyword in keywords if keyword in text_lower)
        # Only exclude if 3+ matches in a non-legal category AND no legal context
        if matches >= 3:
            # Check if there's any legal context
            legal_context_words = ['law', 'batas', 'legal', 'rights', 'karapatan', 'court', 'korte', 'case', 'kaso']
            has_legal_context = any(word in text_lower for word in legal_context_words)
            if not has_legal_context:
                logger.info(f"Query identified as {category} topic ({matches} matches) - NOT legal")
                return False

    # Legal domain keywords (5 main areas)
    # Industry best practice: Include colloquial terms, misspellings, and simple language
    # Target: Below-average education, indigenous people, non-tech-savvy Filipinos
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

    # Remove overly generic words that cause false positives
    # These are too broad and match non-legal queries
    generic_words_to_exclude = [
        'gamit', 'sira', 'nasira',  # Too generic - matches "gamot", "sugat", etc.
        'may sakit',  # Medical, not legal
        'help', 'tulong',  # Too generic without legal context
    ]
    
    # Filter out generic words from legal keywords
    filtered_legal_domain = [k for k in legal_domain_keywords if k not in generic_words_to_exclude]
    filtered_general_legal = [k for k in general_legal_keywords if k not in generic_words_to_exclude]
    
    # Check for legal domain keywords (with filtered list)
    has_legal_domain = any(keyword in text_lower for keyword in filtered_legal_domain)
    
    # Check for STRONG legal keywords (must be explicit)
    strong_legal_keywords = [
        'law', 'batas', 'legal', 'illegal', 'karapatan', 'rights',
        'court', 'korte', 'case', 'kaso', 'sue', 'demanda',
        'attorney', 'abogado', 'lawyer',
        'penalty', 'parusa', 'fine', 'multa',
        'arrest', 'huli', 'police', 'pulis',
        'contract', 'kontrata', 'agreement',
        'crime', 'krimen', 'theft', 'nakaw',
        'estafa', 'fraud', 'scam',
        'labor code', 'civil code', 'revised penal code',
        'republic act', 'presidential decree'
    ]
    has_strong_legal_keyword = any(keyword in text_lower for keyword in strong_legal_keywords)
    
    # Check for general legal keywords (filtered)
    has_legal_keyword = any(keyword in text_lower for keyword in filtered_general_legal)
    
    # Check for conversational patterns
    has_conversational_pattern = any(pattern in text_lower for pattern in conversational_patterns)

    # UPDATED: More permissive approach - A question is legal if:
    # 1. It mentions a legal domain (consumer law, labor law, etc.), OR
    # 2. It has STRONG legal keywords (explicit legal terms), OR
    # 3. It has legal keywords AND conversational patterns, OR
    # 4. It's a general inquiry that could be legal-related, OR
    # 5. It's asking for help/information (benefit of the doubt)
    
    # Add general inquiry patterns (more permissive)
    general_inquiry_patterns = [
        'can you', 'are you able', 'do you know', 'tell me', 'explain',
        'what is', 'what are', 'how do', 'why', 'when', 'where',
        'help', 'assist', 'guide', 'advice', 'information',
        'kaya mo ba', 'alam mo ba', 'sabihin mo', 'ipaliwanag',
        'ano ang', 'paano', 'bakit', 'kailan', 'saan',
        'tulong', 'gabay', 'payo', 'impormasyon'
    ]
    
    has_general_inquiry = any(pattern in text_lower for pattern in general_inquiry_patterns)
    
    # More permissive logic - include general inquiries
    is_legal = (has_legal_domain or 
                has_strong_legal_keyword or 
                (has_conversational_pattern and has_legal_keyword) or
                (has_general_inquiry and len(text.strip()) > 10))  # General inquiries over 10 chars
    
    if is_legal:
        logger.debug(f"Detected as valid question - domain:{has_legal_domain}, strong_keyword:{has_strong_legal_keyword}, keyword:{has_legal_keyword}, conversational:{has_conversational_pattern}, general_inquiry:{has_general_inquiry}")
    else:
        logger.debug(f"NOT a valid question - will provide casual/redirect response")
    
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
    embed_start = time.time()
    print(f"      📡 Calling OpenAI Embeddings API...")
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    embed_time = time.time() - embed_start
    print(f"      ⏱️  Embedding API call: {embed_time:.2f}s")
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


def generate_answer(question: str, context: str, conversation_history: List[Dict[str, str]], 
                   language: str, max_tokens: int = 1200, is_complex: bool = False) -> tuple[str, str, str, List[str]]:
    """
    Generate high-quality answer using GPT with comprehensive system prompts.
    
    NOTE: This function is specifically designed for the USER CHATBOT (chatbot_user.py).
    It uses simplified, accessible prompts optimized for general public users.
    
    For lawyer chatbot (chatbot_lawyer.py), a separate function with more technical,
    in-depth prompts should be implemented when that endpoint is developed.
    
    Uses in-depth prompts following OpenAI's approach to prevent overfitting.
    
    Returns: (answer, confidence_level, simplified_summary)
    """
    # Use comprehensive, in-depth system prompt from configuration
    # These prompts are optimized for accessibility and user-friendliness
    system_prompt = ENGLISH_SYSTEM_PROMPT if language == "english" else TAGALOG_SYSTEM_PROMPT
    
    # Build messages (natural and conversational)
    messages = [
        {"role": "system", "content": system_prompt},
    ]
    
    # Add ALL conversation history for complete context retention
    # No message limit - this prevents the chatbot from "giving up" or losing context
    # The AI model can handle the full conversation history for better continuity
    for msg in conversation_history:
        messages.append(msg)
    
    # Add current question with context
    # Note: Detailed instructions are in system_prompt, keep user message minimal
    if context and context.strip():
        # We have legal context from the database
        user_message = f"""Legal Context:
{context}

User Question: {question}

Please provide a comprehensive informational response with the following structure:

1. **Direct Answer**: Start with a clear, direct answer to the question
2. **Legal Explanation**: Provide detailed explanation citing specific legal codes (use CAPITAL LETTERS for key terms)
3. **Practical Example**: Give a real-world example to illustrate the concept
4. **Important Considerations**: Mention any important limitations, exceptions, or requirements
5. **Follow-up Questions**: End with 2-3 relevant follow-up questions the user might want to ask

Format your response clearly with proper headings and make it accessible to general users."""
    else:
        # No specific legal context found, use general knowledge
        user_message = f"""User Question: {question}

Note: I don't have specific legal documents for this question in my database. Please provide a helpful answer based on your general knowledge of Philippine law with this structure:

1. **Direct Answer**: Clear, direct response to the question
2. **General Legal Information**: What you know about this topic in Philippine law
3. **Limitations**: Clearly state what information you cannot provide
4. **Recommendation**: Suggest consulting a licensed attorney for specific guidance
5. **Follow-up Questions**: 2-3 related questions they might want to explore

If you lack sufficient information, clearly state that and focus on the recommendation to consult a licensed attorney."""
    
    messages.append({"role": "user", "content": user_message})
    
    # Generate response with error handling
    try:
        response = openai_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.3,  # Lower temp for more consistent, accurate responses
            top_p=0.9,  # More focused sampling for better quality
            presence_penalty=0.1,  # Slight penalty to encourage diverse vocabulary
            frequency_penalty=0.1,  # Slight penalty to reduce repetition
            timeout=15.0,  # Reasonable timeout for quality responses
        )
        
        answer = response.choices[0].message.content
        
        # Industry standard: Validate response quality
        if not answer or len(answer.strip()) < 10:
            # Response too short or empty
            return ("I apologize, but I couldn't generate a proper response. Please try rephrasing your question.", 
                    "low", 
                    "Response generation failed", 
                    [])
        
    except Exception as e:
        print(f"❌ Error generating answer: {e}")
        # Return a graceful error message instead of crashing
        return ("I apologize, but I encountered an error while processing your question. Please try again.", 
                "low", 
                f"Error: {str(e)}", 
                [])
    
    # Industry standard: Post-response validation to catch advice-giving
    is_valid, validation_reason = validate_response_quality(answer)
    if not is_valid:
        # Log the validation failure for monitoring
        logger.warning(f"Response validation failed: {validation_reason}")
        logger.warning(f"Question: {question[:100]}")
        logger.warning(f"Original response: {answer[:200]}...")
        
        print(f"⚠️  Response validation failed: {validation_reason}")
        print(f"   Original response: {answer[:200]}...")
        # Regenerate with stronger emphasis on informational content
        # For now, return a safe fallback
        if language == "tagalog":
            answer = "Paumanhin po, pero hindi ako makapagbigay ng personal na legal advice. Maaari lamang akong magbigay ng pangkalahatang impormasyon tungkol sa batas ng Pilipinas. Para sa specific na sitwasyon, kumonsulta po sa lisensyadong abogado."
        else:
            answer = "I apologize, but I can only provide general legal information, not personal legal advice. For specific guidance on your situation, please consult with a licensed attorney."
        confidence = "low"
    
    # Extract follow-up questions from the response
    follow_up_questions = []
    if answer:
        # Look for follow-up questions section in the response
        import re
        
        # Pattern to match follow-up questions section
        followup_patterns = [
            r'(?:Follow-up Questions?|Related Questions?|You might also ask|Mga karagdagang tanong)[:\s]*\n((?:[-•*]\s*.+\n?)+)',
            r'(?:\*\*Follow-up Questions?\*\*|##\s*Follow-up Questions?)[:\s]*\n((?:[-•*]\s*.+\n?)+)',
            r'(?:Questions? you might want to ask|Tanong na maaari ninyong itanong)[:\s]*\n((?:[-•*]\s*.+\n?)+)'
        ]
        
        for pattern in followup_patterns:
            match = re.search(pattern, answer, re.IGNORECASE | re.MULTILINE)
            if match:
                questions_text = match.group(1)
                # Extract individual questions
                question_lines = re.findall(r'[-•*]\s*(.+)', questions_text)
                follow_up_questions = [q.strip().rstrip('?') + '?' for q in question_lines if q.strip()]
                break
        
        # If no structured follow-up questions found, generate some based on the topic
        if not follow_up_questions and context:
            # Generate contextual follow-up questions based on the legal domain
            if any(keyword in answer.lower() for keyword in ['marriage', 'kasal', 'family', 'pamilya']):
                if language == "tagalog":
                    follow_up_questions = [
                        "Ano ang mga requirements para sa kasal sa Pilipinas?",
                        "Paano ang proseso ng annulment?",
                        "Ano ang mga karapatan ng asawa sa property?"
                    ]
                else:
                    follow_up_questions = [
                        "What are the requirements for marriage in the Philippines?",
                        "How does the annulment process work?",
                        "What are spousal property rights?"
                    ]
            elif any(keyword in answer.lower() for keyword in ['employment', 'trabaho', 'labor', 'work']):
                if language == "tagalog":
                    follow_up_questions = [
                        "Ano ang mga karapatan ng empleyado?",
                        "Paano mag-file ng complaint sa DOLE?",
                        "Ano ang tamang proseso sa termination?"
                    ]
                else:
                    follow_up_questions = [
                        "What are employee rights in the Philippines?",
                        "How to file a complaint with DOLE?",
                        "What is the proper termination process?"
                    ]
    
    # Calculate confidence based on source relevance scores (if available)
    confidence = "medium"  # default
    if context and context.strip():
        # We have sources, so we can calculate confidence
        # This will be passed from the calling function
        confidence = "high"  # Will be overridden by actual calculation
    
    # Simplified summary (optional, for internal use only)
    simplified_summary = None
    
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

This is NOT a legal question. It appears to be about a non-legal topic (medical, technology, religious, general advice, etc.).

⚠️ CRITICAL INSTRUCTIONS:
- You can ONLY help with Philippine Civil, Criminal, Consumer, Family, and Labor Law
- This question is OUTSIDE your scope
- Politely decline and explain you cannot help with this topic
- Suggest they consult the appropriate professional (doctor, tech support, religious leader, etc.)
- Be brief, respectful, and redirect them clearly

Response format:
1. Acknowledge their question briefly
2. Explain you cannot help with this specific topic
3. Suggest the appropriate professional to consult
4. Optionally invite them to ask legal questions instead

Example for medical: "I understand you're asking about [medical topic], but I'm a legal assistant and can only help with Philippine law. For medical concerns, I recommend consulting with a licensed medical professional or doctor. If you have any legal questions, feel free to ask!"

Keep it brief (2-3 sentences max). Use the same language they used (English, Tagalog, or Taglish).""",
            'tagalog': f"""Ikaw si Ai.ttorney, isang mainit na legal assistant sa Pilipinas. Ang user lang ay nag-sabi: "{question}"

Ito ay HINDI legal na tanong. Mukhang tungkol ito sa non-legal topic (medical, technology, religious, general advice, etc.).

⚠️ MAHALAGANG INSTRUKSYON:
- Makakatulong ka LAMANG sa Philippine Civil, Criminal, Consumer, Family, at Labor Law
- Ang tanong na ito ay LABAS sa iyong scope
- Magalang na tumanggi at ipaliwanag na hindi ka makakatulong sa topic na ito
- Mag-suggest na kumonsulta sila sa tamang propesyonal (doktor, tech support, religious leader, etc.)
- Maging maikli, magalang, at malinaw na mag-redirect

Format ng sagot:
1. Kilalanin ang kanilang tanong nang maikli
2. Ipaliwanag na hindi ka makakatulong sa specific topic na ito
3. Mag-suggest ng tamang propesyonal na konsultahin
4. Optional: Imbitahan silang magtanong tungkol sa legal

Halimbawa para sa medical: "Naiintindihan ko na nagtanong ka tungkol sa [medical topic], pero ako ay legal assistant at makakatulong lamang sa batas ng Pilipinas. Para sa medical concerns, inirerekomenda kong kumonsulta sa lisensyadong medical professional o doktor. Kung may legal na tanong ka, handa akong tumulong!"

Panatilihing maikli (2-3 pangungusap lang). Gamitin ang parehong lengguwahe nila.

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


def requires_legal_disclaimer(question: str, answer: str) -> bool:
    """
    Determine if a response requires a legal disclaimer.
    Only legal questions/answers should have disclaimers.
    
    Industry best practice: Don't show legal disclaimers for:
    - Simple greetings ("hello", "hi", "kumusta")
    - General chitchat
    - Non-legal questions
    
    Args:
        question: User's input question
        answer: Generated response
    
    Returns:
        bool: True if legal disclaimer is needed, False otherwise
    """
    question_lower = question.lower().strip()
    answer_lower = answer.lower().strip()
    
    # 1. Check if it's a simple greeting - NO disclaimer needed
    if is_simple_greeting(question):
        logger.debug("No disclaimer needed: Simple greeting detected")
        return False
    
    # 2. Check if question is very short and non-legal - NO disclaimer needed
    if len(question_lower) < 15:
        # Short questions that are clearly non-legal
        non_legal_short = [
            'hello', 'hi', 'hey', 'kumusta', 'kamusta', 'salamat', 'thank', 'thanks',
            'ok', 'okay', 'yes', 'no', 'oo', 'hindi', 'what', 'ano', 'who', 'sino'
        ]
        if any(word in question_lower for word in non_legal_short):
            # Check if answer also doesn't contain legal content
            legal_indicators_in_answer = [
                'law', 'batas', 'legal', 'article', 'artikulo', 'code', 'kodigo',
                'rights', 'karapatan', 'court', 'korte', 'case', 'kaso'
            ]
            if not any(indicator in answer_lower for indicator in legal_indicators_in_answer):
                logger.debug("No disclaimer needed: Short non-legal question")
                return False
    
    # 3. Check if question contains legal keywords - NEEDS disclaimer
    legal_keywords = [
        # Legal domain terms
        'law', 'batas', 'legal', 'illegal', 'karapatan', 'rights',
        'court', 'korte', 'case', 'kaso', 'sue', 'demanda',
        
        # Consumer law
        'consumer', 'konsumer', 'warranty', 'refund', 'defective', 'sira',
        
        # Labor law
        'employment', 'trabaho', 'employer', 'boss', 'sahod', 'wage',
        'overtime', 'termination', 'tanggal', 'fired', 'resign',
        
        # Family law
        'marriage', 'kasal', 'divorce', 'annulment', 'custody', 'alimony',
        'domestic violence', 'vawc', 'infidelity', 'cheating',
        
        # Criminal law
        'crime', 'krimen', 'theft', 'nakaw', 'robbery', 'holdap',
        'assault', 'murder', 'fraud', 'estafa', 'arrest', 'huli',
        
        # Civil law
        'contract', 'kontrata', 'property', 'ari-arian', 'inheritance',
        'debt', 'utang', 'rent', 'renta', 'eviction', 'palayas'
    ]
    
    # Check if question contains any legal keywords
    has_legal_keywords = any(keyword in question_lower for keyword in legal_keywords)
    
    # 4. Check if answer contains legal information - NEEDS disclaimer
    legal_answer_indicators = [
        'article', 'artikulo', 'section', 'seksiyon',
        'republic act', 'ra ', 'presidential decree', 'pd ',
        'civil code', 'labor code', 'family code', 'revised penal code',
        'according to law', 'ayon sa batas', 'under philippine law',
        'legal', 'batas', 'karapatan', 'rights'
    ]
    
    has_legal_answer = any(indicator in answer_lower for indicator in legal_answer_indicators)
    
    # Decision logic: Show disclaimer if question OR answer contains legal content
    if has_legal_keywords or has_legal_answer:
        logger.debug(f"Legal disclaimer needed: legal_keywords={has_legal_keywords}, legal_answer={has_legal_answer}")
        return True
    
    logger.debug("No disclaimer needed: No legal content detected")
    return False


def get_legal_disclaimer(language: str, question: str = "", answer: str = "") -> str:
    """
    Get legal disclaimer in appropriate language with in-app legal help link.
    Only returns disclaimer if the question/answer is actually legal-related.
    
    Args:
        language: Detected language (english, tagalog, taglish)
        question: User's question (optional, for context)
        answer: Generated answer (optional, for context)
    
    Returns:
        str: Legal disclaimer if needed, empty string otherwise
    """
    # Check if disclaimer is actually needed
    if question and answer and not requires_legal_disclaimer(question, answer):
        return ""  # No disclaimer for non-legal queries
    
    disclaimers = {
        "english": "⚖️ Important: This is general legal information only, not legal advice. For your specific situation, you can consult with a licensed Philippine lawyer through our [Lawyer Directory](/directory) section.",
        "tagalog": "⚖️ Mahalaga: Ito ay pangkalahatang impormasyon lamang, hindi legal advice. Para sa iyong partikular na sitwasyon, maaari kang kumonsulta sa lisensyadong abogado sa aming [Lawyer Directory](/directory) section.",
        "taglish": "⚖️ Important: Ito ay general legal information lang, hindi legal advice. Para sa iyong specific situation, you can consult with a licensed Philippine lawyer sa aming [Lawyer Directory](/directory) section."
    }
    return disclaimers.get(language, disclaimers["english"])


def create_chat_response(
    answer: str,
    sources: List[SourceCitation] = None,
    confidence: str = None,
    simplified_summary: str = None,
    legal_disclaimer: str = None,
    fallback_suggestions: List[FallbackSuggestion] = None,
    follow_up_questions: List[str] = None,
    security_report: Dict = None,
    session_id: str = None,
    message_id: str = None,
    user_message_id: str = None,
    metadata: Dict = None,
    guest_session_token: str = None  # OpenAI/Anthropic pattern: return server token
) -> ChatResponse:
    """
    Helper function to create standardized ChatResponse objects.
    Reduces code duplication across the endpoint.
    """
    # Add guest session token to metadata if present
    response_metadata = metadata or {}
    if guest_session_token:
        response_metadata["guest_session_token"] = guest_session_token
    
    response = ChatResponse(
        answer=answer,
        sources=sources or [],
        confidence=confidence,
        simplified_summary=simplified_summary,
        legal_disclaimer=legal_disclaimer or get_legal_disclaimer("en"),
        fallback_suggestions=fallback_suggestions,
        follow_up_questions=follow_up_questions or [],
        security_report=security_report,
        session_id=session_id,
        message_id=message_id,
        user_message_id=user_message_id
    )
    
    # Attach metadata if present
    if response_metadata:
        response.metadata = response_metadata
    
    return response


def get_fallback_suggestions(language: str, is_complex: bool = False) -> List[FallbackSuggestion]:
    """
    Get fallback suggestions for complex queries or when professional help is needed
    """
    if language == "tagalog":
        return [
            FallbackSuggestion(
                action="consult_lawyer",
                description="Kumonsulta sa Lisensyadong Abogado",
                reason="Ang iyong tanong ay nangangailangan ng personal na legal advice mula sa propesyonal na abogado na makakapag-review ng iyong specific na kaso."
            ),
            FallbackSuggestion(
                action="legal_directory",
                description="Maghanap ng Abogado sa Legal Directory",
                reason="Maaari kang maghanap ng mga lisensyadong abogado sa aming legal directory o sa Integrated Bar of the Philippines."
            ),
            FallbackSuggestion(
                action="legal_aid",
                description="Humingi ng Tulong sa Legal Aid Organizations",
                reason="May mga non-profit organizations tulad ng Integrated Bar of the Philippines (IBP) na nag-aalok ng free legal consultation."
            )
        ]
    else:  # English or Taglish
        return [
            FallbackSuggestion(
                action="consult_lawyer",
                description="Consult a Licensed Lawyer",
                reason="Your question requires personalized legal advice from a professional lawyer who can review your specific case and circumstances."
            ),
            FallbackSuggestion(
                action="legal_directory",
                description="Find a Lawyer in Legal Directory",
                reason="You can search for licensed lawyers in our legal directory or through the Integrated Bar of the Philippines."
            ),
            FallbackSuggestion(
                action="legal_aid",
                description="Seek Help from Legal Aid Organizations",
                reason="Organizations like the Integrated Bar of the Philippines (IBP) offer free legal consultation services to those in need."
            )
        ]


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


async def get_conversation_history_from_db(chat_service, session_id: str, limit: int = 12) -> List[Dict[str, str]]:
    """
    Retrieve conversation history from database for better context continuity.
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
                "content": msg.content[:500]  # Limit content length for efficiency
            })
        
        print(f"   ✅ Retrieved {len(conversation_history)} messages from database")
        return conversation_history
        
    except Exception as e:
        print(f"   ⚠️ Error retrieving conversation history: {e}")
        return []


@router.post("/ask", response_model=ChatResponse)
async def ask_legal_question(
    request: ChatRequest,
    fastapi_request: Request,
    current_user: Optional[dict] = Depends(get_optional_current_user),
    chat_history_service: ChatHistoryService = Depends(get_chat_history_service)
) -> ChatResponse:
    """
    Main endpoint for general public to ask legal questions about Philippine law
    
    Features:
    - Bilingual support (English, Tagalog, Taglish)
    - Source citations with URLs
    - Legal disclaimers
    - Input filtering for misuse prevention
    - Fallback suggestions for complex queries
    - Query normalization for emotional/informal questions
    - Automatic chat history saving for authenticated users
    
    Example request:
    {
        "question": "Pwede ba akong makipaghiwalay sa asawa ko kasi nambabae siya?",
        "conversation_history": [],
        "max_tokens": 1200,
        "session_id": "optional-uuid-for-existing-session"
    }
    """
    # Production: Track request start time for monitoring
    request_start_time = datetime.now()
    perf_start = time.time()
    
    print("\n" + "="*80)
    print(f"⏱️  PERFORMANCE TRACKING STARTED")
    print(f"📝 Question: {request.question[:100]}...")
    print("="*80)
    
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
    
    # ============================================================================
    # GUEST RATE LIMITING - OpenAI/Anthropic Security Pattern
    # ============================================================================
    # CRITICAL: Server-side validation for guest users
    # Never trust client-side data - validate everything on server
    if not effective_user_id:  # Guest user (no authentication)
        print("\n🛡️  [GUEST SECURITY] Validating guest rate limit...")
        
        # Pass actual FastAPI request for IP-based rate limiting
        rate_limit_result = await GuestRateLimiter.validate_guest_request(
            request=fastapi_request,
            session_id=request.guest_session_id,
            client_prompt_count=request.guest_prompt_count
        )
        
        if not rate_limit_result["allowed"]:
            logger.warning(
                f"🚫 Guest rate limit exceeded: {rate_limit_result['reason']} - "
                f"Message: {rate_limit_result.get('message', 'Rate limit reached')}"
            )
            
            # Return rate limit error with countdown
            return create_chat_response(
                answer=rate_limit_result["message"],
                simplified_summary="Rate limit reached",
                metadata={
                    "rate_limit_exceeded": True,
                    "reason": rate_limit_result["reason"],
                    "reset_seconds": rate_limit_result.get("reset_seconds", 0)
                }
            )
        
        # Rate limit passed - log server-side count
        print(f"✅ Guest rate limit check passed")
        print(f"   Server count: {rate_limit_result['server_count']}/{15}")
        print(f"   Remaining: {rate_limit_result['remaining']}")
        print(f"   Session ID: {rate_limit_result.get('session_id', 'N/A')[:16]}...")
        
        # Store session_id for response (client needs this for next request)
        guest_session_token = rate_limit_result.get("session_id")
    else:
        guest_session_token = None
    # ============================================================================
    
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
                step_start = time.time()
                print(f"\n🔒 [STEP 1] Guardrails input validation...")
                input_validation_result = guardrails_instance.validate_input(request.question)
                step_time = time.time() - step_start
                print(f"⏱️  Guardrails validation took: {step_time:.2f}s")
                
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
        
        # Check if this is an app information question FIRST (before greeting check)
        if is_app_information_question(request.question):
            print(f"\n📱 [APP INFO] Detected app information question: {request.question}")
            
            # Detect language for appropriate response
            language = detect_language(request.question)
            
            # Generate comprehensive app information response
            if language == "tagalog":
                app_response = (
                    "Ako si **Ai.ttorney** - ang inyong AI legal assistant para sa Philippine law! 🏛️⚖️\n\n"
                    "**Ano ang Ai.ttorney?**\n"
                    "Ako ay isang advanced na AI chatbot na specially designed para sa mga Pilipinong nangangailangan ng legal na tulong at impormasyon. Hindi ako abogado, pero may access ako sa comprehensive database ng Philippine laws.\n\n"
                    "**Mga Features ko:**\n"
                    "• **📚 Legal Knowledge Base** - May access ako sa Family Code, Labor Code, Revised Penal Code, at iba pang Philippine laws\n"
                    "• **🗣️ Bilingual Support** - Makakausap ninyo ako sa English, Tagalog, o Taglish\n"
                    "• **💬 Conversation Memory** - Naaalala ko ang lahat ng aming mga usapan\n"
                    "• **📖 Source Citations** - Nagbibigay ako ng mga links sa actual na legal documents\n"
                    "• **🔍 Smart Search** - Hinahanap ko ang pinaka-relevant na legal information para sa inyong tanong\n\n"
                    "**Ano ang pwede ninyong itanong?**\n"
                    "• **Family Law** - Kasal, annulment, child custody, inheritance\n"
                    "• **Labor Law** - Employment rights, termination, wages, benefits\n"
                    "• **Consumer Law** - Product warranties, refunds, consumer rights\n"
                    "• **Criminal Law** - Crimes, penalties, arrest procedures\n"
                    "• **Civil Law** - Contracts, property, obligations\n\n"
                    "**⚠️ Important:** Ang mga sagot ko ay para sa general information lang. Para sa specific legal advice, kailangan pa rin ninyong makipag-consult sa licensed lawyer."
                )
                
                app_followups = [
                    "Anong legal na kategorya ang gusto ninyong malaman?",
                    "May specific na legal na problema ba kayong kailangang solusyunan?",
                    "Paano ko kayo matutulungan sa inyong legal concerns ngayon?"
                ]
            else:
                app_response = (
                    "I'm **Ai.ttorney** - your AI legal assistant for Philippine law! 🏛️⚖️\n\n"
                    "**What is Ai.ttorney?**\n"
                    "I'm an advanced AI chatbot specifically designed to help Filipinos who need legal information and guidance. While I'm not a lawyer, I have access to a comprehensive database of Philippine laws.\n\n"
                    "**My Features:**\n"
                    "• **📚 Legal Knowledge Base** - I have access to the Family Code, Labor Code, Revised Penal Code, and other Philippine laws\n"
                    "• **🗣️ Bilingual Support** - You can talk to me in English, Tagalog, or Taglish\n"
                    "• **💬 Conversation Memory** - I remember all our conversations\n"
                    "• **📖 Source Citations** - I provide links to actual legal documents\n"
                    "• **🔍 Smart Search** - I find the most relevant legal information for your questions\n\n"
                    "**What can you ask me about?**\n"
                    "• **Family Law** - Marriage, annulment, child custody, inheritance\n"
                    "• **Labor Law** - Employment rights, termination, wages, benefits\n"
                    "• **Consumer Law** - Product warranties, refunds, consumer rights\n"
                    "• **Criminal Law** - Crimes, penalties, arrest procedures\n"
                    "• **Civil Law** - Contracts, property, obligations\n\n"
                    "**⚠️ Important:** My responses are for general information only. For specific legal advice, you still need to consult with a licensed lawyer."
                )
                
                app_followups = [
                    "Which legal category would you like to learn about?",
                    "Do you have a specific legal problem that needs solving?",
                    "How can I help you with your legal concerns today?"
                ]
            
            # Save app information interaction
            session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                chat_service=chat_history_service,
                effective_user_id=effective_user_id,
                session_id=request.session_id,
                question=request.question,
                answer=app_response,
                language=language,
                metadata={"type": "app_information"}
            )
            
            return create_chat_response(
                answer=app_response,
                simplified_summary="App information and features explained",
                follow_up_questions=app_followups,
                session_id=session_id,
                message_id=assistant_msg_id,
                user_message_id=user_msg_id
            )
        
        # Check if this is a translation/repeat request
        if is_translation_request(request.question):
            print(f"\n🔄 [TRANSLATION] Detected translation/repeat request: {request.question}")
            
            # Detect target language
            text_lower = request.question.lower()
            target_language = "english" if "english" in text_lower else "tagalog" if "tagalog" in text_lower else "english"
            
            # Get the last assistant message from conversation history
            last_response = None
            if request.conversation_history:
                for msg in reversed(request.conversation_history):
                    # Handle both dict and object formats
                    msg_role = msg.role if hasattr(msg, 'role') else msg.get('role')
                    msg_content = msg.content if hasattr(msg, 'content') else msg.get('content')
                    
                    if msg_role == "assistant":
                        last_response = msg_content
                        break
            
            if not last_response:
                # Try to get from database if no conversation history provided
                if effective_user_id and request.session_id:
                    try:
                        recent_messages = await chat_history_service.get_recent_messages(
                            user_id=effective_user_id,
                            session_id=request.session_id,
                            limit=2
                        )
                        if recent_messages:
                            # Find the most recent assistant message
                            for msg in reversed(recent_messages):
                                if msg.get('role') == 'assistant':
                                    last_response = msg.get('content', '')
                                    break
                    except Exception as e:
                        print(f"Failed to get recent messages for translation: {e}")
            
            if last_response:
                # Generate translation/repeat response
                if target_language == "tagalog":
                    # For legal category responses, provide a proper Tagalog translation
                    if "Family Law" in last_response and "Main Topics" in last_response:
                        translation_response = (
                            "**Batas ng Pamilya** - Mga Legal na Usapin Tungkol sa Pamilya 👨‍👩‍👧‍👦\n\n"
                            "Ang Batas ng Pamilya ay sumasaklaw sa lahat ng legal na isyu na may kaugnayan sa mga relasyon ng pamilya sa Pilipinas:\n\n"
                            "**📋 Mga Pangunahing Paksa:**\n"
                            "• **Kasal** - Mga legal na pangangailangan, sibil at relihiyosong seremonya\n"
                            "• **Annulment** - Pagdedeklara na ang kasal ay walang bisa\n"
                            "• **Legal Separation** - Pormal na paghihiwalay ng mag-asawa\n"
                            "• **Custody ng Anak** - Pag-aalaga at guardianship ng mga anak\n"
                            "• **Inheritance** - Estate planning at mga karapatan sa succession\n"
                            "• **Adoption** - Mga legal na pamamaraan sa pag-adopt\n"
                            "• **VAWC** - Proteksyon laban sa Violence Against Women and Children\n\n"
                            "**⚖️ Mga Governing Laws:**\n"
                            "• Family Code of the Philippines\n"
                            "• Anti-VAWC Act (RA 9262)\n"
                            "• Domestic Adoption Act\n"
                            "• Rules on Custody of Minors\n\n"
                            "Alin sa mga paksang ito ang gusto ninyong malaman pa?\n\n"
                            "Kung may iba pa kayong tanong, huwag mag-atubiling magtanong!"
                        )
                    else:
                        # For other responses, use the original format
                        translation_response = (
                            f"Narito ang sagot ko sa Tagalog:\n\n{last_response}\n\n"
                            "Kung may iba pa kayong tanong, huwag mag-atubiling magtanong!"
                        )
                else:
                    translation_response = (
                        f"Here's my response in English:\n\n{last_response}\n\n"
                        "If you have any other questions, feel free to ask!"
                    )
                
                # Save translation interaction
                session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                    chat_service=chat_history_service,
                    effective_user_id=effective_user_id,
                    session_id=request.session_id,
                    question=request.question,
                    answer=translation_response,
                    language=target_language,
                    metadata={"type": "translation_repeat"}
                )
                
                return create_chat_response(
                    answer=translation_response,
                    simplified_summary=f"Previous response repeated in {target_language}",
                    follow_up_questions=[
                        "Do you need clarification on any part?",
                        "Would you like more details about this topic?",
                        "Is there anything else I can help you with?"
                    ] if target_language == "english" else [
                        "Kailangan ba ninyo ng karagdagang paliwanag?",
                        "Gusto ba ninyo ng mas detalyadong impormasyon?",
                        "May iba pa ba akong matutulungan sa inyo?"
                    ],
                    session_id=session_id,
                    message_id=assistant_msg_id,
                    user_message_id=user_msg_id
                )
            else:
                # No previous response found
                no_previous_response = (
                    "I don't see a previous response to repeat. Could you please ask your legal question again?" 
                    if target_language == "english" else
                    "Wala akong nakitang nakaraang sagot na pwedeng ulitin. Maaari ba ninyong itanong ulit ang inyong legal na katanungan?"
                )
                
                session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                    chat_service=chat_history_service,
                    effective_user_id=effective_user_id,
                    session_id=request.session_id,
                    question=request.question,
                    answer=no_previous_response,
                    language=target_language,
                    metadata={"type": "translation_no_previous"}
                )
                
                return create_chat_response(
                    answer=no_previous_response,
                    simplified_summary="No previous response to repeat",
                    follow_up_questions=[
                        "What legal topic would you like help with?",
                        "Do you have a specific legal question?",
                        "Which area of law interests you?"
                    ] if target_language == "english" else [
                        "Anong legal na paksa ang kailangan ninyong tulong?",
                        "May specific ba kayong legal na tanong?",
                        "Aling larangan ng batas ang interesado kayo?"
                    ],
                    session_id=session_id,
                    message_id=assistant_msg_id,
                    user_message_id=user_msg_id
                )
        
        # Check if this is a legal category request (e.g., "family", "labor", etc.)
        if is_legal_category_request(request.question):
            print(f"\n⚖️ [LEGAL CATEGORY] Detected legal category request: {request.question}")
            
            # Detect language for appropriate response
            language = detect_language(request.question)
            
            # Generate comprehensive legal category response
            category_response, category_followups = get_legal_category_response(request.question, language)
            
            # Save legal category interaction
            session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                chat_service=chat_history_service,
                effective_user_id=effective_user_id,
                session_id=request.session_id,
                question=request.question,
                answer=category_response,
                language=language,
                metadata={"type": "legal_category"}
            )
            
            return create_chat_response(
                answer=category_response,
                simplified_summary=f"Legal category information provided for {request.question}",
                follow_up_questions=category_followups,
                session_id=session_id,
                message_id=assistant_msg_id,
                user_message_id=user_msg_id
            )
        
        # Check if query is a simple greeting BEFORE validation
        step_start = time.time()
        if request.question and is_simple_greeting(request.question):
            print(f"\n✅ [STEP 2] Detected as greeting: {request.question}")
            # Generate intelligent greeting response using AI
            language = detect_language(request.question)
            step_time = time.time() - step_start
            print(f"⏱️  Greeting detection took: {step_time:.2f}s")
            greeting_response = generate_ai_response(request.question, language, 'greeting')
            
            # Save greeting interaction to chat history
            session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                chat_service=chat_history_service,
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
        
        # Basic validation - only check if question exists and isn't empty
        if not request.question or not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
        # Toxicity check removed - OpenAI moderation handles this more comprehensively
        
        # Check for prohibited input (misuse prevention) - keep this for safety
        step_start = time.time()
        print(f"\n🚫 [STEP 4] Prohibited input check...")
        is_prohibited, prohibition_reason = detect_prohibited_input(request.question)
        step_time = time.time() - step_start
        print(f"⏱️  Prohibited check took: {step_time:.2f}s")
        if is_prohibited:
            raise HTTPException(status_code=400, detail=prohibition_reason)
        
        # STEP 4.3: Prompt Injection Detection (NEW - Security Enhancement)
        # Check for prompt injection/hijacking attempts BEFORE processing
        # ⚡ CRITICAL: Check for ALL users (authenticated AND guests) to prevent security bypass
        step_start = time.time()
        print(f"\n🛡️  [STEP 4.3] Prompt injection detection...")
        injection_detector = get_prompt_injection_detector()
        
        try:
            injection_result = injection_detector.detect(request.question.strip())
            step_time = time.time() - step_start
            print(f"⏱️  Injection detection took: {step_time:.2f}s")
            
            # If prompt injection detected, block immediately
            if injection_result["is_injection"]:
                logger.warning(
                    f"🚨 Prompt injection detected for {'user ' + effective_user_id[:8] if effective_user_id else 'guest'}: "
                    f"category={injection_result['category']}, "
                    f"severity={injection_result['severity']:.2f}, "
                    f"risk={injection_result['risk_level']}"
                )
                
                # Record violation ONLY for authenticated users (guests can't be tracked)
                if effective_user_id:
                    violation_service = get_violation_tracking_service()
                    try:
                        print(f"📝 Recording prompt injection violation for user: {effective_user_id}")
                        violation_result = await violation_service.record_violation(
                            user_id=effective_user_id,
                            violation_type=ViolationType.CHATBOT_PROMPT,
                            content_text=request.question.strip(),
                            moderation_result=injection_result,
                            content_id=None
                        )
                        print(f"✅ Prompt injection violation recorded: {violation_result}")
                        
                        # Return error message with violation info
                        language = detect_language(request.question)
                        if language == "tagalog":
                            violation_message = (
                                f"🚨 Labag sa Patakaran ng Seguridad\n\n"
                                f"{injection_result['description']}\n\n"
                                f"⚠️ {violation_result['message']}"
                            )
                        else:
                            violation_message = (
                                f"🚨 Security Policy Violation\n\n"
                                f"{injection_result['description']}\n\n"
                                f"⚠️ {violation_result['message']}"
                            )
                        
                        return create_chat_response(
                            answer=violation_message,
                            simplified_summary=f"Prompt injection blocked: {injection_result['category']}"
                        )
                        
                    except Exception as violation_error:
                        logger.error(f"❌ Failed to record prompt injection violation: {str(violation_error)}")
                        import traceback
                        print(f"Violation error traceback: {traceback.format_exc()}")
                
                # Return generic error message (for guests or if violation recording fails)
                return create_chat_response(
                    answer="🚨 Your message was flagged for attempting to manipulate the system. This violates our usage policy. Please use the chatbot for legitimate legal questions only.",
                    simplified_summary="Prompt injection blocked"
                )
            else:
                print(f"✅ No prompt injection detected")
                    
        except Exception as e:
            logger.error(f"❌ Prompt injection detection error: {str(e)}")
            # Fail-open: Continue without injection detection if service fails
        
        # OPTIMIZATION: Skip gibberish detection for speed (too complex and slow)
        # The AI will handle unclear questions naturally in its response
        
        # Detect language
        step_start = time.time()
        print(f"\n🌐 [STEP 5] Language detection...")
        language = detect_language(request.question)
        step_time = time.time() - step_start
        print(f"⏱️  Language detection took: {step_time:.2f}s")
        print(f"   Detected language: {language}")
        
        # Check if language is supported (English, Tagalog, Taglish only)
        if language not in ["english", "tagalog", "taglish"]:
            unsupported_response = (
                "I'm sorry, but I can only provide accurate legal information in English, Tagalog, or Taglish. "
                "Please ask your question in one of these languages for the best assistance."
                if language == "english" else
                "Paumanhin po, pero maaari lamang akong magbigay ng tumpak na impormasyon legal sa English, Tagalog, o Taglish. "
                "Mangyaring magtanong sa isa sa mga wikang ito para sa pinakamahusay na tulong."
            )
            
            return create_chat_response(
                answer=unsupported_response,
                simplified_summary="Language not supported. Please use English, Tagalog, or Taglish."
            )
        
        # Check for PERSONAL ADVICE QUESTIONS (even if they contain legal keywords)
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
                legal_disclaimer=get_legal_disclaimer(language),
                fallback_suggestions=get_fallback_suggestions(language, is_complex=True)
            )
        
        # OPTIMIZATION: Skip out-of-scope detection for speed (too many checks)
        # The AI will naturally decline non-legal questions in its response
        
        # STEP 4.5: Content Moderation using OpenAI omni-moderation-latest
        # Run moderation on ALL messages (legal and casual) before generating any response
        # Only moderate for authenticated users to track violations
        # Content Moderation - Record violations but continue processing (better UX)
        violation_detected = False
        if effective_user_id:
            step_start = time.time()
            print(f"\n🔍 [STEP 4.5] Content moderation check...")
            moderation_service = get_moderation_service()
            violation_service = get_violation_tracking_service()
            
            try:
                moderation_result = await moderation_service.moderate_content(request.question.strip())
                step_time = time.time() - step_start
                print(f"⏱️  Content moderation took: {step_time:.2f}s")
                
                # If content is flagged, record violation but continue processing
                if not moderation_service.is_content_safe(moderation_result):
                    logger.warning(f"⚠️  Chatbot prompt flagged for user {effective_user_id[:8]}: {moderation_result['violation_summary']}")
                    violation_detected = True
                    
                    # Record violation and get action taken
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
                        print(f"⚠️  Violation recorded, continuing to process question...")
                    except Exception as violation_error:
                        logger.error(f"❌ Failed to record violation: {str(violation_error)}")
                        import traceback
                        print(f"Violation error traceback: {traceback.format_exc()}")
                        # Continue processing even if violation recording fails
                else:
                    print(f"✅ Content moderation passed")
                    
            except Exception as e:
                logger.error(f"❌ Content moderation error: {str(e)}")
                # Fail-open: Continue without moderation if service fails
                print(f"⚠️  Content moderation failed, continuing without moderation: {e}")
        
        # Check if this is a conversation context question (handle specially)
        if is_conversation_context_question(request.question):
            print(f"\n💬 [CONVERSATION CONTEXT] Detected conversation context question")
            
            # Try to retrieve past conversations if user is authenticated
            past_conversations_summary = ""
            if effective_user_id:
                try:
                    print(f"   🔍 Retrieving past conversations for user {effective_user_id[:8]}...")
                    
                    # Get recent sessions (last 7 for better context)
                    user_sessions = await chat_history_service.get_user_sessions(
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
                            session_with_messages = await chat_history_service.get_session_with_messages(
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
                                    
                                    # Add topic indicators if we can detect them
                                    question_lower = user_questions[0].content.lower()
                                    if any(word in question_lower for word in ['marriage', 'kasal', 'wedding', 'annulment']):
                                        summary_text += " (Family Law)"
                                    elif any(word in question_lower for word in ['work', 'job', 'employment', 'trabaho', 'empleyado']):
                                        summary_text += " (Labor Law)"
                                    elif any(word in question_lower for word in ['contract', 'kontrata', 'agreement', 'kasunduan']):
                                        summary_text += " (Contract Law)"
                                    elif any(word in question_lower for word in ['crime', 'criminal', 'krimen', 'arrest']):
                                        summary_text += " (Criminal Law)"
                                    
                                    conversation_summaries.append(summary_text)
                                    
                                    # Store detailed context for AI discussion
                                    if i < 2:  # Only store detailed context for most recent 2 conversations
                                        context_entry = {
                                            'title': session.title,
                                            'questions': [q.content[:300] for q in user_questions[:2]],
                                            'responses': [r.content[:400] for r in assistant_responses[:2]]
                                        }
                                        detailed_context.append(context_entry)
                        
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
            if past_conversations_summary:
                # We have conversation history - create a more engaging response
                if language == "tagalog":
                    context_response = (
                        "Oo, naaalala ko ang aming mga nakaraang usapan! 😊\n\n"
                        "Narito ang mga legal na topics na pinag-usapan natin:"
                        f"{past_conversations_summary}\n\n"
                        "Gusto ninyo bang:\n"
                        "• **Ituloy** ang isa sa mga nakaraang topic na ito?\n"
                        "• **Magdagdag** ng tanong tungkol sa mga nabanggit na?\n"
                        "• **Magtanong** ng bagong legal na isyu?\n"
                        "• **Pag-usapan** ang detalye ng mga nakaraang sagot ko?\n\n"
                        "Sabihin lang ninyo kung alin sa mga nakaraang usapan ang gusto ninyong balikan, "
                        "o magtanong ng bago. Handa akong magbigay ng mas detalyadong paliwanag!"
                    )
                else:
                    context_response = (
                        "Yes, I remember our past conversations! 😊\n\n"
                        "Here are the legal topics we've discussed:"
                        f"{past_conversations_summary}\n\n"
                        "Would you like to:\n"
                        "• **Continue** discussing any of these previous topics?\n"
                        "• **Ask follow-up questions** about what we covered?\n"
                        "• **Explore** a new legal issue?\n"
                        "• **Discuss** the details of my previous responses?\n\n"
                        "Just let me know which past conversation you'd like to revisit, "
                        "or ask me something new. I'm ready to provide more detailed explanations!"
                    )
                
                # Generate contextual follow-up questions based on past conversations
                if language == "tagalog":
                    context_followups = [
                        "Alin sa mga nakaraang topic ang gusto ninyong pag-usapan ulit?",
                        "May follow-up question ba kayo sa mga nabanggit ko dati?",
                        "Gusto ninyo bang magdagdag ng detalye sa mga nakaraang sagot ko?"
                    ]
                else:
                    context_followups = [
                        "Which of our previous topics would you like to discuss further?",
                        "Do you have follow-up questions about what I mentioned before?",
                        "Would you like me to elaborate on any of my previous responses?"
                    ]
            else:
                # No conversation history - standard introduction
                if language == "tagalog":
                    context_response = (
                        "Ako si Ai.ttorney, ang inyong legal assistant para sa Philippine law! 😊\n\n"
                        "Wala pa tayong nakaraang usapan sa sistema, pero handa akong tumulong sa anumang legal na tanong!\n\n"
                        "Maaari ninyong itanong ang tungkol sa:\n"
                        "• **Family Law** (kasal, annulment, child custody)\n"
                        "• **Labor Law** (trabaho, sahod, termination)\n"
                        "• **Consumer Law** (produkto, serbisyo, warranty)\n"
                        "• **Criminal Law** (krimen, arrest, bail)\n"
                        "• **Civil Law** (kontrata, property, utang)\n\n"
                        "Ano pong legal na tanong ang mayroon kayo ngayon? Naaalala ko ang lahat ng aming mga usapan!"
                    )
                else:
                    context_response = (
                        "I'm Ai.ttorney, your legal assistant for Philippine law! 😊\n\n"
                        "We don't have any previous conversations in the system yet, but I'm ready to help with any legal questions!\n\n"
                        "You can ask me about:\n"
                        "• **Family Law** (marriage, annulment, child custody)\n"
                        "• **Labor Law** (employment, wages, termination)\n"
                        "• **Consumer Law** (products, services, warranties)\n"
                        "• **Criminal Law** (crimes, arrest, bail)\n"
                        "• **Civil Law** (contracts, property, debts)\n\n"
                        "What legal question can I help you with today? I'll remember all our conversations!"
                    )
                
                # Standard follow-up questions for new users
                if language == "tagalog":
                    context_followups = [
                        "Anong legal na kategorya ang kailangan ninyong malaman?",
                        "May specific na legal na problema ba kayong kailangang solusyunan?",
                        "Gusto ninyo bang malaman ang tungkol sa mga karapatan ninyo?"
                    ]
                else:
                    context_followups = [
                        "Which legal category would you like to learn about?",
                        "Do you have a specific legal problem that needs solving?",
                        "Would you like to know about your legal rights?"
                    ]
            
            # Save conversation context interaction
            session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                chat_service=chat_history_service,
                effective_user_id=effective_user_id,
                session_id=request.session_id,
                question=request.question,
                answer=context_response,
                language=language,
                metadata={"type": "conversation_context", "past_conversations_found": len(past_conversations_summary) > 0}
            )
            
            return create_chat_response(
                answer=context_response,
                simplified_summary="Retrieved and displayed past conversation history" if past_conversations_summary else "No past conversations found",
                follow_up_questions=context_followups,
                session_id=session_id,
                message_id=assistant_msg_id,
                user_message_id=user_msg_id
            )
        
        # Check if this is actually a legal question or just casual conversation
        if not is_legal_question(request.question):
            # For casual, friendly, or unrelated messages, generate intelligent response using AI
            casual_response = generate_ai_response(request.question, detect_language(request.question), 'casual')
            
            # Save casual interaction to chat history
            session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                chat_service=chat_history_service,
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

        # Check if the legal question needs clarification
        needs_clarify, clarification_type = needs_clarification(request.question)
        if needs_clarify:
            print(f"\n❓ [CLARIFICATION] Question needs clarification: {clarification_type}")
            
            # Generate helpful clarification response
            if language == "tagalog":
                if clarification_type == "too_short":
                    clarification_response = (
                        "Mukhang maikli ang inyong tanong. Maaari po ba kayong magbigay ng mas detalyadong legal na tanong? "
                        "Halimbawa:\n\n"
                        "• 'Ano ang mga karapatan ng empleyado sa illegal dismissal?'\n"
                        "• 'Paano mag-file ng annulment case sa Pilipinas?'\n"
                        "• 'Ano ang mga requirements para sa pag-adopt ng bata?'\n\n"
                        "Ano pong specific na legal na tanong ang mayroon kayo?"
                    )
                elif clarification_type == "vague_pronouns":
                    clarification_response = (
                        "Hindi ko po maintindihan kung ano ang tinutukoy ninyo. Maaari po ba kayong maging mas specific? "
                        "Sabihin po ninyo ang eksaktong legal na sitwasyon o tanong na mayroon kayo.\n\n"
                        "Halimbawa, sa halip na 'Paano ito?' ay sabihin ninyo 'Paano mag-file ng small claims case?'"
                    )
                else:  # too_general
                    clarification_response = (
                        "Ang inyong tanong ay masyadong general. Maaari po ba kayong magbigay ng mas specific na legal na tanong? "
                        "Anong particular na legal na isyu ang kailangan ninyong malaman?\n\n"
                        "Mga halimbawa ng malinaw na tanong:\n"
                        "• Tungkol sa Family Law: kasal, annulment, child custody\n"
                        "• Tungkol sa Labor Law: trabaho, sahod, termination\n"
                        "• Tungkol sa Consumer Law: produkto, serbisyo, warranty"
                    )
            else:
                if clarification_type == "too_short":
                    clarification_response = (
                        "Your question seems quite brief. Could you provide a more detailed legal question? "
                        "For example:\n\n"
                        "• 'What are employee rights in cases of illegal dismissal?'\n"
                        "• 'How do I file for annulment in the Philippines?'\n"
                        "• 'What are the requirements for child adoption?'\n\n"
                        "What specific legal question do you have?"
                    )
                elif clarification_type == "vague_pronouns":
                    clarification_response = (
                        "I'm not sure what you're referring to. Could you be more specific? "
                        "Please tell me the exact legal situation or question you have.\n\n"
                        "For example, instead of 'How do I do this?' please say 'How do I file a small claims case?'"
                    )
                else:  # too_general
                    clarification_response = (
                        "Your question is quite general. Could you provide a more specific legal question? "
                        "What particular legal issue do you need to know about?\n\n"
                        "Examples of clear questions:\n"
                        "• About Family Law: marriage, annulment, child custody\n"
                        "• About Labor Law: employment, wages, termination\n"
                        "• About Consumer Law: products, services, warranties"
                    )
            
            # Generate helpful follow-up questions for clarification
            clarification_followups = []
            if language == "tagalog":
                clarification_followups = [
                    "Anong specific na legal na problema ang kailangan ninyong solusyunan?",
                    "Sa anong legal na kategorya kaya ito - Family, Labor, Consumer, Criminal, o Civil Law?",
                    "Maaari po ba kayong magkwento ng mas detalyadong sitwasyon?"
                ]
            else:
                clarification_followups = [
                    "What specific legal problem do you need to solve?",
                    "Which legal category might this fall under - Family, Labor, Consumer, Criminal, or Civil Law?",
                    "Could you describe your situation in more detail?"
                ]
            
            # Save clarification interaction
            session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
                chat_service=chat_history_service,
                effective_user_id=effective_user_id,
                session_id=request.session_id,
                question=request.question,
                answer=clarification_response,
                language=language,
                metadata={"type": "clarification", "clarification_type": clarification_type}
            )
            
            return create_chat_response(
                answer=clarification_response,
                simplified_summary=f"Question needs clarification: {clarification_type}",
                follow_up_questions=clarification_followups,
                session_id=session_id,
                message_id=assistant_msg_id,
                user_message_id=user_msg_id
            )

        # For legal questions, search Qdrant directly (like test_chatbot.py)
        # OPTIMIZATION: Skip expensive query normalization for speed
        # Only normalize if question is very informal/emotional (contains specific patterns)
        step_start = time.time()
        print(f"\n🔄 [STEP 6] Query normalization check...")
        search_query = request.question
        
        # Only normalize if question contains very informal patterns (saves API call time)
        informal_patterns = ['tangina', 'puta', 'gago', 'walang dahilan', 'nambabae', 'nanlalaki']
        needs_normalization = any(pattern in request.question.lower() for pattern in informal_patterns)
        
        if needs_normalization:
            norm_start = time.time()
            print(f"   🤖 Normalizing emotional query with OpenAI...")
            logger.info("Query needs normalization - using AI to improve search")
            search_query = normalize_emotional_query(request.question, language)
            norm_time = time.time() - norm_start
            print(f"   ⏱️  OpenAI normalization API call: {norm_time:.2f}s")
        else:
            logger.info("Query is clear - skipping normalization for speed")
            print(f"   ✅ Skipping normalization (query is clear)")
        step_time = time.time() - step_start
        print(f"⏱️  Query normalization step took: {step_time:.2f}s")
        
        # Vector search
        search_start = time.time()
        print(f"\n🔍 [STEP 7] Qdrant vector search...")
        print(f"   📡 Connecting to Qdrant Cloud...")
        context, sources = retrieve_relevant_context(search_query, TOP_K_RESULTS)
        search_time = time.time() - search_start
        print(f"⏱️  Qdrant search took: {search_time:.2f}s")
        print(f"   Found {len(sources)} relevant sources")
        
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
                legal_disclaimer=get_legal_disclaimer(language),
                fallback_suggestions=get_fallback_suggestions(language, is_complex=True)
            )
        
        # Detect if query is complex (requires multiple legal domains or personal advice)
        step_start = time.time()
        print(f"\n🧠 [STEP 8] Complexity analysis...")
        is_complex = is_complex_query(request.question)
        step_time = time.time() - step_start
        print(f"⏱️  Complexity check took: {step_time:.2f}s")
        print(f"   Is complex: {is_complex}")
        
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
        
        # Retrieve conversation history from database for better context
        print(f"\n💬 [STEP 8.5] Retrieving conversation history from database...")
        db_conversation_history = await get_conversation_history_from_db(
            chat_service=chat_history_service,
            session_id=request.session_id,
            limit=12  # Last 6 exchanges (12 messages)
        )
        
        # Use database history if available, fallback to client-provided history
        conversation_history = db_conversation_history if db_conversation_history else (request.conversation_history or [])
        
        # Check if user is referencing past conversations
        has_reference, reference_type = extract_conversation_reference(request.question)
        if has_reference:
            print(f"\n🔗 [CONVERSATION REFERENCE] Detected reference to past conversation: {reference_type}")
            # Add more context from conversation history if available
            if len(conversation_history) < 8 and effective_user_id:
                # Try to get more conversation context for better reference understanding
                extended_history = await get_conversation_history_from_db(
                    chat_history_service, 
                    request.session_id, 
                    limit=16  # Get more messages for better context
                )
                if extended_history and len(extended_history) > len(conversation_history):
                    conversation_history = extended_history
                    print(f"   ✅ Extended conversation history to {len(conversation_history)} messages for better reference context")
        
        # Generate answer with proper complexity detection
        gen_start = time.time()
        print(f"\n🤖 [STEP 9] Generating AI answer with OpenAI...")
        print(f"   📡 Calling OpenAI API (model: {CHAT_MODEL})...")
        print(f"   Max tokens: {request.max_tokens}")
        print(f"   Conversation history: {len(conversation_history)} messages (from {'database' if db_conversation_history else 'client'})")
        answer, _, simplified_summary, follow_up_questions = generate_answer(
            request.question,
            context,
            conversation_history,
            language,
            request.max_tokens,
            is_complex=is_complex  # Use actual complexity detection for production
        )
        gen_time = time.time() - gen_start
        print(f"⏱️  OpenAI answer generation took: {gen_time:.2f}s")
        print(f"   Answer length: {len(answer)} characters")
        
        # OPTIMIZATION: Skip final safety check for speed (too many pattern matches)
        # The system prompt already instructs AI to stay on legal topics
        
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
        
        # OPTIMIZATION: Skip Guardrails output validation for speed (adds 1-2 seconds)
        # Basic input validation is sufficient for most cases
        
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
        
        # Get legal disclaimer (only for legal questions)
        legal_disclaimer = get_legal_disclaimer(language, request.question, answer)
        
        # Get fallback suggestions for complex queries OR low confidence answers
        fallback_suggestions = get_fallback_suggestions(language, is_complex=True) if (is_complex or confidence == "low") else None
        
        # Save chat interaction to database (async operation)
        save_start = time.time()
        print(f"\n💾 [STEP 10] Saving to database...")
        session_id, user_msg_id, assistant_msg_id = await save_chat_interaction(
            chat_service=chat_history_service,
            effective_user_id=effective_user_id,
            session_id=request.session_id,
            question=request.question,
            answer=answer,
            language=language,
            metadata={
                "sources": [src for src in sources],
                "confidence": confidence,
                "is_complex": is_complex,
                "source_count": len(sources),
                "avg_relevance": avg_score if sources else 0.0
            }
        )
        save_time = time.time() - save_start
        print(f"⏱️  Database save took: {save_time:.2f}s")
        
        # Production: Log request completion
        total_time = time.time() - perf_start
        request_duration = (datetime.now() - request_start_time).total_seconds()
        
        print("\n" + "="*80)
        print(f"✅ REQUEST COMPLETED")
        print(f"⏱️  TOTAL TIME: {total_time:.2f}s")
        print("="*80)
        print(f"\n📊 PERFORMANCE BREAKDOWN:")
        print(f"   • Total request time: {total_time:.2f}s")
        print(f"   • Answer length: {len(answer)} characters")
        print(f"   • Sources found: {len(source_citations)}")
        print(f"   • Confidence: {confidence}")
        print("\n💡 BOTTLENECK ANALYSIS:")
        if total_time > 5:
            print(f"   ⚠️  Response took {total_time:.2f}s (target: <5s)")
            print(f"   Check the step timings above to identify bottlenecks:")
            print(f"   - If 'OpenAI' steps are slow → Internet/OpenAI API issue")
            print(f"   - If 'Qdrant' step is slow → Internet/Qdrant Cloud issue")
            print(f"   - If 'Database' step is slow → Database connection issue")
        else:
            print(f"   ✅ Response time is good ({total_time:.2f}s)")
        print("="*80 + "\n")
        
        logger.info(f"Request completed - duration={request_duration:.2f}s, answer_length={len(answer)}, sources={len(source_citations)}")
        
        return create_chat_response(
            answer=answer,
            sources=source_citations,
            confidence=confidence,
            simplified_summary=simplified_summary,
            legal_disclaimer=legal_disclaimer,
            fallback_suggestions=fallback_suggestions,
            follow_up_questions=follow_up_questions,
            security_report=security_report,
            session_id=session_id,
            message_id=assistant_msg_id,
            user_message_id=user_msg_id
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
    """Check if the chatbot service for general public is running"""
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
            "service": "Ai.ttorney Legal Chatbot - General Public",
            "description": "Bilingual chatbot for Philippine legal seekers with AI security",
            "database": "Qdrant Cloud",
            "documents": count,
            "model": CHAT_MODEL,
            "embedding_model": EMBEDDING_MODEL,
            "languages": ["English", "Tagalog", "Taglish"],
            "features": [
                "Natural conversational responses",
                "Bilingual support (English, Tagalog, Taglish)",
                "Source citations with URLs",
                "Legal disclaimers",
                "Greeting detection and responses",
                "Handles all user scenarios (emotional, rude, confused, etc.)",
                "Guardrails AI security validation" if guardrails_instance else "Basic security validation"
            ],
            "security": guardrails_status,
            "target_audience": "Non-lawyer users in the Philippines"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
