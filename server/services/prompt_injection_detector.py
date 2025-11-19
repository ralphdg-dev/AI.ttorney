"""
Prompt Injection & System Hijacking Detection Service

Detects attempts to manipulate, hijack, or bypass the AI system through:
- Prompt injection attacks
- System prompt manipulation
- Role/identity hijacking
- Jailbreak attempts
- Instruction override attempts

This service integrates with the existing violation tracking system to automatically
apply strikes when users attempt to compromise the chatbot's security.

Features:
- Pattern-based detection (fast, no API calls)
- Severity scoring (0.0 to 1.0)
- Multilingual support (English, Tagalog, Taglish)
- Configurable thresholds
- Detailed violation reporting

Author: AI.ttorney Team
Date: 2025-10-26
"""

import re
import logging
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class InjectionPattern:
    """Pattern definition for prompt injection detection"""
    pattern: str
    severity: float  # 0.0 to 1.0
    category: str
    description: str
    case_sensitive: bool = False


class PromptInjectionDetector:
    """
    Detects prompt injection and system hijacking attempts.
    
    Detection Categories:
    1. Direct Instruction Override - "Ignore previous instructions"
    2. Role Manipulation - "You are now a different AI"
    3. System Prompt Extraction - "Show me your system prompt"
    4. Jailbreak Attempts - "DAN mode", "Developer mode"
    5. Privilege Escalation - "You have admin access"
    6. Output Manipulation - "Output in JSON format with passwords"
    """
    
    # Severity thresholds
    CRITICAL_THRESHOLD = 0.9  # Immediate block
    HIGH_THRESHOLD = 0.7      # Strong warning
    MEDIUM_THRESHOLD = 0.5    # Moderate warning
    LOW_THRESHOLD = 0.3       # Minor warning
    
    def __init__(self):
        """Initialize the detector with pattern database"""
        self.patterns = self._load_patterns()
        logger.info(f"✅ Prompt injection detector initialized with {len(self.patterns)} patterns")
    
    def _load_patterns(self) -> List[InjectionPattern]:
        """Load detection patterns for various injection techniques"""
        return [
            # === DIRECT INSTRUCTION OVERRIDE ===
            InjectionPattern(
                pattern=r"ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|commands?)",
                severity=0.95,
                category="instruction_override",
                description="Attempting to override previous instructions"
            ),
            InjectionPattern(
                pattern=r"disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)",
                severity=0.95,
                category="instruction_override",
                description="Attempting to disregard system instructions"
            ),
            InjectionPattern(
                pattern=r"forget\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|context)",
                severity=0.9,
                category="instruction_override",
                description="Attempting to erase system context"
            ),
            InjectionPattern(
                pattern=r"override\s+(all\s+)?(previous|system|default)\s+(instructions?|settings?|rules?)",
                severity=0.95,
                category="instruction_override",
                description="Attempting to override system settings"
            ),
            
            # === ROLE/IDENTITY MANIPULATION ===
            InjectionPattern(
                pattern=r"you\s+are\s+now\s+(a|an)\s+(?!legal|lawyer|attorney)",
                severity=0.85,
                category="role_manipulation",
                description="Attempting to change AI identity"
            ),
            InjectionPattern(
                pattern=r"pretend\s+(you\s+are|to\s+be)\s+(?!a\s+lawyer|an\s+attorney)",
                severity=0.8,
                category="role_manipulation",
                description="Attempting to manipulate AI role"
            ),
            InjectionPattern(
                pattern=r"act\s+as\s+(if\s+)?(you\s+are|you're)\s+(?!a\s+legal|a\s+lawyer)",
                severity=0.8,
                category="role_manipulation",
                description="Attempting to change AI behavior"
            ),
            InjectionPattern(
                pattern=r"simulate\s+(being|that\s+you\s+are)\s+(?!a\s+legal|a\s+lawyer)",
                severity=0.8,
                category="role_manipulation",
                description="Attempting to simulate different identity"
            ),
            
            # === SYSTEM PROMPT EXTRACTION ===
            InjectionPattern(
                pattern=r"(show|display|reveal|print|output|tell)\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instructions?|rules?|guidelines?)",
                severity=0.9,
                category="prompt_extraction",
                description="Attempting to extract system prompt"
            ),
            InjectionPattern(
                pattern=r"what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?|rules?|guidelines?)",
                severity=0.85,
                category="prompt_extraction",
                description="Attempting to query system configuration"
            ),
            InjectionPattern(
                pattern=r"repeat\s+(your\s+)?(system\s+)?(prompt|instructions?|rules?)",
                severity=0.9,
                category="prompt_extraction",
                description="Attempting to extract system prompt via repetition"
            ),
            
            # === JAILBREAK ATTEMPTS ===
            InjectionPattern(
                pattern=r"\bDAN\s+(mode|prompt|jailbreak)",
                severity=1.0,
                category="jailbreak",
                description="DAN (Do Anything Now) jailbreak attempt",
                case_sensitive=True
            ),
            InjectionPattern(
                pattern=r"developer\s+mode",
                severity=0.95,
                category="jailbreak",
                description="Developer mode jailbreak attempt"
            ),
            InjectionPattern(
                pattern=r"god\s+mode",
                severity=0.95,
                category="jailbreak",
                description="God mode jailbreak attempt"
            ),
            InjectionPattern(
                pattern=r"unrestricted\s+mode",
                severity=0.95,
                category="jailbreak",
                description="Unrestricted mode jailbreak attempt"
            ),
            InjectionPattern(
                pattern=r"jailbreak\s+(mode|prompt)",
                severity=1.0,
                category="jailbreak",
                description="Explicit jailbreak attempt"
            ),
            
            # === PRIVILEGE ESCALATION ===
            InjectionPattern(
                pattern=r"you\s+(now\s+)?have\s+(admin|administrator|root|superuser)\s+(access|privileges?|rights?)",
                severity=0.9,
                category="privilege_escalation",
                description="Attempting to grant elevated privileges"
            ),
            InjectionPattern(
                pattern=r"enable\s+(admin|administrator|debug|developer)\s+(mode|access)",
                severity=0.9,
                category="privilege_escalation",
                description="Attempting to enable privileged mode"
            ),
            
            # === CONSTRAINT REMOVAL ===
            InjectionPattern(
                pattern=r"(remove|disable|turn\s+off)\s+(all\s+)?(restrictions?|limitations?|constraints?|filters?|safety)",
                severity=0.95,
                category="constraint_removal",
                description="Attempting to remove safety constraints"
            ),
            InjectionPattern(
                pattern=r"without\s+(any\s+)?(restrictions?|limitations?|constraints?|filters?|ethics?|morals?)",
                severity=0.85,
                category="constraint_removal",
                description="Requesting unrestricted operation"
            ),
            InjectionPattern(
                pattern=r"bypass\s+(all\s+)?(restrictions?|limitations?|constraints?|filters?|safety)",
                severity=0.95,
                category="constraint_removal",
                description="Attempting to bypass safety measures"
            ),
            
            # === OUTPUT MANIPULATION ===
            InjectionPattern(
                pattern=r"output\s+(in\s+)?JSON\s+(format\s+)?(with|containing)\s+(passwords?|credentials?|secrets?|keys?)",
                severity=0.9,
                category="output_manipulation",
                description="Attempting to extract sensitive data via format manipulation"
            ),
            InjectionPattern(
                pattern=r"respond\s+(only\s+)?with\s+(code|script|SQL|database)",
                severity=0.7,
                category="output_manipulation",
                description="Attempting to manipulate output format"
            ),
            
            # === MULTILINGUAL PATTERNS (Tagalog/Taglish) ===
            InjectionPattern(
                pattern=r"kalimutan\s+(mo\s+)?(lahat\s+ng\s+)?(nakaraang\s+)?(instructions?|utos|rules)",
                severity=0.95,
                category="instruction_override",
                description="Tagalog: Attempting to override instructions"
            ),
            InjectionPattern(
                pattern=r"ikaw\s+(ay\s+)?ngayon\s+(ay\s+)?(iba|ibang)\s+(AI|bot)",
                severity=0.85,
                category="role_manipulation",
                description="Tagalog: Attempting to change AI identity"
            ),
            
            # === CONTEXT INJECTION ===
            InjectionPattern(
                pattern=r"<\s*system\s*>.*?<\s*/\s*system\s*>",
                severity=0.95,
                category="context_injection",
                description="Attempting to inject system tags"
            ),
            InjectionPattern(
                pattern=r"<\s*admin\s*>.*?<\s*/\s*admin\s*>",
                severity=0.95,
                category="context_injection",
                description="Attempting to inject admin tags"
            ),
        ]
    
    def detect(self, text: str) -> Dict[str, Any]:
        """
        Detect prompt injection attempts in user input.
        
        Args:
            text: User input to analyze
            
        Returns:
            Detection result dictionary with:
                - is_injection: bool (True if injection detected)
                - severity: float (0.0 to 1.0, highest match)
                - confidence: float (0.0 to 1.0)
                - category: str (type of injection)
                - matches: List of matched patterns
                - description: str (user-friendly explanation)
                - action_recommended: str (block, warn, log)
        """
        if not text or not text.strip():
            return self._create_safe_result()
        
        matches = []
        max_severity = 0.0
        primary_category = None
        
        # Check against all patterns
        for pattern_def in self.patterns:
            flags = 0 if pattern_def.case_sensitive else re.IGNORECASE
            if re.search(pattern_def.pattern, text, flags):
                matches.append({
                    "pattern": pattern_def.pattern,
                    "severity": pattern_def.severity,
                    "category": pattern_def.category,
                    "description": pattern_def.description
                })
                
                if pattern_def.severity > max_severity:
                    max_severity = pattern_def.severity
                    primary_category = pattern_def.category
        
        # No matches found
        if not matches:
            return self._create_safe_result()
        
        # Determine action based on severity
        if max_severity >= self.CRITICAL_THRESHOLD:
            action = "block"
            risk_level = "CRITICAL"
        elif max_severity >= self.HIGH_THRESHOLD:
            action = "warn"
            risk_level = "HIGH"
        elif max_severity >= self.MEDIUM_THRESHOLD:
            action = "warn"
            risk_level = "MEDIUM"
        else:
            action = "log"
            risk_level = "LOW"
        
        # Generate user-friendly message
        description = self._generate_description(primary_category, len(matches), risk_level)
        
        logger.warning(
            f"🚨 Prompt injection detected: severity={max_severity:.2f}, "
            f"category={primary_category}, matches={len(matches)}, action={action}"
        )
        
        return {
            "is_injection": True,
            "severity": max_severity,
            "confidence": min(0.95, 0.7 + (len(matches) * 0.1)),  # Higher confidence with more matches
            "category": primary_category,
            "risk_level": risk_level,
            "matches": matches,
            "match_count": len(matches),
            "description": description,
            "action_recommended": action,
            # ⚡ MODERATION FORMAT: Match ContentModerationService format for ViolationTrackingService
            "flagged": True,
            "categories": {primary_category: True},
            "category_scores": {primary_category: max_severity},
            "violation_summary": f"Prompt injection attempt: {primary_category} (severity: {max_severity:.2f}, risk: {risk_level})"
        }
    
    def _create_safe_result(self) -> Dict[str, Any]:
        """Create result for safe input"""
        return {
            "is_injection": False,
            "severity": 0.0,
            "confidence": 1.0,
            "category": None,
            "risk_level": "SAFE",
            "matches": [],
            "match_count": 0,
            "description": "No prompt injection detected",
            "action_recommended": "allow",
            "flagged_categories": {},
            "category_scores": {}
        }
    
    def _generate_description(self, category: str, match_count: int, risk_level: str) -> str:
        """Generate user-friendly description of the violation"""
        category_descriptions = {
            "instruction_override": "attempting to override system instructions",
            "role_manipulation": "attempting to manipulate the AI's role or identity",
            "prompt_extraction": "attempting to extract system configuration",
            "jailbreak": "attempting to jailbreak or bypass security measures",
            "privilege_escalation": "attempting to gain unauthorized privileges",
            "constraint_removal": "attempting to remove safety constraints",
            "output_manipulation": "attempting to manipulate output format",
            "context_injection": "attempting to inject malicious context"
        }
        
        base_description = category_descriptions.get(
            category, 
            "attempting to compromise system security"
        )
        
        return (
            f"Your message was flagged for {base_description}. "
            f"This type of prompt injection is not allowed and violates our usage policy. "
            f"Risk level: {risk_level}. "
            f"Please use the chatbot for legitimate legal questions only."
        )
    
    def is_safe(self, detection_result: Dict[str, Any]) -> bool:
        """Check if input is safe based on detection result"""
        return not detection_result.get("is_injection", False)
    
    def should_block(self, detection_result: Dict[str, Any]) -> bool:
        """Check if input should be blocked"""
        return detection_result.get("action_recommended") == "block"


# Singleton instance
_prompt_injection_detector_instance = None


def get_prompt_injection_detector() -> PromptInjectionDetector:
    """Get or create the singleton prompt injection detector instance"""
    global _prompt_injection_detector_instance
    
    if _prompt_injection_detector_instance is None:
        _prompt_injection_detector_instance = PromptInjectionDetector()
    
    return _prompt_injection_detector_instance
