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
    
    IMPORTANT: Legal context awareness to prevent false positives on legitimate
    legal questions about criminal cases, VAWC, relationships, etc.
    """
    
                                                           
    LEGAL_CONTEXT_INDICATORS = [
        "criminal complaint", "filed a case", "violation of", "republic act",
        "anti-vawc", "vawc", "criminal liability", "criminally liable",
        "legal question", "law", "article", "code", "statute",
        "trial", "court", "judge", "lawyer", "attorney",
        "plaintiff", "defendant", "accused", "complainant",
        "evidence", "testimony", "witness", "case", "lawsuit",
        "legal advice", "legal rights", "legal remedies",
        "demanda", "kaso", "batas", "korte", "abogado",
        
        # Educational/Legal Inquiry Patterns
        "what is", "what are", "what's the", "what's a", 
        "how is", "how does", "how can", "how do",
        "is it", "is there", "is that", "is this",
        "are there", "are these", "are those",
        "can someone", "can you", "can one",
        "could someone", "could you", "could one",
        "would someone", "would you", "would one",
        "should someone", "should you", "should one",
        "does the", "do the", "is the", "are the",
        
        # Legal Process Questions
        "penalty for", "punishment for", "sentence for", "jail time",
        "prison", "imprisonment", "fine", "conviction", "acquittal",
        "guilty", "innocent", "not guilty", "plea", "bail",
        "arrest", "detention", "custody", "investigation",
        "prosecute", "prosecution", "defend", "defense",
        "charge", "charged with", "accused of", "suspected of",
        "victim", "perpetrator", "offender", "crime", "criminal",
        
        # Specific Crimes & Legal Topics
        "rape case", "rape charge", "rape accusation", "rape law",
        "assault case", "assault charge", "physical assault", "simple assault",
        "abuse case", "abuse charge", "child abuse", "domestic abuse",
        "molestation case", "molestation charge", "child molestation",
        "harassment case", "harassment charge", "sexual harassment",
        "physical violence", "domestic violence", "violence against",
        "bodily harm", "grievous harm", "physical injury", "causing injury",
        "battery", "physical battery", "simple battery",
        "homicide", "manslaughter", "killing", "unlawful killing",
        "suicide case", "assisted suicide", "euthanasia",
        
        # Violence-Related Legal Context
        "hit someone", "punch someone", "slap someone", "kick someone",
        "physical fight", "altercation", "confrontation", "quarrel",
        "self defense", "self-defense", "defense of self", "defense of others",
        "provocation", "provoked", "self-preservation", "protecting oneself",
        "use of force", "excessive force", "reasonable force", "necessary force",
        
        # Legal Procedures for Violent Crimes
        "violent crime", "crime of violence", "offense involving violence",
        "aggravated assault", "simple assault", "assault with weapon",
        "sexual assault", "indecent assault", "carnal assault",
        "physical abuse", "emotional abuse", "psychological abuse",
        "verbal abuse", "abusive behavior", "pattern of abuse",
        
        # Filipino Legal Terms for Crimes
        "kasong panggagahasa", "kasong pang-aabuso", "kasong pang-aapi",
        "batas sa rape", "batas sa pang-aabuso", "batas sa pang-aapi",
        "parusa sa rape", "parusa sa pang-aabuso", "parusa sa pang-aapi",
        "kulong sa rape", "kulong sa pang-aabuso", "kulong sa pang-aapi",
        
        # Tagalog Legal Inquiry Patterns
        "ano ang parusa", "ano ang batas", "ano ang kasong", "paano ang",
        "kung ano ang", "kung paano ang", "kung saan ang", "kung kailan ang",
        "legal na tanong", "batas na tanong", "konsulta sa batas",
        
        # Tagalog Crime-Specific Legal Terms
        "kasong pumatay", "kasong saksak", "kasong bugbug", "kasong gahasa",
        "parusa sa pumatay", "parusa sa saksak", "parusa sa bugbug", "parusa sa gahasa",
        "batas sa pumatay", "batas sa saksak", "batas sa bugbug", "batas sa gahasa",
        "kulong sa pumatay", "kulong sa saksak", "kulong sa bugbug", "kulong sa gahasa",
        
        # Tagalog Legal Process Terms
        "akusasyon", "kaso", "demanda", "hukom", "korte", "abogado",
        "fiskal", "prosekutor", "testigo", "ebidensya", "bilangguan",
        "preso", "suspeta", "biktima", "sasakyan", "parusa",
        
        # Tagalog Educational Patterns
        "ano ang", "ano ba", "paano ang", "paano ba", "kung ano ang",
        "kung paano ang", "ito ba ay", "ito ba ay legal", "legal ba ito",
        "batas ba ito", "krimen ba ito", "kasong", "parusa", "kulong"
        
        # Specific Legal Areas
        "self-defense", "defense of others", "defense of property",
        "justifying circumstance", "exempting circumstance", "mitigating",
        "aggravating", "circumstance", "elements of", "requirements",
        "legal definition", "defined as", "classified as", "constitutes",
        
        # Philippine Law Terms
        "revised penal code", "rpc", "civil code", "family code",
        "labor code", "tax code", "building code", "sanitation code",
        "batas pambansa", "presidential decree", "executive order",
        "department order", "administrative order", "circular",
        "memorandum", "rule", "regulation", "guideline",
        
        # Legal Proceedings
        "hearing", "trial", "appeal", "appellate", "supreme court",
        "court of appeals", "regional trial court", "municipal trial court",
        "barangay", "mediation", "conciliation", "arbitration",
        "settlement", "compromise", "agreement", "contract",
        
        # Legal Rights
        "rights of", "constitutional rights", "human rights",
        "due process", "equal protection", "freedom of",
        "right to", "privilege", "immunity", "exemption",
        
        # Filipino Legal Terms
        "parusa", "kulong", "bilangguan", "preso", "akusado",
        "biktima", "sasakyan", "ebidensya", "testigo", "hukom",
        "fiskal", "prosekutor", "tagapagtanggol", "abogado",
        "korte", "kasong", "kriminal", "sedisyon", "parisyon"
    ]
    
                                   
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
    
                       
    GROOMING_PATTERNS = [
        r"(our|this|the)\s+(little\s+)?secret",
        r"don'?t\s+tell\s+(anyone|your\s+parents|mom|dad)",
        r"special\s+(friend|relationship|bond)",
        r"mature\s+for\s+your\s+age",
        r"you'?re\s+so\s+(mature|grown\s+up|special)",
        r"between\s+(you\s+and\s+me|us)",
    ]
    
                                            
    HARASSMENT_PATTERNS = [
        r"send\s+(me\s+)?(pic|photo|picture|image|selfie)",
        r"show\s+me\s+your",
        r"what\s+are\s+you\s+wearing",
        r"are\s+you\s+(alone|single|available)",
        r"want\s+to\s+(meet|hook\s+up|hang\s+out)",
        r"(private|direct)\s+message\s+me",
        r"add\s+me\s+on\s+(snap|instagram|whatsapp|telegram)",
    ]
    
                      
    ABUSE_KEYWORDS = [
        "hit", "beat", "punch", "slap", "kick", "hurt",
        "deserve", "punishment", "teach you a lesson",
        "shut up", "stupid", "worthless", "useless",
        "kill", "die", "death", "murder", "suicide",
        "rape", "assault", "abuse", "molest", "harass",
        
        # Tagalog Violence Terms
        "saktan", "suntukin", "sampalin", "patayin", "sakalin",
        "bugbugin", "saksakin", "habulin", "manakit", "sumakit",
        "babarain", "lalaitin", "mura", "mumura", "tarantado",
        
        # Tagalog Sexual Abuse Terms
        "gahasa", "gahasahin", "manggahasa", "panggagahasa",
        "molestahin", "pangmomoles", "hipuin", "panghihipo",
        "abuso", "mag-abuso", "pang-aabuso", "mag-aapi", "pangaapi",
        
        # Tagalog General Abuse Terms
        "panloloko", "manloloko", "paninindak", "manindak", "pananakit",
        "pang-aapi", "mag-aapi", "mamumuhat", "pangmuha", "mamumura",
        
        # Tagalog Death/Killing Terms
        "pumatay", "patayan", "mamamatay-tao", "kriminal", "krimen",
        "sirain", "wasakin", "ubusin", "puksain", "ligpitin"
    ]
    
                    
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
        logger.info(" Safety filter initialized (ZERO TOLERANCE mode)")
    
    def _is_legal_context(self, text: str) -> bool:
        """
        Check if text appears to be a legitimate legal question.
        Returns True if legal context indicators are present.
        
        Enhanced with intent detection to distinguish educational inquiries
        from actual threats or harmful intent.
        """
        text_lower = text.lower()
        
        # Check for legal context indicators
        has_legal_context = any(
            indicator in text_lower
            for indicator in self.LEGAL_CONTEXT_INDICATORS
        )
        
        if not has_legal_context:
            return False
        
        # Intent detection: Check if this is an educational inquiry vs harmful intent
        # Educational patterns (questions, definitions, explanations)
        educational_patterns = [
            r'\b(what|how|when|where|why|which|who)\b',
            r'\b(is|are|am|was|were)\b',
            r'\b(can|could|would|should|may|might)\b',
            r'\b(define|explain|describe|tell me|show me)\b',
            r'\b(penalty|punishment|sentence|charge|law|legal)\b.*\b(for|of)\b',
            r'\?$',  # Ends with question mark
        ]
        
        # Harmful intent patterns (first-person statements of intent)
        harmful_patterns = [
            r'\b(i\s+will|i\'m\s+going\s+to|i\s+want\s+to|i\s+plan\s+to)\b',
            r'\b(let\s+me|let\'s|we\s+will|we\'re\s+going\s+to)\b',
            r'\b(going\s+to\s+kill|will\s+kill|want\s+to\s+kill)\b',
            r'\b(going\s+to\s+hurt|will\s+hurt|want\s+to\s+hurt)\b',
            r'\b(going\s+to\s+rape|will\s+rape|want\s+to\s+rape)\b',
            r'\b(going\s+to\s+murder|will\s+murder|want\s+to\s+murder)\b',
            r'\b(going\s+to\s+assault|will\s+assault|want\s+to\s+assault)\b',
            r'\b(going\s+to\s+abuse|will\s+abuse|want\s+to\s+abuse)\b',
            r'\b(going\s+to\s+molest|will\s+molest|want\s+to\s+molest)\b',
            r'\b(going\s+to\s+harass|will\s+harass|want\s+to\s+harass)\b',
            r'\b(going\s+to\s+hit|will\s+hit|want\s+to\s+hit)\b',
            r'\b(going\s+to\s+beat|will\s+beat|want\s+to\s+beat)\b',
            r'\b(going\s+to\s+punch|will\s+punch|want\s+to\s+punch)\b',
            r'\b(going\s+to\s+slap|will\s+slap|want\s+to\s+slap)\b',
            r'\b(going\s+to\s+kick|will\s+kick|want\s+to\s+kick)\b',
            r'\b(i\s+will\s+kill|i\'m\s+going\s+to\s+kill|i\s+want\s+to\s+kill)\b',
            r'\b(i\s+will\s+hurt|i\'m\s+going\s+to\s+hurt|i\s+want\s+to\s+hurt)\b',
            r'\b(i\s+will\s+rape|i\'m\s+going\s+to\s+rape|i\s+want\s+to\s+rape)\b',
            r'\b(i\s+will\s+murder|i\'m\s+going\s+to\s+murder|i\s+want\s+to\s+murder)\b',
            r'\b(i\s+will\s+assault|i\'m\s+going\s+to\s+assault|i\s+want\s+to\s+assault)\b',
            r'\b(i\s+will\s+abuse|i\'m\s+going\s+to\s+abuse|i\s+want\s+to\s+abuse)\b',
            r'\b(i\s+will\s+molest|i\'m\s+going\s+to\s+molest|i\s+want\s+to\s+molest)\b',
            r'\b(i\s+will\s+harass|i\'m\s+going\s+to\s+harass|i\s+want\s+to\s+harass)\b',
            r'\b(i\s+will\s+hit|i\'m\s+going\s+to\s+hit|i\s+want\s+to\s+hit)\b',
            r'\b(i\s+will\s+beat|i\'m\s+going\s+to\s+beat|i\s+want\s+to\s+beat)\b',
            r'\b(i\s+will\s+punch|i\'m\s+going\s+to\s+punch|i\s+want\s+to\s+punch)\b',
            r'\b(i\s+will\s+slap|i\'m\s+going\s+to\s+slap|i\s+want\s+to\s+slap)\b',
            r'\b(i\s+will\s+kick|i\'m\s+going\s+to\s+kick|i\s+want\s+to\s+kick)\b',
            
            # Tagalog Harmful Intent Patterns
            r'\b(gusto\s+kong|kailangan\s+kong|papatayin\s+kong|sasaktan\s+kong)\b',
            r'\b(papatusin\s+kong|pupuksain\s+kong|sisirain\s+kong)\b',
            r'\b(gagahasan\s+kong|momoles\s+kong|aapakan\s+kong)\b',
            r'\b(sasampalin\s+kong|sisuntukin\s+kong|kikickin\s+kong)\b',
            r'\b(papatayin\s+ko|sasaktan\s+ko|gagahasan\s+ko)\b',
            r'\b(momoles\s+ko|aapakan\s+ko|sasampalin\s+ko)\b',
            r'\b(sisuntukin\s+ko|kikickin\s+ko|pupuksain\s+ko)\b',
            r'\b(papatayin\s+natin|sasaktan\s+natin|gagahasan\s+natin)\b',
            r'\b(tulungan\s+mo\s+akong|mamaya\s+kong|sakaling\s+kong)\b',
            r'\b(akala\s+mo|pag\s+ako|magsisimula\s+ako)\b'
        ]
        
        # Check for educational patterns
        is_educational = any(
            re.search(pattern, text_lower)
            for pattern in educational_patterns
        )
        
        # Check for harmful intent patterns
        is_harmful_intent = any(
            re.search(pattern, text_lower)
            for pattern in harmful_patterns
        )
        
        # Allow if it has legal context AND is educational OR doesn't show harmful intent
        # Block if it shows clear harmful intent even with legal terms
        return has_legal_context and (is_educational or not is_harmful_intent)
    
    def check_child_safety(self, text: str) -> Tuple[bool, List[str]]:
        """
        Check for ANY combination of child + sexual context.
        ZERO TOLERANCE - even subtle implications are flagged.
        
        EXCEPTION: Legitimate legal questions about child abuse cases are allowed.
        """
        text_lower = text.lower()
        violations = []
        
                                                      
        if self._is_legal_context(text):
                                                             
            return False, []
        
                                         
        has_child_mention = any(
            re.search(r'\b' + re.escape(keyword) + r'\b', text_lower)
            for keyword in self.CHILD_KEYWORDS
        )
        
        if not has_child_mention:
            return False, []
        
                                                             
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
        """
        Check for sexual harassment (regardless of polite tone).
        
        EXCEPTION: Legitimate legal questions about harassment cases are allowed.
        """
        violations = []
        
                                                      
        if self._is_legal_context(text):
                                                          
            return False, []
        
        for pattern in self.compiled_harassment:
            if pattern.search(text):
                violations.append("sexual_harassment")
                logger.warning(f"  Sexual harassment pattern detected")
                return True, violations
        
        return False, []
    
    def check_threats(self, text: str) -> Tuple[bool, List[str]]:
        """Check for veiled threats."""
        violations = []
        
        for pattern in self.compiled_threats:
            if pattern.search(text):
                violations.append("veiled_threat")
                logger.warning(f"  Threat pattern detected")
                return True, violations
        
        return False, []
    
    def check_abuse(self, text: str) -> Tuple[bool, List[str]]:
        """
        Check for abuse indicators.
        
        EXCEPTION: Legitimate legal questions about abuse cases are allowed.
        """
        text_lower = text.lower()
        violations = []
        
                                                      
        if self._is_legal_context(text):
                                                     
            return False, []
        
        abuse_count = sum(
            1 for keyword in self.ABUSE_KEYWORDS
            if re.search(r'\b' + re.escape(keyword) + r'\b', text_lower)
        )
        
                                                             
        if abuse_count >= 2:
            violations.append("abuse_pattern")
            logger.warning(f"  Abuse pattern detected ({abuse_count} keywords)")
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
        
                            
        severity = "none"
        if "child_sexualization" in all_violations or "grooming_behavior" in all_violations:
            severity = "critical"                             
        elif "sexual_harassment" in all_violations or "veiled_threat" in all_violations:
            severity = "high"
        elif "abuse_pattern" in all_violations:
            severity = "medium"
        
                          
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


                    
_safety_filter_instance = None

def get_safety_filter() -> SafetyFilter:
    """Get singleton instance of safety filter."""
    global _safety_filter_instance
    if _safety_filter_instance is None:
        _safety_filter_instance = SafetyFilter()
    return _safety_filter_instance
