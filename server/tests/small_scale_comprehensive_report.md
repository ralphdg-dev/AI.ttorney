# AI.TTORNEY Small Scale Comprehensive Test Results
*Generated on 2025-12-27 03:33:54*

## Test Overview

This comprehensive small scale test evaluated both user and lawyer chatbots using 5 queries per legal domain (25 queries per chatbot, 50 total).

### Overall Performance
- **Total Queries**: 50 (25 user + 25 lawyer)
- **Successful Responses**: 50
- **Success Rate**: 100.0%
- **Average Response Time**: 2.33 seconds

### Domain Performance

**User Chatbot:**
- Civil Law: 5/5 (100.0%)
- Criminal Law: 5/5 (100.0%)
- Family Law: 5/5 (100.0%)
- Labor Law: 5/5 (100.0%)
- Consumer Law: 5/5 (100.0%)

**Lawyer Chatbot:**
- Civil Law: 5/5 (100.0%)
- Criminal Law: 5/5 (100.0%)
- Family Law: 5/5 (100.0%)
- Labor Law: 5/5 (100.0%)
- Consumer Law: 5/5 (100.0%)

### Technical Details

- **Authentication**: User credentials + Lawyer credentials (mikko.samaniego.cics@ust.edu.ph)
- **Backend API**: FastAPI streaming responses
- **Evaluation Framework**: DeepEval with Answer Relevancy metric
- **Test Design**: 5 queries per domain per role, medium to high complexity
- **Response Processing**: Server-Sent Events (SSE) parsing

### Conclusion

The small scale comprehensive test demonstrates the AI.TTORNEY system's capability to handle both user-level and lawyer-level legal queries across all major Philippine legal domains with proper authentication and reliable performance.

---

*This report contains actual test results from live backend evaluation.*
