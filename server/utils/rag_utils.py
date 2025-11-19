# rag_utils.py
"""
Retrieval Augmented Generation (RAG) Utilities

Enhanced context retrieval combining:
1. Qdrant vector embeddings (primary source)
2. Google Web Search (fallback for low confidence)

This module provides a unified interface for retrieving legal context
from multiple sources with intelligent fallback mechanisms.
"""

import logging
from typing import List, Dict, Tuple
from qdrant_client import QdrantClient
from openai import OpenAI

logger = logging.getLogger(__name__)


def retrieve_relevant_context_with_web_search(
    question: str,
    qdrant_client: QdrantClient,
    openai_client: OpenAI,
    collection_name: str,
    embedding_model: str,
    top_k: int = 5,
    min_confidence_score: float = 0.3,
    enable_web_search: bool = True
) -> Tuple[str, List[Dict], Dict]:
    """
    Enhanced context retrieval with web search fallback
    
    Flow:
    1. Query Qdrant vector database
    2. Check confidence score
    3. If low confidence → Trigger Google Search
    4. Combine and return context
    
    Args:
        question: User's legal question
        qdrant_client: Qdrant client instance
        openai_client: OpenAI client for embeddings
        collection_name: Qdrant collection name
        embedding_model: OpenAI embedding model name
        top_k: Number of results to retrieve
        min_confidence_score: Minimum relevance threshold
        enable_web_search: Whether to use web search fallback
    
    Returns:
        Tuple of (context_text, sources, metadata)
        - context_text: Combined context string
        - sources: List of source citations
        - metadata: Additional info (web_search_triggered, confidence, etc.)
    """
    from services.web_search_service import get_web_search_service
    
    metadata = {
        "web_search_triggered": False,
        "qdrant_results": 0,
        "web_results": 0,
        "max_confidence": 0.0,
        "search_strategy": "qdrant_only"
    }
    
    # Step 1: Get embedding for question
    try:
        logger.info(f"🔍 Generating embedding for query: {question[:60]}...")
        embedding_response = openai_client.embeddings.create(
            model=embedding_model,
            input=question
        )
        question_embedding = embedding_response.data[0].embedding
    except Exception as e:
        logger.error(f"❌ Failed to generate embedding: {e}")
        return "", [], metadata
    
    # Step 2: Query Qdrant vector database
    try:
        logger.info(f"📊 Querying Qdrant collection: {collection_name}")
        qdrant_results = qdrant_client.search(
            collection_name=collection_name,
            query_vector=question_embedding,
            limit=top_k,
            score_threshold=min_confidence_score
        )
        
        metadata["qdrant_results"] = len(qdrant_results)
        
        if qdrant_results:
            max_score = max(r.score for r in qdrant_results)
            metadata["max_confidence"] = max_score
            logger.info(f"✅ Qdrant: Found {len(qdrant_results)} results, max score: {max_score:.3f}")
        else:
            logger.warning("⚠️  Qdrant: No results found")
            
    except Exception as e:
        logger.error(f"❌ Qdrant search error: {e}")
        qdrant_results = []
    
    # Step 3: Build context from Qdrant results
    qdrant_context_parts = []
    qdrant_sources = []
    
    for i, result in enumerate(qdrant_results, 1):
        payload = result.payload
        doc = payload.get('text', '')
        
        # Skip if no text content
        if not doc or len(doc.strip()) < 10:
            continue
        
        source_url = payload.get('source_url', '')
        
        # Add to context with URL
        source_info = f"[Qdrant Source {i}: {payload.get('law', 'Unknown')} - Article {payload.get('article_number', 'N/A')}]"
        if source_url:
            source_info += f"\n[URL: {source_url}]"
        qdrant_context_parts.append(f"{source_info}\n{doc}\n")
        
        # Store source metadata
        qdrant_sources.append({
            'source': payload.get('source', 'Qdrant Database'),
            'law': payload.get('law', 'Unknown Law'),
            'article_number': payload.get('article_number', 'N/A'),
            'article_title': payload.get('article_title', payload.get('article_heading', '')),
            'text_preview': doc[:200] + "..." if len(doc) > 200 else doc,
            'source_url': source_url,
            'relevance_score': result.score,
            'source_type': 'qdrant'
        })
    
    # Step 4: Check if web search should be triggered
    web_search_service = get_web_search_service()
    web_context_parts = []
    web_sources = []
    
    if enable_web_search and web_search_service.is_enabled():
        # Determine if we should trigger web search
        max_qdrant_score = metadata["max_confidence"]
        num_qdrant_results = len(qdrant_sources)
        
        should_search_web = web_search_service.should_trigger_web_search(
            qdrant_score=max_qdrant_score,
            num_results=num_qdrant_results
        )
        
        if should_search_web:
            logger.info("🌐 Triggering web search to augment context...")
            metadata["web_search_triggered"] = True
            metadata["search_strategy"] = "hybrid" if qdrant_sources else "web_only"
            
            # Perform web search AND scrape content from websites
            web_results = web_search_service.search_and_scrape(question)
            metadata["web_results"] = len(web_results)
            
            if web_results:
                # Format web results with scraped content into context
                for i, result in enumerate(web_results, 1):
                    # Use scraped content if available, otherwise use snippet
                    content = result.get('scraped_content', result.get('snippet', ''))
                    
                    if content:
                        # Format context entry with full scraped content
                        context_entry = f"""[Web Source {i}: {result.get('title', 'Untitled')}]
[URL: {result.get('url', '')}]
{content}
"""
                        web_context_parts.append(context_entry)
                        
                        # Create source citation
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
                
                logger.info(f"✅ Added {len(web_results)} web search results with scraped content to context")
            else:
                logger.warning("⚠️  Web search returned no results")
    
    # Step 5: Combine all contexts - PRIORITIZE WEB SEARCH OVER QDRANT
    # Put web search results FIRST so LLM sees them as primary sources
    all_context_parts = web_context_parts + qdrant_context_parts
    all_sources = web_sources + qdrant_sources
    
    if not all_context_parts:
        logger.warning("❌ No context available from any source")
        return "", [], metadata
    
    # Add separator between web and Qdrant results (web search first)
    if qdrant_context_parts and web_context_parts:
        combined_context = (
            "=== PRIMARY SOURCES: WEB SEARCH (Most Recent & Comprehensive) ===\n\n" +
            "\n\n".join(web_context_parts) +
            "\n\n=== SUPPLEMENTARY SOURCES: LEGAL DATABASE (Additional Context) ===\n\n" +
            "\n\n".join(qdrant_context_parts)
        )
    else:
        combined_context = "\n\n".join(all_context_parts)
    
    logger.info(
        f"📦 Context built: {len(qdrant_sources)} Qdrant + {len(web_sources)} Web = {len(all_sources)} total sources"
    )
    
    return combined_context, all_sources, metadata


def get_embedding(text: str, openai_client: OpenAI, embedding_model: str) -> List[float]:
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
