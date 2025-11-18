#!/usr/bin/env python3
"""
Quick .env API Keys Test

Simple script to check if your API keys are loaded from .env file.

Usage:
    python test_env_keys.py
"""

import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

print("\n" + "=" * 70)
print("🔑 CHECKING .ENV API KEYS")
print("=" * 70 + "\n")

# Check all required API keys
keys_to_check = {
    "OPENAI_API_KEY": "OpenAI API (for embeddings & chat)",
    "QDRANT_URL": "Qdrant Cloud URL",
    "QDRANT_API_KEY": "Qdrant API Key",
    "GOOGLE_API_KEY": "Google Custom Search API",
    "GOOGLE_CSE_ID": "Google Custom Search Engine ID",
}

all_present = True

for key, description in keys_to_check.items():
    value = os.getenv(key)
    
    if value:
        # Mask the key for security (show first 10 and last 4 chars)
        if len(value) > 14:
            masked = f"{value[:10]}...{value[-4:]}"
        else:
            masked = f"{value[:4]}...{value[-2:]}"
        
        print(f"✅ {key}")
        print(f"   Description: {description}")
        print(f"   Value: {masked}")
        print(f"   Length: {len(value)} characters")
    else:
        print(f"❌ {key}")
        print(f"   Description: {description}")
        print(f"   Status: NOT SET")
        all_present = False
    
    print()

print("=" * 70)

if all_present:
    print("✅ All API keys are present in .env file!")
    print("\n📝 Next step: Run 'python test_google_api.py' to test if they work")
else:
    print("❌ Some API keys are missing!")
    print("\n📝 Add missing keys to your .env file:")
    print("   Example:")
    print("   GOOGLE_API_KEY=your_api_key_here")
    print("   GOOGLE_CSE_ID=your_search_engine_id_here")

print("=" * 70 + "\n")
