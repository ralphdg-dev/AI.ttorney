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
    
                                                                  
                                                        
    PROFANITY_LIST = [
                          
        "putangina", "tangina", "tanginamo", "putanginamo", "puta", "gago", "gaga",
        "tarantado", "tarantada", "ulol", "bobo", "tanga", "tangahan",
        "leche", "peste", "yawa", "pakyu", "fuck", "shit", "bitch",
        
                                            
        "p*tangina", "t*ngina", "p*ta", "g*go", "t*nga",
        "putang ina", "tang ina", "puta ng ina",
        
                         
        "amputa", "ampota", "kingina", "punyeta", "punyemas",
        "hudas", "demonyo", "hayop", "hayop ka",
        
                          
        "tae", "dumi", "basura", "walang kwenta", "walang hiya",
        "pokpok", "puta", "baboy", "aso",
        
                                  
        "papatayin", "sasaktan", "susuntukin", "babarilin",
        "mamatay", "mamatay ka", "sana mamatay",
        
                              
        "kantot", "kantutan", "tamod", "titi", "puke", "bilat",
        
                      
        "gago ka", "tanga ka", "bobo ka", "ulol ka",
        "putang inang", "tanginang", "leche ka",
        
                                               
        "fuck", "shit", "bitch", "asshole", "bastard", "damn",
        "hell", "crap", "dick", "pussy", "cock",
        
                    
        "fck", "fck you", "fk", "sht", "btch", "dmn",
    ]
    
                                                              
    PROFANITY_PATTERNS = [
        r"p+u+t+a+n+g+\s*i+n+a+",                             
        r"t+a+n+g+\s*i+n+a+",                                
        r"g+a+g+o+",                                      
        r"t+a+n+g+a+",                                     
        r"b+o+b+o+",                                      
        r"u+l+o+l+",                                      
        r"f+u+c+k+",                                      
        r"s+h+i+t+",                                      
        r"p+a+k+y+u+",                                     
    ]
    
    def __init__(self):
        """Initialize the profanity filter."""
                                                       
        self.compiled_patterns = [
            re.compile(pattern, re.IGNORECASE) 
            for pattern in self.PROFANITY_PATTERNS
        ]
        logger.info(" Filipino profanity filter initialized")
    
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
        
                             
        for profanity in self.PROFANITY_LIST:
                                                          
            pattern = r'\b' + re.escape(profanity) + r'\b'
            if re.search(pattern, text_lower):
                matched_words.append(profanity)
        
                              
        for pattern in self.compiled_patterns:
            matches = pattern.findall(text_lower)
            matched_words.extend(matches)
        
                           
        matched_words = list(set(matched_words))
        
                            
        severity = "none"
        if matched_words:
                                                                      
            high_severity_words = [
                "putangina", "tangina", "fuck", "papatayin", "kantot",
                "mamatay", "sasaktan", "susuntukin"
            ]
            if any(word in text_lower for word in high_severity_words):
                severity = "high"
                                                 
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


                    
_profanity_filter_instance = None

def get_filipino_profanity_filter() -> FilipinoProfanityFilter:
    """Get singleton instance of Filipino profanity filter."""
    global _profanity_filter_instance
    if _profanity_filter_instance is None:
        _profanity_filter_instance = FilipinoProfanityFilter()
    return _profanity_filter_instance
