# AI.ttorney Bilingual Legal Chatbot - Setup Guide

## Overview
This guide will help you set up the bilingual (English & Filipino) legal chatbot that uses scraped Philippine legal data as its knowledge base.

## Architecture
- **Backend**: FastAPI with OpenAI GPT-4o-mini
- **Frontend**: React Native (Expo) with TypeScript
- **Knowledge Base**: Scraped legal documents (Consumer Act, Revised Penal Code, Family Code)
- **Retrieval**: RAG (Retrieval Augmented Generation) with embeddings

---

## Prerequisites

### Required Software
- Python 3.9+ (for backend)
- Node.js 16+ (for frontend)
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Required Python Packages
```bash
pip install -r server/requirements.txt
```

### Required Node Packages
```bash
cd client
npm install axios
```

---

## Setup Instructions

### Step 1: Configure Environment Variables

1. Copy the example environment file:
```bash
cd server
cp .env.example .env
```

2. Edit `.env` and add your OpenAI API key:
```env
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

### Step 2: Run Web Scrapers (If Not Already Done)

Run the scraper scripts to collect legal data:

```bash
cd server/scripts

# Scrape Consumer Act
python consumer_act_scraper.py

# Scrape Revised Penal Code
python revised_penal_code_scraper.py

# Scrape Family Code
python family_law_scraper.py
```

**Output**: JSON files will be saved to `server/data/raw/`

### Step 3: Preprocess Legal Data

Clean and structure the scraped data:

```bash
cd server/data
python preprocess_data.py
```

**Output**: 
- `server/data/processed/legal_knowledge.jsonl` (structured legal text chunks)
- Summary statistics showing number of chunks per source

**Expected Output**:
```
🚀 Starting data preprocessing for AI.ttorney Legal Chatbot
📂 Found 3 JSON files to process
📄 Processing: consumer_act.json
✅ Processed 245 chunks from consumer_act.json
📄 Processing: revised_penal_code.json
✅ Processed 512 chunks from revised_penal_code.json
📄 Processing: family_code.json
✅ Processed 189 chunks from family_code.json
💾 Saving 946 processed chunks to legal_knowledge.jsonl
✅ Preprocessing complete!
```

### Step 4: Generate Embeddings

Create vector embeddings for semantic search:

```bash
cd server/data
python generate_embeddings.py
```

**Output**: 
- `server/data/embeddings/embeddings.pkl` (vector embeddings + metadata)
- This will take a few minutes depending on the amount of data
- Cost: ~$0.10-0.50 depending on data size (using text-embedding-3-small)

**Expected Output**:
```
🚀 Starting embeddings generation for AI.ttorney Legal Chatbot
📥 Loading processed data...
✅ Loaded 946 text chunks
🔄 Generating embeddings in batches of 100...
Processing batches: 100%|██████████| 10/10
✅ Generated 946 embeddings
💾 Saving embeddings to embeddings.pkl...
✅ Embeddings saved successfully!
```

**Optional - Test Embeddings**:
```bash
python generate_embeddings.py test
```

### Step 5: Start the Backend Server

```bash
cd server
python main.py
```

**Expected Output**:
```
INFO:     AI.ttorney API starting up...
INFO:     ✅ Supabase connection established
INFO:     Starting server on 0.0.0.0:8000
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Test the chatbot API**:
```bash
# Health check
curl http://localhost:8000/api/chatbot/health

# Test chat
curl -X POST http://localhost:8000/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are consumer rights in the Philippines?"}'
```

### Step 6: Configure Frontend

1. Update the API URL in your `.env` file (client):
```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

2. For network testing (use your actual IP):
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```

### Step 7: Start the Frontend

```bash
cd client
npm start
# or
npx expo start
```

Navigate to the chatbot screen and start asking legal questions!

---

## Usage Examples

### English Questions
- "What are my rights as a consumer?"
- "What is the penalty for theft in the Philippines?"
- "How do I file for annulment?"

### Filipino Questions
- "Ano ang mga karapatan ko bilang consumer?"
- "Ano ang parusa sa pagnanakaw sa Pilipinas?"
- "Paano mag-file ng annulment?"

---

## File Structure

```
server/
├── data/
│   ├── raw/                          # Scraped JSON files
│   │   ├── consumer_act.json
│   │   ├── revised_penal_code.json
│   │   └── family_code.json
│   ├── processed/                    # Cleaned structured data
│   │   └── legal_knowledge.jsonl
│   ├── embeddings/                   # Vector embeddings
│   │   └── embeddings.pkl
│   ├── preprocess_data.py           # Data cleaning script
│   └── generate_embeddings.py       # Embeddings generation script
├── routes/
│   └── chatbot.py                   # Chatbot API endpoints
├── main.py                          # FastAPI server
└── requirements.txt                 # Python dependencies

client/
└── app/
    └── chatbot.tsx                  # Chat UI component
```

---

## API Endpoints

### POST /api/chatbot/chat
Send a message to the chatbot.

**Request**:
```json
{
  "message": "What are consumer rights?",
  "conversation_history": [
    {"role": "user", "content": "Previous question"},
    {"role": "assistant", "content": "Previous answer"}
  ]
}
```

**Response**:
```json
{
  "response": "Consumer rights in the Philippines include...",
  "sources": [
    {
      "law": "Consumer Act of the Philippines",
      "article": "2",
      "title": "Basic Rights of Consumers",
      "relevance": 0.892
    }
  ],
  "language": "en"
}
```

### GET /api/chatbot/health
Check if the chatbot service is ready.

**Response**:
```json
{
  "status": "healthy",
  "embeddings_loaded": true,
  "api_key_configured": true,
  "total_knowledge_chunks": 946,
  "model": "gpt-4o-mini"
}
```

---

## Troubleshooting

### Issue: "Embeddings file not found"
**Solution**: Run `python generate_embeddings.py` to create embeddings.

### Issue: "OpenAI API key not configured"
**Solution**: Add `OPENAI_API_KEY` to your `.env` file.

### Issue: "No JSON files found in raw/"
**Solution**: Run the scraper scripts first to generate legal data.

### Issue: Frontend can't connect to backend
**Solution**: 
- Check that backend is running on port 8000
- Update `EXPO_PUBLIC_API_URL` with correct IP address
- For physical devices, use your computer's network IP, not localhost

### Issue: Slow response times
**Solution**: 
- Reduce `TOP_K_RESULTS` in `chatbot.py` (default: 5)
- Use a faster model like `gpt-3.5-turbo` instead of `gpt-4o-mini`

---

## Cost Estimates

### Embeddings Generation (One-time)
- **Model**: text-embedding-3-small
- **Cost**: ~$0.10-0.50 for ~1000 chunks
- **Frequency**: Only when adding new legal data

### Chat Requests (Per message)
- **Model**: gpt-4o-mini
- **Cost**: ~$0.001-0.005 per message
- **Includes**: Context retrieval + response generation

---

## Adding More Legal Data

1. Create a new scraper in `server/scripts/`
2. Save output to `server/data/raw/`
3. Re-run preprocessing: `python preprocess_data.py`
4. Re-generate embeddings: `python generate_embeddings.py`
5. Restart the backend server

The chatbot will automatically use the new data!

---

## Production Deployment

### Backend
1. Set `NODE_ENV=production` in `.env`
2. Use a production WSGI server (e.g., Gunicorn)
3. Enable HTTPS
4. Restrict CORS origins
5. Add rate limiting

### Frontend
1. Update `EXPO_PUBLIC_API_URL` to production URL
2. Build production app: `expo build`
3. Deploy to app stores

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review FastAPI logs for backend errors
3. Check browser/app console for frontend errors
4. Verify OpenAI API key is valid and has credits

---

## License & Disclaimer

This chatbot is for **educational purposes only**. It does not provide legal advice and does not create a lawyer-client relationship. Users should consult with licensed attorneys for legal advice.

The scraped legal data is publicly available from LawPhil and other government sources.
