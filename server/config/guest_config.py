"""
Guest Configuration - Backend
Single source of truth for guest rate limiting configuration
Mirrors frontend config for consistency (DRY principle)
"""

import os
from typing import Final

# ============================================================================
# GUEST SESSION CONSTANTS (Single Source of Truth)
# ============================================================================

# Maximum number of prompts a guest user can send
# Must match frontend: client/config/guestConfig.ts
GUEST_PROMPT_LIMIT: Final[int] = int(os.getenv("GUEST_PROMPT_LIMIT", "15"))

# Guest session expiration time in hours
# Must match frontend: 24 hours
SESSION_EXPIRY_HOURS: Final[int] = int(os.getenv("GUEST_SESSION_HOURS", "24"))

# IP-based rate limiting (backup layer)
# Prevents abuse even if session tokens are compromised
IP_RATE_LIMIT_PER_HOUR: Final[int] = int(os.getenv("GUEST_IP_LIMIT_HOUR", "30"))

# ============================================================================
# VALIDATION RULES
# ============================================================================

class GuestSessionValidation:
    """
    Guest session validation rules
    Mirrors frontend validation for consistency
    """
    
    # Minimum session ID length (prevents guessing attacks)
    MIN_SESSION_ID_LENGTH: Final[int] = 20
    
    # Session ID must start with this prefix
    SESSION_ID_PREFIX: Final[str] = "guest_"
    
    # Maximum session age in seconds (24 hours + buffer)
    MAX_SESSION_AGE_SECONDS: Final[int] = (SESSION_EXPIRY_HOURS + 1) * 3600
    
    # Expiry buffer for clock skew (5 minutes)
    EXPIRY_BUFFER_SECONDS: Final[int] = 5 * 60

# ============================================================================
# ERROR MESSAGES (Centralized)
# ============================================================================

class GuestErrorMessages:
    """
    Centralized error messages for guest rate limiting
    Ensures consistent user-facing messages
    """
    
    @staticmethod
    def limit_reached(prompts: int, hours_left: int, minutes_left: int) -> str:
        """Generate limit reached message"""
        return f"You've used all {prompts} free prompts. Resets in {hours_left}h {minutes_left}m."
    
    @staticmethod
    def session_expired() -> str:
        """Generate session expired message"""
        return "Your 24-hour session has expired. Refresh to start a new session."
    
    @staticmethod
    def session_not_found() -> str:
        """Generate session not found message"""
        return "Session expired. Please refresh the page."
    
    @staticmethod
    def ip_rate_limit(minutes_left: int) -> str:
        """Generate IP rate limit message"""
        return f"Too many requests from your IP. Try again in {minutes_left} minutes."

# ============================================================================
# HELPER FUNCTIONS (DRY Principle)
# ============================================================================

def calculate_remaining_prompts(prompt_count: int) -> int:
    """
    Calculate remaining prompts
    
    Args:
        prompt_count: Current prompt count
        
    Returns:
        Number of prompts remaining
    """
    return max(0, GUEST_PROMPT_LIMIT - prompt_count)

def is_prompt_limit_reached(prompt_count: int) -> bool:
    """
    Check if prompt limit is reached
    
    Args:
        prompt_count: Current prompt count
        
    Returns:
        True if limit is reached
    """
    return prompt_count >= GUEST_PROMPT_LIMIT

def validate_session_id(session_id: str) -> bool:
    """
    Validate session ID format
    
    Args:
        session_id: Session ID to validate
        
    Returns:
        True if session ID is valid
    """
    if not session_id or not isinstance(session_id, str):
        return False
    
    if not session_id.startswith(GuestSessionValidation.SESSION_ID_PREFIX):
        return False
    
    if len(session_id) < GuestSessionValidation.MIN_SESSION_ID_LENGTH:
        return False
    
    return True

def calculate_reset_time(created_at: float) -> int:
    """
    Calculate when session resets
    
    Args:
        created_at: Session creation timestamp
        
    Returns:
        Reset timestamp
    """
    return int(created_at + SESSION_EXPIRY_HOURS * 3600)

# ============================================================================
# EXPORT ALL
# ============================================================================

__all__ = [
    'GUEST_PROMPT_LIMIT',
    'SESSION_EXPIRY_HOURS',
    'IP_RATE_LIMIT_PER_HOUR',
    'GuestSessionValidation',
    'GuestErrorMessages',
    'calculate_remaining_prompts',
    'is_prompt_limit_reached',
    'validate_session_id',
    'calculate_reset_time',
]
