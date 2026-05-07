import logging
from typing import Any, List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


def retrieve_relevant_context_with_web_search(
    question: str,
    collection_name: Optional[str] = None,
    embedding_model: Optional[str] = None,
    top_k: int = 5,
    min_confidence_score: float = 0.3,
    enable_web_search: bool = True,
    openai_client: Optional[Any] = None
) -> Tuple[str, List[Dict], Dict]:
    """
    Retrieve legal context from trusted web sources only.
    
    The optional OpenAI parameter is accepted for backward compatibility with
    older route call sites, but is intentionally ignored.
    
    Args:
        question: User's question
        collection_name: Deprecated; ignored.
        embedding_model: Deprecated; ignored.
        top_k: Number of web results to retrieve
        min_confidence_score: Deprecated; ignored.
        enable_web_search: Enable Google search fallback
        openai_client: Deprecated; ignored.
        
    Returns:
        Tuple of (context_text, sources, metadata)
    """
    from services.web_search_service import get_web_search_service

    logger.info(f"🔍 Searching trusted web sources for context: {question[:100]}...")
    
    metadata = {
        "web_search_triggered": False,
        "web_results": 0,
        "max_confidence": 0.0,
        "search_strategy": "web_only"
    }

    web_search_service = get_web_search_service()
    web_context_parts = []
    web_sources = []

    if not enable_web_search:
        logger.warning("Web search disabled for this request")
        return "", [], metadata

    if not web_search_service.is_enabled():
        logger.warning("Web search service is not configured")
        return "", [], metadata
    
    logger.info("Triggering trusted web search for chatbot context")
    metadata["web_search_triggered"] = True

    result_limit = max(1, min(top_k or 5, 5))
    web_results = web_search_service.search_and_scrape(question, result_limit)
    metadata["web_results"] = len(web_results)

    if not web_results:
        logger.warning("Web search returned no results")
        return "", [], metadata

    valid_results = []
    for result in web_results:
        content = result.get('scraped_content', result.get('snippet', ''))
        url = result.get('url', '')
        title = result.get('title', '')

        if not content or len(content.strip()) < 50:
            logger.debug(f"Skipping web result with insufficient content: {title[:50]}")
            continue

        if url.count('/') <= 3 and not any(keyword in url.lower() for keyword in ['article', 'law', 'republic-act', 'executive-order', 'small-claims', 'rules', 'issuance']):
            logger.debug(f"Skipping generic homepage: {url}")
            continue

        generic_phrases = [
            'has the exclusive power to',
            'official website',
            'welcome to',
            'home page',
            'about us'
        ]
        if any(phrase in title.lower() for phrase in generic_phrases):
            logger.debug(f"Skipping generic title: {title[:50]}")
            continue

        valid_results.append(result)

    for i, result in enumerate(valid_results, 1):
        content = result.get('scraped_content', result.get('snippet', ''))

        context_entry = f"""[Web Source {i}: {result.get('title', 'Untitled')}]
[URL: {result.get('url', '')}]
{content}
"""
        web_context_parts.append(context_entry)

        web_sources.append({
            "source": "Web Search",
            "law": result.get("source", "Web"),
            "article_number": f"Web Result {i}",
            "article_title": result.get("title", ""),
            "text_preview": content[:200] + "..." if len(content) > 200 else content,
            "source_url": result.get("url", ""),
            "relevance_score": 0.0,
            "search_timestamp": result.get("timestamp", ""),
            "source_type": "web_scraped"
        })

    if not web_context_parts:
        logger.warning(" No context available from any source")
        return "", [], metadata
    
    combined_context = "\n\n".join(web_context_parts)
    
    logger.info(f"Context built from {len(web_sources)} trusted web sources")
    
    return combined_context, web_sources, metadata


def get_embedding(text: str, openai_client: Any, embedding_model: str) -> List[float]:
    """
    Generate embedding for text using OpenAI
    
    Args:
        text: Text to embed
        openai_client: OpenAI client instance
        embedding_model: Model name for embeddings
    
    Returns:
        List of embedding values
    """
    try:
        response = openai_client.embeddings.create(
            model=embedding_model,
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        raise
