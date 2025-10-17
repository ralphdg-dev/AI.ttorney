"""
Setup script for chat history tables in Supabase
Run this to create the necessary tables if they don't exist
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from services.supabase_service import SupabaseService
from dotenv import load_dotenv

load_dotenv()

def setup_tables():
    """Check if tables exist and provide setup instructions"""
    
    print("🔍 Checking chat history tables...")
    
    supabase = SupabaseService()
    
    try:
        # Try to query chat_sessions table
        response = supabase.supabase.table("chat_sessions").select("id").limit(1).execute()
        print("✅ chat_sessions table exists")
        print(f"   Found {len(response.data)} sessions")
    except Exception as e:
        print(f"❌ chat_sessions table does NOT exist")
        print(f"   Error: {str(e)}")
        print("\n📋 TO FIX:")
        print("   1. Go to your Supabase project dashboard")
        print("   2. Navigate to SQL Editor")
        print("   3. Run the SQL file: server/database/chat_history_schema.sql")
        return False
    
    try:
        # Try to query chat_messages table
        response = supabase.supabase.table("chat_messages").select("id").limit(1).execute()
        print("✅ chat_messages table exists")
        print(f"   Found {len(response.data)} messages")
    except Exception as e:
        print(f"❌ chat_messages table does NOT exist")
        print(f"   Error: {str(e)}")
        print("\n📋 TO FIX:")
        print("   1. Go to your Supabase project dashboard")
        print("   2. Navigate to SQL Editor")
        print("   3. Run the SQL file: server/database/chat_history_schema.sql")
        return False
    
    print("\n✅ All tables exist! Chat history system is ready.")
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("Chat History Database Setup Checker")
    print("=" * 60)
    print()
    
    success = setup_tables()
    
    if not success:
        print("\n" + "=" * 60)
        print("⚠️  SETUP REQUIRED")
        print("=" * 60)
        print("\nThe chat history tables need to be created in Supabase.")
        print("Follow the instructions above to set them up.")
        sys.exit(1)
    else:
        print("\n" + "=" * 60)
        print("✅ SETUP COMPLETE")
        print("=" * 60)
        print("\nYour chat history system is ready to use!")
        sys.exit(0)
