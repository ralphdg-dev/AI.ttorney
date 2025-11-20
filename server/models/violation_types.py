from enum import Enum


class ViolationType(str, Enum):
    """
    Enum for violation types that matches the database enum.
    
    Database enum definition:
    CREATE TYPE violation_type AS ENUM ('forum_post', 'chatbot_prompt', 'forum_reply');
    
    Note: 'chatbot_prompt' covers ALL chatbot violations including:
          - Content moderation (profanity, harassment, hate speech, etc.)
          - Security violations (prompt injection, system hijacking attempts)
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
    
    Database enum definition:
    CREATE TYPE suspension_type AS ENUM ('temporary', 'permanent');
    """
    TEMPORARY = "temporary"                                          
    PERMANENT = "permanent"                               
    
    @classmethod
    def values(cls) -> list[str]:
        """Get all valid suspension type values."""
        return [member.value for member in cls]
    
    @classmethod
    def is_valid(cls, value: str) -> bool:
        """Check if a value is a valid suspension type."""
        return value in cls.values()


class AccountStatus(str, Enum):
    """
    Enum for user account status.
    
    Database enum definition:
    CREATE TYPE account_status AS ENUM ('active', 'suspended', 'banned');
    """
    ACTIVE = "active"                                             
    SUSPENDED = "suspended"                                     
    BANNED = "banned"                                  
    
    @classmethod
    def values(cls) -> list[str]:
        """Get all valid account status values."""
        return [member.value for member in cls]
    
    @classmethod
    def is_valid(cls, value: str) -> bool:
        """Check if a value is a valid account status."""
        return value in cls.values()
