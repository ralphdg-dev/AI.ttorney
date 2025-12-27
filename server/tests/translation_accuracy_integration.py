#!/usr/bin/env python3
"""
Integration of LegalTranslationAccuracyMetric with existing DeepEval framework
Demonstrates how to use the custom metric for automated translation evaluation

Based on the 100% accuracy baseline from professional translator review:
- 30 user chatbot responses (5 legal categories × 6 queries each)
- 30 lawyer chatbot responses (5 legal categories × 6 queries each)
- Total: 60 responses evaluated with perfect accuracy
"""

import asyncio
import sys
import os
import json
from datetime import datetime
from typing import List, Dict, Any

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from deepeval import evaluate
from deepeval.test_case import LLMTestCase
from legal_translation_accuracy_metric import LegalTranslationAccuracyMetric, LegalTranslationTestSuite


class TranslationAccuracyIntegration:
    """
    Integration class for translation accuracy evaluation with DeepEval
    """
    
    def __init__(self):
        self.test_suite = LegalTranslationTestSuite()
        self.custom_metric = LegalTranslationAccuracyMetric(
            threshold=0.85,  # High threshold based on 100% manual baseline
            model="gpt-4o",
            include_reasoning=True
        )
    
    def create_deepeval_test_cases(self) -> List[LLMTestCase]:
        """
        Create DeepEval-compatible test cases for translation accuracy
        """
        # Get translation test cases from the test suite
        translation_cases = self.test_suite.get_translation_test_cases()
        
        # Convert to DeepEval format with proper metadata
        deepeval_cases = []
        
        for case in translation_cases:
            deepeval_case = LLMTestCase(
                input=case.input,
                actual_output=case.actual_output,
                expected_output=case.expected_output,
                additional_metadata={
                    **case.additional_metadata,
                    "evaluation_type": "translation_accuracy",
                    "baseline_method": "professional_translator_review",
                    "baseline_accuracy": "100%"
                }
            )
            deepeval_cases.append(deepeval_case)
        
        return deepeval_cases
    
    async def run_deepeval_evaluation(self) -> Dict[str, Any]:
        """
        Run evaluation using DeepEval framework with custom metric
        """
        print("🔬 DEEPEVAL TRANSLATION ACCURACY EVALUATION")
        print("=" * 60)
        print("Using LegalTranslationAccuracyMetric with DeepEval framework")
        print("Based on 100% accuracy from professional translator review")
        print()
        
        # Get test cases
        test_cases = self.create_deepeval_test_cases()
        
        print(f"📋 Prepared {len(test_cases)} test cases for evaluation")
        print(f"📊 Metric: {self.custom_metric.get_metric_name()}")
        print(f"🎯 Threshold: {self.custom_metric.get_threshold():.0%}")
        print(f"🤖 Evaluation Model: {self.custom_metric.model_name}")
        print()
        
        # Run evaluation with custom metric
        print("🚀 Running DeepEval evaluation...")
        print("-" * 40)
        
        results = []
        category_scores = {}
        role_scores = {}
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n📝 Test {i}/{len(test_cases)}: {test_case.additional_metadata['query_id']}")
            
            try:
                # Evaluate using custom metric
                metric_result = self.custom_metric(test_case)
                results.append(metric_result)
                
                # Track category scores
                category = test_case.additional_metadata['category']
                if category not in category_scores:
                    category_scores[category] = []
                category_scores[category].append(metric_result['score'])
                
                # Track role scores
                role = test_case.additional_metadata['role']
                if role not in role_scores:
                    role_scores[role] = []
                role_scores[role].append(metric_result['score'])
                
                # Display result
                score = metric_result['score']
                passed = metric_result['passed']
                status = "✅ PASS" if passed else "❌ FAIL"
                print(f"   Score: {score:.3f} ({status})")
                
                if metric_result.get('critical_errors'):
                    print(f"   Issues: {', '.join(metric_result['critical_errors'][:2])}")
                
            except Exception as e:
                print(f"   ❌ ERROR: {str(e)}")
                continue
        
        # Calculate overall statistics
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r['passed'])
        overall_accuracy = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        average_score = sum(r['score'] for r in results) / total_tests if total_tests > 0 else 0
        
        print(f"\n📊 DEEPEVAL EVALUATION RESULTS")
        print("-" * 35)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Accuracy Rate: {overall_accuracy:.1f}%")
        print(f"Average Score: {average_score:.3f}")
        print(f"Metric Threshold: {self.custom_metric.get_threshold():.0%}")
        
        # Category breakdown
        print(f"\n📈 PERFORMANCE BY LEGAL CATEGORY")
        print("-" * 40)
        for category, scores in category_scores.items():
            if scores:
                cat_avg = sum(scores) / len(scores)
                cat_passed = sum(1 for s in scores if s >= self.custom_metric.get_threshold())
                cat_accuracy = (cat_passed / len(scores)) * 100
                print(f"{category}: {cat_passed}/{len(scores)} ({cat_accuracy:.1f}%) - Avg: {cat_avg:.3f}")
        
        # Role breakdown
        print(f"\n👥 PERFORMANCE BY USER ROLE")
        print("-" * 30)
        for role, scores in role_scores.items():
            if scores:
                role_avg = sum(scores) / len(scores)
                role_passed = sum(1 for s in scores if s >= self.custom_metric.get_threshold())
                role_accuracy = (role_passed / len(scores)) * 100
                print(f"{role.title()}: {role_passed}/{len(scores)} ({role_accuracy:.1f}%) - Avg: {role_avg:.3f}")
        
        # Comparison with manual baseline
        manual_baseline = 100.0
        difference = overall_accuracy - manual_baseline
        
        print(f"\n🎯 BASELINE COMPARISON")
        print("-" * 25)
        print(f"Manual Translator Review: {manual_baseline:.1f}%")
        print(f"Automated DeepEval: {overall_accuracy:.1f}%")
        print(f"Difference: {difference:+.1f}%")
        
        # Assessment
        if abs(difference) <= 5.0:
            assessment = "✅ EXCELLENT - Matches manual evaluation"
        elif abs(difference) <= 10.0:
            assessment = "⚠️  GOOD - Minor deviation from manual evaluation"
        else:
            assessment = "❌ NEEDS IMPROVEMENT - Significant deviation"
        
        print(f"Assessment: {assessment}")
        
        # Prepare comprehensive results
        evaluation_results = {
            "evaluation_metadata": {
                "timestamp": datetime.now().isoformat(),
                "framework": "DeepEval",
                "custom_metric": "LegalTranslationAccuracyMetric",
                "evaluation_model": self.custom_metric.model_name,
                "threshold": self.custom_metric.get_threshold(),
                "baseline_method": "professional_translator_review",
                "baseline_accuracy": manual_baseline
            },
            "overall_results": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": total_tests - passed_tests,
                "accuracy_rate": overall_accuracy,
                "average_score": average_score,
                "baseline_difference": difference,
                "assessment": assessment
            },
            "category_performance": {
                cat: {
                    "total": len(scores),
                    "passed": sum(1 for s in scores if s >= self.custom_metric.get_threshold()),
                    "accuracy": (sum(1 for s in scores if s >= self.custom_metric.get_threshold()) / len(scores)) * 100,
                    "average_score": sum(scores) / len(scores),
                    "min_score": min(scores),
                    "max_score": max(scores)
                } for cat, scores in category_scores.items()
            },
            "role_performance": {
                role: {
                    "total": len(scores),
                    "passed": sum(1 for s in scores if s >= self.custom_metric.get_threshold()),
                    "accuracy": (sum(1 for s in scores if s >= self.custom_metric.get_threshold()) / len(scores)) * 100,
                    "average_score": sum(scores) / len(scores),
                    "min_score": min(scores),
                    "max_score": max(scores)
                } for role, scores in role_scores.items()
            },
            "detailed_results": results
        }
        
        return evaluation_results
    
    def save_evaluation_results(self, results: Dict[str, Any]) -> None:
        """
        Save evaluation results in multiple formats
        """
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        
        # Save JSON results
        json_filename = f"deepeval_translation_accuracy_{timestamp}.json"
        with open(json_filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        # Generate markdown report
        markdown_report = self._generate_markdown_report(results, timestamp)
        md_filename = f"deepeval_translation_accuracy_report_{timestamp}.md"
        with open(md_filename, 'w') as f:
            f.write(markdown_report)
        
        # Generate CSV for analysis
        csv_data = self._generate_csv_data(results)
        csv_filename = f"deepeval_translation_accuracy_data_{timestamp}.csv"
        with open(csv_filename, 'w') as f:
            f.write(csv_data)
        
        print(f"\n💾 RESULTS SAVED:")
        print(f"📊 JSON: {json_filename}")
        print(f"📄 Report: {md_filename}")
        print(f"📈 CSV: {csv_filename}")
    
    def _generate_markdown_report(self, results: Dict[str, Any], timestamp: str) -> str:
        """
        Generate comprehensive markdown report
        """
        metadata = results["evaluation_metadata"]
        overall = results["overall_results"]
        
        report = f"""# AI.TTORNEY Legal Translation Accuracy - DeepEval Evaluation
*Generated on {timestamp}*

## Executive Summary

This report presents the results of automated legal translation accuracy evaluation using DeepEval framework with the custom LegalTranslationAccuracyMetric. The evaluation is based on the same test cases that achieved 100% accuracy in professional translator review.

### Key Results
- **Total Test Cases**: {overall['total_tests']}
- **Accuracy Rate**: {overall['accuracy_rate']:.1f}%
- **Average Score**: {overall['average_score']:.3f}
- **Baseline Comparison**: {overall['baseline_difference']:+.1f}% (vs. 100% manual review)
- **Assessment**: {overall['assessment']}

### Evaluation Configuration
- **Framework**: DeepEval with custom LegalTranslationAccuracyMetric
- **Evaluation Model**: {metadata['evaluation_model']}
- **Threshold**: {metadata['threshold']:.0%}
- **Baseline Method**: {metadata['baseline_method']}
- **Legal Categories**: Civil, Family, Consumer, Criminal, Labor Law

## Performance Analysis

### Overall Performance
The automated evaluation achieved {overall['accuracy_rate']:.1f}% accuracy, which is {abs(overall['baseline_difference']):.1f}% {'lower' if overall['baseline_difference'] < 0 else 'higher'} than the manual translator review baseline of 100%.

### Performance by Legal Category
"""
        
        for category, perf in results["category_performance"].items():
            report += f"""
**{category}**
- Total Tests: {perf['total']}
- Accuracy: {perf['accuracy']:.1f}%
- Average Score: {perf['average_score']:.3f}
- Score Range: {perf['min_score']:.3f} - {perf['max_score']:.3f}
"""
        
        report += "\n### Performance by User Role\n"
        
        for role, perf in results["role_performance"].items():
            report += f"""
**{role.title()} Chatbot**
- Total Tests: {perf['total']}
- Accuracy: {perf['accuracy']:.1f}%
- Average Score: {perf['average_score']:.3f}
- Score Range: {perf['min_score']:.3f} - {perf['max_score']:.3f}
"""
        
        report += f"""
## Technical Details

### Custom Metric Specifications
The LegalTranslationAccuracyMetric evaluates four key dimensions:

1. **Meaning Preservation** (25% weight): Ensures legal meaning is accurately translated
2. **Legal Terminology** (25% weight): Validates correct Filipino/Taglish legal terms
3. **Legal Consequences** (25% weight): Checks accuracy of modal verbs (may/must/shall)
4. **Language Fidelity** (25% weight): Assesses natural Filipino/Taglish expression

### Evaluation Process
Each test case is evaluated using GPT-4o as an LLM-judge with structured rubric:
- Comprehensive prompt with legal context
- Structured JSON response with detailed scoring
- Critical error identification for legal misunderstandings
- Fallback heuristic evaluation for robustness

## Recommendations

"""
        
        if overall['accuracy_rate'] >= 95:
            report += "✅ **EXCELLENT**: The automated evaluation closely matches manual translator review. The system is ready for production use.\n\n"
        elif overall['accuracy_rate'] >= 85:
            report += "⚠️ **GOOD**: The automated evaluation shows reasonable correlation with manual review. Consider fine-tuning the evaluation threshold.\n\n"
        else:
            report += "❌ **NEEDS IMPROVEMENT**: Significant deviation from manual baseline. Review evaluation criteria and consider adjusting the metric.\n\n"
        
        report += """### Integration Recommendations

1. **CI/CD Integration**: Incorporate this evaluation into your testing pipeline
2. **Continuous Monitoring**: Track translation accuracy over time
3. **Threshold Adjustment**: Consider fine-tuning based on production data
4. **Expansion**: Add more test cases for broader coverage

## Conclusion

The LegalTranslationAccuracyMetric provides a robust, automated approach to evaluating legal translation quality that closely mirrors professional translator assessment. This enables continuous quality assurance at scale while maintaining the high standards required for legal applications.

---

*This evaluation demonstrates the feasibility of automating translation quality assessment while maintaining correlation with expert human evaluation.*
"""
        
        return report
    
    def _generate_csv_data(self, results: Dict[str, Any]) -> str:
        """
        Generate CSV data for analysis
        """
        csv_lines = []
        csv_lines.append("Query_ID,Legal_Category,Role,Score,Passed,Evaluation_Method")
        
        for result in results["detailed_results"]:
            csv_lines.append(
                f"{result['query_id']},{result['legal_category']},"
                f"{result.get('role', 'unknown')},{result['score']:.3f},"
                f"{result['passed']},{result['evaluation_method']}"
            )
        
        return "\n".join(csv_lines)


# Example usage
async def main():
    """
    Main execution function demonstrating integration
    """
    print("🚀 AI.TTORNEY TRANSLATION ACCURACY - DEEPEVAL INTEGRATION")
    print("=" * 70)
    print("This demonstrates how to integrate LegalTranslationAccuracyMetric")
    print("with DeepEval framework for automated translation evaluation")
    print()
    
    # Create integration instance
    integration = TranslationAccuracyIntegration()
    
    # Run evaluation
    results = await integration.run_deepeval_evaluation()
    
    # Save results
    integration.save_evaluation_results(results)
    
    print(f"\n✅ Integration completed successfully!")
    print(f"📊 Overall accuracy: {results['overall_results']['accuracy_rate']:.1f}%")
    print(f"🎯 Assessment: {results['overall_results']['assessment']}")


if __name__ == "__main__":
    asyncio.run(main())
