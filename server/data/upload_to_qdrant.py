"""
Upload Embeddings to Qdrant Cloud for AI.ttorney Legal Chatbot

This script:
1. Loads embeddings from embeddings.pkl
2. Creates a Qdrant collection
3. Uploads all embeddings with metadata
4. Saves to Qdrant Cloud for use by the chatbot API

Requirements:
- pip install qdrant-client
- Qdrant Cloud account (free tier available)
- QDRANT_URL and QDRANT_API_KEY in .env file
"""

import pickle
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from pathlib import Path
from typing import List, Dict, Any
from tqdm import tqdm
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
EMBEDDINGS_FILE = Path(__file__).parent / "embeddings" / "embeddings.pkl"
COLLECTION_NAME = "legal_knowledge"
QDRANT_URL = os.getenv("QDRANT_URL")  # e.g., "https://your-cluster.qdrant.io"
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
VECTOR_SIZE = 1536  # text-embedding-3-small dimension

def load_embeddings() -> tuple[List[str], List[List[float]], List[str], List[Dict[str, Any]]]:
    """Load embeddings from pickle file"""
    print(f"📥 Loading embeddings from {EMBEDDINGS_FILE}")
    
    with open(EMBEDDINGS_FILE, 'rb') as f:
        data = pickle.load(f)
    
    # Extract data from the structure
    documents = data['documents']  # List of dicts with 'id', 'text', 'metadata'
    embeddings = data['embeddings']  # numpy array
    
    # Parse documents
    ids = [doc['id'] for doc in documents]
    texts = [doc['text'] for doc in documents]
    metadatas = [doc['metadata'] for doc in documents]
    
    # Convert numpy array to list if needed
    if hasattr(embeddings, 'tolist'):
        embeddings = embeddings.tolist()
    
    print(f"✅ Loaded {len(ids)} embeddings")
    return ids, embeddings, texts, metadatas


def create_qdrant_collection():
    """Create or recreate Qdrant collection"""
    print(f"\n🗄️  Connecting to Qdrant Cloud...")
    
    if not QDRANT_URL or not QDRANT_API_KEY:
        raise ValueError("QDRANT_URL and QDRANT_API_KEY must be set in .env file")
    
    # Create client
    client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
    )
    
    print(f"✅ Connected to Qdrant Cloud")
    
    # Delete existing collection if it exists (for fresh upload)
    try:
        client.delete_collection(collection_name=COLLECTION_NAME)
        print(f"🗑️  Deleted existing collection: {COLLECTION_NAME}")
    except:
        pass
    
    # Create new collection
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )
    
    print(f"✅ Created collection: {COLLECTION_NAME}")
    return client


def upload_to_qdrant(client: QdrantClient, ids: List[str], embeddings: List[List[float]], 
                     texts: List[str], metadatas: List[Dict[str, Any]]):
    """Upload embeddings to Qdrant Cloud in batches"""
    import time
    
    print(f"\n📤 Uploading {len(ids)} embeddings to Qdrant Cloud...")
    print(f"⚠️  Using small batches for reliability. This will take a few minutes...")
    
    # Use very small batch size for free tier reliability
    BATCH_SIZE = 25  # Reduced to 25 for better reliability
    MAX_RETRIES = 3
    DELAY_BETWEEN_BATCHES = 0.5  # Half second delay between batches
    total_batches = (len(ids) + BATCH_SIZE - 1) // BATCH_SIZE
    
    for i in tqdm(range(0, len(ids), BATCH_SIZE), total=total_batches, desc="Uploading batches"):
        batch_end = min(i + BATCH_SIZE, len(ids))
        
        # Create points for this batch
        points = []
        for j in range(i, batch_end):
            # Add text to payload for retrieval
            payload = metadatas[j].copy()
            payload['text'] = texts[j]
            
            points.append(
                PointStruct(
                    id=j,  # Use numeric ID for Qdrant
                    vector=embeddings[j],
                    payload=payload
                )
            )
        
        # Upload batch with retry logic
        for retry in range(MAX_RETRIES):
            try:
                client.upsert(
                    collection_name=COLLECTION_NAME,
                    points=points,
                    wait=False  # Don't wait for indexing to complete
                )
                break  # Success, exit retry loop
            except Exception as e:
                if retry < MAX_RETRIES - 1:
                    print(f"\n⚠️  Batch {i//BATCH_SIZE + 1} failed, retrying ({retry + 1}/{MAX_RETRIES})...")
                    time.sleep(3)  # Wait longer before retry
                else:
                    print(f"\n❌ Batch {i//BATCH_SIZE + 1} failed after {MAX_RETRIES} retries: {str(e)}")
                    raise
        
        # Small delay between batches to avoid rate limits
        time.sleep(DELAY_BETWEEN_BATCHES)
    
    print(f"✅ Successfully uploaded all embeddings!")
    print(f"⏳ Waiting for Qdrant to finish indexing...")
    time.sleep(5)  # Give Qdrant time to index


def verify_upload(client: QdrantClient, sample_embedding: List[float]):
    """Verify the upload was successful"""
    print(f"\n🔍 Verifying upload...")
    
    # Get collection info
    collection_info = client.get_collection(collection_name=COLLECTION_NAME)
    count = collection_info.points_count
    print(f"✅ Collection contains {count} documents")
    
    # Test query with sample embedding
    results = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=sample_embedding,
        limit=3
    )
    
    print(f"\n📋 Sample query results:")
    for i, result in enumerate(results, 1):
        payload = result.payload
        print(f"\n{i}. Source: {payload.get('source', 'Unknown')}")
        print(f"   Article: {payload.get('article_number', 'N/A')}")
        print(f"   Score: {result.score:.4f}")
        print(f"   Preview: {payload.get('text', '')[:100]}...")


def main():
    """Main execution function"""
    print("🚀 Starting Qdrant Cloud Upload Process")
    print("=" * 60)
    
    # Load embeddings
    ids, embeddings, texts, metadatas = load_embeddings()
    
    # Create Qdrant collection
    client = create_qdrant_collection()
    
    # Upload to Qdrant
    upload_to_qdrant(client, ids, embeddings, texts, metadatas)
    
    # Verify upload (use first embedding as sample)
    verify_upload(client, embeddings[0])
    
    print("\n" + "=" * 60)
    print("✅ Qdrant Cloud upload complete!")
    print(f"🌐 Qdrant URL: {QDRANT_URL}")
    print(f"📊 Collection name: {COLLECTION_NAME}")
    print(f"📈 Total documents: {len(ids)}")


if __name__ == "__main__":
    main()
