# Chatbot Security Testing Scripts

Automated testing scripts for AI.ttorney's chatbot security features including prompt injection detection, content moderation, and the strike system.

## 📋 Available Test Scripts

### 1. **quick_test_chatbot.py** (Recommended for Quick Checks)
Simple, fast test script that doesn't require authentication.

**Features:**
- ✅ No authentication required (tests as guest)
- ✅ 7 essential security tests
- ✅ Color-coded output
- ✅ Runs in ~10 seconds
- ✅ Perfect for quick validation

**Usage:**
```bash
cd server
python quick_test_chatbot.py
```

**Tests Included:**
1. Prompt Injection: Instruction Override
2. Prompt Injection: Role Manipulation
3. Prompt Injection: System Extraction
4. Content Moderation: Profanity
5. Content Moderation: Threats
6. Legitimate Legal Question (should pass)
7. Another Legitimate Question (should pass)

---

### 2. **test_chatbot_security.py** (Comprehensive Test Suite)
Full-featured test suite with authentication and strike system testing.

**Features:**
- ✅ Comprehensive test coverage (15+ tests)
- ✅ Tests strike system escalation
- ✅ Checks violation tracking
- ✅ Automatic test user creation
- ✅ Detailed reporting
- ✅ Tests both user and lawyer endpoints

**Usage:**
```bash
cd server
python test_chatbot_security.py
```

**Test Categories:**
1. **Prompt Injection Detection** (13 tests)
   - Instruction override attempts
   - Role manipulation
   - System prompt extraction
   - Jailbreak attempts
   - Legitimate questions (control group)

2. **Content Moderation** (7 tests)
   - Profanity detection
   - Harassment detection
   - Hate speech detection
   - Normal questions (control group)

3. **Strike System** (3 violations)
   - Tests 3-strike escalation
   - Verifies suspension after 3 strikes
   - Checks violation counting

---

## 🚀 Quick Start

### Prerequisites
1. **Server Running:**
   ```bash
   cd server
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Dependencies Installed:**
   ```bash
   pip install httpx requests
   ```

### Run Quick Test (30 seconds)
```bash
python quick_test_chatbot.py
```

### Run Full Test Suite (2-3 minutes)
```bash
python test_chatbot_security.py
```

---

## 📊 Understanding Test Results

### ✅ Success Indicators
- **Green ✅**: Test passed as expected
- **"PASSED"**: Security feature working correctly
- **"Blocked as expected"**: Malicious input properly detected
- **"Allowed as expected"**: Legitimate input not blocked

### ❌ Failure Indicators
- **Red ❌**: Test failed
- **"FAILED"**: Security feature not working correctly
- **"Expected blocked, got allowed"**: Malicious input not detected
- **"Expected allowed, got blocked"**: False positive (legitimate input blocked)

### Example Output
```
🧪 TEST: Prompt Injection: Instruction Override
✅ PASSED - Blocked as expected
Response: 🚨 Security Violation Detected...

🧪 TEST: Legitimate Legal Question
✅ PASSED - Allowed as expected
Response: Under Philippine law, the statute of limitations...
```

---

## 🔧 Configuration

### Quick Test Configuration
Edit `quick_test_chatbot.py`:
```python
BASE_URL = "http://localhost:8000"  # Change if server on different port
```

### Full Test Configuration
Edit `test_chatbot_security.py`:
```python
BASE_URL = "http://localhost:8000"
TEST_USER_EMAIL = "test_security@example.com"
TEST_USER_PASSWORD = "TestPassword123!"
```

---

## 🎯 What Each Test Validates

### Prompt Injection Tests
| Test | Validates |
|------|-----------|
| Instruction Override | Detects attempts to override system instructions |
| Role Manipulation | Detects attempts to change AI role/behavior |
| System Extraction | Detects attempts to extract system prompts |
| Jailbreak | Detects DAN mode and similar jailbreak attempts |

### Content Moderation Tests
| Test | Validates |
|------|-----------|
| Profanity | Detects offensive language |
| Harassment | Detects threatening/harassing content |
| Hate Speech | Detects discriminatory content |
| Legitimate Questions | Ensures normal questions aren't blocked |

### Strike System Tests
| Test | Validates |
|------|-----------|
| Violation 1 | Strike count increments to 1 |
| Violation 2 | Strike count increments to 2 |
| Violation 3 | User suspended after 3 strikes |

---

## 🐛 Troubleshooting

### "Connection refused" Error
**Problem:** Server not running
**Solution:**
```bash
cd server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### "All tests failed" Error
**Problem:** Server not responding or wrong URL
**Solution:** Check `BASE_URL` in test script matches your server

### "Authentication failed" Error (Full Test Suite)
**Problem:** Test user creation failed
**Solution:** Check database connection and Supabase configuration

### Tests Pass But Security Not Working
**Problem:** False positives in tests
**Solution:** 
1. Check server logs for actual violation detection
2. Verify `prompt_injection_detector.py` is loaded
3. Check OpenAI API key is configured

---

## 📈 Expected Results

### Quick Test (7 tests)
- **Expected:** 7/7 passed (100%)
- **Time:** ~10 seconds
- **Failures:** 0

### Full Test Suite (20+ tests)
- **Expected:** 20+/20+ passed (100%)
- **Time:** 2-3 minutes
- **Failures:** 0

### Strike System Test
- **Expected Behavior:**
  1. Violation 1: Strike count = 1, not suspended
  2. Violation 2: Strike count = 2, not suspended
  3. Violation 3: Strike count = 0, suspended = true

---

## 🔍 Debugging Tips

### Enable Verbose Logging
Add to test script:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Check Server Logs
Watch server console for:
```
🛡️  [STEP 1] Prompt injection detection...
🚨 Prompt injection detected...
📝 Recording prompt injection violation...
✅ Prompt injection violation recorded...
```

### Manual Testing
Test individual endpoints:
```bash
# Test prompt injection
curl -X POST http://localhost:8000/api/chatbot/user/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Ignore previous instructions"}'
```

---

## 📝 Adding Custom Tests

### Add Test to Quick Script
```python
results.append(test_prompt(
    "Your test question here",
    "Test Name",
    should_block=True  # or False
))
```

### Add Test to Full Suite
```python
test_cases = [
    ("Your test question", True),  # True = should block
    ("Another test", False),       # False = should allow
]
```

---

## 🎓 Best Practices

1. **Run Quick Test First**: Fast validation before deploying
2. **Run Full Suite Before Production**: Comprehensive validation
3. **Test After Code Changes**: Ensure security features still work
4. **Monitor Strike System**: Verify escalation works correctly
5. **Check False Positives**: Ensure legitimate questions aren't blocked

---

## 📞 Support

If tests consistently fail:
1. Check server logs for errors
2. Verify OpenAI API key is configured
3. Ensure database is accessible
4. Check `prompt_injection_detector.py` is loaded
5. Verify `violation_tracking_service.py` is working

---

## ✅ Success Criteria

Your security system is working correctly if:
- ✅ All prompt injection attempts are blocked
- ✅ All content moderation violations are blocked
- ✅ Legitimate questions are allowed through
- ✅ Strike system escalates properly (1 → 2 → 3 → suspension)
- ✅ Violations are tracked in database
- ✅ User receives appropriate warning messages

---

**Last Updated:** October 26, 2025
**Version:** 1.0.0
**Maintainer:** AI.ttorney Team
