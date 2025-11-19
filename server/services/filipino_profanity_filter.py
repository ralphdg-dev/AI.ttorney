"""
Filipino Profanity Filter

Catches Filipino/Tagalog profanity and offensive language that OpenAI's 
moderation API might miss. This is a pre-filter that runs before OpenAI moderation.

This ensures strict enforcement of community guidelines for Filipino users.
"""

import re
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class FilipinoProfanityFilter:
    """
    Pre-filter for Filipino profanity and offensive language.
    
    This catches common Filipino curse words, slang, and offensive terms
    that might not be caught by OpenAI's moderation API.
    """
    
    # Comprehensive list of Filipino profanity and offensive terms
    # Note: These are stored for detection purposes only
    PROFANITY_LIST = [
        # Strong profanity
        "putangina", "tangina", "tanginamo", "putanginamo", "puta", "gago", "gaga",
        "tarantado", "tarantada", "ulol", "bobo", "tanga", "tangahan",
        "leche", "peste", "yawa", "pakyu", "fuck", "shit", "bitch",
        
        # Variations and common misspellings
        "p*tangina", "t*ngina", "p*ta", "g*go", "t*nga",
        "putang ina", "tang ina", "puta ng ina",
        
        # Offensive slang
        "amputa", "ampota", "kingina", "punyeta", "punyemas",
        "hudas", "demonyo", "hayop", "hayop ka",
        
        # Derogatory terms
        "tae", "dumi", "basura", "walang kwenta", "walang hiya",
        "pokpok", "puta", "baboy", "aso",
        
        # Threats/violence related
        "papatayin", "sasaktan", "susuntukin", "babarilin",
        "mamatay", "mamatay ka", "sana mamatay",
        
        # Sexual/inappropriate
        "kantot", "kantutan", "tamod", "titi", "puke", "bilat",
        
        # Combinations
        "gago ka", "tanga ka", "bobo ka", "ulol ka",
        "putang inang", "tanginang", "leche ka",
        
        # English profanity (common in Taglish)
        "fuck", "shit", "bitch", "asshole", "bastard", "damn",
        "hell", "crap", "dick", "pussy", "cock",
        
        # Variations
        "fck", "fck you", "fk", "sht", "btch", "dmn",
    ]
    
    # Patterns for detecting variations and creative spellings
    PROFANITY_PATTERNS = [
        r"p+u+t+a+n+g+\s*i+n+a+",  # putangina with variations
        r"t+a+n+g+\s*i+n+a+",       # tangina with variations
        r"g+a+g+o+",                # gago with variations
        r"t+a+n+g+a+",              # tanga with variations
        r"b+o+b+o+",                # bobo with variations
        r"u+l+o+l+",                # ulol with variations
        r"f+u+c+k+",                # fuck with variations
        r"s+h+i+t+",                # shit with variations
        r"p+a+k+y+u+",              # pakyu with variations
    ]
    
    def __init__(self):
        """Initialize the profanity filter."""
        # Compile regex patterns for better performance
        self.compiled_patterns = [
            re.compile(pattern, re.IGNORECASE) 
            for pattern in self.PROFANITY_PATTERNS
        ]
        logger.info("✅ Filipino profanity filter initialized")
    
    def contains_profanity(self, text: str) -> Dict[str, Any]:
        """
        Check if text contains Filipino profanity.
        
        Args:
            text: The text to check
            
        Returns:
            Dict with:
                - is_profane: bool
                - matched_words: List of detected profane words
                - severity: 'high', 'medium', or 'low'
        """
        if not text:
            return {
                "is_profane": False,
                "matched_words": [],
                "severity": "none"
            }
        
        text_lower = text.lower()
        matched_words = []
        
        # Check exact matches
        for profanity in self.PROFANITY_LIST:
            # Use word boundaries to avoid false positives
            pattern = r'\b' + re.escape(profanity) + r'\b'
            if re.search(pattern, text_lower):
                matched_words.append(profanity)
        
        # Check regex patterns
        for pattern in self.compiled_patterns:
            matches = pattern.findall(text_lower)
            matched_words.extend(matches)
        
        # Remove duplicates
        matched_words = list(set(matched_words))
        
        # Determine severity
        severity = "none"
        if matched_words:
            # High severity: strong profanity, threats, sexual content
            high_severity_words = [
                "putangina", "tangina", "fuck", "papatayin", "kantot",
                "mamatay", "sasaktan", "susuntukin"
            ]
            if any(word in text_lower for word in high_severity_words):
                severity = "high"
            # Medium severity: moderate profanity
            elif any(word in text_lower for word in ["gago", "tanga", "bobo", "ulol", "puta"]):
                severity = "medium"
            else:
                severity = "low"
        
        is_profane = len(matched_words) > 0
        
        if is_profane:
            logger.warning(f"🚨 Filipino profanity detected: {matched_words} (severity: {severity})")
        
        return {
            "is_profane": is_profane,
            "matched_words": matched_words,
            "severity": severity
        }
    
    def get_violation_message(self, matched_words: List[str], severity: str) -> str:
        """
        Get user-friendly violation message.
        
        Args:
            matched_words: List of detected profane words
            severity: Severity level
            
        Returns:
            User-friendly message in English and Filipino
        """
        if severity == "high":
            return (
                "Your post contains severe profanity or offensive language that violates our community guidelines. "
                "Ang iyong post ay naglalaman ng matinding mura o nakakasakit na salita na lumalabag sa aming patakaran. "
                "Please revise your message to be respectful."
            )
        elif severity == "medium":
            return (
                "Your post contains inappropriate language. "
                "Ang iyong post ay naglalaman ng hindi angkop na salita. "
                "Please use respectful language when posting."
            )
        else:
            return (
                "Your post may contain inappropriate content. "
                "Ang iyong post ay maaaring maglaman ng hindi angkop na nilalaman. "
                "Please review and revise."
            )


# Singleton instance
_profanity_filter_instance = None

def get_filipino_profanity_filter() -> FilipinoProfanityFilter:
    """Get singleton instance of Filipino profanity filter."""
    global _profanity_filter_instance
    if _profanity_filter_instance is None:
        _profanity_filter_instance = FilipinoProfanityFilter()
    return _profanity_filter_instance
