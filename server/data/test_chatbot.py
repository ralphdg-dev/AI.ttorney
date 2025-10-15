"""
Test Script for Legal Chatbot with Qdrant Cloud

This script allows you to test the chatbot locally before integrating with the API.
"""

from qdrant_client import QdrantClient
from openai import OpenAI
import os
from dotenv import load_dotenv
from typing import List, Dict

# Load environment variables
load_dotenv()

# Configuration
COLLECTION_NAME = "legal_knowledge"
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"
TOP_K_RESULTS = 5

# Initialize clients
qdrant_client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
)
openai_client = OpenAI(api_key=OPENAI_API_KEY)


def get_embedding(text: str) -> List[float]:
    """Generate embedding for text"""
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    return response.data[0].embedding


def search_legal_knowledge(question: str, top_k: int = TOP_K_RESULTS):
    """Search Qdrant Cloud for relevant legal context"""
    print(f"\n🔍 Searching for: '{question}'")
    print("=" * 80)
    
    # Get embedding
    question_embedding = get_embedding(question)
    
    # Query Qdrant
    results = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=question_embedding,
        limit=top_k
    )
    
    # Display results
    context_parts = []
    
    for i, result in enumerate(results, 1):
        payload = result.payload
        doc = payload.get('text', '')
        
        print(f"\n📄 Result {i} (Relevance: {result.score:.2%})")
        print(f"   Source: {payload.get('source', 'Unknown')}")
        print(f"   Law: {payload.get('law', 'Unknown')}")
        print(f"   Article: {payload.get('article_number', 'N/A')}")
        print(f"   Preview: {doc[:150]}...")
        
        # Build context for GPT
        source_info = f"[Source {i}: {payload.get('law', 'Unknown')} - Article {payload.get('article_number', 'N/A')}]"
        context_parts.append(f"{source_info}\n{doc}")
    
    return "\n\n".join(context_parts)


def ask_chatbot(question: str):
    """Ask the chatbot a question"""
    print("\n" + "=" * 80)
    print("💬 LEGAL CHATBOT")
    print("=" * 80)
    
    # Get relevant context
    context = search_legal_knowledge(question)
    
    # Build prompt
    system_prompt = """You are a knowledgeable Philippine legal assistant for AI.ttorney. 
Provide accurate legal information based on Philippine laws.

Guidelines:
1. Answer using ONLY the provided legal context
2. Cite specific articles and laws
3. Use clear, professional language
4. Always remind users to consult a licensed lawyer
5. Be concise but thorough"""

    user_message = f"""Legal Context:
{context}

User Question: {question}

Please provide a comprehensive answer based on the legal context above."""

    print("\n🤖 Generating answer...")
    print("=" * 80)
    
    # Generate response
    response = openai_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        max_tokens=1000,
        temperature=0.3
    )
    
    answer = response.choices[0].message.content
    
    print("\n✅ ANSWER:")
    print("-" * 80)
    print(answer)
    print("-" * 80)
    
    return answer


def interactive_mode():
    """Run chatbot in interactive mode"""
    print("\n" + "=" * 80)
    print("🎯 AI.TTORNEY LEGAL CHATBOT - INTERACTIVE MODE")
    print("=" * 80)
    print("\nType your legal questions (or 'quit' to exit)")
    print("Examples:")
    print("  - What are the penalties for theft?")
    print("  - What is the legal age for marriage?")
    print("  - What are consumer rights in the Philippines?")
    print("\n" + "=" * 80)
    
    while True:
        question = input("\n❓ Your question: ").strip()
        
        if question.lower() in ['quit', 'exit', 'q']:
            print("\n👋 Goodbye!")
            break
        
        if not question:
            continue
        
        try:
            ask_chatbot(question)
        except Exception as e:
            print(f"\n❌ Error: {str(e)}")


def run_sample_queries():
    """Run some sample queries to test the system"""
    sample_questions = [
        "What are the penalties for theft in the Philippines?",
        "What is the legal age for marriage?",
        "What are consumer rights under the Consumer Act?",
        "What is self-defense under Philippine law?",
        "What are the grounds for annulment of marriage?"
    ]
    
    print("\n" + "=" * 80)
    print("🧪 RUNNING SAMPLE QUERIES")
    print("=" * 80)
    
    for question in sample_questions:
        try:
            ask_chatbot(question)
            input("\nPress Enter to continue to next question...")
        except Exception as e:
            print(f"\n❌ Error: {str(e)}")


def main():
    """Main function"""
    print("\n🚀 Legal Chatbot Test Script (Qdrant Cloud)")
    print("=" * 80)
    
    # Check database connection
    try:
        collection_info = qdrant_client.get_collection(collection_name=COLLECTION_NAME)
        count = collection_info.points_count
        print(f"✅ Connected to Qdrant Cloud")
        print(f"📊 Database contains {count} documents")
    except Exception as e:
        print(f"❌ Error connecting to Qdrant: {str(e)}")
        print("\nMake sure you have:")
        print("1. Created a Qdrant Cloud account")
        print("2. Set QDRANT_URL and QDRANT_API_KEY in .env file")
        print("3. Run upload_to_qdrant.py to upload embeddings")
        return
    
    # Menu
    print("\nChoose an option:")
    print("1. Interactive mode (ask your own questions)")
    print("2. Run sample queries")
    print("3. Exit")
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    if choice == "1":
        interactive_mode()
    elif choice == "2":
        run_sample_queries()
    else:
        print("\n👋 Goodbye!")


if __name__ == "__main__":
    main()
