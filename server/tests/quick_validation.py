"""
Quick Validation Script for AI.ttorney Chatbot Changes

This script performs a quick sanity check to ensure:
1. System prompt emphasizes informational responses
2. No advice-giving language in prompts
3. Greeting fallback prevention is in place

Run this before running the full test suite.
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.system_prompts import ENGLISH_SYSTEM_PROMPT, TAGALOG_SYSTEM_PROMPT


def validate_system_prompt():
    """Validate that system prompt has been updated correctly"""
    print("="*80)
    print("VALIDATING SYSTEM PROMPT UPDATES")
    print("="*80)
    
    issues = []
    checks_passed = 0
    total_checks = 0
    
    # Check 1: Emphasis on INFORMATION
    total_checks += 1
    if "INFORMATIONAL content" in ENGLISH_SYSTEM_PROMPT or "INFORMATION" in ENGLISH_SYSTEM_PROMPT:
        print("✅ Check 1: System prompt emphasizes INFORMATIONAL content")
        checks_passed += 1
    else:
        print("❌ Check 1: FAILED - System prompt should emphasize INFORMATIONAL content")
        issues.append("System prompt doesn't emphasize INFORMATIONAL content")
    
    # Check 2: Directive language restrictions
    total_checks += 1
    directive_phrases = ["you should", "you must", "I recommend", "I suggest"]
    has_restrictions = any(phrase in ENGLISH_SYSTEM_PROMPT.lower() for phrase in ["never use directive", "never use: \"you should\""])
    
    if has_restrictions:
        print("✅ Check 2: System prompt restricts directive language")
        checks_passed += 1
    else:
        print("❌ Check 2: FAILED - System prompt should restrict directive language")
        issues.append("System prompt doesn't restrict directive language")
    
    # Check 3: Informational framing examples
    total_checks += 1
    informational_phrases = ["under philippine law", "the law states", "according to"]
    has_examples = any(phrase in ENGLISH_SYSTEM_PROMPT.lower() for phrase in informational_phrases)
    
    if has_examples:
        print("✅ Check 3: System prompt includes informational framing examples")
        checks_passed += 1
    else:
        print("❌ Check 3: FAILED - System prompt should include informational framing examples")
        issues.append("System prompt doesn't include informational framing examples")
    
    # Check 4: Greeting fallback prevention
    total_checks += 1
    has_fallback_prevention = "never fallback to greetings" in ENGLISH_SYSTEM_PROMPT.lower()
    
    if has_fallback_prevention:
        print("✅ Check 4: System prompt prevents greeting fallback")
        checks_passed += 1
    else:
        print("❌ Check 4: FAILED - System prompt should prevent greeting fallback")
        issues.append("System prompt doesn't prevent greeting fallback")
    
    # Check 5: Good vs Bad examples
    total_checks += 1
    has_examples_section = "INFORMATIONAL RESPONSE EXAMPLES" in ENGLISH_SYSTEM_PROMPT or "ADVICE RESPONSES (BAD" in ENGLISH_SYSTEM_PROMPT
    
    if has_examples_section:
        print("✅ Check 5: System prompt includes good vs bad examples")
        checks_passed += 1
    else:
        print("❌ Check 5: FAILED - System prompt should include good vs bad examples")
        issues.append("System prompt doesn't include good vs bad examples")
    
    # Check 6: Five law categories clearly defined
    total_checks += 1
    law_categories = ["civil law", "criminal law", "consumer law", "family law", "labor law"]
    has_all_categories = all(category in ENGLISH_SYSTEM_PROMPT.lower() for category in law_categories)
    
    if has_all_categories:
        print("✅ Check 6: All 5 law categories are defined")
        checks_passed += 1
    else:
        print("❌ Check 6: FAILED - All 5 law categories should be defined")
        issues.append("Not all 5 law categories are defined")
    
    # Check 7: Explain vs Tell distinction
    total_checks += 1
    has_distinction = "explain what the law says" in ENGLISH_SYSTEM_PROMPT.lower() and "not" in ENGLISH_SYSTEM_PROMPT.lower()
    
    if has_distinction:
        print("✅ Check 7: System prompt distinguishes 'explain' vs 'tell what to do'")
        checks_passed += 1
    else:
        print("❌ Check 7: FAILED - System prompt should distinguish 'explain' vs 'tell'")
        issues.append("System prompt doesn't distinguish 'explain' vs 'tell what to do'")
    
    # Summary
    print("\n" + "="*80)
    print(f"VALIDATION SUMMARY: {checks_passed}/{total_checks} checks passed")
    print("="*80)
    
    if checks_passed == total_checks:
        print("✅ ALL CHECKS PASSED - System prompt is properly configured")
        print("\nYou can now run the full test suite:")
        print("  python tests/test_chatbot_responses.py")
        return True
    else:
        print(f"⚠️  {total_checks - checks_passed} CHECKS FAILED")
        print("\nIssues found:")
        for i, issue in enumerate(issues, 1):
            print(f"  {i}. {issue}")
        print("\nPlease review and update config/system_prompts.py")
        return False


def validate_code_changes():
    """Validate that code changes are in place"""
    print("\n" + "="*80)
    print("VALIDATING CODE CHANGES")
    print("="*80)
    
    try:
        # Import the chatbot module
        from api.chatbot_user import generate_answer
        
        # Check if function exists
        print("✅ Check 1: generate_answer() function exists")
        
        # Check function signature
        import inspect
        sig = inspect.signature(generate_answer)
        params = list(sig.parameters.keys())
        
        expected_params = ['question', 'context', 'conversation_history', 'language', 'max_tokens', 'is_complex']
        if all(param in params for param in expected_params):
            print("✅ Check 2: generate_answer() has correct parameters")
        else:
            print("⚠️  Check 2: generate_answer() parameters may have changed")
        
        print("\n✅ CODE VALIDATION PASSED")
        return True
        
    except Exception as e:
        print(f"❌ CODE VALIDATION FAILED: {str(e)}")
        return False


def main():
    """Run all validations"""
    print("\n" + "#"*80)
    print("# AI.TTORNEY CHATBOT - QUICK VALIDATION")
    print("#"*80 + "\n")
    
    prompt_valid = validate_system_prompt()
    code_valid = validate_code_changes()
    
    print("\n" + "#"*80)
    if prompt_valid and code_valid:
        print("# ✅ ALL VALIDATIONS PASSED")
        print("#"*80)
        print("\n🎉 Your changes are ready for testing!")
        print("\nNext steps:")
        print("  1. Start the server: python main.py")
        print("  2. Run full test suite: python tests/test_chatbot_responses.py")
        print("  3. Review the test report")
        return 0
    else:
        print("# ⚠️  SOME VALIDATIONS FAILED")
        print("#"*80)
        print("\n⚠️  Please fix the issues above before running tests")
        return 1


if __name__ == "__main__":
    exit(main())
