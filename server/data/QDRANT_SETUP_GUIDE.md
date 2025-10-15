# 🚀 AI.ttorney Legal Chatbot - Qdrant Cloud Setup Guide

Complete guide to set up your RAG-powered legal chatbot with Qdrant Cloud (Free Tier).

---

## 🎯 Why Qdrant Cloud?

- ✅ **1GB Free Forever** - No credit card required
- ✅ **Fully Managed** - No deployment or maintenance
- ✅ **Production Ready** - High availability, auto-healing, backups
- ✅ **Multi-Cloud** - AWS, GCP, Azure support
- ✅ **Fast & Scalable** - Built for vector search

---

## 📋 Prerequisites

1. **Embeddings Generated** ✅ (You already have this!)
   - File: `embeddings/embeddings.pkl`
   - Contains 3,456 legal text chunks with embeddings

2. **OpenAI API Key** 
   - For embeddings and chat completions
   - Add to `.env` file

3. **Python Packages**
   ```bash
   pip install qdrant-client openai python-dotenv tqdm fastapi uvicorn
   ```

---

## 🌐 Step 1: Create Qdrant Cloud Account

### 1.1 Sign Up (Free)

1. Go to: https://cloud.qdrant.io/
2. Click **"Start Free"**
3. Sign up with email or GitHub
4. **No credit card required!**

### 1.2 Create a Cluster

1. After login, click **"Create Cluster"**
2. Choose:
   - **Cluster Name**: `ai-ttorney-legal-kb`
   - **Cloud Provider**: AWS (or your preference)
   - **Region**: Choose closest to Philippines (e.g., Singapore)
   - **Plan**: **Free Tier** (1GB)
3. Click **"Create"**
4. Wait 2-3 minutes for cluster to be ready

### 1.3 Get Your Credentials

1. Click on your cluster name
2. Copy the **Cluster URL** (e.g., `https://xxxxx-xxxxx.aws.cloud.qdrant.io:6333`)
3. Click **"API Keys"** tab
4. Click **"Create API Key"**
5. Copy the API key (you'll only see it once!)

---

## 🔑 Step 2: Configure Environment Variables

Add these to your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Qdrant Cloud Configuration
QDRANT_URL=https://xxxxx-xxxxx.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=your-qdrant-api-key-here
```

**Important:** Replace with your actual credentials!

---

## 📤 Step 3: Upload Embeddings to Qdrant Cloud

```bash
cd server/data
python upload_to_qdrant.py
```

### What This Does:

1. ✅ Connects to your Qdrant Cloud cluster
2. ✅ Creates a collection named `legal_knowledge`
3. ✅ Uploads all 3,456 embeddings with metadata
4. ✅ Verifies upload with a test query

### Expected Output:

```
🚀 Starting Qdrant Cloud Upload Process
============================================================
📥 Loading embeddings from embeddings.pkl
✅ Loaded 3456 embeddings

🗄️  Connecting to Qdrant Cloud...
✅ Connected to Qdrant Cloud
✅ Created collection: legal_knowledge

📤 Uploading 3456 embeddings to Qdrant Cloud...
Uploading batches: 100%|████████████████| 35/35 [00:45<00:00]
✅ Successfully uploaded all embeddings!

🔍 Verifying upload...
✅ Collection contains 3456 documents

📋 Sample query results:
1. Source: revised_penal_code
   Article: 309
   Score: 0.8542
   Preview: Article 309. Penalties for theft...

============================================================
✅ Qdrant Cloud upload complete!
🌐 Qdrant URL: https://xxxxx.aws.cloud.qdrant.io:6333
📊 Collection name: legal_knowledge
📈 Total documents: 3456
```

### Troubleshooting Upload:

**Error: "Connection refused"**
- Check your `QDRANT_URL` is correct
- Make sure cluster is running (green status in dashboard)

**Error: "Unauthorized"**
- Check your `QDRANT_API_KEY` is correct
- API key should start with something like `eyJ...`

**Error: "Collection already exists"**
- The script automatically deletes old collections
- If it fails, manually delete in Qdrant dashboard

---

## 🧪 Step 4: Test the Chatbot Locally

```bash
python test_chatbot.py
```

### Choose an Option:

**Option 1: Interactive Mode**
- Ask your own legal questions
- Get real-time answers with sources

**Option 2: Sample Queries**
- Run pre-defined test questions
- See how the system performs

### Example Interaction:

```
🎯 AI.TTORNEY LEGAL CHATBOT - INTERACTIVE MODE
============================================================

❓ Your question: What are the penalties for theft?

🔍 Searching for: 'What are the penalties for theft?'
============================================================

📄 Result 1 (Relevance: 85.42%)
   Source: revised_penal_code
   Law: Revised Penal Code of the Philippines
   Article: 309
   Preview: Article 309. Penalties. — Any person guilty of theft...

🤖 Generating answer...
============================================================

✅ ANSWER:
------------------------------------------------------------------------
Under the Revised Penal Code of the Philippines (Article 309), 
theft is punishable by imprisonment and fines depending on the 
value of the property stolen:

1. If the value exceeds 22,000 pesos: prision mayor (6-12 years)
2. If the value is between 12,000-22,000 pesos: prision correccional
3. If the value is less than 12,000 pesos: arresto mayor

The penalty increases if the theft is qualified (Article 310), 
such as theft by a domestic servant or with grave abuse of confidence.

**Important:** This is general legal information. Please consult 
with a licensed lawyer for advice specific to your situation.
------------------------------------------------------------------------
```

---

## 🔌 Step 5: Integrate with FastAPI Backend

### Option A: Add to Existing FastAPI App

If you have an existing FastAPI app in `server/`:

```python
# In your main.py or app.py
from api.legal_chatbot import router as chatbot_router

app = FastAPI()
app.include_router(chatbot_router)
```

### Option B: Run Standalone Chatbot Server

```bash
cd server
uvicorn api.legal_chatbot:router --reload --port 8001
```

---

## 📡 API Endpoints

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
  "database": "Qdrant Cloud",
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
User Question: "What are penalties for theft?"
     ↓
1. Convert question to embedding (OpenAI)
     ↓
2. Search Qdrant Cloud for top 5 similar legal chunks
     ↓
3. Retrieve relevant articles from Qdrant
     ↓
4. Build context with retrieved articles
     ↓
5. Send context + question to GPT-4o-mini
     ↓
6. GPT generates answer citing specific articles
     ↓
Return answer + source citations to user
```

---

## ⚙️ Configuration Options

Edit these in `api/legal_chatbot.py`:

```python
CHAT_MODEL = "gpt-4o-mini"  # Change to "gpt-4" for better quality
TOP_K_RESULTS = 5           # Number of relevant chunks (3-10)
EMBEDDING_MODEL = "text-embedding-3-small"  # Don't change
```

---

## 💰 Cost Estimates

### Qdrant Cloud (Free Tier)
- **Storage**: 1GB free forever
- **Your usage**: ~50MB for 3,456 embeddings
- **Cost**: $0 (well within free tier!)

### OpenAI API (Using gpt-4o-mini)
- **Per question**: ~$0.001-0.003
- **1,000 questions**: ~$1-3
- **Very affordable!**

### If Using GPT-4 (Optional)
- **Per question**: ~$0.01-0.03
- **1,000 questions**: ~$10-30

---

## 🎯 Qdrant Cloud Dashboard Features

### Monitor Your Cluster:

1. **Collections Tab**
   - View your `legal_knowledge` collection
   - See point count (should be 3,456)
   - Check vector dimensions (1536)

2. **Metrics Tab**
   - Query performance
   - Storage usage
   - Request counts

3. **Console Tab**
   - Test queries directly
   - Browse your data
   - Debug issues

---

## 🔧 Troubleshooting

### "Collection not found"
```bash
# Re-run the upload script
python upload_to_qdrant.py
```

### "OpenAI API quota exceeded"
- Add credits to your OpenAI account
- Or use a different API key

### "Slow responses"
- Reduce `TOP_K_RESULTS` from 5 to 3
- Use `gpt-4o-mini` instead of `gpt-4`
- Check Qdrant Cloud region (use closest)

### "Connection timeout"
- Check your internet connection
- Verify Qdrant cluster is running
- Try a different region

---

## 📁 File Structure

```
server/
├── data/
│   ├── embeddings/
│   │   └── embeddings.pkl          # Your generated embeddings
│   ├── upload_to_qdrant.py         # Upload script (renamed!)
│   ├── test_chatbot.py             # Test script
│   └── QDRANT_SETUP_GUIDE.md       # This file
├── api/
│   └── legal_chatbot.py            # FastAPI endpoint
└── .env                            # Environment variables
```

---

## 🎯 Next Steps

1. ✅ Create Qdrant Cloud account (Free)
2. ✅ Add credentials to `.env`
3. ✅ Upload embeddings with `upload_to_qdrant.py`
4. ✅ Test locally with `test_chatbot.py`
5. 🔜 Integrate with FastAPI backend
6. 🔜 Connect to React Native mobile app
7. 🔜 Add conversation history
8. 🔜 Implement user feedback system

---

## 🌟 Qdrant Cloud Advantages

### vs ChromaDB (Local):
- ✅ No local storage needed
- ✅ Accessible from anywhere
- ✅ Automatic backups
- ✅ Better performance at scale
- ✅ Production-ready infrastructure

### vs Pinecone:
- ✅ More generous free tier (1GB vs 100MB)
- ✅ No credit card required
- ✅ Open-source core
- ✅ Better pricing for small projects

---

## 📞 Support Resources

### Qdrant:
- Dashboard: https://cloud.qdrant.io/
- Docs: https://qdrant.tech/documentation/
- Discord: https://discord.gg/qdrant

### OpenAI:
- Dashboard: https://platform.openai.com/
- Docs: https://platform.openai.com/docs/

---

## 🚀 Ready to Launch!

You now have a production-ready legal chatbot with:
- ✅ 3,456 Philippine legal documents
- ✅ Cloud-hosted vector database (Qdrant)
- ✅ AI-powered answers (OpenAI GPT)
- ✅ Source citations for transparency
- ✅ Scalable infrastructure
- ✅ $0 hosting cost (free tier)

**Start building the future of legal tech! ⚖️🤖**
