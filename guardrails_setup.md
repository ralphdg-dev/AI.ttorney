# Guardrails AI Security Setup for Lawyer Chatbot

## ⚠️ **Python Version Compatibility**

**Recommended:** Python 3.11 or 3.12 for full Guardrails AI support
**Current:** Python 3.13 - Basic security validation only (Guardrails AI compatibility issues)
### **Python Version Status:**
- ✅ **Python 3.11/3.12**: Full Guardrails AI compatibility with all advanced validators
- ⚠️ **Python 3.13**: Basic security validation only (lxml compilation issues)

## Complete Installation Guide

### add this to .env

```bash
#Guardrail API Key
AITTORNEY_GUARDRAIL_API=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnaXRodWJ8MTk1MTE3MzcxIiwiYXBpS2V5SWQiOiI3NjJiYmIzYS04ZDRhLTQ5ZTMtYWNiOS00NjU1ZmQzMGYyZjUiLCJzY29wZSI6InJlYWQ6cGFja2FnZXMiLCJwZXJtaXNzaW9ucyI6W10sImlhdCI6MTc2MDcwNzg1MSwiZXhwIjo0OTE0MzA3ODUxfQ.MNzNwPWsQdit8T4qwEH5pzz1D7YdSndP6plTatmoooY

### **Step 1: Navigate to Server Directory**
```bash
cd server
```

### **Step 2: Install Guardrails AI Core**
```bash
pip install guardrails-ai

# Install required dependencies for advanced validators
pip install torch transformers peft jinja2
```

### **Step 3: Install Hub Validators**
```bash
# Install individual validators from Guardrails Hub
guardrails hub install hub://guardrails/toxic_language
guardrails hub install hub://guardrails/bias_check
guardrails hub install hub://guardrails/sensitive_topics
guardrails hub install hub://guardrails/restrict_to_topic
guardrails hub install hub://guardrails/regex_match

# Install advanced validators (requires additional dependencies)
guardrails hub install hub://guardrails/llamaguard_7b
guardrails hub install hub://groundedai/grounded_ai_hallucination
```

### **Step 4: Configure Guardrails Hub**
```bash
# Configure Guardrails Hub (if required)
guardrails configure

# Verify installation
guardrails hub list
```

### **Step 5: Update Project Dependencies**
```bash
# Install all project dependencies
pip install -r requirements.txt
```

### **Step 6: Environment Configuration**
Add these environment variables to your `.env` file:

```bash
# Guardrails AI Configuration
ENABLE_GUARDRAILS=true
GUARDRAILS_STRICT_MODE=true
GUARDRAILS_LOG_SECURITY_EVENTS=true
GUARDRAILS_MAX_RETRIES=2
GUARDRAILS_TIMEOUT_SECONDS=30
```

### **Step 7: Test Installation**
```bash
# Test Guardrails configuration
python3 -c "from config.guardrails_config import get_guardrails_instance; print('✅ Guardrails loaded successfully')"

# Run security tests
python3 test_guardrails.py
```

## Security Features

### Input Validation
- **Prompt Injection Protection**: Detects and blocks malicious prompt injection attempts
- **Toxic Language Detection**: Blocks inappropriate or offensive content
- **Bias Detection**: Identifies potential bias in user questions
- **Competitor Check**: Prevents competitive intelligence gathering
- **Sensitive Topics Filter**: Blocks questions about illegal or unethical activities

### Output Validation
- **Hallucination Detection**: Ensures AI responses are grounded in legal sources
- **Grounded AI Validation**: Additional layer of factual accuracy checking
- **LlamaGuard Content Safety**: Comprehensive content safety filtering
- **PII Filtering**: Prevents accidental exposure of sensitive information
- **Bias Check**: Ensures fair and unbiased legal advice
- **Toxic Language Filter**: Maintains professional response standards

## Configuration Options

### Strict Mode (`GUARDRAILS_STRICT_MODE=true`)
- **Enabled**: Blocks requests/responses that fail security validation
- **Disabled**: Logs security issues but allows processing to continue
- **Recommendation**: Enable for production environments

### Security Logging (`GUARDRAILS_LOG_SECURITY_EVENTS=true`)
- Logs all security validation events for monitoring and analysis
- Includes timestamps, validation results, and security scores
- Essential for security auditing and compliance

### Retry Logic (`GUARDRAILS_MAX_RETRIES=2`)
- Number of retry attempts for failed output validation
- Uses more conservative AI parameters on retries
- Helps recover from temporary validation failures

### Timeout (`GUARDRAILS_TIMEOUT_SECONDS=30`)
- Maximum time allowed for security validation
- Prevents hanging on complex validation tasks
- Balances security thoroughness with response time

## API Response Changes

With Guardrails enabled, the lawyer chatbot API responses now include:

```json
{
  "answer": "Legal response content...",
  "sources": [...],
  "confidence": "high",
  "language": "english",
  "legal_analysis": "...",
  "related_provisions": [...],
  "security_report": {
    "security_score": 0.95,
    "security_level": "HIGH",
    "issues_detected": 0,
    "issues": [],
    "recommendations": [],
    "timestamp": "2024-01-01T12:00:00Z",
    "guardrails_enabled": true
  }
}
```

## Health Check

Check guardrails status via the health endpoint:

```bash
curl http://localhost:8000/api/chatbot/lawyer/health
```

Response includes:
- Guardrails availability and configuration
- Security features list
- Validation settings
- System status

## Security Monitoring

Monitor security events in the application logs:

```bash
# View security events
grep "lawyer_chatbot_security" server.log

# Monitor validation failures
grep "Security issue detected" server.log

# Check processing times
grep "Request processed" server.log
```

## Troubleshooting

### Common Issues

1. **Import Error**: `ModuleNotFoundError: No module named 'guardrails'`
   - Solution: Run `pip install guardrails-ai>=0.4.0`

2. **Validator Not Found**: `ValidationError: Validator not installed`
   - Solution: Install missing validators with `guardrails hub install`

3. **High Latency**: Responses taking too long
   - Solution: Reduce `GUARDRAILS_TIMEOUT_SECONDS` or disable non-critical validators

4. **Too Many Blocks**: Legitimate requests being blocked
   - Solution: Set `GUARDRAILS_STRICT_MODE=false` for testing

### Performance Optimization

- **Disable unused validators** in `guardrails_config.py`
- **Adjust thresholds** for less sensitive validation
- **Use async validation** for better performance
- **Cache validation results** for repeated patterns

## Legal Compliance

Guardrails AI helps ensure:
- **Client Confidentiality**: PII detection prevents data leaks
- **Professional Standards**: Toxic language and bias detection
- **Ethical Guidelines**: Sensitive topics filtering
- **Accuracy Requirements**: Hallucination and grounding validation
- **Security Compliance**: Comprehensive threat detection

## Support

For issues with Guardrails AI integration:
1. Check the official documentation: https://docs.guardrailsai.com/
2. Review security logs for specific error messages
3. Test with `GUARDRAILS_STRICT_MODE=false` to isolate issues
4. Contact the development team with security event logs
