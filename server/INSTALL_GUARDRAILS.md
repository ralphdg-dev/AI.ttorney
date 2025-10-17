# Guardrails AI Installation Guide
## AI.ttorney Lawyer Chatbot Security Setup

This guide will walk you through installing and configuring Guardrails AI for the AI.ttorney lawyer chatbot.

---

## 📋 Prerequisites

### Python Version Requirements
- ✅ **Recommended**: Python 3.11 or 3.12 (full compatibility)
- ⚠️ **Limited Support**: Python 3.13 (basic validation only, lxml issues)

### Check Your Python Version
```bash
python --version
# or
python3 --version
```

---

## 🚀 Quick Start (Automated Installation)

### Windows (PowerShell)
```powershell
cd server
.\install_guardrails.ps1
```

### Linux/Mac (Bash)
```bash
cd server
chmod +x install_guardrails.sh
./install_guardrails.sh
```

The automated scripts will:
1. Check Python version compatibility
2. Install Guardrails AI core
3. Install required dependencies
4. Configure Guardrails Hub
5. Install security validators
6. Test the installation
7. Verify environment configuration

---

## 📝 Manual Installation (Step-by-Step)

### Step 1: Navigate to Server Directory
```bash
cd server
```

### Step 2: Install Guardrails AI Core
```bash
pip install guardrails-ai
```

### Step 3: Install Core Dependencies
```bash
pip install torch transformers peft jinja2
```

**Note**: On Python 3.13, some dependencies may fail to install due to lxml compilation issues. This is expected.

### Step 4: Configure Guardrails Hub

Set your API key as an environment variable:

**Windows (PowerShell):**
```powershell
$env:GUARDRAILS_API_KEY="your-api-key-here"
```

**Linux/Mac (Bash):**
```bash
export GUARDRAILS_API_KEY="your-api-key-here"
```

Then configure:
```bash
guardrails configure
```

### Step 5: Install Security Validators

#### Basic Validators (Recommended)
```bash
guardrails hub install hub://guardrails/toxic_language
guardrails hub install hub://guardrails/bias_check
guardrails hub install hub://guardrails/sensitive_topics
guardrails hub install hub://guardrails/restrict_to_topic
guardrails hub install hub://guardrails/regex_match
```

#### Advanced Validators (Optional)
```bash
guardrails hub install hub://guardrails/llamaguard_7b
guardrails hub install hub://groundedai/grounded_ai_hallucination
```

**Note**: Advanced validators require additional dependencies and may take longer to install.

### Step 6: Verify Installation
```bash
# List installed validators
guardrails hub list

# Test configuration
python -c "from config.guardrails_config import get_guardrails_instance; print('✅ Guardrails loaded successfully')"
```

### Step 7: Configure Environment Variables

Copy the example configuration:
```bash
# Copy example to your .env file
cat .env.guardrails.example >> .env
```

Or manually add these to your `.env` file:
```bash
# Guardrails API Key
AITTORNEY_GUARDRAIL_API=your-api-key-here

# Guardrails Configuration
ENABLE_GUARDRAILS=true
GUARDRAILS_STRICT_MODE=true
GUARDRAILS_LOG_SECURITY_EVENTS=true
GUARDRAILS_MAX_RETRIES=2
GUARDRAILS_TIMEOUT_SECONDS=30
```

### Step 8: Run Tests
```bash
python data/test_guardrails.py
```

---

## 🧪 Testing Your Installation

### Basic Test
```bash
python -c "from config.guardrails_config import get_guardrails_instance; print('✅ Success')"
```

### Full Test Suite
```bash
python data/test_guardrails.py
```

The test suite will:
- Test input validation with various scenarios
- Test output validation with legal responses
- Generate security reports
- Verify configuration settings

### Expected Output
```
================================================================================
  GUARDRAILS AI SECURITY TEST SUITE
  AI.ttorney Lawyer Chatbot
================================================================================

✅ Loaded 5 Guardrails validators: ['ToxicLanguage', 'BiasCheck', ...]

Testing Input Validation
Test 1: Normal Legal Question
✅ Result: PASSED validation

Testing Output Validation
Test 1: Professional Legal Response
✅ Result: PASSED validation

Testing Security Report Generation
✅ Security Report Generated Successfully
   Security Score: 1.0
   Security Level: HIGH
```

---

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_GUARDRAILS` | `true` | Enable/disable Guardrails AI |
| `GUARDRAILS_STRICT_MODE` | `true` | Block failed validations (true) or log warnings (false) |
| `GUARDRAILS_LOG_SECURITY_EVENTS` | `true` | Log all security validation events |
| `GUARDRAILS_MAX_RETRIES` | `2` | Number of retry attempts for failed validations |
| `GUARDRAILS_TIMEOUT_SECONDS` | `30` | Maximum time for validation operations |

### Strict Mode

**Enabled (Recommended for Production)**
- Blocks requests/responses that fail security validation
- Ensures maximum security compliance
- May reject some legitimate edge cases

**Disabled (Recommended for Testing)**
- Logs security issues but allows processing
- Useful for debugging and development
- Not recommended for production

---

## 🐛 Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'guardrails'"
**Solution**: Install Guardrails AI
```bash
pip install guardrails-ai>=0.4.0
```

### Issue: "Validator not installed"
**Solution**: Install the missing validator
```bash
guardrails hub install hub://guardrails/validator_name
```

### Issue: lxml compilation errors (Python 3.13)
**Solution**: This is a known compatibility issue with Python 3.13
- **Option 1**: Use Python 3.11 or 3.12 (recommended)
- **Option 2**: Continue with basic validation (limited functionality)

### Issue: High latency / slow responses
**Solution**: Optimize validation settings
- Reduce `GUARDRAILS_TIMEOUT_SECONDS`
- Disable non-critical validators in `config/guardrails_config.py`
- Set `GUARDRAILS_STRICT_MODE=false` for testing

### Issue: Too many legitimate requests blocked
**Solution**: Adjust validation thresholds
- Set `GUARDRAILS_STRICT_MODE=false`
- Modify validator thresholds in `config/guardrails_config.py`
- Review and adjust sensitive topics list

---

## 📊 Monitoring & Logs

### View Security Events
```bash
# View all security events
grep "lawyer_chatbot_security" server.log

# Monitor validation failures
grep "Security issue detected" server.log

# Check processing times
grep "Request processed" server.log
```

### Health Check Endpoint
```bash
curl http://localhost:8000/api/chatbot/lawyer/health
```

Response includes:
- Guardrails availability
- Installed validators
- Configuration settings
- System status

---

## 📚 Additional Resources

- **Official Documentation**: https://docs.guardrailsai.com/
- **Guardrails Hub**: https://hub.guardrailsai.com/
- **Project Documentation**: See `GUARDRAILS_SETUP.md` in project root
- **Test Suite**: Run `python data/test_guardrails.py`

---

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs**: Review security event logs for specific errors
2. **Test with strict mode off**: Set `GUARDRAILS_STRICT_MODE=false`
3. **Verify installation**: Run `guardrails hub list`
4. **Review documentation**: Check `GUARDRAILS_SETUP.md`
5. **Contact support**: Provide security event logs and error messages

---

## ✅ Installation Checklist

- [ ] Python 3.11 or 3.12 installed (or 3.13 with limitations)
- [ ] Guardrails AI core installed
- [ ] Core dependencies installed (torch, transformers, peft, jinja2)
- [ ] Guardrails Hub configured with API key
- [ ] Security validators installed
- [ ] Environment variables configured in `.env`
- [ ] Configuration file exists at `config/guardrails_config.py`
- [ ] Test suite runs successfully
- [ ] Health check endpoint responds correctly

---

## 🎉 Success!

Once all steps are complete, your AI.ttorney lawyer chatbot will have:
- ✅ Input validation for user questions
- ✅ Output validation for AI responses
- ✅ Toxic language detection
- ✅ Bias detection and prevention
- ✅ Hallucination detection
- ✅ Sensitive topics filtering
- ✅ Comprehensive security reporting
- ✅ Audit logging for compliance

Your chatbot is now secured with enterprise-grade AI safety measures!
