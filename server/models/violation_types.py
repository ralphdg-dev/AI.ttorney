"""
Moderation Enums

Defines the types of content that can be moderated and suspension types.
Must match the database enums.

Author: AI.ttorney Team
Date: 2025-10-23
"""

from enum import Enum


class ViolationType(str, Enum):
    """
    Enum for violation types that matches the database enum.
    
    Database enum definition:
    CREATE TYPE violation_type AS ENUM ('forum_post', 'chatbot_prompt', 'forum_reply');
    """
    FORUM_POST = "forum_post"
    CHATBOT_PROMPT = "chatbot_prompt"
    FORUM_REPLY = "forum_reply"
    
    @classmethod
    def values(cls) -> list[str]:
        """Get all valid violation type values."""
        return [member.value for member in cls]
    
    @classmethod
    def is_valid(cls, value: str) -> bool:
        """Check if a value is a valid violation type."""
        return value in cls.values()


class SuspensionType(str, Enum):
    """
    Enum for suspension types.
    
    Recommended database enum definition:
    CREATE TYPE suspension_type AS ENUM ('temporary', 'permanent');
    
    Current implementation uses TEXT field, but should be migrated to ENUM for:
    - Data integrity (prevents invalid values)
    - Better indexing performance
    - Self-documenting schema
    - Type safety in queries
    """
    TEMPORARY = "temporary"  # 7-day suspension (1st and 2nd offense)
    PERMANENT = "permanent"  # Permanent ban (3rd offense)
    
    @classmethod
    def values(cls) -> list[str]:
        """Get all valid suspension type values."""
        return [member.value for member in cls]
    
    @classmethod
    def is_valid(cls, value: str) -> bool:
        """Check if a value is a valid suspension type."""
        return value in cls.values()
