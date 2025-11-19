# Testing Web Search RAG Integration

This guide explains how to test if your Google API credentials are working correctly for the Web Search RAG feature.

## Quick Test Commands

### 1. Check if .env keys are loaded
```bash
python test_env_keys.py
```

This will show you:
- ✅ Which API keys are present
- ❌ Which keys are missing
- Masked values for security

### 2. Test Google API credentials
```bash
python test_google_api.py
```

This will:
- Verify API keys are set
- Make a real API call to Google
- Show sample search results
- Test the WebSearchService class

**Note:** The search automatically includes authoritative Philippine legal sources:
- Official Gazette
- LawPhil
- Supreme Court of the Philippines

## Expected Output

### ✅ Success Output
```
======================================================================
🔍 TESTING GOOGLE CUSTOM SEARCH API CREDENTIALS
======================================================================

📋 Step 1: Checking environment variables...
----------------------------------------------------------------------
✅ GOOGLE_API_KEY found: AIzaSyBkMxY1234...abcd
✅ GOOGLE_CSE_ID found: 1234567890abcdef

📋 Step 2: Testing API connection...
----------------------------------------------------------------------
🔍 Searching for: 'Philippine labor law'
📡 Making request to: https://www.googleapis.com/customsearch/v1

✅ API request successful!

✅ Found 3 search results

📄 Sample Results:
----------------------------------------------------------------------

1. Labor Code of the Philippines - DOLE
   URL: https://www.dole.gov.ph/labor-code/
   Snippet: The Labor Code of the Philippines is the legal code governing employment practices...

2. Philippine Labor Laws - LawPhil
   URL: https://lawphil.net/statutes/presdecs/pd1975/pd_442_1975.html
   Snippet: Presidential Decree No. 442, as amended, otherwise known as the Labor Code...

3. Employee Rights in the Philippines
   URL: https://www.officialgazette.gov.ph/labor-laws/
   Snippet: Know your rights as an employee under Philippine labor law...

======================================================================
✅ SUCCESS! Your Google API credentials are working correctly!
======================================================================
```

### ❌ Common Error Outputs

#### Missing API Key
```
❌ GOOGLE_API_KEY is not set in .env file
   Please add: GOOGLE_API_KEY=your_api_key_here
```

**Solution:** Add the key to your `.env` file

#### Invalid API Key
```
❌ Bad Request (400)
   Error: API key not valid. Please pass a valid API key.

💡 Solution:
   1. Check your GOOGLE_API_KEY in .env file
   2. Verify the API key is enabled in Google Cloud Console
   3. Make sure Custom Search API is enabled
```

**Solution:** 
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new API key or verify existing one
3. Enable "Custom Search API"

#### Quota Exceeded
```
❌ Forbidden (403)
   Error: Quota exceeded for quota metric 'Queries' and limit 'Queries per day'

💡 Solution:
   You've exceeded your daily quota (100 free searches/day)
   Wait 24 hours or upgrade to a paid plan
```

**Solution:** Wait 24 hours or upgrade to paid tier

## Setting Up Google API Credentials

### Step 1: Get Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **API Key**
5. Copy the API key
6. Click **Restrict Key** and enable **Custom Search API**

### Step 2: Create Custom Search Engine

1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click **Add** to create a new search engine
3. Configure:
   - **Sites to search:** Leave empty or add specific legal sites
   - **Search the entire web:** Enable this option
   - **Name:** "Philippine Legal Search" (or any name)
4. Click **Create**
5. Copy the **Search Engine ID** (looks like: `1234567890abcdef`)

### Step 3: Add to .env File

Add these lines to your `server/.env` file:

```bash
# Google Custom Search API (for web search RAG)
GOOGLE_API_KEY=AIzaSyBkMxY1234567890abcdefghijklmnop
GOOGLE_CSE_ID=1234567890abcdef:1234567890
```

## Testing in the Chatbot

### 1. Start the Server
```bash
cd server
uvicorn main:app --reload
```

### 2. Ask a Legal Question

Send a request to the chatbot API:

```bash
curl -X POST http://localhost:8000/api/chatbot/user/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the requirements for annulment in the Philippines?",
    "max_tokens": 500
  }'
```

### 3. Check the Logs

Look for these messages in the server logs:

```
🔍 [STEP 7] Enhanced RAG with web search...
   📡 Connecting to Qdrant Cloud...
⏱️  Search took: 1.23s
   Found 8 relevant sources
   🌐 Web search triggered: hybrid
   📊 Qdrant: 3, Web: 5
```

**Indicators:**
- `🌐 Web search triggered: hybrid` - Both Qdrant and web search used
- `🌐 Web search triggered: web_only` - Only web search used (no Qdrant results)
- No web search message - Qdrant confidence was high enough (≥ 0.8)

## Confidence Threshold Behavior

The system uses a **0.8 confidence threshold**:

| Qdrant Score | Behavior | Sources Used |
|--------------|----------|--------------|
| ≥ 0.8 | High confidence | Qdrant only |
| < 0.8 | Low confidence | Qdrant + Web Search |
| 0 results | No matches | Web Search only |

## Troubleshooting

### Issue: "Web search is disabled (missing API credentials)"

**Cause:** API keys not found in environment

**Solution:**
1. Check `.env` file exists in `server/` directory
2. Verify keys are present: `python test_env_keys.py`
3. Restart the server after adding keys

### Issue: "Request timed out"

**Cause:** Network connectivity issues

**Solution:**
1. Check internet connection
2. Try again (might be temporary)
3. Check firewall settings

### Issue: "No results returned"

**Cause:** Custom Search Engine not configured properly

**Solution:**
1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Edit your search engine
3. Enable "Search the entire web"
4. Save changes

## Cost Considerations

### Free Tier
- **100 searches per day** (free)
- Resets at midnight Pacific Time
- Sufficient for development/testing

### Paid Tier
- **$5 per 1,000 queries** after free tier
- Up to 10,000 queries per day
- Only needed for production with high traffic

### Optimization
The system includes caching (1 hour TTL) to minimize API calls:
- Same query within 1 hour = cached result (no API call)
- Different queries = new API call

## Next Steps

Once your API keys are working:

1. ✅ Test with various legal questions
2. ✅ Monitor logs for web search triggers
3. ✅ Check response quality with web sources
4. ✅ Adjust confidence threshold if needed (in `web_search_service.py`)

## Support

If you encounter issues:
1. Run `python test_env_keys.py` - Check keys are loaded
2. Run `python test_google_api.py` - Test API connection
3. Check server logs for detailed error messages
4. Verify Google Cloud Console settings
