"""
Enhanced Legal Chatbot API for Lawyers
Detailed + Contextual Answers with LawPhil Links (No Supreme Court Cases)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from qdrant_client import QdrantClient
from openai import OpenAI
import os
from dotenv import load_dotenv

# --- Load configuration ---
load_dotenv()

COLLECTION_NAME = "legal_knowledge"
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"
TOP_K_RESULTS = 8

# --- Initialize clients ---
qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

try:
    import httpx
    http_client = httpx.Client()
    openai_client = OpenAI(api_key=OPENAI_API_KEY, http_client=http_client)
    print("✅ OpenAI client initialized for Legal Chatbot")
except Exception as e:
    print(f"⚠️ HTTP client failed: {e}")
    openai_client = OpenAI(api_key=OPENAI_API_KEY)

router = APIRouter(prefix="/api/chatbot/lawyer", tags=["Legal Chatbot - Lawyer"])

# --- Core LawPhil References ---
LAWS = {
    "Civil Code": "https://lawphil.net/statutes/repacts/ra1949/ra_386_1949.html",
    "Revised Penal Code": "https://lawphil.net/statutes/acts/act_3815_1930.html",
    "Rules of Court": "https://lawphil.net/courts/rules/rc_roc.html",
    "Labor Code": "https://lawphil.net/statutes/presdecs/pd1974/pd_442_1974.html",
    "Corporation Code": "https://lawphil.net/statutes/repacts/ra2019/ra_11232_2019.html",
    "Family Code": "https://lawphil.net/executive/execord/eo1987/eo_209_1987.html"
}

# --- Models ---
class LawyerChatRequest(BaseModel):
    question: str
    conversation_history: Optional[List[Dict[str, str]]] = []
    max_tokens: Optional[int] = 2000
    include_cross_references: Optional[bool] = True


class SourceCitation(BaseModel):
    source: str
    law: str
    article_number: str
    article_title: Optional[str] = None
    text_preview: str
    relevance_score: float
    lawphil_link: Optional[str] = None


class LawyerChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    confidence: str
    language: str
    legal_analysis: Optional[str] = None
    related_provisions: Optional[List[str]] = None


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


# --- Main API Endpoint ---
@router.post("/ask", response_model=LawyerChatResponse)
async def ask_legal_question_lawyer(request: LawyerChatRequest):
    try:
        if not openai_client:
            raise HTTPException(status_code=503, detail="OpenAI unavailable")
        if not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")

        language = detect_language(request.question)
        if is_greeting_or_casual(request.question):
            ans, conf, _, _ = generate_lawyer_answer(request.question, "", request.conversation_history, language, False, 500)
            return LawyerChatResponse(answer=ans, sources=[], confidence=conf, language=language)

        context, sources = retrieve_relevant_context(request.question)
        ans, conf, analysis, related = generate_lawyer_answer(
            request.question, context, request.conversation_history,
            language, request.include_cross_references, request.max_tokens
        )

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

        return LawyerChatResponse(
            answer=ans,
            sources=citations,
            confidence=conf,
            language=language,
            legal_analysis=analysis,
            related_provisions=related
        )
    except Exception as e:
        print("❌ Error:", e)
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


# --- Health Check ---
@router.get("/health")
async def health_check():
    try:
        info = qdrant_client.get_collection(collection_name=COLLECTION_NAME)
        return {
            "status": "healthy",
            "service": "Enhanced Legal Chatbot (Codified Philippine Law)",
            "model": CHAT_MODEL,
            "documents": info.points_count,
            "features": [
                "LawPhil Links",
                "No Supreme Court Cases",
                "Formal Legal Analysis",
                "English & Tagalog Support",
                "Structured Answer Format"
            ]
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
