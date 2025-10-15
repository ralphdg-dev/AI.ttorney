# 🤖 AI.ttorney Legal Chatbot Setup Guide

Complete guide to set up and use the RAG-powered legal chatbot.

---

## 📋 Prerequisites

1. **Embeddings Generated** ✅ (You already have this!)
   - File: `embeddings/embeddings.pkl`
   - Contains 3,456 legal text chunks with embeddings

2. **OpenAI API Key** 
   - Make sure your `.env` file has: `OPENAI_API_KEY=your_key_here`
   - Need credits for embeddings and chat completions

3. **Python Packages**
   ```bash
   pip install chromadb openai python-dotenv tqdm fastapi uvicorn
   ```

---

## 🚀 Step-by-Step Setup

### Step 1: Upload Embeddings to ChromaDB

```bash
cd server/data
python upload_to_chromadb.py
```

**What this does:**
- Creates a ChromaDB database at `server/data/chroma_db/`
- Uploads all 3,456 embeddings with metadata
- Verifies the upload with a test query

**Expected output:**
```
✅ Loaded 3456 embeddings
✅ Created collection: legal_knowledge
✅ Successfully uploaded all embeddings!
✅ Collection contains 3456 documents
```

---

### Step 2: Test the Chatbot Locally

```bash
python test_chatbot.py
```

**Choose an option:**
1. **Interactive mode** - Ask your own questions
2. **Sample queries** - Run pre-defined test questions

**Example interaction:**
```
❓ Your question: What are the penalties for theft?

🔍 Searching for relevant legal context...
📄 Found 5 relevant articles

🤖 Generating answer...
✅ ANSWER:
Under the Revised Penal Code of the Philippines, theft is punishable by...
[Detailed answer with article citations]
```

---

### Step 3: Integrate with FastAPI Backend

#### Option A: Add to existing FastAPI app

If you already have a FastAPI app in `server/`:

```python
# In your main.py or app.py
from api.legal_chatbot import router as chatbot_router

app.include_router(chatbot_router)
```

#### Option B: Create standalone chatbot server

```bash
cd server
uvicorn api.legal_chatbot:router --reload --port 8001
```

---

## 🔌 API Endpoints

### POST `/api/chatbot/ask`

Ask a legal question and get an AI-generated answer with sources.

**Request:**
```json
{
  "question": "What are the penalties for theft in the Philippines?",
  "conversation_history": [],
  "max_tokens": 1000
}
```

**Response:**
```json
{
  "answer": "Under the Revised Penal Code...",
  "sources": [
    {
      "source": "revised_penal_code",
      "law": "Revised Penal Code of the Philippines",
      "article_number": "309",
      "article_title": "Penalties for Theft",
      "text_preview": "Article 309. Penalties..."
    }
  ],
  "confidence": "high"
}
```

### GET `/api/chatbot/health`

Check if the chatbot service is running.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "documents": 3456,
  "model": "gpt-4o-mini"
}
```

---

## 🧪 Testing with cURL

```bash
# Health check
curl http://localhost:8001/api/chatbot/health

# Ask a question
curl -X POST http://localhost:8001/api/chatbot/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are consumer rights in the Philippines?",
    "max_tokens": 500
  }'
```

---

## 📊 How RAG Works

```
User Question
     ↓
1. Convert to embedding (vector)
     ↓
2. Search ChromaDB for top 5 similar chunks
     ↓
3. Retrieve relevant legal articles
     ↓
4. Send context + question to GPT
     ↓
5. GPT generates answer with citations
     ↓
Return answer + sources to user
```

---

## ⚙️ Configuration

Edit these settings in `api/legal_chatbot.py`:

```python
CHAT_MODEL = "gpt-4o-mini"  # Change to gpt-4 for better quality
TOP_K_RESULTS = 5           # Number of relevant chunks to retrieve
```

---

## 💰 Cost Estimates

Using `gpt-4o-mini` (recommended):
- **Per question**: ~$0.001-0.003 (very cheap!)
- **1000 questions**: ~$1-3

Using `gpt-4`:
- **Per question**: ~$0.01-0.03
- **1000 questions**: ~$10-30

---

## 🔧 Troubleshooting

### "Collection not found"
```bash
# Re-run the upload script
python upload_to_chromadb.py
```

### "OpenAI API quota exceeded"
- Add credits to your OpenAI account
- Or use a different API key

### "Slow responses"
- Reduce `TOP_K_RESULTS` from 5 to 3
- Use `gpt-4o-mini` instead of `gpt-4`

---

## 📁 File Structure

```
server/
├── data/
│   ├── embeddings/
│   │   └── embeddings.pkl          # Your generated embeddings
│   ├── chroma_db/                  # ChromaDB database (created)
│   ├── upload_to_chromadb.py       # Upload script
│   ├── test_chatbot.py             # Test script
│   └── CHATBOT_SETUP.md            # This file
└── api/
    └── legal_chatbot.py            # FastAPI endpoint
```

---

## 🎯 Next Steps

1. ✅ Upload embeddings to ChromaDB
2. ✅ Test locally with `test_chatbot.py`
3. ✅ Integrate with your FastAPI backend
4. 🔜 Connect to your React Native mobile app
5. 🔜 Add conversation history support
6. 🔜 Implement user feedback system

---

## 📞 Support

If you encounter issues:
1. Check that ChromaDB is properly initialized
2. Verify OpenAI API key is valid
3. Ensure embeddings.pkl exists and is not corrupted
4. Check Python package versions

---

**Ready to build the future of legal tech! 🚀⚖️**
