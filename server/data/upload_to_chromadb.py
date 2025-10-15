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

def load_embeddings() -> tuple[List[str], List[List[float]], List[Dict[str, Any]]]:
    """Load embeddings from pickle file"""
    print(f"📥 Loading embeddings from {EMBEDDINGS_FILE}")
    
    with open(EMBEDDINGS_FILE, 'rb') as f:
        data = pickle.load(f)
    
    ids = data['ids']
    embeddings = data['embeddings']
    texts = data['texts']
    metadatas = data['metadatas']
    
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
    print(f"\n📤 Uploading {len(ids)} embeddings to Qdrant Cloud...")
    
    # Qdrant recommends batch size of 100-500
    BATCH_SIZE = 100
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
        
        # Upload batch
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )
    
    print(f"✅ Successfully uploaded all embeddings!")


def verify_upload(collection):
    """Verify the upload was successful"""
    print(f"\n🔍 Verifying upload...")
    
    count = collection.count()
    print(f"✅ Collection contains {count} documents")
    
    # Test query
    results = collection.query(
        query_texts=["What is theft?"],
        n_results=3
    )
    
    print(f"\n📋 Sample query results:")
    for i, (doc, metadata) in enumerate(zip(results['documents'][0], results['metadatas'][0]), 1):
        print(f"\n{i}. Source: {metadata.get('source', 'Unknown')}")
        print(f"   Article: {metadata.get('article_number', 'N/A')}")
        print(f"   Preview: {doc[:100]}...")


def main():
    """Main execution function"""
    print("🚀 Starting ChromaDB Upload Process")
    print("=" * 60)
    
    # Load embeddings
    ids, embeddings, texts, metadatas = load_embeddings()
    
    # Create ChromaDB collection
    collection = create_chromadb_collection()
    
    # Upload to ChromaDB
    upload_to_chromadb(collection, ids, embeddings, texts, metadatas)
    
    # Verify upload
    verify_upload(collection)
    
    print("\n" + "=" * 60)
    print("✅ ChromaDB upload complete!")
    print(f"📁 Database location: {CHROMA_DB_PATH}")
    print(f"📊 Collection name: {COLLECTION_NAME}")
    print(f"📈 Total documents: {len(ids)}")


if __name__ == "__main__":
    main()
