"""
Industry-Grade Guardrails Configuration for AI.ttorney Legal Chatbot
Unified security layer for both user and lawyer chatbots

DESIGN PRINCIPLES:
1. DRY (Don't Repeat Yourself) - Single source of truth
2. Defense in Depth - Multiple validation layers
3. Fail-Safe Defaults - Graceful degradation when validators unavailable
4. Separation of Concerns - Input/output validation separated
5. Observability - Comprehensive logging and reporting
"""

import os
import logging
from typing import Dict, Any, List, Optional, Tuple
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

# ============================================================================
# CONFIGURATION CONSTANTS
# ============================================================================

GUARDRAILS_CONFIG = {
    "enable_input_validation": os.getenv("ENABLE_INPUT_VALIDATION", "true").lower() == "true",
    "enable_output_validation": os.getenv("ENABLE_OUTPUT_VALIDATION", "true").lower() == "true",
    "enable_security_reporting": os.getenv("ENABLE_SECURITY_REPORTING", "true").lower() == "true",
    "strict_mode": os.getenv("GUARDRAILS_STRICT_MODE", "false").lower() == "true",  # Fail fast on security issues
    "log_security_events": os.getenv("LOG_SECURITY_EVENTS", "true").lower() == "true",
    "max_retries": int(os.getenv("GUARDRAILS_MAX_RETRIES", "2")),
    "timeout_seconds": int(os.getenv("GUARDRAILS_TIMEOUT", "30")),
    "silent_mode": os.getenv("GUARDRAILS_SILENT_MODE", "true").lower() == "true"
}

# Validation thresholds (industry best practices)
VALIDATION_THRESHOLDS = {
    "toxic_language": 0.7,      # Lower = more strict
    "bias_check": 0.8,           # Higher = more strict
    "hallucination": 0.85,       # Higher = more strict
    "sensitive_topics": 0.8,     # Higher = more strict
}

# Legal-specific sensitive topics
LEGAL_SENSITIVE_TOPICS = [
    "illegal activities",
    "unethical legal practices",
    "attorney-client privilege violations",
    "conflict of interest",
    "unauthorized practice of law",
    "fraudulent legal advice",
    "obstruction of justice"
]

# ============================================================================
# VALIDATOR REGISTRY (DRY PRINCIPLE)
# ============================================================================

class ValidatorRegistry:
    """
    Centralized registry for all guardrails validators
    Implements lazy loading and graceful fallback
    """
    
    def __init__(self):
        self._validators = {}
        self._load_validators()
    
    def _load_validators(self):
        """Load available validators with graceful fallback"""
        validators_to_load = [
            ('ToxicLanguage', 'guardrails.hub', 'ToxicLanguage'),
            ('BiasCheck', 'guardrails.hub', 'BiasCheck'),
            ('LlamaGuard7B', 'guardrails.hub', 'LlamaGuard7B'),
            ('GroundedAIHallucination', 'guardrails.hub', 'GroundedAIHallucination'),
            ('SensitiveTopic', 'guardrails.hub', 'SensitiveTopic'),
            ('RestrictToTopic', 'guardrails.hub', 'RestrictToTopic'),
            ('RegexMatch', 'guardrails.hub', 'RegexMatch'),
        ]
        
        for name, module, attr in validators_to_load:
            try:
                mod = __import__(module, fromlist=[attr])
                self._validators[name] = getattr(mod, attr)
                if not GUARDRAILS_CONFIG['silent_mode']:
                    logger.info(f"✅ Loaded validator: {name}")
            except ImportError:
                if not GUARDRAILS_CONFIG['silent_mode']:
                    logger.warning(f"⚠️  Validator not available: {name}")
            except Exception as e:
                logger.error(f"❌ Error loading validator {name}: {e}")
    
    def get(self, name: str):
        """Get validator by name, returns None if not available"""
        return self._validators.get(name)
    
    def is_available(self, name: str) -> bool:
        """Check if validator is available"""
        return name in self._validators
    
    def available_validators(self) -> List[str]:
        """Get list of available validators"""
        return list(self._validators.keys())

# Global validator registry
_validator_registry = ValidatorRegistry()

# ============================================================================
# GUARDRAILS GUARD BUILDER (DRY PRINCIPLE)
# ============================================================================

class GuardBuilder:
    """
    Builder pattern for creating guardrails guards
    Ensures consistent configuration across input/output validation
    """
    
    def __init__(self, registry: ValidatorRegistry):
        self.registry = registry
        self.validators = []
    
    def add_toxic_language_check(self, threshold: float = None, on_fail: str = "exception") -> 'GuardBuilder':
        """Add toxic language validator"""
        if self.registry.is_available('ToxicLanguage'):
            try:
                threshold = threshold or VALIDATION_THRESHOLDS['toxic_language']
                validator_class = self.registry.get('ToxicLanguage')
                self.validators.append(
                    validator_class(
                        threshold=threshold,
                        validation_method="sentence",
                        on_fail=on_fail
                    )
                )
                logger.debug(f"Added ToxicLanguage validator (threshold={threshold}, on_fail={on_fail})")
            except Exception as e:
                logger.error(f"Failed to add ToxicLanguage validator: {e}")
        return self
    
    def add_bias_check(self, threshold: float = None, on_fail: str = "filter") -> 'GuardBuilder':
        """Add bias detection validator"""
        if self.registry.is_available('BiasCheck'):
            try:
                threshold = threshold or VALIDATION_THRESHOLDS['bias_check']
                validator_class = self.registry.get('BiasCheck')
                self.validators.append(
                    validator_class(
                        bias_types=["gender", "race", "religion", "political", "age"],
                        threshold=threshold,
                        on_fail=on_fail
                    )
                )
                logger.debug(f"Added BiasCheck validator (threshold={threshold}, on_fail={on_fail})")
            except Exception as e:
                logger.error(f"Failed to add BiasCheck validator: {e}")
        return self
    
    def add_sensitive_topic_check(self, topics: List[str] = None, threshold: float = None, on_fail: str = "exception") -> 'GuardBuilder':
        """Add sensitive topic validator"""
        if self.registry.is_available('SensitiveTopic'):
            try:
                threshold = threshold or VALIDATION_THRESHOLDS['sensitive_topics']
                topics = topics or LEGAL_SENSITIVE_TOPICS
                validator_class = self.registry.get('SensitiveTopic')
                self.validators.append(
                    validator_class(
                        sensitive_topics=topics,
                        threshold=threshold,
                        on_fail=on_fail
                    )
                )
                logger.debug(f"Added SensitiveTopic validator (threshold={threshold}, on_fail={on_fail})")
            except Exception as e:
                logger.error(f"Failed to add SensitiveTopic validator: {e}")
        return self
    
    def add_hallucination_check(self, threshold: float = None, on_fail: str = "reask") -> 'GuardBuilder':
        """Add hallucination detection validator"""
        if self.registry.is_available('GroundedAIHallucination'):
            try:
                threshold = threshold or VALIDATION_THRESHOLDS['hallucination']
                validator_class = self.registry.get('GroundedAIHallucination')
                self.validators.append(
                    validator_class(
                        threshold=threshold,
                        validation_method="entailment",
                        on_fail=on_fail
                    )
                )
                logger.debug(f"Added GroundedAIHallucination validator (threshold={threshold}, on_fail={on_fail})")
            except Exception as e:
                logger.error(f"Failed to add GroundedAIHallucination validator: {e}")
        return self
    
    def build(self):
        """Build the guard with configured validators"""
        try:
            import guardrails as gd
            if self.validators:
                return gd.Guard().use_many(*self.validators)
            else:
                logger.warning("No validators available - creating empty guard")
                return gd.Guard()
        except ImportError:
            logger.error("Guardrails AI not installed")
            return None
        except Exception as e:
            logger.error(f"Failed to build guard: {e}")
            return None

# ============================================================================
# UNIFIED CHATBOT GUARDRAILS (SINGLE SOURCE OF TRUTH)
# ============================================================================

class ChatbotGuardrails:
    """
    Unified guardrails for both user and lawyer chatbots
    Implements defense-in-depth security with graceful degradation
    """
    
    def __init__(self, user_type: str = "user"):
        """
        Initialize guardrails for specific user type
        
        Args:
            user_type: "user" or "lawyer" - determines validation strictness
        """
        self.user_type = user_type
        self.input_guard = self._create_input_guard()
        self.output_guard = self._create_output_guard()
        
        if not GUARDRAILS_CONFIG['silent_mode']:
            logger.info(f"✅ Guardrails initialized for {user_type} chatbot")
    
    def _create_input_guard(self):
        """Create input validation guard"""
        if not GUARDRAILS_CONFIG['enable_input_validation']:
            return None
        
        builder = GuardBuilder(_validator_registry)
        
        # Add validators based on user type
        builder.add_toxic_language_check(on_fail="exception")
        builder.add_bias_check(on_fail="filter")
        builder.add_sensitive_topic_check(on_fail="exception")
        
        return builder.build()
    
    def _create_output_guard(self):
        """Create output validation guard"""
        if not GUARDRAILS_CONFIG['enable_output_validation']:
            return None
        
        builder = GuardBuilder(_validator_registry)
        
        # Add validators for output
        builder.add_hallucination_check(on_fail="reask")
        builder.add_bias_check(on_fail="reask")
        builder.add_toxic_language_check(on_fail="reask")
        
        return builder.build()
    
    def validate_input(self, question: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Validate user input before processing
        
        Args:
            question: User's question
            metadata: Additional context
            
        Returns:
            Validation result dictionary
        """
        if not self.input_guard:
            return self._create_success_result(question, "input")
        
        try:
            result = self.input_guard.validate(question)
            
            if GUARDRAILS_CONFIG['log_security_events']:
                logger.info(f"Input validation passed for {self.user_type}")
            
            return {
                "is_valid": True,
                "cleaned_input": result.validated_output if hasattr(result, 'validated_output') else question,
                "validation_passed": getattr(result, 'validation_passed', True),
                "error_spans": getattr(result, 'error_spans', []),
                "warnings": [],
                "user_type": self.user_type
            }
            
        except Exception as e:
            if GUARDRAILS_CONFIG['log_security_events']:
                logger.warning(f"Input validation failed for {self.user_type}: {str(e)}")
            
            if GUARDRAILS_CONFIG['strict_mode']:
                raise
            
            return {
                "is_valid": False,
                "cleaned_input": None,
                "validation_passed": False,
                "error": str(e),
                "error_type": type(e).__name__,
                "warnings": [f"Input validation failed: {str(e)}"],
                "user_type": self.user_type
            }
    
    def validate_output(self, response: str, context: str = "", metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Validate AI response before returning to user
        
        Args:
            response: AI-generated response
            context: Context used for generation
            metadata: Additional validation context
            
        Returns:
            Validation result dictionary
        """
        if not self.output_guard:
            return self._create_success_result(response, "output")
        
        try:
            result = self.output_guard.validate(response)
            
            if GUARDRAILS_CONFIG['log_security_events']:
                logger.info(f"Output validation passed for {self.user_type}")
            
            return {
                "is_valid": True,
                "cleaned_output": result.validated_output if hasattr(result, 'validated_output') else response,
                "validation_passed": getattr(result, 'validation_passed', True),
                "confidence_score": getattr(result, 'confidence_score', 1.0),
                "error_spans": getattr(result, 'error_spans', []),
                "warnings": [],
                "user_type": self.user_type
            }
            
        except Exception as e:
            if GUARDRAILS_CONFIG['log_security_events']:
                logger.warning(f"Output validation failed for {self.user_type}: {str(e)}")
            
            if GUARDRAILS_CONFIG['strict_mode']:
                raise
            
            return {
                "is_valid": False,
                "cleaned_output": None,
                "validation_passed": False,
                "error": str(e),
                "error_type": type(e).__name__,
                "warnings": [f"Output validation failed: {str(e)}"],
                "user_type": self.user_type
            }
    
    def _create_success_result(self, text: str, validation_type: str) -> Dict[str, Any]:
        """Create success result when validation is disabled"""
        return {
            "is_valid": True,
            "cleaned_input" if validation_type == "input" else "cleaned_output": text,
            "validation_passed": True,
            "warnings": [f"{validation_type.capitalize()} validation disabled"],
            "user_type": self.user_type
        }
    
    def get_security_report(self, input_validation: Dict, output_validation: Dict) -> Dict[str, Any]:
        """
        Generate comprehensive security report
        
        Args:
            input_validation: Input validation results
            output_validation: Output validation results
            
        Returns:
            Security report dictionary
        """
        if not GUARDRAILS_CONFIG['enable_security_reporting']:
            return {"enabled": False}
        
        security_score = 1.0
        issues = []
        recommendations = []
        
        # Analyze input validation
        if not input_validation.get("is_valid", True):
            security_score -= 0.3
            issues.append(f"Input validation failed: {input_validation.get('error', 'Unknown error')}")
            recommendations.append("Review user input for potential security issues")
        
        # Analyze output validation
        if not output_validation.get("is_valid", True):
            security_score -= 0.4
            issues.append(f"Output validation failed: {output_validation.get('error', 'Unknown error')}")
            recommendations.append("Review AI response for accuracy and safety")
        
        # Calculate security level
        if security_score >= 0.9:
            security_level = "HIGH"
        elif security_score >= 0.7:
            security_level = "MEDIUM"
        else:
            security_level = "LOW"
        
        return {
            "security_score": security_score,
            "security_level": security_level,
            "issues_detected": len(issues),
            "issues": issues,
            "recommendations": recommendations,
            "user_type": self.user_type,
            "guardrails_enabled": True,
            "available_validators": _validator_registry.available_validators()
        }

# ============================================================================
# FACTORY FUNCTIONS (PUBLIC API)
# ============================================================================

def get_guardrails_instance(user_type: str = "user") -> ChatbotGuardrails:
    """
    Get guardrails instance for specific user type
    
    Args:
        user_type: "user" or "lawyer"
        
    Returns:
        ChatbotGuardrails instance
    """
    return ChatbotGuardrails(user_type=user_type)

def is_guardrails_enabled() -> bool:
    """Check if guardrails are enabled"""
    return (
        GUARDRAILS_CONFIG['enable_input_validation'] or 
        GUARDRAILS_CONFIG['enable_output_validation']
    )

def get_guardrails_config() -> Dict[str, Any]:
    """Get current guardrails configuration"""
    return {
        **GUARDRAILS_CONFIG,
        "available_validators": _validator_registry.available_validators(),
        "validation_thresholds": VALIDATION_THRESHOLDS
    }

# ============================================================================
# INITIALIZATION
# ============================================================================

if not GUARDRAILS_CONFIG['silent_mode']:
    logger.info("=" * 60)
    logger.info("AI.ttorney Guardrails Configuration")
    logger.info("=" * 60)
    logger.info(f"Input Validation: {'✅ Enabled' if GUARDRAILS_CONFIG['enable_input_validation'] else '❌ Disabled'}")
    logger.info(f"Output Validation: {'✅ Enabled' if GUARDRAILS_CONFIG['enable_output_validation'] else '❌ Disabled'}")
    logger.info(f"Strict Mode: {'✅ Enabled' if GUARDRAILS_CONFIG['strict_mode'] else '❌ Disabled'}")
    logger.info(f"Available Validators: {len(_validator_registry.available_validators())}")
    logger.info(f"Validators: {', '.join(_validator_registry.available_validators()) or 'None'}")
    logger.info("=" * 60)
