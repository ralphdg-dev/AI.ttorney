import os
import sys
import logging
from pathlib import Path

                              
sys.path.append(str(Path(__file__).parent.parent))

from services.supabase_service import SupabaseService
from dotenv import load_dotenv

load_dotenv()

# Configure logging for script
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def setup_tables():
    """Check if tables exist and provide setup instructions"""
    
    logger.info("Checking chat history tables...")
    
    supabase = SupabaseService()
    
    try:
                                          
        response = supabase.supabase.table("chat_sessions").select("id").limit(1).execute()
        logger.info("chat_sessions table exists")
        logger.info(f"Found {len(response.data)} sessions")
    except Exception as e:
        logger.error("chat_sessions table does NOT exist")
        logger.error(f"Error: {str(e)}")
        logger.error("\n TO FIX:")
        logger.error("   1. Go to your Supabase project dashboard")
        logger.error("   2. Navigate to SQL Editor")
        logger.error("   3. Run the SQL file: server/database/chat_history_schema.sql")
        return False
    
    try:
                                          
        response = supabase.supabase.table("chat_messages").select("id").limit(1).execute()
        logger.info("chat_messages table exists")
        logger.info(f"Found {len(response.data)} messages")
    except Exception as e:
        logger.error("chat_messages table does NOT exist")
        logger.error(f"Error: {str(e)}")
        logger.error("\n TO FIX:")
        logger.error("   1. Go to your Supabase project dashboard")
        logger.error("   2. Navigate to SQL Editor")
        logger.error("   3. Run the SQL file: server/database/chat_history_schema.sql")
        return False
    
    logger.info("All tables exist! Chat history system is ready.")
    return True

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("Chat History Database Setup Checker")
    logger.info("=" * 60)
    
    success = setup_tables()
    
    if not success:
        logger.error("=" * 60)
        logger.error("SETUP REQUIRED")
        logger.error("=" * 60)
        logger.error("The chat history tables need to be created in Supabase.")
        logger.error("Follow the instructions above to set them up.")
        sys.exit(1)
    else:
        logger.info("=" * 60)
        logger.info("SETUP COMPLETE")
        logger.info("=" * 60)
        logger.info("Your chat history system is ready to use!")
        sys.exit(0)
