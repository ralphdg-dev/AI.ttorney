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

# Industry standard: Configure logging for monitoring and debugging
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

# Import comprehensive system prompts
from config.system_prompts import ENGLISH_SYSTEM_PROMPT, TAGALOG_SYSTEM_PROMPT

# Import chat history service
from services.chat_history_service import ChatHistoryService, get_chat_history_service

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

# Initialize Guardrails (if available)
SILENT_MODE = os.getenv("GUARDRAILS_SILENT_MODE", "true").lower() == "true"

if GUARDRAILS_AVAILABLE and is_guardrails_enabled():
    try:
        guardrails_instance = get_guardrails_instance()
        if not SILENT_MODE:
            print("✅ Guardrails AI enabled for user chatbot")
    except Exception as e:
        if not SILENT_MODE:
            print(f"⚠️  Failed to initialize Guardrails: {e}")
        guardrails_instance = None
else:
    guardrails_instance = None
    if not SILENT_MODE:
        print("ℹ️  Guardrails AI disabled for user chatbot")

# Create router
router = APIRouter(prefix="/api/chatbot/user", tags=["Legal Chatbot - User"])


# Request/Response Models
class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500, description="User's legal question or greeting")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default=[], max_items=10, description="Previous conversation (max 10 messages)")
    max_tokens: Optional[int] = Field(default=1200, ge=100, le=2000, description="Max response tokens")
    user_id: Optional[str] = Field(default=None, description="User ID for logging")
    session_id: Optional[str] = Field(default=None, description="Chat session ID for history tracking")
    
    class Config:
        # Production: Add example for API documentation
        schema_extra = {
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
    simplified_summary: Optional[str] = None
    legal_disclaimer: str
    fallback_suggestions: Optional[List[FallbackSuggestion]] = None
    security_report: Optional[Dict] = Field(default=None, description="Guardrails AI security validation report")
    session_id: Optional[str] = Field(default=None, description="Chat session ID for tracking conversation")
    message_id: Optional[str] = Field(default=None, description="Message ID for the assistant's response")
    user_message_id: Optional[str] = Field(default=None, description="Message ID for the user's question")


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
            max_tokens=150,
            temperature=0.3
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
    Check if the input is actually asking for legal information or advice.
    Handles both direct questions and conversational queries.
    """
    text_lower = text.lower().strip()

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
    """
    answer_lower = answer.lower()
    
    # Check for advice-giving language (critical safety check)
    advice_patterns = [
        r'\byou should\b', r'\byou must\b', r'\byou need to\b',
        r'\bi recommend\b', r'\bi suggest\b', r'\bi advise\b',
        r'\bmy advice\b', r'\bmake sure you\b', r'\bmake sure to\b',
        r'\bbe sure to\b', r'\byou have to\b', r'\byou ought to\b',
        r'\bdapat mo\b', r'\bkailangan mo\b', r'\bgawin mo\b',
        r'\birecommend ko\b', r'\bsiguraduhin mo\b'
    ]
    
    for pattern in advice_patterns:
        if re.search(pattern, answer_lower):
            return False, f"Response contains advice-giving language: {pattern}"
    
    return True, ""


def generate_answer(question: str, context: str, conversation_history: List[Dict[str, str]], 
                   language: str, max_tokens: int = 1200, is_complex: bool = False) -> tuple[str, str, str]:
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
    
    # Add conversation history (last 3 exchanges only, keep it natural)
    for msg in conversation_history[-3:]:
        messages.append(msg)
    
    # Add current question with context
    # Note: Detailed instructions are in system_prompt, keep user message minimal
    if context and context.strip():
        # We have legal context from the database
        user_message = f"""Legal Context:
{context}

User Question: {question}

Please provide an informational response based on the legal context above. Remember to cite specific legal codes and use capital letters for key terms."""
    else:
        # No specific legal context found, use general knowledge
        user_message = f"""User Question: {question}

Note: I don't have specific legal documents for this question in my database. Please provide a helpful answer based on your general knowledge of Philippine law (Civil, Criminal, Consumer, Family, or Labor Law). If you lack sufficient information, clearly state that and recommend consulting a licensed attorney."""
    
    messages.append({"role": "user", "content": user_message})
    
    # Generate response with error handling
    try:
        response = openai_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.5,  # Slightly higher for more conversational tone
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
        print(f"   Original response: {answer[:200]}...")
        # Regenerate with stronger emphasis on informational content
        # For now, return a safe fallback
        if language == "tagalog":
            answer = "Paumanhin po, pero hindi ako makapagbigay ng personal na legal advice. Maaari lamang akong magbigay ng pangkalahatang impormasyon tungkol sa batas ng Pilipinas. Para sa specific na sitwasyon, kumonsulta po sa lisensyadong abogado."
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
    
    return answer, confidence, simplified_summary


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
            'english': f"""You are Ai.ttorney, a friendly Philippine legal assistant. The user just said: "{question}"

This seems like a greeting or casual message, not a legal question. Respond in a natural, conversational way that:
1. Matches their energy and language style
2. Shows personality and warmth
3. Invites them to ask legal questions if they want
4. Feels like talking to a knowledgeable friend
5. Uses the same language they used (English, Tagalog, or Taglish)

Keep it brief but engaging - like a real conversation starter.

Examples:
- For "hello": "Hey there! I'm Ai.ttorney, your go-to for Philippine legal questions. What's up?"
- For "kumusta": "Kumusta kaibigan! Ai.ttorney dito - may legal topics ka bang gustong malaman?"

Make it varied and natural, not robotic.""",
            'tagalog': f"""Ikaw si Ai.ttorney, isang mainit na legal assistant sa Pilipinas. Ang user lang ay nag-sabi: "{question}"

Ito ay mukhang greeting o casual na mensahe, hindi legal na tanong. Sumagot nang natural at conversational na:
1. I-match ang kanilang energy at estilo ng lengguwahe
2. Magpakita ng personalidad at init
3. Imbitahan silang magtanong tungkol sa legal kung gusto nila
4. Parang kausap ang taong marunong sa kulturang Pilipino
5. Gamitin ang parehong lengguwahe nila

Panatilihing maikli pero engaging - parang tunay na conversation starter.

Gawing varied at natural, hindi robotic."""
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
    
    # Fallback responses
    fallbacks = {
        'greeting': "Hello! I'm Ai.ttorney, your legal assistant for Philippine law. How can I help you today?",
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
            temperature=0.8,
        )
        
        result = response.choices[0].message.content
        return result.strip() if result else fallbacks[response_type]
        
    except Exception as e:
        print(f"Error generating {response_type} response: {e}")
        return fallbacks[response_type]


def get_legal_disclaimer(language: str) -> str:
    """
    Get legal disclaimer in appropriate language with in-app legal help link
    """
    disclaimers = {
        "english": "⚖️ Important: This is general legal information only, not legal advice. For your specific situation, you can consult with a licensed Philippine lawyer through our [Legal Help](/legal-help) section.",
        "tagalog": "⚖️ Mahalaga: Ito ay pangkalahatang impormasyon lamang, hindi legal advice. Para sa iyong partikular na sitwasyon, maaari kang kumonsulta sa lisensyadong abogado sa aming [Legal Help](/legal-help) section.",
        "taglish": "⚖️ Important: Ito ay general legal information lang, hindi legal advice. Para sa iyong specific situation, you can consult with a licensed Philippine lawyer sa aming [Legal Help](/legal-help) section."
    }
    return disclaimers.get(language, disclaimers["english"])


def create_chat_response(
    answer: str,
    sources: List[SourceCitation] = None,
    simplified_summary: str = None,
    legal_disclaimer: str = "",
    fallback_suggestions: List[FallbackSuggestion] = None,
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
        simplified_summary=simplified_summary,
        legal_disclaimer=legal_disclaimer,
        fallback_suggestions=fallback_suggestions,
        security_report=security_report,
        session_id=session_id,
        message_id=message_id,
        user_message_id=user_message_id
    )


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
            session = await chat_service.create_session(
                user_id=UUID(effective_user_id),
                title=title,
                language=language
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


@router.post("/ask", response_model=ChatResponse)
async def ask_legal_question(
    request: ChatRequest,
    chat_service: ChatHistoryService = Depends(get_chat_history_service),
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
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
    
    # Extract user_id from authentication if available
    authenticated_user_id = None
    if current_user and "user" in current_user:
        authenticated_user_id = current_user["user"]["id"]
    
    # Use authenticated user_id, fallback to request.user_id for backward compatibility
    effective_user_id = authenticated_user_id or request.user_id
    
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
        
        # Basic validation - only check if question exists and isn't empty
        if not request.question or not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
        # Check for toxic content first
        is_toxic, toxic_reason = detect_toxic_content(request.question)
        if is_toxic:
            # Return a polite response instead of raising an error
            language = detect_language(request.question)
            if language == "tagalog":
                polite_response = "Naiintindihan ko na baka frustrated ka, pero nandito ako para magbigay ng helpful legal information. Pakiusap, magtanong nang may respeto, at masayang tutulungan kita. 😊"
            else:
                polite_response = "I understand you may be frustrated, but I'm here to provide helpful legal information. Please rephrase your question in a respectful manner, and I'll be happy to assist you. 😊"
            
            return create_chat_response(
                answer=polite_response,
                simplified_summary="Toxic content detected - polite redirection"
            )
        
        # Check for prohibited input (misuse prevention) - keep this for safety
        is_prohibited, prohibition_reason = detect_prohibited_input(request.question)
        if is_prohibited:
            raise HTTPException(status_code=400, detail=prohibition_reason)
        
        # Detect language
        language = detect_language(request.question)
        
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
                legal_disclaimer=get_legal_disclaimer(language),
                fallback_suggestions=get_fallback_suggestions(language, is_complex=True)
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
                legal_disclaimer=get_legal_disclaimer(language),
                fallback_suggestions=get_fallback_suggestions(language, is_complex=True)
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
        
        # Generate answer with proper complexity detection
        answer, _, simplified_summary = generate_answer(
            request.question,
            context,
            request.conversation_history,
            language,
            request.max_tokens,
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
            print(f"   Question: {request.question}")
            print(f"   Matches: {out_of_scope_matches}")
            
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
                        legal_disclaimer=get_legal_disclaimer(language),
                        fallback_suggestions=get_fallback_suggestions(language, is_complex=True),
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
        
        # Get legal disclaimer (simplified)
        legal_disclaimer = get_legal_disclaimer(language)
        
        # Get fallback suggestions for complex queries OR low confidence answers
        fallback_suggestions = get_fallback_suggestions(language, is_complex=True) if (is_complex or confidence == "low") else None
        
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
            simplified_summary=simplified_summary,
            legal_disclaimer=legal_disclaimer,
            fallback_suggestions=fallback_suggestions,
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
