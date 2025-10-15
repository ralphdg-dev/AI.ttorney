"""
Chatbot Routes for AI.ttorney Legal Assistant

Bilingual (English & Filipino) legal chatbot that uses:
- RAG (Retrieval Augmented Generation) with embeddings
- OpenAI GPT-4o-mini for responses
- Scraped legal data as knowledge base
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import pickle
import numpy as np
from pathlib import Path
from dotenv import load_dotenv
import openai
import logging

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Router
router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

# Configuration
EMBEDDINGS_DIR = Path(__file__).parent.parent / "data" / "embeddings"
EMBEDDINGS_FILE = EMBEDDINGS_DIR / "embeddings.pkl"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
CHAT_MODEL = "gpt-4o-mini"  # or "gpt-3.5-turbo" for cost savings
TOP_K_RESULTS = 5  # Number of relevant chunks to retrieve

# Global cache for embeddings (loaded once on startup)
_embeddings_cache = None


def load_embeddings():
    """Load embeddings from disk (cached)"""
    global _embeddings_cache
    
    if _embeddings_cache is not None:
        return _embeddings_cache
    
    if not EMBEDDINGS_FILE.exists():
        raise FileNotFoundError(
            f"Embeddings file not found at {EMBEDDINGS_FILE}\n"
            "Please run generate_embeddings.py first."
        )
    
    logger.info(f"Loading embeddings from {EMBEDDINGS_FILE}")
    with open(EMBEDDINGS_FILE, 'rb') as f:
        _embeddings_cache = pickle.load(f)
    
    logger.info(f"Loaded {len(_embeddings_cache['documents'])} document chunks")
    return _embeddings_cache


def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors"""
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    return dot_product / (norm1 * norm2)


def retrieve_relevant_context(query: str, top_k: int = TOP_K_RESULTS) -> List[dict]:
    """
    Retrieve most relevant legal document chunks for the query
    
    Args:
        query: User's question
        top_k: Number of top results to return
    
    Returns:
        List of relevant document chunks with metadata
    """
    try:
        # Load embeddings
        embeddings_data = load_embeddings()
        embeddings = embeddings_data['embeddings']
        documents = embeddings_data['documents']
        
        # Generate query embedding
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        query_response = client.embeddings.create(
            model=embeddings_data['metadata']['model'],
            input=[query]
        )
        query_embedding = np.array(query_response.data[0].embedding)
        
        # Calculate similarities
        similarities = []
        for i, emb in enumerate(embeddings):
            sim = cosine_similarity(query_embedding, emb)
            similarities.append((i, sim))
        
        # Sort by similarity and get top k
        similarities.sort(key=lambda x: x[1], reverse=True)
        top_results = similarities[:top_k]
        
        # Return documents with scores
        relevant_docs = []
        for idx, score in top_results:
            doc = documents[idx].copy()
            doc['relevance_score'] = float(score)
            relevant_docs.append(doc)
        
        return relevant_docs
        
    except Exception as e:
        logger.error(f"Error retrieving context: {str(e)}")
        raise


def detect_language(text: str) -> str:
    """
    Simple language detection (English vs Filipino)
    
    Returns: 'en' or 'fil'
    """
    # Common Filipino words/particles
    filipino_indicators = [
        'ang', 'ng', 'mga', 'sa', 'ay', 'ko', 'mo', 'niya', 'kami', 'kayo',
        'sila', 'ako', 'ikaw', 'tayo', 'ano', 'paano', 'bakit', 'saan',
        'kailan', 'sino', 'alin', 'magkano', 'po', 'opo', 'na', 'pa'
    ]
    
    text_lower = text.lower()
    filipino_count = sum(1 for word in filipino_indicators if f' {word} ' in f' {text_lower} ')
    
    # If 2 or more Filipino indicators found, assume Filipino
    return 'fil' if filipino_count >= 2 else 'en'


def create_system_prompt(language: str) -> str:
    """
    Create bilingual system prompt for the chatbot
    
    Args:
        language: 'en' for English, 'fil' for Filipino
    """
    if language == 'fil':
        return """Ikaw ay Ai.ttorney, isang helpful at matalino na legal assistant para sa mga Pilipino.

MAHALAGANG ALITUNTUNIN:
1. Sumagot sa wikang Filipino kung ang tanong ay sa Filipino
2. Ipaliwanag ang mga legal concepts nang simple at madaling maintindihan
3. HUWAG magbigay ng formal legal advice - ikaw ay educational assistant lamang
4. Kung kailangan ng legal advice, i-recommend na kumunsulta sa lisensyadong abogado
5. Gumamit ng mga halimbawa para mas maintindihan
6. Maging respectful at professional sa lahat ng oras

Ang iyong layunin ay tulungan ang mga tao na maintindihan ang kanilang legal rights at obligations, pero HINDI ka abogado at HINDI ka nagbibigay ng legal advice.

Kung hindi mo alam ang sagot, aminin ito at i-suggest na kumunsulta sa abogado."""
    else:
        return """You are Ai.ttorney, a helpful and knowledgeable legal assistant for Filipinos.

IMPORTANT GUIDELINES:
1. Respond in English if the question is in English
2. Explain legal concepts in simple, easy-to-understand language
3. DO NOT provide formal legal advice - you are an educational assistant only
4. If legal advice is needed, recommend consulting with a licensed attorney
5. Use examples to make concepts clearer
6. Be respectful and professional at all times

Your goal is to help people understand their legal rights and obligations, but you are NOT a lawyer and do NOT provide legal advice.

If you don't know the answer, admit it and suggest consulting with an attorney."""


# Request/Response Models
class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    response: str
    sources: List[dict]
    language: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint for the legal chatbot
    
    Process:
    1. Detect user's language (English or Filipino)
    2. Retrieve relevant legal context using embeddings
    3. Send context + conversation to OpenAI
    4. Return bilingual response
    """
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Detect language
        language = detect_language(request.message)
        logger.info(f"Detected language: {language}")
        
        # Retrieve relevant context from embeddings
        # TODO: This is where embeddings retrieval happens
        # The retrieve_relevant_context function uses cosine similarity
        # to find the most relevant legal document chunks
        relevant_docs = retrieve_relevant_context(request.message, top_k=TOP_K_RESULTS)
        
        # Build context from retrieved documents
        context_parts = []
        for i, doc in enumerate(relevant_docs, 1):
            metadata = doc['metadata']
            context_parts.append(
                f"[Source {i}] {metadata.get('law', 'Legal Document')}\n"
                f"Article {metadata.get('article_number', 'N/A')}: {metadata.get('article_title', '')}\n"
                f"{doc['text']}\n"
            )
        
        context = "\n---\n".join(context_parts)
        
        # Create system prompt based on language
        system_prompt = create_system_prompt(language)
        
        # Build messages for OpenAI
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": f"LEGAL CONTEXT:\n{context}"}
        ]
        
        # Add conversation history
        if request.conversation_history:
            for msg in request.conversation_history[-6:]:  # Last 3 exchanges
                messages.append({"role": msg.role, "content": msg.content})
        
        # Add current user message
        messages.append({"role": "user", "content": request.message})
        
        # Call OpenAI API
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        completion = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        response_text = completion.choices[0].message.content
        
        # Prepare sources for frontend
        sources = []
        for doc in relevant_docs[:3]:  # Top 3 sources
            metadata = doc['metadata']
            sources.append({
                'law': metadata.get('law', 'Legal Document'),
                'article': metadata.get('article_number', 'N/A'),
                'title': metadata.get('article_title', ''),
                'relevance': round(doc['relevance_score'], 3)
            })
        
        return ChatResponse(
            response=response_text,
            sources=sources,
            language=language
        )
        
    except FileNotFoundError as e:
        logger.error(f"Embeddings not found: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="Legal knowledge base not initialized. Please contact support."
        )
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing your request."
        )


@router.get("/health")
async def health_check():
    """Check if chatbot service is ready"""
    try:
        embeddings_exists = EMBEDDINGS_FILE.exists()
        api_key_configured = bool(OPENAI_API_KEY)
        
        if embeddings_exists:
            embeddings_data = load_embeddings()
            total_chunks = len(embeddings_data['documents'])
        else:
            total_chunks = 0
        
        return {
            "status": "healthy" if (embeddings_exists and api_key_configured) else "degraded",
            "embeddings_loaded": embeddings_exists,
            "api_key_configured": api_key_configured,
            "total_knowledge_chunks": total_chunks,
            "model": CHAT_MODEL
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }
