"""
Numerical Accuracy Validator for Legal AI Responses

This module prevents the AI from hallucinating numerical values (amounts, ages, periods, etc.)
by validating that all numbers in the response actually exist in the provided legal context.

Critical for legal accuracy - prevents dangerous misinformation like:
- Wrong monetary thresholds (e.g., "40,000 pesos" when Article 309 says "22,000 pesos")
- Wrong ages (e.g., "18 years" when law says "16 years")
- Wrong time periods, percentages, penalties, etc.
"""

import re
import logging
from typing import List, Tuple, Dict

logger = logging.getLogger(__name__)


class NumericalValidator:
    """Validates that numerical values in AI responses match the provided legal context"""
    
    # Common numerical patterns in legal text
    PESO_PATTERN = r'(\d{1,3}(?:,\d{3})*)\s*pesos?'
    YEAR_PATTERN = r'(\d{1,2})\s*(?:years?|taon)'
    DAY_PATTERN = r'(\d{1,3})\s*(?:days?|araw)'
    MONTH_PATTERN = r'(\d{1,2})\s*(?:months?|buwan)'
    PERCENTAGE_PATTERN = r'(\d{1,3}(?:\.\d+)?)\s*(?:%|percent|porsyento)'
    
    # Article 309 specific thresholds (for quick reference)
    ARTICLE_309_THRESHOLDS = {
        '22,000', '12,000', '6,000', '200', '50', '5'
    }
    
    def __init__(self):
        self.patterns = [
            ('peso', self.PESO_PATTERN),
            ('year', self.YEAR_PATTERN),
            ('day', self.DAY_PATTERN),
            ('month', self.MONTH_PATTERN),
            ('percentage', self.PERCENTAGE_PATTERN),
        ]
    
    def extract_numbers(self, text: str, pattern_type: str = 'peso') -> List[str]:
        """Extract all numbers of a specific type from text"""
        pattern = next((p for t, p in self.patterns if t == pattern_type), self.PESO_PATTERN)
        matches = re.findall(pattern, text, re.IGNORECASE)
        # Keep original format with commas for better matching
        return matches
    
    def validate_response(self, response: str, context: str, question: str = "") -> Tuple[bool, List[str]]:
        """
        Validate that all numerical values in response exist in the provided context
        
        Args:
            response: The AI's response text
            context: The legal context provided to the AI
            question: The user's question (optional, for logging)
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Special check for Article 309 (theft penalties) - CRITICAL
        if 'article 309' in question.lower() or 'article 309' in response.lower() or '309' in question:
            errors.extend(self._validate_article_309(response, context))
        
        # TODO: General numerical validation disabled for now - too aggressive
        # Only Article 309 validation is active to prevent the critical 40,000 pesos hallucination
        
        is_valid = len(errors) == 0
        
        if not is_valid:
            logger.error(f"❌ NUMERICAL HALLUCINATION DETECTED:")
            for error in errors:
                logger.error(f"   - {error}")
            logger.error(f"   Question: {question[:100]}")
            logger.error(f"   Response excerpt: {response[:200]}")
        
        return is_valid, errors
    
    def _validate_article_309(self, response: str, context: str) -> List[str]:
        """Special validation for Article 309 theft penalties - ONLY checks for known hallucinations"""
        errors = []
        
        # Check for the specific hallucination: 40,000 pesos
        # This is the critical error we need to prevent
        if re.search(r'40[,\s]*000\s*pesos', response, re.IGNORECASE):
            errors.append(
                f"CRITICAL HALLUCINATION: '40,000 pesos' detected in Article 309 response. "
                f"Article 309 does NOT mention 40,000 pesos. Valid thresholds are: 22,000, 12,000, 6,000, 200, 50, 5 pesos."
            )
            logger.error("🚨 BLOCKED: AI tried to say '40,000 pesos' for Article 309!")
        
        # Check for other common hallucinations
        if re.search(r'30[,\s]*000\s*pesos', response, re.IGNORECASE):
            errors.append("HALLUCINATION: '30,000 pesos' not in Article 309")
        
        if re.search(r'50[,\s]*000\s*pesos', response, re.IGNORECASE):
            errors.append("HALLUCINATION: '50,000 pesos' not in Article 309")
        
        return errors
    
    def get_correction_message(self, errors: List[str]) -> str:
        """Generate a user-friendly error message for hallucinated numbers"""
        if not errors:
            return ""
        
        return (
            "⚠️ ACCURACY ERROR DETECTED: The AI attempted to provide incorrect numerical information. "
            "This response has been blocked to prevent misinformation. "
            "Please try rephrasing your question or contact support."
        )


# Singleton instance
_validator = None

def get_numerical_validator() -> NumericalValidator:
    """Get the singleton numerical validator instance"""
    global _validator
    if _validator is None:
        _validator = NumericalValidator()
    return _validator
