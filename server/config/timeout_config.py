"""
Centralized timeout configuration for AI.ttorney backend
Following DRY principles and industry standards for slow internet conditions
"""

import os
import logging
from typing import Dict, Any
from dotenv import load_dotenv

# Set up logger for this module
logger = logging.getLogger(__name__)

load_dotenv()

def _ENV_FLOAT(key: str, default: str) -> float:
    """Get float from environment variable with default"""
    return float(os.getenv(key, default))

def _ENV_INT(key: str, default: str) -> int:
    """Get int from environment variable with default"""
    return int(os.getenv(key, default))

# Industry-standard timeout values optimized for slow internet connections
# Based on FAANG practices (Google, Facebook, Amazon, Netflix)

# Core timeout configurations - Optimized for Philippine rural internet (2G/3G/slow 4G)
TIMEOUT_CONFIG = {
    # Chatbot timeouts - highest priority for user experience
    "chatbot_streaming": _ENV_FLOAT("CHATBOT_STREAMING_TIMEOUT", "180.0"),  # 3 minutes for complex AI responses on slow networks
    "chatbot_openai": _ENV_FLOAT("CHATBOT_OPENAI_TIMEOUT", "180.0"),  # Match streaming timeout for consistency
    "chatbot_vector_search": _ENV_FLOAT("CHATBOT_VECTOR_SEARCH_TIMEOUT", "90.0"),  # Vector DB operations with 50% buffer
    
    # General HTTP client timeouts - significantly increased for PH rural conditions
    "http_default": _ENV_FLOAT("HTTP_DEFAULT_TIMEOUT", "90.0"),  # Standard HTTP operations (60s → 90s)
    "http_quick": _ENV_FLOAT("HTTP_QUICK_TIMEOUT", "45.0"),  # Quick operations (30s → 45s)
    "http_upload": _ENV_FLOAT("HTTP_UPLOAD_TIMEOUT", "120.0"),  # File uploads/downloads (80s → 120s)
    
    # Service-specific timeouts - optimized for PH network reliability
    "smtp": _ENV_FLOAT("SMTP_TIMEOUT", "45.0"),  # Email operations (30s → 45s)
    "places_proxy": _ENV_FLOAT("PLACES_PROXY_TIMEOUT", "20.0"),  # Map queries with buffer (10s → 20s)
    "web_search": _ENV_FLOAT("WEB_SEARCH_TIMEOUT", "60.0"),  # Web scraping operations (45s → 60s)
    "bookmark_service": _ENV_FLOAT("BOOKMARK_SERVICE_TIMEOUT", "60.0"),  # External bookmark APIs (40s → 60s)
    
    # Database and internal service timeouts - increased for stability
    "database_query": _ENV_FLOAT("DATABASE_QUERY_TIMEOUT", "60.0"),  # Database operations (45s → 60s)
    "guardrails": _ENV_FLOAT("GUARDRAILS_TIMEOUT", "60.0"),  # AI guardrails validation (40s → 60s)
    "otp_service": _ENV_FLOAT("OTP_SERVICE_TIMEOUT", "45.0"),  # OTP generation/sending (30s → 45s)
    
    # Admin and moderation timeouts - enhanced for reliability
    "moderation_service": _ENV_FLOAT("MODERATION_SERVICE_TIMEOUT", "60.0"),  # Content moderation (45s → 60s)
    "violation_tracking": _ENV_FLOAT("VIOLATION_TRACKING_TIMEOUT", "60.0"),  # Violation logging (45s → 60s)
    "admin_operations": _ENV_FLOAT("ADMIN_OPERATIONS_TIMEOUT", "90.0"),  # Admin panel operations (60s → 90s)
}

# Connection pool settings to prevent resource exhaustion
CONNECTION_CONFIG = {
    "http_max_connections": _ENV_INT("HTTP_MAX_CONNECTIONS", "100"),  # Total connection pool size
    "http_max_keepalive": _ENV_INT("HTTP_MAX_KEEPALIVE", "20"),  # Keep-alive connections
    "http_retries": _ENV_INT("HTTP_RETRIES", "3"),  # Automatic retries
    "http_backoff_factor": _ENV_FLOAT("HTTP_BACKOFF_FACTOR", "0.5"),  # Retry backoff
}

# Connection-specific timeouts for PH network conditions (high latency, packet loss)
CONNECTION_TIMEOUTS = {
    "connect": _ENV_FLOAT("HTTP_CONNECT_TIMEOUT", "15.0"),  # TCP establishment (5s → 15s) for slow DNS/handshakes
    "write": _ENV_FLOAT("HTTP_WRITE_TIMEOUT", "30.0"),  # Request upload (10s → 30s) for packet loss
    "read": _ENV_FLOAT("HTTP_READ_TIMEOUT", "90.0"),  # Response download (matches http_default)
    "pool": _ENV_FLOAT("HTTP_POOL_TIMEOUT", "10.0"),  # Connection pool acquisition (5s → 10s)
}

def get_timeout(operation: str) -> float:
    """
    Get timeout for a specific operation
    
    Args:
        operation: Operation key from TIMEOUT_CONFIG
        
    Returns:
        Timeout value in seconds
        
    Raises:
        KeyError: If operation not found in config
    """
    if operation not in TIMEOUT_CONFIG:
        raise KeyError(f"Timeout operation '{operation}' not found in config. Available: {list(TIMEOUT_CONFIG.keys())}")
    return TIMEOUT_CONFIG[operation]

def get_connection_config() -> Dict[str, Any]:
    """
    Get connection pool configuration
    
    Returns:
        Dictionary with connection settings
    """
    return CONNECTION_CONFIG.copy()

def create_httpx_timeout(operation: str) -> "httpx.Timeout":
    """
    Create httpx.Timeout object for specific operation with PH-optimized connection timeouts
    
    Args:
        operation: Operation key from TIMEOUT_CONFIG
        
    Returns:
        httpx.Timeout configured for the operation with PH network optimizations
    """
    import httpx
    
    timeout_seconds = get_timeout(operation)
    
    # Configure PH-optimized timeouts for high latency and packet loss
    # httpx.Timeout(connect=15.0, read=timeout_seconds, write=30.0, pool=10.0)
    return httpx.Timeout(
        connect=CONNECTION_TIMEOUTS["connect"],  # TCP establishment (15s for slow DNS/handshakes)
        read=timeout_seconds,  # Read response (main operation)
        write=CONNECTION_TIMEOUTS["write"],  # Write request (30s for packet loss)
        pool=CONNECTION_TIMEOUTS["pool"],  # Connection pool acquisition (10s for congestion)
    )

# Industry-standard timeout bundles for common use cases
TIMEOUT_BUNDLES = {
    "chatbot": {
        "openai": get_timeout("chatbot_openai"),
        "vector_search": get_timeout("chatbot_vector_search"),
        "guardrails": get_timeout("guardrails"),
    },
    "content_moderation": {
        "moderation": get_timeout("moderation_service"),
        "guardrails": get_timeout("guardrails"),
        "violation_tracking": get_timeout("violation_tracking"),
    },
    "external_apis": {
        "default": get_timeout("http_default"),
        "quick": get_timeout("http_quick"),
        "upload": get_timeout("http_upload"),
    }
}

def get_timeout_bundle(bundle_name: str) -> Dict[str, float]:
    """
    Get a predefined bundle of timeouts
    
    Args:
        bundle_name: Name of the timeout bundle
        
    Returns:
        Dictionary with timeout values for the bundle
    """
    if bundle_name not in TIMEOUT_BUNDLES:
        raise KeyError(f"Timeout bundle '{bundle_name}' not found. Available: {list(TIMEOUT_BUNDLES.keys())}")
    return TIMEOUT_BUNDLES[bundle_name].copy()

# Validation functions
def validate_timeouts() -> bool:
    """
    Validate all timeout configurations
    
    Returns:
        True if all timeouts are reasonable values
    """
    for key, value in TIMEOUT_CONFIG.items():
        if value <= 0:
            logger.error(f"Invalid timeout for {key}: {value}s must be positive")
            return False
        if value > 300:  # 5 minutes max
            logger.warning(f"Very long timeout for {key}: {value}s (max recommended: 300s)")
    
    return True

# Print configuration on import for debugging
if os.getenv("DEBUG_TIMEOUTS", "false").lower() == "true":
    logger.info("Timeout Configuration:")
    for key, value in sorted(TIMEOUT_CONFIG.items()):
        logger.info(f"  {key}: {value}s")
    
    logger.info("Connection Configuration:")
    for key, value in sorted(CONNECTION_CONFIG.items()):
        logger.info(f"  {key}: {value}")
