"""
Legal Chatbot API for Lawyers (Technical & Professional)

This API endpoint:
1. Receives lawyer questions in English or Tagalog
2. Searches Qdrant Cloud for relevant legal context
3. Uses OpenAI GPT to generate professional, detailed legal analysis
4. Returns comprehensive answers with case law, cross-references, and technical analysis
5. Provides advanced legal research capabilities for professional use

Endpoint: POST /api/chatbot/lawyer/ask
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
TOP_K_RESULTS = 8  # More results for lawyers (vs 5 for users)

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
    print("✅ OpenAI client initialized successfully for lawyer chatbot")
except Exception as e:
    print(f"WARNING: Failed to initialize OpenAI client for lawyer chatbot: {e}")
    # Fallback: try without custom http client
    try:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        print("✅ OpenAI client initialized successfully for lawyer chatbot (fallback)")
    except Exception as e2:
        print(f"WARNING: Fallback also failed for lawyer chatbot: {e2}")
        openai_client = None

# Create router
router = APIRouter(prefix="/api/chatbot/lawyer", tags=["Legal Chatbot - Lawyer"])


# Request/Response Models
class LawyerChatRequest(BaseModel):
    question: str
    conversation_history: Optional[List[Dict[str, str]]] = []
    max_tokens: Optional[int] = 2000
    include_case_law: Optional[bool] = True
    include_cross_references: Optional[bool] = True


class SourceCitation(BaseModel):
    source: str
    law: str
    article_number: str
    article_title: Optional[str] = None
    text_preview: str
    relevance_score: float


class LawyerChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    confidence: str  # "high", "medium", "low"
    language: str  # "english", "tagalog", "mixed"
    legal_analysis: Optional[str] = None
    related_provisions: Optional[List[str]] = None
    case_law_references: Optional[List[str]] = None


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
    """Generate embedding for lawyer question"""
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    return response.data[0].embedding


def retrieve_relevant_context(question: str, top_k: int = TOP_K_RESULTS) -> tuple[str, List[Dict]]:
    """
    Retrieve relevant legal context from Qdrant Cloud for lawyers
    Returns: (context_text, source_metadata)
    """
    # Get embedding for question
    question_embedding = get_embedding(question)
    
    # Query Qdrant with higher threshold for lawyers
    results = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=question_embedding,
        limit=top_k,
        score_threshold=0.6  # Higher threshold for professional use
    )
    
    # Build context string
    context_parts = []
    sources = []
    
    for i, result in enumerate(results, 1):
        payload = result.payload
        doc = payload.get('text', '')
        
        # Add to context with more detailed source info for lawyers
        source_info = f"[Source {i}: {payload.get('law', 'Unknown')} - Article {payload.get('article_number', 'N/A')}]"
        context_parts.append(f"{source_info}\n{doc}\n")
        
        # Store source metadata with relevance score
        sources.append({
            'source': payload.get('source', 'Unknown'),
            'law': payload.get('law', 'Unknown Law'),
            'article_number': payload.get('article_number', 'N/A'),
            'article_title': payload.get('article_title', payload.get('article_heading', '')),
            'text_preview': doc[:300] + "..." if len(doc) > 300 else doc,  # Longer preview for lawyers
            'relevance_score': result.score
        })
    
    context_text = "\n\n".join(context_parts)
    return context_text, sources


def generate_lawyer_answer(question: str, context: str, conversation_history: List[Dict[str, str]], 
                          language: str, include_case_law: bool, include_cross_references: bool,
                          max_tokens: int = 2000) -> tuple[str, str, str, List[str], List[str]]:
    """
    Generate professional legal analysis using GPT with retrieved context
    Returns: (answer, confidence_level, legal_analysis, related_provisions, case_law_references)
    """
    # Build professional system prompt for lawyers
    system_prompt = """You are an advanced AI legal research assistant for AI.ttorney, specifically designed for licensed lawyers and legal professionals in the Philippines.

Your role is to provide comprehensive, technical legal analysis and professional guidance.

LANGUAGE GUIDELINES:
- If the user asks in Tagalog, respond in Tagalog with appropriate legal terminology
- If the user asks in English, respond in English with precise legal language
- Use proper legal terminology and cite specific provisions
- Maintain professional tone throughout

RESPONSE FORMAT FOR LAWYERS:
1. **Executive Summary**: Brief overview of the legal issue and conclusion
2. **Legal Analysis**: Detailed examination of applicable laws, regulations, and jurisprudence
3. **Statutory Basis**: Specific citations to relevant provisions
4. **Case Law & Precedents**: Relevant Supreme Court decisions and doctrine (if available)
5. **Cross-References**: Related provisions and interconnected legal concepts
6. **Professional Recommendations**: Strategic considerations and next steps
7. **Risk Assessment**: Potential legal risks and mitigation strategies

PROFESSIONAL STANDARDS:
- Provide precise legal citations and article numbers
- Include cross-references to related provisions
- Analyze potential legal implications and consequences
- Suggest procedural considerations and strategic approaches
- Maintain accuracy and professional objectivity
- Use technical legal language appropriate for lawyers

TAGALOG LEGAL TERMINOLOGY (use when responding in Tagalog):
- Batas = Law/Statute
- Jurisprudensya = Jurisprudence
- Kautusan = Order/Ruling
- Desisyon = Decision
- Doktrina = Doctrine
- Precedente = Precedent
- Probisyon = Provision
- Artikulo = Article

IMPORTANT:
- Base analysis ONLY on provided legal context and established law
- Cite specific article numbers and legal provisions
- Provide comprehensive analysis suitable for legal professionals
- Include strategic and procedural considerations
- Maintain professional standards of legal research"""

    # Build messages
    messages = [
        {"role": "system", "content": system_prompt},
    ]
    
    # Add conversation history (last 8 exchanges for lawyers)
    for msg in conversation_history[-8:]:
        messages.append(msg)
    
    # Add current question with context and professional instructions
    language_instruction = ""
    if language == "tagalog":
        language_instruction = "\n\nIMPORTANT: The lawyer asked in Tagalog. Respond in Tagalog using appropriate legal terminology."
    elif language == "english":
        language_instruction = "\n\nIMPORTANT: The lawyer asked in English. Respond in English using precise legal language."
    
    case_law_instruction = ""
    if include_case_law:
        case_law_instruction = "\n\nInclude relevant case law, Supreme Court decisions, and legal precedents where applicable."
    
    cross_ref_instruction = ""
    if include_cross_references:
        cross_ref_instruction = "\n\nProvide cross-references to related provisions and interconnected legal concepts."
    
    user_message = f"""Legal Context:
{context}

Lawyer's Question: {question}{language_instruction}{case_law_instruction}{cross_ref_instruction}

Please provide a comprehensive professional legal analysis with detailed citations, cross-references, and strategic considerations."""
    
    messages.append({"role": "user", "content": user_message})
    
    # Generate response
    response = openai_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.3,  # Lower temperature for more precise legal analysis
    )
    
    answer = response.choices[0].message.content
    
    # Generate separate legal analysis section
    analysis_prompt = "Provide a concise legal analysis focusing on the key legal principles and their practical application."
    analysis_messages = [
        {"role": "system", "content": "You are a legal analysis specialist. Provide focused legal analysis."},
        {"role": "user", "content": f"Based on this legal response:\n\n{answer}\n\n{analysis_prompt}"}
    ]
    
    analysis_response = openai_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=analysis_messages,
        max_tokens=500,
        temperature=0.2,
    )
    
    legal_analysis = analysis_response.choices[0].message.content
    
    # Extract related provisions and case law references from the answer
    related_provisions = []
    case_law_references = []
    
    # Simple extraction logic (can be enhanced with NLP)
    lines = answer.split('\n')
    for line in lines:
        if 'Article' in line or 'Section' in line:
            related_provisions.append(line.strip())
        if 'v.' in line or 'Case:' in line or 'G.R.' in line:
            case_law_references.append(line.strip())
    
    # Limit to top 5 each
    related_provisions = related_provisions[:5]
    case_law_references = case_law_references[:5]
    
    # Determine confidence based on finish reason and content quality
    finish_reason = response.choices[0].finish_reason
    confidence = "high" if finish_reason == "stop" else "medium"
    
    if "insufficient information" in answer.lower() or "hindi sapat ang impormasyon" in answer.lower():
        confidence = "low"
    
    return answer, confidence, legal_analysis, related_provisions, case_law_references


@router.post("/ask", response_model=LawyerChatResponse)
async def ask_legal_question_lawyer(request: LawyerChatRequest):
    """
    Main endpoint for lawyers to ask legal questions
    Supports both English and Tagalog with professional-level analysis
    
    Example request:
    {
        "question": "What are the procedural requirements for filing a motion for reconsideration?",
        "conversation_history": [],
        "max_tokens": 2000,
        "include_case_law": true,
        "include_cross_references": true
    }
    """
    try:
        # Check if OpenAI client is available
        if openai_client is None:
            raise HTTPException(status_code=503, detail="OpenAI service is currently unavailable")
        
        # Validate question
        if not request.question or len(request.question.strip()) < 5:
            raise HTTPException(status_code=400, detail="Question is too short")
        
        # Detect language
        language = detect_language(request.question)
        
        # Retrieve relevant context with higher threshold for lawyers
        context, sources = retrieve_relevant_context(request.question, TOP_K_RESULTS)
        
        # Generate professional legal analysis
        answer, confidence, legal_analysis, related_provisions, case_law_references = generate_lawyer_answer(
            request.question,
            context,
            request.conversation_history,
            language,
            request.include_case_law,
            request.include_cross_references,
            request.max_tokens
        )
        
        # Format sources for response
        source_citations = [
            SourceCitation(
                source=src['source'],
                law=src['law'],
                article_number=src['article_number'],
                article_title=src['article_title'],
                text_preview=src['text_preview'],
                relevance_score=src['relevance_score']
            )
            for src in sources
        ]
        
        return LawyerChatResponse(
            answer=answer,
            sources=source_citations,
            confidence=confidence,
            language=language,
            legal_analysis=legal_analysis,
            related_provisions=related_provisions,
            case_law_references=case_law_references
        )
        
    except Exception as e:
        print(f"Error in lawyer chatbot: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing legal question: {str(e)}")


@router.get("/health")
async def health_check():
    """Check if the lawyer chatbot service is running"""
    try:
        collection_info = qdrant_client.get_collection(collection_name=COLLECTION_NAME)
        count = collection_info.points_count
        return {
            "status": "healthy",
            "service": "Lawyer Chatbot (Technical & Professional)",
            "database": "Qdrant Cloud",
            "documents": count,
            "model": CHAT_MODEL,
            "languages": ["English", "Tagalog"],
            "features": ["Case Law Analysis", "Cross-References", "Professional Analysis"]
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
