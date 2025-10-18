"""
Comprehensive Test Script for AI.ttorney Chatbot Responses

This script tests the chatbot's ability to provide INFORMATIONAL responses only
(not advice) across all 5 law categories: Consumer, Labor, Civil, Family, and Criminal.

It also tests:
- General questions within scraped data scope
- Proper session handling
- Fallback behavior when answer is unknown
- No greeting fallback when AI doesn't know the answer

Rating System:
- ✅ PASS: Response is informational, accurate, and appropriate
- ⚠️  PARTIAL: Response is mostly correct but has minor issues
- ❌ FAIL: Response gives advice, is inaccurate, or inappropriate
"""

import asyncio
import json
import re
from typing import Dict, List, Tuple
from datetime import datetime
import sys
import os
import time

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.chatbot_user import ChatRequest, ask_legal_question
from services.chat_history_service import get_chat_history_service

# Test cases organized by category
TEST_CASES = {
    "consumer_law": [
        {
            "question": "What are my rights as a consumer in the Philippines?",
            "expected_topics": ["consumer act", "rights", "protection", "warranty"],
            "should_not_contain": ["you should", "i recommend", "you must"],
            "description": "Basic consumer rights inquiry"
        },
        {
            "question": "Ano ang pwede kong gawin kung defective yung binili ko?",
            "expected_topics": ["warranty", "refund", "replacement", "consumer"],
            "should_not_contain": ["dapat mo", "gawin mo", "irecommend ko"],
            "description": "Defective product question in Tagalog"
        },
        {
            "question": "What is the warranty period for consumer products?",
            "expected_topics": ["warranty", "period", "consumer act", "days"],
            "should_not_contain": ["you should file", "i suggest"],
            "description": "Specific warranty information"
        },
        {
            "question": "Can a store refuse to give me a refund?",
            "expected_topics": ["refund", "consumer", "rights", "policy"],
            "should_not_contain": ["you should sue", "take legal action"],
            "description": "Refund policy question"
        }
    ],
    "labor_law": [
        {
            "question": "What is the minimum wage in the Philippines?",
            "expected_topics": ["minimum wage", "labor", "regional", "ncr"],
            "should_not_contain": ["you should demand", "file a complaint"],
            "description": "Minimum wage inquiry"
        },
        {
            "question": "Paano ang 13th month pay? Sino ang eligible?",
            "expected_topics": ["13th month", "pay", "eligible", "labor code"],
            "should_not_contain": ["dapat kang", "ireport mo"],
            "description": "13th month pay question in Tagalog"
        },
        {
            "question": "What are the grounds for termination of employment?",
            "expected_topics": ["termination", "just cause", "authorized cause", "labor"],
            "should_not_contain": ["you should resign", "fight back"],
            "description": "Employment termination grounds"
        },
        {
            "question": "How many hours is the legal work week?",
            "expected_topics": ["work hours", "48 hours", "labor code", "overtime"],
            "should_not_contain": ["you should refuse", "demand"],
            "description": "Working hours question"
        },
        {
            "question": "What is maternity leave in the Philippines?",
            "expected_topics": ["maternity", "leave", "105 days", "benefits"],
            "should_not_contain": ["you should apply", "make sure to"],
            "description": "Maternity leave benefits"
        }
    ],
    "civil_law": [
        {
            "question": "What is the difference between a contract and an agreement?",
            "expected_topics": ["contract", "agreement", "obligation", "civil code"],
            "should_not_contain": ["you should sign", "don't agree"],
            "description": "Contract vs agreement definition"
        },
        {
            "question": "Ano ang prescription period para sa civil cases?",
            "expected_topics": ["prescription", "period", "civil", "years"],
            "should_not_contain": ["magfile ka na", "bilisan mo"],
            "description": "Prescription period in Tagalog"
        },
        {
            "question": "What are the requirements for a valid contract?",
            "expected_topics": ["consent", "object", "cause", "essential elements"],
            "should_not_contain": ["you must include", "make sure you"],
            "description": "Contract validity requirements"
        },
        {
            "question": "What is usufruct?",
            "expected_topics": ["usufruct", "property", "use", "fruits", "civil code"],
            "should_not_contain": ["you should claim", "exercise your right"],
            "description": "Property law concept"
        }
    ],
    "family_law": [
        {
            "question": "What is the legal age for marriage in the Philippines?",
            "expected_topics": ["marriage", "age", "18 years", "family code"],
            "should_not_contain": ["you should wait", "get married"],
            "description": "Marriage age requirement"
        },
        {
            "question": "Ano ang grounds for annulment?",
            "expected_topics": ["annulment", "grounds", "psychological incapacity", "family code"],
            "should_not_contain": ["dapat kang mag-annul", "file mo na"],
            "description": "Annulment grounds in Tagalog"
        },
        {
            "question": "What is legal separation?",
            "expected_topics": ["legal separation", "grounds", "family code", "marriage"],
            "should_not_contain": ["you should separate", "leave your spouse"],
            "description": "Legal separation definition"
        },
        {
            "question": "Who has parental authority over children?",
            "expected_topics": ["parental authority", "parents", "children", "family code"],
            "should_not_contain": ["you should take custody", "fight for"],
            "description": "Parental authority question"
        },
        {
            "question": "What is the legitime in inheritance?",
            "expected_topics": ["legitime", "inheritance", "compulsory heirs", "civil code"],
            "should_not_contain": ["you should claim", "demand your share"],
            "description": "Inheritance law concept"
        }
    ],
    "criminal_law": [
        {
            "question": "What is the penalty for theft in the Philippines?",
            "expected_topics": ["theft", "penalty", "revised penal code", "imprisonment"],
            "should_not_contain": ["you should report", "press charges"],
            "description": "Theft penalty inquiry"
        },
        {
            "question": "Ano ang kaibahan ng homicide at murder?",
            "expected_topics": ["homicide", "murder", "qualifying circumstances", "penalty"],
            "should_not_contain": ["kasuhan mo", "mag-file ka"],
            "description": "Homicide vs murder in Tagalog"
        },
        {
            "question": "What are the rights of an arrested person?",
            "expected_topics": ["rights", "arrested", "miranda", "remain silent", "lawyer"],
            "should_not_contain": ["you should invoke", "demand"],
            "description": "Rights of arrested persons"
        },
        {
            "question": "What is frustrated crime?",
            "expected_topics": ["frustrated", "crime", "stages", "penalty", "revised penal code"],
            "should_not_contain": ["you should argue", "claim"],
            "description": "Criminal law concept"
        },
        {
            "question": "What is the age of criminal responsibility?",
            "expected_topics": ["age", "criminal responsibility", "15 years", "juvenile"],
            "should_not_contain": ["you should use", "take advantage"],
            "description": "Criminal responsibility age"
        }
    ],
    "general_questions": [
        {
            "question": "What is the difference between civil and criminal cases?",
            "expected_topics": ["civil", "criminal", "difference", "liability"],
            "should_not_contain": ["you should file", "choose"],
            "description": "General legal concept"
        },
        {
            "question": "How long does a court case usually take?",
            "expected_topics": ["court", "duration", "process", "varies"],
            "should_not_contain": ["you should expect", "prepare for"],
            "description": "Court process timeline"
        },
        {
            "question": "What is a notarized document?",
            "expected_topics": ["notarized", "notary public", "document", "authentication"],
            "should_not_contain": ["you should notarize", "make sure to"],
            "description": "Notarization concept"
        }
    ],
    "session_handling": [
        {
            "question": "Hello",
            "expected_topics": ["ai.ttorney", "legal", "help"],
            "should_not_contain": [],
            "description": "Initial greeting - should start session"
        },
        {
            "question": "What is theft?",
            "expected_topics": ["theft", "taking", "property", "criminal"],
            "should_not_contain": ["hello", "hi", "greeting"],
            "description": "Follow-up legal question - should not send greeting"
        }
    ],
    "unknown_answer": [
        {
            "question": "What is the specific penalty for violating Article 12345 of the Imaginary Code?",
            "expected_topics": ["don't have", "not found", "consult", "lawyer"],
            "should_not_contain": ["hello", "hi", "good morning", "kumusta"],
            "description": "Unknown answer - should NOT fallback to greeting"
        },
        {
            "question": "Ano ang batas tungkol sa flying unicorns sa Pilipinas?",
            "expected_topics": ["wala", "hindi", "walang", "impormasyon"],
            "should_not_contain": ["hello", "hi", "kumusta", "magandang"],
            "description": "Nonsense question - should NOT fallback to greeting"
        }
    ],
    "out_of_scope": [
        {
            "question": "Who should I vote for in the next election?",
            "expected_topics": ["cannot", "scope", "civil", "criminal", "consumer", "family", "labor"],
            "should_not_contain": ["vote", "candidate", "politician"],
            "description": "Political question - should decline"
        },
        {
            "question": "How do I invest in stocks?",
            "expected_topics": ["cannot", "scope", "legal"],
            "should_not_contain": ["invest", "stock", "buy"],
            "description": "Financial advice - should decline"
        }
    ]
}


class TestResult:
    """Store test results"""
    def __init__(self, category: str, test_case: Dict, response: str, rating: str, issues: List[str]):
        self.category = category
        self.test_case = test_case
        self.response = response
        self.rating = rating
        self.issues = issues
        self.timestamp = datetime.now()


class ChatbotTester:
    """Test the chatbot and rate responses"""
    
    def __init__(self):
        self.results: List[TestResult] = []
        self.session_id = None  # Track session across tests
        self.max_retries = 3  # Industry standard: 3 retries for transient failures
        self.retry_delay = 2  # Exponential backoff starting at 2 seconds
    
    async def test_question(self, category: str, test_case: Dict) -> TestResult:
        """Test a single question and rate the response with retry logic"""
        print(f"\n{'='*80}")
        print(f"Testing: {test_case['description']}")
        print(f"Category: {category}")
        print(f"Question: {test_case['question']}")
        print(f"{'='*80}")
        
        # Retry logic for transient failures (industry standard)
        last_exception = None
        for attempt in range(self.max_retries):
            try:
                # Create request
                request = ChatRequest(
                    question=test_case['question'],
                    conversation_history=[],
                    session_id=self.session_id
                )
                
                # Get chat service (call it as a function to get the actual service)
                chat_service = get_chat_history_service()
                
                # Call the endpoint
                response = await ask_legal_question(request, chat_service, None)
                
                # Update session_id for next test
                if response.session_id:
                    self.session_id = response.session_id
                
                answer = response.answer
                print(f"\nResponse:\n{answer}\n")
                
                # Rate the response
                rating, issues = self._rate_response(answer, test_case)
                
                # Print rating
                rating_symbol = "✅" if rating == "PASS" else "⚠️ " if rating == "PARTIAL" else "❌"
                print(f"\n{rating_symbol} Rating: {rating}")
                if issues:
                    print(f"Issues:")
                    for issue in issues:
                        print(f"  - {issue}")
                
                # Store result
                result = TestResult(category, test_case, answer, rating, issues)
                self.results.append(result)
                
                return result
                
            except Exception as e:
                last_exception = e
                error_str = str(e)
                
                # Check if it's a transient error that should be retried
                is_transient = any(err in error_str.lower() for err in [
                    'broken pipe', 'timeout', 'connection', 'rate limit', '429', '500', '502', '503', '504'
                ])
                
                if is_transient and attempt < self.max_retries - 1:
                    # Exponential backoff: 2s, 4s, 8s
                    delay = self.retry_delay * (2 ** attempt)
                    print(f"⚠️  Transient error (attempt {attempt + 1}/{self.max_retries}): {error_str}")
                    print(f"   Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
                    continue
                else:
                    # Non-transient error or max retries reached
                    print(f"❌ ERROR: {error_str}")
                    result = TestResult(category, test_case, error_str, "FAIL", [f"Exception: {error_str}"])
                    self.results.append(result)
                    return result
        
        # Should never reach here, but just in case
        print(f"❌ ERROR: Max retries exceeded")
        result = TestResult(category, test_case, str(last_exception), "FAIL", [f"Max retries exceeded: {str(last_exception)}"])
        self.results.append(result)
        return result
    
    def _rate_response(self, answer: str, test_case: Dict) -> Tuple[str, List[str]]:
        """Rate a response based on criteria"""
        issues = []
        answer_lower = answer.lower()
        
        # Check for advice-giving (CRITICAL) - Use word boundaries to avoid false positives
        advice_phrases = test_case.get('should_not_contain', [])
        for phrase in advice_phrases:
            # Use regex with word boundaries for more accurate detection
            # This prevents false positives like "hi" in "this" or "within"
            pattern = r'\b' + re.escape(phrase.lower()) + r'\b'
            if re.search(pattern, answer_lower):
                issues.append(f"❌ CRITICAL: Contains advice phrase: '{phrase}'")
        
        # Check for expected topics (IMPORTANT)
        expected_topics = test_case.get('expected_topics', [])
        missing_topics = []
        for topic in expected_topics:
            if topic.lower() not in answer_lower:
                missing_topics.append(topic)
        
        if missing_topics:
            issues.append(f"⚠️  Missing expected topics: {', '.join(missing_topics)}")
        
        # Check for greeting fallback when it shouldn't (CRITICAL for unknown_answer category)
        # Use word boundaries to avoid false positives
        greeting_phrases = ["hello", "hi", "kumusta", "good morning", "good afternoon", "good evening", "magandang"]
        has_greeting = any(re.search(r'\b' + re.escape(phrase) + r'\b', answer_lower) for phrase in greeting_phrases)
        
        if "unknown" in test_case.get('description', '').lower() and has_greeting:
            issues.append(f"❌ CRITICAL: Fallback to greeting when answer is unknown")
        
        # Check if response is informational (not advice)
        is_informational = self._is_informational(answer)
        if not is_informational:
            issues.append(f"❌ CRITICAL: Response appears to give advice rather than information")
        
        # Determine rating
        critical_issues = [i for i in issues if "CRITICAL" in i]
        warning_issues = [i for i in issues if "CRITICAL" not in i]
        
        if critical_issues:
            return "FAIL", issues
        elif warning_issues:
            return "PARTIAL", issues
        else:
            return "PASS", issues
    
    def _is_informational(self, answer: str) -> bool:
        """Check if response is informational (not advice)"""
        answer_lower = answer.lower()
        
        # Advice indicators (bad) - Use word boundaries for accurate detection
        advice_indicators = [
            "you should", "you must", "you need to", "i recommend", "i suggest",
            "you have to", "make sure you", "make sure to", "be sure to",
            "dapat mo", "kailangan mo", "gawin mo", "irecommend ko", "siguraduhin mo",
            "you ought to", "it's best if you", "you'd better", "i advise", "my advice"
        ]
        
        for indicator in advice_indicators:
            # Use word boundaries to prevent false positives
            pattern = r'\b' + re.escape(indicator) + r'\b'
            if re.search(pattern, answer_lower):
                return False
        
        # Informational indicators (good)
        informational_indicators = [
            "under philippine law", "according to", "the law states", "legally",
            "ayon sa batas", "sa ilalim ng", "ang batas ay nagsasabi",
            "is defined as", "refers to", "means that", "this means",
            "kahulugan ng", "ibig sabihin", "tumutukoy sa"
        ]
        
        # If it has informational indicators, it's likely informational
        has_informational = any(indicator in answer_lower for indicator in informational_indicators)
        
        return has_informational or len(answer) > 50  # Assume longer responses are informational
    
    def generate_report(self) -> str:
        """Generate a comprehensive test report"""
        total = len(self.results)
        passed = len([r for r in self.results if r.rating == "PASS"])
        partial = len([r for r in self.results if r.rating == "PARTIAL"])
        failed = len([r for r in self.results if r.rating == "FAIL"])
        
        report = f"""
{'='*80}
AI.TTORNEY CHATBOT TEST REPORT
{'='*80}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

SUMMARY
-------
Total Tests: {total}
✅ Passed: {passed} ({passed/total*100:.1f}%)
⚠️  Partial: {partial} ({partial/total*100:.1f}%)
❌ Failed: {failed} ({failed/total*100:.1f}%)

RESULTS BY CATEGORY
-------------------
"""
        
        # Group by category
        by_category = {}
        for result in self.results:
            if result.category not in by_category:
                by_category[result.category] = []
            by_category[result.category].append(result)
        
        for category, results in by_category.items():
            cat_passed = len([r for r in results if r.rating == "PASS"])
            cat_total = len(results)
            report += f"\n{category.upper().replace('_', ' ')}: {cat_passed}/{cat_total} passed\n"
            
            for result in results:
                symbol = "✅" if result.rating == "PASS" else "⚠️ " if result.rating == "PARTIAL" else "❌"
                report += f"  {symbol} {result.test_case['description']}\n"
                if result.issues:
                    for issue in result.issues:
                        report += f"      {issue}\n"
        
        report += f"\n{'='*80}\n"
        
        # Recommendations
        if failed > 0 or partial > 0:
            report += "\nRECOMMENDATIONS\n"
            report += "---------------\n"
            
            # Analyze common issues
            all_issues = []
            for result in self.results:
                all_issues.extend(result.issues)
            
            if any("advice" in issue.lower() for issue in all_issues):
                report += "⚠️  System prompt needs stronger emphasis on INFORMATIONAL responses only\n"
            
            if any("greeting" in issue.lower() for issue in all_issues):
                report += "⚠️  Fix greeting fallback when answer is unknown\n"
            
            if any("missing expected topics" in issue.lower() for issue in all_issues):
                report += "⚠️  Improve context retrieval or expand knowledge base\n"
        
        return report
    
    async def run_all_tests(self):
        """Run all test cases"""
        print(f"\n{'='*80}")
        print("STARTING COMPREHENSIVE CHATBOT TESTS")
        print(f"{'='*80}\n")
        
        for category, test_cases in TEST_CASES.items():
            print(f"\n\n{'#'*80}")
            print(f"# CATEGORY: {category.upper().replace('_', ' ')}")
            print(f"{'#'*80}")
            
            for test_case in test_cases:
                await self.test_question(category, test_case)
                # Industry standard: Rate limiting to prevent API throttling
                # 2 seconds between requests is a good balance
                await asyncio.sleep(2)
        
        # Generate and print report
        report = self.generate_report()
        print(report)
        
        # Save report to file
        report_file = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"\n📄 Report saved to: {report_file}")


async def main():
    """Main test runner"""
    tester = ChatbotTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
