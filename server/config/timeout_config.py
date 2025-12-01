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

# Core timeout configurations
TIMEOUT_CONFIG = {
    # Chatbot timeouts - highest priority for user experience
    "chatbot_streaming": _ENV_FLOAT("CHATBOT_STREAMING_TIMEOUT", "120.0"),  # 2 minutes for complex AI responses
    "chatbot_openai": _ENV_FLOAT("CHATBOT_OPENAI_TIMEOUT", "120.0"),  # Match streaming timeout
    "chatbot_vector_search": _ENV_FLOAT("CHATBOT_VECTOR_SEARCH_TIMEOUT", "60.0"),  # Vector DB operations
    
    # General HTTP client timeouts - increased for slow internet
    "http_default": _ENV_FLOAT("HTTP_DEFAULT_TIMEOUT", "60.0"),  # Standard HTTP operations
    "http_quick": _ENV_FLOAT("HTTP_QUICK_TIMEOUT", "30.0"),  # Quick operations (moderation, search)
    "http_upload": _ENV_FLOAT("HTTP_UPLOAD_TIMEOUT", "80.0"),  # File uploads/downloads
    
    # Service-specific timeouts
    "smtp": _ENV_FLOAT("SMTP_TIMEOUT", "30.0"),  # Email operations
    "places_proxy": _ENV_FLOAT("PLACES_PROXY_TIMEOUT", "10.0"),  # Keep fast for map queries
    "web_search": _ENV_FLOAT("WEB_SEARCH_TIMEOUT", "45.0"),  # Web scraping operations
    "bookmark_service": _ENV_FLOAT("BOOKMARK_SERVICE_TIMEOUT", "40.0"),  # External bookmark APIs
    
    # Database and internal service timeouts
    "database_query": _ENV_FLOAT("DATABASE_QUERY_TIMEOUT", "45.0"),  # Database operations
    "guardrails": _ENV_FLOAT("GUARDRAILS_TIMEOUT", "40.0"),  # AI guardrails validation
    "otp_service": _ENV_FLOAT("OTP_SERVICE_TIMEOUT", "30.0"),  # OTP generation/sending
    
    # Admin and moderation timeouts
    "moderation_service": _ENV_FLOAT("MODERATION_SERVICE_TIMEOUT", "45.0"),  # Content moderation
    "violation_tracking": _ENV_FLOAT("VIOLATION_TRACKING_TIMEOUT", "45.0"),  # Violation logging
    "admin_operations": _ENV_FLOAT("ADMIN_OPERATIONS_TIMEOUT", "60.0"),  # Admin panel operations
}

# Connection pool settings to prevent resource exhaustion
CONNECTION_CONFIG = {
    "http_max_connections": _ENV_INT("HTTP_MAX_CONNECTIONS", "100"),  # Total connection pool size
    "http_max_keepalive": _ENV_INT("HTTP_MAX_KEEPALIVE", "20"),  # Keep-alive connections
    "http_retries": _ENV_INT("HTTP_RETRIES", "3"),  # Automatic retries
    "http_backoff_factor": _ENV_FLOAT("HTTP_BACKOFF_FACTOR", "0.5"),  # Retry backoff
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
    Create httpx.Timeout object for specific operation
    
    Args:
        operation: Operation key from TIMEOUT_CONFIG
        
    Returns:
        httpx.Timeout configured for the operation
    """
    import httpx
    
    timeout_seconds = get_timeout(operation)
    
    # Configure different timeout values for different scenarios
    # httpx.Timeout(connect=5.0, read=timeout_seconds, write=10.0, pool=5.0)
    return httpx.Timeout(
        connect=5.0,  # Connection establishment
        read=timeout_seconds,  # Read response (main operation)
        write=10.0,  # Write request
        pool=5.0,  # Connection pool acquisition
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
