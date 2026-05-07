"""
Industry-Grade Client Caching - FAANG Pattern
Single source of truth for all resource-intensive clients
Uses @lru_cache for thread-safe, zero-overhead singletons
"""

import os
import logging
from functools import lru_cache
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

@lru_cache(maxsize=1)
def get_openai_client() -> OpenAI:
    """
    Singleton OpenAI client - cached for lifetime of app
    Saves ~50MB per endpoint instance
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable required")
    
    logger.info("🤖 Initializing OpenAI client (cached singleton)")
    return OpenAI(api_key=api_key)

@lru_cache(maxsize=1)
def get_supabase_client():
    """
    Singleton Supabase client - cached for lifetime of app
    """
    try:
        from supabase import create_client, Client
    except ImportError:
        logger.error("❌ Supabase client not available")
        return None
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY required")
    
    logger.info("🗄️ Initializing Supabase client (cached singleton)")
    return create_client(url, key)

def clear_client_cache():
    """
    Force refresh all cached clients (useful for testing or config changes)
    """
    get_openai_client.cache_clear()
    get_supabase_client.cache_clear()
    logger.info("🧹 Cleared all client caches")

def get_cache_info():
    """
    Get cache statistics for monitoring
    """
    return {
        "openai": get_openai_client.cache_info(),
        "supabase": get_supabase_client.cache_info()
    }
