"""
Legal Chatbot API with RAG (Retrieval-Augmented Generation)

This API endpoint:
1. Receives user questions
2. Searches ChromaDB for relevant legal context
3. Uses OpenAI GPT to generate accurate answers
4. Returns answer with source citations

Endpoint: POST /api/chatbot/ask
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import chromadb
from openai import OpenAI
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
CHROMA_DB_PATH = Path(__file__).parent.parent / "data" / "chroma_db"
COLLECTION_NAME = "legal_knowledge"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"  # Cost-effective and capable
TOP_K_RESULTS = 5  # Number of relevant chunks to retrieve

# Initialize ChromaDB client
chroma_client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))
collection = chroma_client.get_collection(name=COLLECTION_NAME)

# Initialize OpenAI client
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Create router
router = APIRouter(prefix="/api/chatbot", tags=["Legal Chatbot"])


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


def get_embedding(text: str) -> List[float]:
    """Generate embedding for user question"""
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    return response.data[0].embedding


def retrieve_relevant_context(question: str, top_k: int = TOP_K_RESULTS) -> tuple[str, List[Dict]]:
    """
    Retrieve relevant legal context from ChromaDB
    Returns: (context_text, source_metadata)
    """
    # Get embedding for question
    question_embedding = get_embedding(question)
    
    # Query ChromaDB
    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=top_k
    )
    
    # Extract documents and metadata
    documents = results['documents'][0]
    metadatas = results['metadatas'][0]
    distances = results['distances'][0]
    
    # Build context string
    context_parts = []
    sources = []
    
    for i, (doc, metadata, distance) in enumerate(zip(documents, metadatas, distances), 1):
        # Add to context
        source_info = f"[Source {i}: {metadata.get('law', 'Unknown')} - Article {metadata.get('article_number', 'N/A')}]"
        context_parts.append(f"{source_info}\n{doc}\n")
        
        # Store source metadata
        sources.append({
            'source': metadata.get('source', 'Unknown'),
            'law': metadata.get('law', 'Unknown Law'),
            'article_number': metadata.get('article_number', 'N/A'),
            'article_title': metadata.get('article_title', metadata.get('article_heading', '')),
            'text_preview': doc[:200] + "..." if len(doc) > 200 else doc,
            'relevance_score': 1 - distance  # Convert distance to similarity score
        })
    
    context_text = "\n\n".join(context_parts)
    return context_text, sources


def generate_answer(question: str, context: str, conversation_history: List[Dict[str, str]], 
                   max_tokens: int = 1000) -> tuple[str, str]:
    """
    Generate answer using GPT with retrieved context
    Returns: (answer, confidence_level)
    """
    # Build system prompt
    system_prompt = """You are a knowledgeable Philippine legal assistant for AI.ttorney. 
Your role is to provide accurate, helpful legal information based on Philippine laws.

Guidelines:
1. Answer questions using ONLY the provided legal context
2. Cite specific articles and laws when possible
3. If the context doesn't contain enough information, say so clearly
4. Use clear, professional language that non-lawyers can understand
5. Always remind users to consult a licensed lawyer for specific legal advice
6. Be concise but thorough

Format your answers with:
- Clear explanation of the legal principle
- Relevant article citations
- Practical implications
- Disclaimer about consulting a lawyer"""

    # Build messages
    messages = [
        {"role": "system", "content": system_prompt},
    ]
    
    # Add conversation history (last 5 exchanges)
    for msg in conversation_history[-5:]:
        messages.append(msg)
    
    # Add current question with context
    user_message = f"""Legal Context:
{context}

User Question: {question}

Please provide a comprehensive answer based on the legal context above."""
    
    messages.append({"role": "user", "content": user_message})
    
    # Generate response
    response = openai_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.3,  # Lower temperature for more factual responses
    )
    
    answer = response.choices[0].message.content
    
    # Determine confidence based on finish reason and content
    finish_reason = response.choices[0].finish_reason
    confidence = "high" if finish_reason == "stop" else "medium"
    
    if "I don't have enough information" in answer or "not clear" in answer.lower():
        confidence = "low"
    
    return answer, confidence


@router.post("/ask", response_model=ChatResponse)
async def ask_legal_question(request: ChatRequest):
    """
    Main endpoint for asking legal questions
    
    Example request:
    {
        "question": "What are the penalties for theft in the Philippines?",
        "conversation_history": [],
        "max_tokens": 1000
    }
    """
    try:
        # Validate question
        if not request.question or len(request.question.strip()) < 5:
            raise HTTPException(status_code=400, detail="Question is too short")
        
        # Retrieve relevant context
        context, sources = retrieve_relevant_context(request.question, TOP_K_RESULTS)
        
        # Generate answer
        answer, confidence = generate_answer(
            request.question,
            context,
            request.conversation_history,
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
            confidence=confidence
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")


@router.get("/health")
async def health_check():
    """Check if the chatbot service is running"""
    try:
        count = collection.count()
        return {
            "status": "healthy",
            "database": "connected",
            "documents": count,
            "model": CHAT_MODEL
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
