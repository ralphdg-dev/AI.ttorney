"""
Guardrails AI Configuration for Lawyer Chatbot Security
Comprehensive security measures for AI.ttorney legal assistant
"""

import guardrails as gd
from typing import Dict, Any, List, Optional
import os
from dotenv import load_dotenv

# Import available validators with fallback handling
available_validators = {}

try:
    from guardrails.hub import ToxicLanguage
    available_validators['ToxicLanguage'] = ToxicLanguage
except ImportError:
    print("⚠️ ToxicLanguage validator not available")

try:
    from guardrails.hub import BiasCheck
    available_validators['BiasCheck'] = BiasCheck
except ImportError:
    print("⚠️ BiasCheck validator not available")

try:
    from guardrails.hub import LlamaGuard7B
    available_validators['LlamaGuard7B'] = LlamaGuard7B
except ImportError:
    print("⚠️ LlamaGuard7B validator not available")

try:
    from guardrails.hub import GroundedAIHallucination
    available_validators['GroundedAIHallucination'] = GroundedAIHallucination
except ImportError:
    print("⚠️ GroundedAIHallucination validator not available")

try:
    from guardrails.hub import SensitiveTopic
    available_validators['SensitiveTopic'] = SensitiveTopic
except ImportError:
    print("⚠️ SensitiveTopic validator not available")

try:
    from guardrails.hub import RestrictToTopic
    available_validators['RestrictToTopic'] = RestrictToTopic
except ImportError:
    print("⚠️ RestrictToTopic validator not available")

try:
    from guardrails.hub import RegexMatch
    available_validators['RegexMatch'] = RegexMatch
except ImportError:
    print("⚠️ RegexMatch validator not available")

load_dotenv()

print(f"✅ Loaded {len(available_validators)} Guardrails validators: {list(available_validators.keys())}")

class LawyerChatbotGuardrails:
    """
    Comprehensive security guardrails for lawyer chatbot
    Implements multiple layers of protection for input and output validation
    """
    
    def __init__(self):
        self.input_guard = self._create_input_guard()
        self.output_guard = self._create_output_guard()
        
    def _create_input_guard(self) -> gd.Guard:
        """
        Create input validation guard for user questions
        Uses only available validators for robust operation
        """
        validators = []
        
        # Toxic language detection - Maintain professional standards
        if 'ToxicLanguage' in available_validators:
            try:
                validators.append(
                    available_validators['ToxicLanguage'](
                        threshold=0.7,
                        validation_method="sentence",
                        on_fail="exception"
                    )
                )
                print("✅ ToxicLanguage validator added to input guard")
            except Exception as e:
                print(f"⚠️ Failed to initialize ToxicLanguage validator: {e}")
        
        # Bias detection - Ensure fair legal advice
        if 'BiasCheck' in available_validators:
            try:
                validators.append(
                    available_validators['BiasCheck'](
                        bias_types=["gender", "race", "religion", "political", "age"],
                        threshold=0.8,
                        on_fail="filter"
                    )
                )
                print("✅ BiasCheck validator added to input guard")
            except Exception as e:
                print(f"⚠️ Failed to initialize BiasCheck validator: {e}")
        
        # Sensitive topics filter - Legal ethics compliance
        if 'SensitiveTopic' in available_validators:
            try:
                validators.append(
                    available_validators['SensitiveTopic'](
                        sensitive_topics=[
                            "illegal activities", 
                            "unethical legal practices",
                            "attorney-client privilege violations",
                            "conflict of interest",
                            "unauthorized practice of law"
                        ],
                        threshold=0.8,
                        on_fail="exception"
                    )
                )
                print("✅ SensitiveTopic validator added to input guard")
            except Exception as e:
                print(f"⚠️ Failed to initialize SensitiveTopic validator: {e}")
        
        if validators:
            return gd.Guard().use_many(*validators)
        else:
            print("⚠️ No input validators available - creating empty guard")
            return gd.Guard()
    
    def _create_output_guard(self) -> gd.Guard:
        """
        Create output validation guard for AI responses
        Uses only available validators for robust operation
        """
        validators = []
        
        # Grounded AI hallucination check - Critical for legal accuracy
        if 'GroundedAIHallucination' in available_validators:
            try:
                validators.append(
                    available_validators['GroundedAIHallucination'](
                        threshold=0.85,
                        validation_method="entailment",
                        on_fail="reask"
                    )
                )
                print("✅ GroundedAIHallucination validator added to output guard")
            except Exception as e:
                print(f"⚠️ Failed to initialize GroundedAIHallucination validator: {e}")
        
        # Skip LlamaGuard7B for now due to initialization issues
        # if 'LlamaGuard7B' in available_validators:
        #     try:
        #         validators.append(
        #             available_validators['LlamaGuard7B'](
        #                 threshold=0.8,
        #                 on_fail="filter"
        #             )
        #         )
        #         print("✅ LlamaGuard7B validator added to output guard")
        #     except Exception as e:
        #         print(f"⚠️ Failed to initialize LlamaGuard7B validator: {e}")
        
        # Bias check in responses
        if 'BiasCheck' in available_validators:
            try:
                validators.append(
                    available_validators['BiasCheck'](
                        bias_types=["gender", "race", "religion", "political"],
                        threshold=0.8,
                        on_fail="reask"
                    )
                )
                print("✅ BiasCheck validator added to output guard")
            except Exception as e:
                print(f"⚠️ Failed to initialize BiasCheck validator: {e}")
        
        # Toxic language in responses
        if 'ToxicLanguage' in available_validators:
            try:
                validators.append(
                    available_validators['ToxicLanguage'](
                        threshold=0.7,
                        validation_method="sentence",
                        on_fail="reask"
                    )
                )
                print("✅ ToxicLanguage validator added to output guard")
            except Exception as e:
                print(f"⚠️ Failed to initialize ToxicLanguage validator: {e}")
        
        if validators:
            return gd.Guard().use_many(*validators)
        else:
            print("⚠️ No output validators available - creating empty guard")
            return gd.Guard()
    
    def validate_input(self, question: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Validate user input before processing
        
        Args:
            question: User's legal question
            metadata: Additional context (user info, session data, etc.)
            
        Returns:
            Dict with validation results and cleaned input
        """
        try:
            # Run input validation
            result = self.input_guard.validate(question)
            
            return {
                "is_valid": True,
                "cleaned_input": result.validated_output,
                "validation_passed": result.validation_passed,
                "error_spans": result.error_spans if hasattr(result, 'error_spans') else [],
                "warnings": []
            }
            
        except Exception as e:
            return {
                "is_valid": False,
                "cleaned_input": None,
                "validation_passed": False,
                "error": str(e),
                "error_type": type(e).__name__,
                "warnings": [f"Input validation failed: {str(e)}"]
            }
    
    def validate_output(self, response: str, context: str = "", metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Validate AI response before returning to user
        
        Args:
            response: AI-generated legal response
            context: Legal context used for generation
            metadata: Additional validation context
            
        Returns:
            Dict with validation results and cleaned response
        """
        try:
            # Run output validation
            result = self.output_guard.validate(response)
            
            return {
                "is_valid": True,
                "cleaned_output": result.validated_output,
                "validation_passed": result.validation_passed,
                "confidence_score": getattr(result, 'confidence_score', 1.0),
                "error_spans": result.error_spans if hasattr(result, 'error_spans') else [],
                "warnings": []
            }
            
        except Exception as e:
            return {
                "is_valid": False,
                "cleaned_output": None,
                "validation_passed": False,
                "error": str(e),
                "error_type": type(e).__name__,
                "warnings": [f"Output validation failed: {str(e)}"]
            }
    
    def get_security_report(self, input_validation: Dict, output_validation: Dict) -> Dict[str, Any]:
        """
        Generate comprehensive security report for the interaction
        
        Args:
            input_validation: Results from input validation
            output_validation: Results from output validation
            
        Returns:
            Security report with recommendations
        """
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
        
        # Calculate final security level
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
            "timestamp": None,  # Will be set by the API
            "guardrails_version": gd.__version__
        }

# Global instance for the lawyer chatbot
lawyer_guardrails = LawyerChatbotGuardrails()

# Configuration constants
GUARDRAILS_CONFIG = {
    "enable_input_validation": True,
    "enable_output_validation": True,
    "enable_security_reporting": True,
    "strict_mode": True,  # Fail fast on security issues
    "log_security_events": True,
    "max_retries": 2,  # For reask scenarios
    "timeout_seconds": 30
}

def get_guardrails_instance():
    """Get the configured guardrails instance"""
    return lawyer_guardrails

def is_guardrails_enabled() -> bool:
    """Check if guardrails are enabled in environment"""
    return os.getenv("ENABLE_GUARDRAILS", "true").lower() == "true"
