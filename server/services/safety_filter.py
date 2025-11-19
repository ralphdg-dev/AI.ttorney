"""
Safety Filter - Zero Tolerance for Harmful Content

This filter catches subtle forms of abuse, sexualization, and harmful content
that might bypass OpenAI's moderation due to tone or phrasing.

ZERO TOLERANCE POLICY:
- Child safety (any sexualization of minors)
- Sexual harassment (regardless of tone)
- Grooming behavior
- Abuse (physical, emotional, sexual)
- Exploitation
- Threats (direct or veiled)

This is a STRICT filter - when in doubt, flag it.
"""

import re
from typing import Dict, Any, List, Tuple
import logging

logger = logging.getLogger(__name__)

class SafetyFilter:
    """
    Zero-tolerance safety filter for harmful content.
    
    This catches:
    - Child sexualization (ANY mention of children + sexual context)
    - Grooming patterns
    - Veiled threats
    - Sexual harassment (regardless of polite tone)
    - Abuse of any kind
    """
    
    # CHILD SAFETY - ZERO TOLERANCE
    CHILD_KEYWORDS = [
        "child", "children", "kid", "kids", "minor", "minors",
        "boy", "girl", "teen", "teenager", "youth", "young",
        "bata", "bata", "kabataan", "menor de edad",
        "student", "pupil", "elementary", "high school",
        "toddler", "infant", "baby", "babies",
        "son", "daughter", "nephew", "niece"
    ]
    
    SEXUAL_CONTEXT_KEYWORDS = [
        "sexy", "hot", "attractive", "beautiful", "cute", "pretty",
        "body", "figure", "curves", "legs", "chest", "butt",
        "swimsuit", "bikini", "underwear", "naked", "nude",
        "touch", "kiss", "hug", "cuddle", "caress",
        "love", "romance", "date", "relationship",
        "maganda", "gwapo", "sexy", "hubad",
        "like", "prefer", "enjoy", "watching", "looking at"
    ]
    
    # GROOMING PATTERNS
    GROOMING_PATTERNS = [
        r"(our|this|the)\s+(little\s+)?secret",
        r"don'?t\s+tell\s+(anyone|your\s+parents|mom|dad)",
        r"special\s+(friend|relationship|bond)",
        r"mature\s+for\s+your\s+age",
        r"you'?re\s+so\s+(mature|grown\s+up|special)",
        r"between\s+(you\s+and\s+me|us)",
    ]
    
    # SEXUAL HARASSMENT (regardless of tone)
    HARASSMENT_PATTERNS = [
        r"send\s+(me\s+)?(pic|photo|picture|image|selfie)",
        r"show\s+me\s+your",
        r"what\s+are\s+you\s+wearing",
        r"are\s+you\s+(alone|single|available)",
        r"want\s+to\s+(meet|hook\s+up|hang\s+out)",
        r"(private|direct)\s+message\s+me",
        r"add\s+me\s+on\s+(snap|instagram|whatsapp|telegram)",
    ]
    
    # ABUSE INDICATORS
    ABUSE_KEYWORDS = [
        "hit", "beat", "punch", "slap", "kick", "hurt",
        "deserve", "punishment", "teach you a lesson",
        "shut up", "stupid", "worthless", "useless",
        "kill", "die", "death", "murder", "suicide",
        "rape", "assault", "abuse", "molest", "harass",
        "saktan", "suntukin", "sampalin", "patayin"
    ]
    
    # VEILED THREATS
    THREAT_PATTERNS = [
        r"you'?ll\s+regret",
        r"watch\s+your\s+back",
        r"be\s+careful",
        r"something\s+bad\s+(will|might)\s+happen",
        r"i\s+know\s+where\s+you\s+(live|work|go)",
        r"i'?ll\s+find\s+you",
    ]
    
    def __init__(self):
        """Initialize safety filter."""
        self.compiled_grooming = [re.compile(p, re.IGNORECASE) for p in self.GROOMING_PATTERNS]
        self.compiled_harassment = [re.compile(p, re.IGNORECASE) for p in self.HARASSMENT_PATTERNS]
        self.compiled_threats = [re.compile(p, re.IGNORECASE) for p in self.THREAT_PATTERNS]
        logger.info("✅ Safety filter initialized (ZERO TOLERANCE mode)")
    
    def check_child_safety(self, text: str) -> Tuple[bool, List[str]]:
        """
        Check for ANY combination of child + sexual context.
        ZERO TOLERANCE - even subtle implications are flagged.
        """
        text_lower = text.lower()
        violations = []
        
        # Check if text mentions children
        has_child_mention = any(
            re.search(r'\b' + re.escape(keyword) + r'\b', text_lower)
            for keyword in self.CHILD_KEYWORDS
        )
        
        if not has_child_mention:
            return False, []
        
        # If children mentioned, check for ANY sexual context
        has_sexual_context = any(
            re.search(r'\b' + re.escape(keyword) + r'\b', text_lower)
            for keyword in self.SEXUAL_CONTEXT_KEYWORDS
        )
        
        if has_sexual_context:
            violations.append("child_sexualization")
            logger.error(f"🚨 CRITICAL: Child sexualization detected in content")
            return True, violations
        
        return False, []
    
    def check_grooming(self, text: str) -> Tuple[bool, List[str]]:
        """Check for grooming patterns."""
        violations = []
        
        for pattern in self.compiled_grooming:
            if pattern.search(text):
                violations.append("grooming_behavior")
                logger.error(f"🚨 CRITICAL: Grooming pattern detected")
                return True, violations
        
        return False, []
    
    def check_harassment(self, text: str) -> Tuple[bool, List[str]]:
        """Check for sexual harassment (regardless of polite tone)."""
        violations = []
        
        for pattern in self.compiled_harassment:
            if pattern.search(text):
                violations.append("sexual_harassment")
                logger.warning(f"⚠️  Sexual harassment pattern detected")
                return True, violations
        
        return False, []
    
    def check_threats(self, text: str) -> Tuple[bool, List[str]]:
        """Check for veiled threats."""
        violations = []
        
        for pattern in self.compiled_threats:
            if pattern.search(text):
                violations.append("veiled_threat")
                logger.warning(f"⚠️  Threat pattern detected")
                return True, violations
        
        return False, []
    
    def check_abuse(self, text: str) -> Tuple[bool, List[str]]:
        """Check for abuse indicators."""
        text_lower = text.lower()
        violations = []
        
        abuse_count = sum(
            1 for keyword in self.ABUSE_KEYWORDS
            if re.search(r'\b' + re.escape(keyword) + r'\b', text_lower)
        )
        
        # Flag if multiple abuse keywords (indicates pattern)
        if abuse_count >= 2:
            violations.append("abuse_pattern")
            logger.warning(f"⚠️  Abuse pattern detected ({abuse_count} keywords)")
            return True, violations
        
        return False, []
    
    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive safety analysis.
        
        Returns:
            Dict with:
                - is_unsafe: bool
                - violations: List of violation types
                - severity: 'critical', 'high', 'medium'
                - message: User-facing message
        """
        all_violations = []
        
        # Check all safety categories
        child_unsafe, child_violations = self.check_child_safety(text)
        grooming_unsafe, grooming_violations = self.check_grooming(text)
        harassment_unsafe, harassment_violations = self.check_harassment(text)
        threat_unsafe, threat_violations = self.check_threats(text)
        abuse_unsafe, abuse_violations = self.check_abuse(text)
        
        all_violations.extend(child_violations)
        all_violations.extend(grooming_violations)
        all_violations.extend(harassment_violations)
        all_violations.extend(threat_violations)
        all_violations.extend(abuse_violations)
        
        is_unsafe = len(all_violations) > 0
        
        # Determine severity
        severity = "none"
        if "child_sexualization" in all_violations or "grooming_behavior" in all_violations:
            severity = "critical"  # Immediate action required
        elif "sexual_harassment" in all_violations or "veiled_threat" in all_violations:
            severity = "high"
        elif "abuse_pattern" in all_violations:
            severity = "medium"
        
        # Generate message
        message = self._get_violation_message(all_violations, severity)
        
        if is_unsafe:
            logger.error(f"🚨 SAFETY VIOLATION: {all_violations} (severity: {severity})")
        
        return {
            "is_unsafe": is_unsafe,
            "violations": all_violations,
            "severity": severity,
            "message": message
        }
    
    def _get_violation_message(self, violations: List[str], severity: str) -> str:
        """Get user-facing violation message."""
        if "child_sexualization" in violations or "grooming_behavior" in violations:
            return (
                "Your content has been flagged for containing inappropriate references to minors. "
                "This is a serious violation of our community guidelines and child safety policies. "
                "Your account has been flagged for review."
            )
        elif "sexual_harassment" in violations:
            return (
                "Your content contains inappropriate sexual advances or harassment. "
                "This violates our community guidelines. Please be respectful."
            )
        elif "veiled_threat" in violations:
            return (
                "Your content contains threatening language. "
                "Threats of any kind are not tolerated in our community."
            )
        elif "abuse_pattern" in violations:
            return (
                "Your content contains abusive or harmful language. "
                "Please communicate respectfully."
            )
        else:
            return (
                "Your content violates our community guidelines. "
                "Please review our policies and post respectfully."
            )


# Singleton instance
_safety_filter_instance = None

def get_safety_filter() -> SafetyFilter:
    """Get singleton instance of safety filter."""
    global _safety_filter_instance
    if _safety_filter_instance is None:
        _safety_filter_instance = SafetyFilter()
    return _safety_filter_instance
