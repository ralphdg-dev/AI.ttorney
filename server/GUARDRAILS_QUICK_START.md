# Guardrails AI - Quick Start Guide
## Get up and running in 5 minutes

---

## ⚡ Fastest Installation

### Windows
```powershell
cd server
.\install_guardrails.ps1
```

### Linux/Mac
```bash
cd server
chmod +x install_guardrails.sh
./install_guardrails.sh
```

---

## 📦 Manual Installation (3 Commands)

```bash
# 1. Install Guardrails AI
pip install guardrails-ai

# 2. Configure with your API key
guardrails configure

# 3. Install basic validators
guardrails hub install hub://guardrails/toxic_language
guardrails hub install hub://guardrails/bias_check
guardrails hub install hub://guardrails/sensitive_topics
```

---

## ⚙️ Configuration (.env file)

Add these to your `.env` file:

```bash
AITTORNEY_GUARDRAIL_API=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnaXRodWJ8MTk1MTE3MzcxIiwiYXBpS2V5SWQiOiI3NjJiYmIzYS04ZDRhLTQ5ZTMtYWNiOS00NjU1ZmQzMGYyZjUiLCJzY29wZSI6InJlYWQ6cGFja2FnZXMiLCJwZXJtaXNzaW9ucyI6W10sImlhdCI6MTc2MDcwNzg1MSwiZXhwIjo0OTE0MzA3ODUxfQ.MNzNwPWsQdit8T4qwEH5pzz1D7YdSndP6plTatmoooY
ENABLE_GUARDRAILS=true
GUARDRAILS_STRICT_MODE=true
GUARDRAILS_LOG_SECURITY_EVENTS=true
GUARDRAILS_MAX_RETRIES=2
GUARDRAILS_TIMEOUT_SECONDS=30
```

---

## ✅ Test Installation

```bash
# Quick test
python -c "from config.guardrails_config import get_guardrails_instance; print('✅ Success')"

# Full test suite
python data/test_guardrails.py
```

---

## 🔍 Verify Validators

```bash
guardrails hub list
```

Expected output:
```
✅ toxic_language
✅ bias_check
✅ sensitive_topics
```

---

## 🚨 Common Issues

### Issue: "Module not found"
```bash
pip install guardrails-ai
```

### Issue: "Validator not installed"
```bash
guardrails hub install hub://guardrails/validator_name
```

### Issue: Python 3.13 compatibility
**Solution**: Use Python 3.11 or 3.12 for full support

---

## 📚 Full Documentation

- **Installation Guide**: `INSTALL_GUARDRAILS.md`
- **Setup Guide**: `GUARDRAILS_SETUP.md` (in project root)
- **Test Suite**: `python data/test_guardrails.py`

---

## 🎯 What You Get

✅ **Input Validation** - Blocks toxic language, bias, sensitive topics
✅ **Output Validation** - Prevents hallucinations, ensures accuracy
✅ **Security Reporting** - Comprehensive security scores and logs
✅ **Legal Compliance** - PII protection, professional standards

---

## 🔗 Quick Links

- [Guardrails Docs](https://docs.guardrailsai.com/)
- [Guardrails Hub](https://hub.guardrailsai.com/)
- [Test Your Setup](data/test_guardrails.py)

---

## 💡 Pro Tips

1. **Start with strict mode OFF** for testing: `GUARDRAILS_STRICT_MODE=false`
2. **Check logs** for security events: `grep "lawyer_chatbot_security" server.log`
3. **Test health endpoint**: `curl http://localhost:8000/api/chatbot/lawyer/health`

---

**Need Help?** Check `INSTALL_GUARDRAILS.md` for detailed troubleshooting.
