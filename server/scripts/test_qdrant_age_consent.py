import logging
from services.client_cache import get_qdrant_client, get_openai_client

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

# Test what Qdrant returns for age of consent query
qdrant_client = get_qdrant_client()
openai_client = get_openai_client()

query = "what is the age of consent in the philippines"
print(f"\nQuery: {query}\n")

# Generate embedding
embedding_response = openai_client.embeddings.create(
    model="text-embedding-3-small",
    input=query
)
question_embedding = embedding_response.data[0].embedding

# Search Qdrant
results = qdrant_client.search(
    collection_name="legal_knowledge",
    query_vector=question_embedding,
    limit=5,
    score_threshold=0.3
)

print(f"Qdrant results: {len(results)}\n")

for i, result in enumerate(results, 1):
    payload = result.payload
    print(f"{i}. Score: {result.score:.3f}")
    print(f"   Law: {payload.get('law', 'Unknown')}")
    print(f"   Article: {payload.get('article_number', 'N/A')}")
    print(f"   Title: {payload.get('article_title', 'N/A')}")
    print(f"   Text preview: {payload.get('text', '')[:200]}...")
    print()

# Check if score is above 0.8 (web search threshold)
if results and results[0].score >= 0.8:
    print(f"⚠️  PROBLEM: Highest score ({results[0].score:.3f}) is >= 0.8")
    print("   Web search will NOT be triggered!")
    print("   Qdrant has outdated info with high confidence.")
else:
    print(f"✅ Web search would be triggered (score < 0.8)")
