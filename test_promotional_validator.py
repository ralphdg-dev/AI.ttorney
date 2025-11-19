#!/usr/bin/env python3
"""
Test script for the enhanced promotional content validator
Tests the comprehensive rules for blocking promotional content and external links
"""

import asyncio
import sys
import os

# Add the server directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'server'))

from services.promotional_content_validator import get_promotional_validator

# Test cases based on your examples
TEST_CASES = [
    # Cases that should be BLOCKED
    {
        "content": "Buy my kutsinta! DM me for orders",
        "should_block": True,
        "description": "Direct selling with contact solicitation"
    },
    {
        "content": "Check out my baking page @lyannas_bakes",
        "should_block": True,
        "description": "Social media promotion"
    },
    {
        "content": "Available na ang fresh kutsinta! Message me for orders",
        "should_block": True,
        "description": "Filipino/Taglish promotional content"
    },
    {
        "content": "Contact me at john (at) example (dot) com for legal consultation",
        "should_block": True,
        "description": "Obfuscated email with service offering"
    },
    {
        "content": "Call me at zero nine one seven one two three four five six seven",
        "should_block": True,
        "description": "Spelled-out phone number"
    },
    {
        "content": "Visit my website: example dot com",
        "should_block": True,
        "description": "Obfuscated URL"
    },
    {
        "content": "GCash me at 09171234567 for orders",
        "should_block": True,
        "description": "Payment identifier with phone number"
    },
    {
        "content": "k u t s i n t a available for order",
        "should_block": True,
        "description": "Spaced out obfuscated word"
    },
    {
        "content": "Follow my IG: @bakingqueen for updates",
        "should_block": True,
        "description": "Social media handle promotion"
    },
    {
        "content": "Limited stock! Shop now at my small business",
        "should_block": True,
        "description": "Business promotion with urgency"
    },
    
    # Cases that should be ALLOWED
    {
        "content": "I went through this legal process last year",
        "should_block": False,
        "description": "Personal experience sharing"
    },
    {
        "content": "Have you tried filing a complaint with the barangay?",
        "should_block": False,
        "description": "Neutral advice question"
    },
    {
        "content": "The law states that you have 30 days to respond",
        "should_block": False,
        "description": "Legal information sharing"
    },
    {
        "content": "You should gather all your documents first",
        "should_block": False,
        "description": "General advice"
    },
    {
        "content": "This sounds like a labor law issue",
        "should_block": False,
        "description": "Legal categorization"
    },
    {
        "content": "I recommend reading about your rights first",
        "should_block": False,
        "description": "Educational recommendation"
    },
]

async def test_validator():
    """Test the promotional content validator with various cases"""
    print("🧪 Testing Enhanced Promotional Content Validator")
    print("=" * 60)
    
    try:
        validator = get_promotional_validator()
        
        passed = 0
        failed = 0
        
        for i, test_case in enumerate(TEST_CASES, 1):
            content = test_case["content"]
            should_block = test_case["should_block"]
            description = test_case["description"]
            
            print(f"\n{i:2d}. Testing: {description}")
            print(f"    Content: \"{content}\"")
            print(f"    Expected: {'BLOCK' if should_block else 'ALLOW'}")
            
            # Test the validator
            result = await validator.validate_content(content)
            is_blocked = not result["is_valid"]
            
            print(f"    Result:   {'BLOCK' if is_blocked else 'ALLOW'}")
            
            if is_blocked and result.get("reason"):
                print(f"    Reason:   {result['reason']}")
            
            if result.get("detected_items"):
                print(f"    Detected: {result['detected_items'][:3]}")  # Show first 3 items
            
            # Check if result matches expectation
            if is_blocked == should_block:
                print(f"    Status:   ✅ PASS")
                passed += 1
            else:
                print(f"    Status:   ❌ FAIL")
                failed += 1
        
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {passed} passed, {failed} failed")
        
        if failed == 0:
            print("🎉 All tests passed! The validator is working correctly.")
        else:
            print(f"⚠️  {failed} test(s) failed. Review the validator logic.")
            
    except Exception as e:
        print(f"❌ Error running tests: {str(e)}")
        print("Make sure OPENAI_API_KEY is set in your environment variables.")

if __name__ == "__main__":
    asyncio.run(test_validator())
