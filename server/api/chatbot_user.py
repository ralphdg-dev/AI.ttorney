"""
Legal Chatbot API for Regular Users (Simplified & Bilingual)

This API endpoint:
1. Receives user questions in English or Tagalog
2. Searches Qdrant Cloud for relevant legal context
3. Uses OpenAI GPT to generate simplified, easy-to-understand answers
4. Returns answer with practical examples and source citations
5. Responds in the same language as the question

Endpoint: POST /api/chatbot/user/ask
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from qdrant_client import QdrantClient
from openai import OpenAI
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
COLLECTION_NAME = "legal_knowledge"
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"  # Cost-effective and capable
TOP_K_RESULTS = 5  # Number of relevant chunks to retrieve

# Initialize Qdrant client
qdrant_client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
)

# Initialize OpenAI client with a workaround for the proxies issue
openai_client = None
try:
    # Import OpenAI and create client with minimal parameters
    from openai import OpenAI
    
    # Create a custom httpx client without proxies
    import httpx
    http_client = httpx.Client()
    
    # Initialize OpenAI client with custom http client
    openai_client = OpenAI(
        api_key=OPENAI_API_KEY,
        http_client=http_client
    )
    print("✅ OpenAI client initialized successfully with custom http client")
except Exception as e:
    print(f"WARNING: Failed to initialize OpenAI client: {e}")
    # Fallback: try without custom http client
    try:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        print("✅ OpenAI client initialized successfully (fallback)")
    except Exception as e2:
        print(f"WARNING: Fallback also failed: {e2}")
        openai_client = None

# Create router
router = APIRouter(prefix="/api/chatbot/user", tags=["Legal Chatbot - User"])


# Request/Response Models
class ChatRequest(BaseModel):
    question: str
    conversation_history: Optional[List[Dict[str, str]]] = []
    max_tokens: Optional[int] = 1000


class SourceCitation(BaseModel):
    source: str
    law: str
    article_number: str
    article_title: Optional[str] = None
    text_preview: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    confidence: str  # "high", "medium", "low"
    language: str  # "english", "tagalog", "mixed"
    simplified_summary: Optional[str] = None


def detect_language(text: str) -> str:
    """
    Detect if the question is in English, Tagalog, or mixed
    Simple keyword-based detection
    """
    tagalog_keywords = [
        'ano', 'paano', 'saan', 'kailan', 'bakit', 'sino', 'mga', 'ng', 'sa', 'ay',
        'ko', 'mo', 'niya', 'natin', 'nila', 'ba', 'po', 'opo', 'hindi', 'oo'
    ]
    
    text_lower = text.lower()
    tagalog_count = sum(1 for keyword in tagalog_keywords if keyword in text_lower.split())
    
    if tagalog_count >= 2:
        return "tagalog"
    elif tagalog_count == 1:
        return "mixed"
    else:
        return "english"


def get_embedding(text: str) -> List[float]:
    """Generate embedding for user question"""
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    return response.data[0].embedding


def retrieve_relevant_context(question: str, top_k: int = TOP_K_RESULTS) -> tuple[str, List[Dict]]:
    """
    Retrieve relevant legal context from Qdrant Cloud
    Returns: (context_text, source_metadata)
    """
    # Get embedding for question
    question_embedding = get_embedding(question)
    
    # Query Qdrant
    results = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=question_embedding,
        limit=top_k
    )
    
    # Build context string
    context_parts = []
    sources = []
    
    for i, result in enumerate(results, 1):
        payload = result.payload
        doc = payload.get('text', '')
        
        # Add to context
        source_info = f"[Source {i}: {payload.get('law', 'Unknown')} - Article {payload.get('article_number', 'N/A')}]"
        context_parts.append(f"{source_info}\n{doc}\n")
        
        # Store source metadata
        sources.append({
            'source': payload.get('source', 'Unknown'),
            'law': payload.get('law', 'Unknown Law'),
            'article_number': payload.get('article_number', 'N/A'),
            'article_title': payload.get('article_title', payload.get('article_heading', '')),
            'text_preview': doc[:200] + "..." if len(doc) > 200 else doc,
            'relevance_score': result.score  # Qdrant returns similarity score directly
        })
    
    context_text = "\n\n".join(context_parts)
    return context_text, sources


def generate_answer(question: str, context: str, conversation_history: List[Dict[str, str]], 
                   language: str, max_tokens: int = 1000) -> tuple[str, str, str]:
    """
    Generate simplified answer using GPT with retrieved context
    Returns: (answer, confidence_level, simplified_summary)
    """
    # Build bilingual system prompt for regular users
    system_prompt = """You are a friendly and helpful Philippine legal assistant for AI.ttorney, designed to help regular people understand the law.

Your role is to make legal information accessible to everyone, regardless of their education level.

LANGUAGE GUIDELINES:
- If the user asks in Tagalog, respond in Tagalog
- If the user asks in English, respond in English
- Use simple, everyday language that anyone can understand
- Avoid legal jargon unless necessary (and explain it if you use it)

RESPONSE FORMAT:
1. **Direct Answer**: Start with a clear, simple answer to their question
2. **Explanation**: Explain the legal basis in simple terms
3. **Real Example**: Give a practical, relatable example (Halimbawa/For example)
4. **What This Means for You**: Summarize the practical implications
5. **Important Note**: Remind them to consult a lawyer for specific cases

STYLE GUIDELINES:
- Use conversational, friendly tone
- Break down complex concepts into simple steps
- Use analogies and everyday examples
- Translate legal terms to common language
- Be empathetic and understanding
- Use "ikaw" (you) and "tayo" (we) to make it personal

TAGALOG TRANSLATIONS (use when responding in Tagalog):
- Law = Batas
- Rights = Karapatan
- Penalty = Parusa
- Court = Hukuman/Korte
- Lawyer = Abogado
- Contract = Kontrata
- Property = Ari-arian

IMPORTANT:
- Answer ONLY based on the provided legal context
- If unsure, say so clearly
- Always remind users to consult a licensed lawyer
- Be encouraging and supportive"""

    # Build messages
    messages = [
        {"role": "system", "content": system_prompt},
    ]
    
    # Add conversation history (last 5 exchanges)
    for msg in conversation_history[-5:]:
        messages.append(msg)
    
    # Add current question with context
    language_instruction = ""
    if language == "tagalog":
        language_instruction = "\n\nIMPORTANT: The user asked in Tagalog. Respond in Tagalog using simple, everyday language."
    elif language == "english":
        language_instruction = "\n\nIMPORTANT: The user asked in English. Respond in English using simple, everyday language."
    
    user_message = f"""Legal Context:
{context}

User Question: {question}{language_instruction}

Please provide a comprehensive, easy-to-understand answer with practical examples."""
    
    messages.append({"role": "user", "content": user_message})
    
    # Generate response
    response = openai_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.5,  # Slightly higher for more conversational tone
    )
    
    answer = response.choices[0].message.content
    
    # Generate simplified summary
    summary_prompt = "In 1-2 sentences, what's the most important thing the user should know?"
    summary_messages = [
        {"role": "system", "content": "You are a helpful assistant that creates brief summaries."},
        {"role": "user", "content": f"Based on this answer:\n\n{answer}\n\n{summary_prompt}"}
    ]
    
    summary_response = openai_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=summary_messages,
        max_tokens=100,
        temperature=0.3,
    )
    
    simplified_summary = summary_response.choices[0].message.content
    
    # Determine confidence based on finish reason and content
    finish_reason = response.choices[0].finish_reason
    confidence = "high" if finish_reason == "stop" else "medium"
    
    if "I don't have enough information" in answer or "hindi ko sigurado" in answer.lower():
        confidence = "low"
    
    return answer, confidence, simplified_summary


@router.post("/ask", response_model=ChatResponse)
async def ask_legal_question(request: ChatRequest):
    """
    Main endpoint for regular users to ask legal questions
    Supports both English and Tagalog
    
    Example request:
    {
        "question": "Ano ang parusa sa pagnanakaw?",
        "conversation_history": [],
        "max_tokens": 1000
    }
    """
    try:
        # Validate question
        if not request.question or len(request.question.strip()) < 5:
            raise HTTPException(status_code=400, detail="Question is too short")
        
        # Detect language
        language = detect_language(request.question)
        
        # Retrieve relevant context
        context, sources = retrieve_relevant_context(request.question, TOP_K_RESULTS)
        
        # Generate answer
        answer, confidence, simplified_summary = generate_answer(
            request.question,
            context,
            request.conversation_history,
            language,
            request.max_tokens
        )
        
        # Format sources for response
        source_citations = [
            SourceCitation(
                source=src['source'],
                law=src['law'],
                article_number=src['article_number'],
                article_title=src['article_title'],
                text_preview=src['text_preview']
            )
            for src in sources
        ]
        
        return ChatResponse(
            answer=answer,
            sources=source_citations,
            confidence=confidence,
            language=language,
            simplified_summary=simplified_summary
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")


@router.get("/health")
async def health_check():
    """Check if the user chatbot service is running"""
    try:
        collection_info = qdrant_client.get_collection(collection_name=COLLECTION_NAME)
        count = collection_info.points_count
        return {
            "status": "healthy",
            "service": "User Chatbot (Simplified & Bilingual)",
            "database": "Qdrant Cloud",
            "documents": count,
            "model": CHAT_MODEL,
            "languages": ["English", "Tagalog"]
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
