import json
import os
import pickle
import numpy as np
from pathlib import Path
from typing import List, Dict, Any
from dotenv import load_dotenv
from tqdm import tqdm
import time

                            
load_dotenv()

               
PROCESSED_DATA_DIR = Path(__file__).parent / "processed"
EMBEDDINGS_DIR = Path(__file__).parent / "embeddings"
INPUT_FILE = PROCESSED_DATA_DIR / "legal_knowledge.jsonl"
OUTPUT_FILE = EMBEDDINGS_DIR / "embeddings.pkl"

                      
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL = "text-embedding-3-small"                                           
BATCH_SIZE = 100                                           
RATE_LIMIT_DELAY = 1                           


def load_processed_data() -> List[Dict[str, Any]]:
    """Load processed legal data from JSONL file"""
    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Processed data not found at {INPUT_FILE}\n"
            "Please run preprocess_data.py first."
        )
    
    data = []
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            data.append(json.loads(line))
    
    return data


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a batch of texts using OpenAI API
    
    Args:
        texts: List of text strings to embed
    
    Returns:
        List of embedding vectors
    """
    try:
                                                            
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=texts
        )
        
        embeddings = [item.embedding for item in response.data]
        return embeddings
        
    except Exception as e:
        print(f" Error generating embeddings: {str(e)}")
        raise


def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors"""
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    return dot_product / (norm1 * norm2)


def generate_all_embeddings():
    """
    Main function to generate embeddings for all processed data
    """
                      
    if not OPENAI_API_KEY:
        raise ValueError(
            "OPENAI_API_KEY not found in environment variables.\n"
            "Please add it to your .env file."
        )
    
                              
    EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)
    
    print(" Starting embeddings generation for AI.ttorney Legal Chatbot")
    print(f"📂 Input file: {INPUT_FILE}")
    print(f"📂 Output file: {OUTPUT_FILE}")
    print(f"🤖 Model: {EMBEDDING_MODEL}")
    print("=" * 60)
    
                         
    print("\n Loading processed data...")
    data = load_processed_data()
    print(f" Loaded {len(data)} text chunks")
    
                                             
    texts = [item['text'] for item in data]
    
                                    
    print(f"\n Generating embeddings in batches of {BATCH_SIZE}...")
    all_embeddings = []
    
    for i in tqdm(range(0, len(texts), BATCH_SIZE), desc="Processing batches"):
        batch_texts = texts[i:i + BATCH_SIZE]
        
        try:
            batch_embeddings = generate_embeddings_batch(batch_texts)
            all_embeddings.extend(batch_embeddings)
            
                           
            if i + BATCH_SIZE < len(texts):
                time.sleep(RATE_LIMIT_DELAY)
                
        except Exception as e:
            print(f"\n Error processing batch {i // BATCH_SIZE + 1}: {str(e)}")
            print("Stopping embeddings generation.")
            return
    
    print(f"\n Generated {len(all_embeddings)} embeddings")
    
                                                     
    embeddings_array = np.array(all_embeddings, dtype=np.float32)
    
                                       
    embeddings_data = {
        'embeddings': embeddings_array,
        'documents': data,
        'metadata': {
            'model': EMBEDDING_MODEL,
            'total_chunks': len(data),
            'embedding_dimension': len(all_embeddings[0]),
            'generated_at': time.strftime('%Y-%m-%d %H:%M:%S')
        }
    }
    
                     
    print(f"\n Saving embeddings to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'wb') as f:
        pickle.dump(embeddings_data, f)
    
    print(" Embeddings saved successfully!")
    
                   
    print("\n" + "=" * 60)
    print(" SUMMARY")
    print("=" * 60)
    print(f"Total chunks embedded: {len(data)}")
    print(f"Embedding dimension: {len(all_embeddings[0])}")
    print(f"Model used: {EMBEDDING_MODEL}")
    print(f"Output file size: {OUTPUT_FILE.stat().st_size / (1024 * 1024):.2f} MB")
    
                                   
    sources = {}
    for item in data:
        source = item['metadata']['source']
        sources[source] = sources.get(source, 0) + 1
    
    print("\n Embeddings by source:")
    for source, count in sources.items():
        print(f"  - {source}: {count} chunks")
    
    print("\n Ready for retrieval! You can now use these embeddings in main.py")


def test_embeddings():
    """
    Test function to verify embeddings work correctly
    """
    if not OUTPUT_FILE.exists():
        print(" Embeddings file not found. Run generate_all_embeddings() first.")
        return
    
    print("\n🧪 Testing embeddings...")
    
    with open(OUTPUT_FILE, 'rb') as f:
        embeddings_data = pickle.load(f)
    
    embeddings = embeddings_data['embeddings']
    documents = embeddings_data['documents']
    
    print(f" Loaded {len(embeddings)} embeddings")
    print(f" Embedding dimension: {embeddings.shape[1]}")
    
                
    test_query = "What are consumer rights?"
    print(f"\n Test query: '{test_query}'")
    
                              
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    query_response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[test_query]
    )
    query_embedding = np.array(query_response.data[0].embedding)
    
                            
    similarities = []
    for i, emb in enumerate(embeddings):
        sim = cosine_similarity(query_embedding, emb)
        similarities.append((i, sim))
    
                       
    similarities.sort(key=lambda x: x[1], reverse=True)
    top_results = similarities[:3]
    
    print("\n Top 3 most relevant chunks:")
    for rank, (idx, score) in enumerate(top_results, 1):
        doc = documents[idx]
        print(f"\n{rank}. Score: {score:.4f}")
        print(f"   Source: {doc['metadata']['source']}")
        print(f"   Article: {doc['metadata'].get('article_number', 'N/A')}")
        print(f"   Text preview: {doc['text'][:150]}...")
    
    print("\n Embeddings test complete!")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        test_embeddings()
    else:
        generate_all_embeddings()
