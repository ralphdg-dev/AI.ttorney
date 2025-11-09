import os
import logging
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from functools import lru_cache

logging.basicConfig(level=logging.CRITICAL, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
logger.setLevel(logging.CRITICAL)

load_dotenv()

_ENV_BOOL = lambda k, d: os.getenv(k, d).lower() == "true"
_ENV_INT = lambda k, d: int(os.getenv(k, d))

GUARDRAILS_CONFIG = {
    "enable_input_validation": _ENV_BOOL("ENABLE_INPUT_VALIDATION", "true"),
    "enable_output_validation": _ENV_BOOL("ENABLE_OUTPUT_VALIDATION", "true"),
    "enable_security_reporting": _ENV_BOOL("ENABLE_SECURITY_REPORTING", "true"),
    "strict_mode": _ENV_BOOL("GUARDRAILS_STRICT_MODE", "false"),
    "log_security_events": _ENV_BOOL("LOG_SECURITY_EVENTS", "false"),
    "max_retries": _ENV_INT("GUARDRAILS_MAX_RETRIES", "1"),
    "timeout_seconds": _ENV_INT("GUARDRAILS_TIMEOUT", "20"),
    "silent_mode": _ENV_BOOL("GUARDRAILS_SILENT_MODE", "true")
}

VALIDATION_THRESHOLDS = {
    "toxic_language": 0.7,
    "bias_check": 0.8,
    "hallucination": 0.85,
    "sensitive_topics": 0.8,
}

LEGAL_SENSITIVE_TOPICS = [
    "illegal activities",
    "unethical legal practices",
    "attorney-client privilege violations",
    "conflict of interest",
    "unauthorized practice of law",
    "fraudulent legal advice",
    "obstruction of justice"
]

class ValidatorRegistry:
    __slots__ = ('_validators', '_loaded')
    
    def __init__(self):
        self._validators = {}
        self._loaded = False
    
    def _load_validators(self):
        if self._loaded:
            return
        
        validators = [
            ('BiasCheck', 'guardrails.hub'),
            ('GroundedAIHallucination', 'guardrails.hub'),
            ('SensitiveTopic', 'guardrails.hub'),
        ]
        
        for name, module in validators:
            try:
                mod = __import__(module, fromlist=[name])
                self._validators[name] = getattr(mod, name)
            except (ImportError, AttributeError, Exception):
                pass
        
        self._loaded = True
    
    def get(self, name: str):
        if not self._loaded:
            self._load_validators()
        return self._validators.get(name)
    
    def is_available(self, name: str) -> bool:
        if not self._loaded:
            self._load_validators()
        return name in self._validators
    
    def available_validators(self) -> List[str]:
        if not self._loaded:
            self._load_validators()
        return list(self._validators.keys())

@lru_cache(maxsize=1)
def _get_validator_registry():
    return ValidatorRegistry()

class GuardBuilder:
    __slots__ = ('registry', 'validators')
    
    def __init__(self, registry: ValidatorRegistry):
        self.registry = registry
        self.validators = []
    
    def add_bias_check(self, threshold: float = None, on_fail: str = "filter") -> 'GuardBuilder':
        if self.registry.is_available('BiasCheck'):
            try:
                validator_class = self.registry.get('BiasCheck')
                self.validators.append(
                    validator_class(
                        bias_types=["gender", "race", "religion", "political", "age"],
                        threshold=threshold or VALIDATION_THRESHOLDS['bias_check'],
                        on_fail=on_fail
                    )
                )
            except Exception:
                pass
        return self
    
    def add_sensitive_topic_check(self, topics: List[str] = None, threshold: float = None, on_fail: str = "exception") -> 'GuardBuilder':
        if self.registry.is_available('SensitiveTopic'):
            try:
                validator_class = self.registry.get('SensitiveTopic')
                self.validators.append(
                    validator_class(
                        sensitive_topics=topics or LEGAL_SENSITIVE_TOPICS,
                        threshold=threshold or VALIDATION_THRESHOLDS['sensitive_topics'],
                        on_fail=on_fail
                    )
                )
            except Exception:
                pass
        return self
    
    def add_hallucination_check(self, threshold: float = None, on_fail: str = "reask") -> 'GuardBuilder':
        if self.registry.is_available('GroundedAIHallucination'):
            try:
                validator_class = self.registry.get('GroundedAIHallucination')
                self.validators.append(
                    validator_class(
                        threshold=threshold or VALIDATION_THRESHOLDS['hallucination'],
                        validation_method="entailment",
                        on_fail=on_fail
                    )
                )
            except Exception:
                pass
        return self
    
    def build(self):
        try:
            import guardrails as gd
            return gd.Guard().use_many(*self.validators) if self.validators else gd.Guard()
        except (ImportError, Exception):
            return None

class ChatbotGuardrails:
    __slots__ = ('user_type', 'input_guard', 'output_guard', '_registry')
    
    def __init__(self, user_type: str = "user"):
        self.user_type = user_type
        self._registry = _get_validator_registry()
        self.input_guard = self._create_input_guard()
        self.output_guard = self._create_output_guard()
    
    def _create_input_guard(self):
        if not GUARDRAILS_CONFIG['enable_input_validation']:
            return None
        
        builder = GuardBuilder(self._registry)
        builder.add_bias_check(on_fail="filter")
        builder.add_sensitive_topic_check(on_fail="exception")
        return builder.build()
    
    def _create_output_guard(self):
        if not GUARDRAILS_CONFIG['enable_output_validation']:
            return None
        
        builder = GuardBuilder(self._registry)
        builder.add_hallucination_check(on_fail="reask")
        builder.add_bias_check(on_fail="reask")
        return builder.build()
    
    def validate_input(self, question: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.input_guard:
            return {"is_valid": True, "cleaned_input": question, "validation_passed": True, "warnings": []}
        
        try:
            result = self.input_guard.validate(question)
            return {
                "is_valid": True,
                "cleaned_input": getattr(result, 'validated_output', question),
                "validation_passed": getattr(result, 'validation_passed', True),
                "error_spans": getattr(result, 'error_spans', []),
                "warnings": []
            }
        except Exception as e:
            if GUARDRAILS_CONFIG['strict_mode']:
                raise
            return {
                "is_valid": False,
                "cleaned_input": None,
                "validation_passed": False,
                "error": str(e),
                "error_type": type(e).__name__,
                "warnings": [f"Input validation failed: {str(e)}"]
            }
    
    def validate_output(self, response: str, context: str = "", metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.output_guard:
            return {"is_valid": True, "cleaned_output": response, "validation_passed": True, "warnings": []}
        
        try:
            result = self.output_guard.validate(response)
            return {
                "is_valid": True,
                "cleaned_output": getattr(result, 'validated_output', response),
                "validation_passed": getattr(result, 'validation_passed', True),
                "confidence_score": getattr(result, 'confidence_score', 1.0),
                "error_spans": getattr(result, 'error_spans', []),
                "warnings": []
            }
        except Exception as e:
            if GUARDRAILS_CONFIG['strict_mode']:
                raise
            return {
                "is_valid": False,
                "cleaned_output": None,
                "validation_passed": False,
                "error": str(e),
                "error_type": type(e).__name__,
                "warnings": [f"Output validation failed: {str(e)}"]
            }
    
    def get_security_report(self, input_validation: Dict, output_validation: Dict) -> Dict[str, Any]:
        if not GUARDRAILS_CONFIG['enable_security_reporting']:
            return {"enabled": False}
        
        score = 1.0
        issues = []
        
        if not input_validation.get("is_valid", True):
            score -= 0.3
            issues.append(f"Input: {input_validation.get('error', 'Unknown')}")
        
        if not output_validation.get("is_valid", True):
            score -= 0.4
            issues.append(f"Output: {output_validation.get('error', 'Unknown')}")
        
        return {
            "security_score": score,
            "security_level": "HIGH" if score >= 0.9 else "MEDIUM" if score >= 0.7 else "LOW",
            "issues_detected": len(issues),
            "issues": issues,
            "guardrails_enabled": True
        }

@lru_cache(maxsize=2)
def get_guardrails_instance(user_type: str = "user") -> ChatbotGuardrails:
    return ChatbotGuardrails(user_type=user_type)

def is_guardrails_enabled() -> bool:
    return GUARDRAILS_CONFIG['enable_input_validation'] or GUARDRAILS_CONFIG['enable_output_validation']

def get_guardrails_config() -> Dict[str, Any]:
    return {
        **GUARDRAILS_CONFIG,
        "available_validators": _get_validator_registry().available_validators(),
        "validation_thresholds": VALIDATION_THRESHOLDS
    }
