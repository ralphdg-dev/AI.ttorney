# AI.ttorney Chatbot - Quick Start

## 🚀 Fast Setup (5 Steps)

### 1. Install Dependencies
```bash
# Backend
cd server
pip install -r requirements.txt

# Frontend (if axios not installed)
cd ../client
npm install axios
```

### 2. Configure OpenAI API Key
```bash
cd server
cp .env.example .env
# Edit .env and add: OPENAI_API_KEY=sk-your-key-here
```

### 3. Prepare Data (First Time Only)
```bash
cd server/data

# Step 3a: Preprocess scraped legal data
python preprocess_data.py

# Step 3b: Generate embeddings (takes 2-5 minutes)
python generate_embeddings.py
```

### 4. Start Backend
```bash
cd server
python main.py
# Server runs on http://localhost:8000
```

### 5. Start Frontend
```bash
cd client
npm start
# Navigate to chatbot screen in your app
```

---

## ✅ Verify Setup

### Test Backend
```bash
# Health check
curl http://localhost:8000/api/chatbot/health

# Test chat
curl -X POST http://localhost:8000/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are consumer rights?"}'
```

### Expected Response
```json
{
  "response": "Consumer rights in the Philippines include...",
  "sources": [...],
  "language": "en"
}
```

---

## 📁 Key Files Created

| File | Purpose |
|------|---------|
| `server/data/preprocess_data.py` | Cleans and structures scraped JSON |
| `server/data/generate_embeddings.py` | Creates vector embeddings |
| `server/routes/chatbot.py` | Chat API endpoint with RAG |
| `client/app/chatbot.tsx` | Updated chat UI with API integration |
| `server/data/processed/legal_knowledge.jsonl` | Processed legal text |
| `server/data/embeddings/embeddings.pkl` | Vector embeddings |

---

## 🎯 Usage

### Ask in English
- "What are my rights as a consumer?"
- "What is the penalty for theft?"
- "How do I file for annulment?"

### Ask in Filipino
- "Ano ang mga karapatan ko bilang consumer?"
- "Ano ang parusa sa pagnanakaw?"
- "Paano mag-file ng annulment?"

The chatbot automatically detects language and responds accordingly!

---

## 🔧 Common Issues

| Issue | Solution |
|-------|----------|
| "Embeddings not found" | Run `python generate_embeddings.py` |
| "API key not configured" | Add `OPENAI_API_KEY` to `.env` |
| Frontend can't connect | Update `EXPO_PUBLIC_API_URL` in client `.env` |
| No raw data | Run scraper scripts first |

---

## 💰 Cost

- **Embeddings**: ~$0.10-0.50 (one-time)
- **Per chat**: ~$0.001-0.005 per message
- **Model**: gpt-4o-mini (cost-effective)

---

## 📚 Full Documentation

See `CHATBOT_SETUP.md` for detailed setup, troubleshooting, and production deployment.

---

## 🎉 You're Ready!

Your bilingual legal chatbot is now operational. Users can ask questions in English or Filipino and get answers based on Philippine legal documents.
