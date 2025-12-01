#!/usr/bin/env python3
"""
Script to check and fix legal articles in the database
"""
import os
import sys
import logging
from supabase import create_client

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging for script
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def check_articles():
    """Check articles in database"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
        return
    
    supabase = create_client(supabase_url, supabase_key)
    
    # Check total articles
    logger.info("CHECKING LEGAL ARTICLES DATABASE...")
    logger.info("=" * 60)
    
    try:
        # Get all articles (including unverified)
        all_articles = supabase.table('legal_articles').select('id, title_en, is_verified, created_at').execute()
        logger.info(f"Total articles in database: {len(all_articles.data)}")
        
        if len(all_articles.data) == 0:
            logger.error("ERROR: No articles found in database!")
            logger.error("SOLUTION: You need to add articles to the 'legal_articles' table in Supabase")
            return
        
        # Count verified vs unverified
        verified = [a for a in all_articles.data if a.get('is_verified') == True]
        unverified = [a for a in all_articles.data if a.get('is_verified') != True]
        
        logger.info(f"   Verified articles: {len(verified)}")
        logger.info(f"   Unverified articles: {len(unverified)}")
        
        if len(verified) == 0:
            logger.error("ERROR: No verified articles found!")
            logger.error(f"SOLUTION: Set is_verified=true for {len(unverified)} articles")
            logger.info("Showing first 5 unverified articles:")
            for i, article in enumerate(unverified[:5], 1):
                logger.info(f"   {i}. {article.get('title_en', 'No title')} (ID: {article.get('id')})")
            
            response = input("Do you want to verify ALL articles? (yes/no): ")
            if response.lower() == 'yes':
                verify_all_articles(supabase)
        else:
            logger.info("Verified articles found! Showing first 5:")
            for i, article in enumerate(verified[:5], 1):
                logger.info(f"   {i}. {article.get('title_en', 'No title')}")
    
    except Exception as e:
        logger.error(f"ERROR checking database: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")

def verify_all_articles(supabase):
    """Set is_verified=true for all articles"""
    try:
        logger.info("Verifying all articles...")
        
        # Update all articles to set is_verified=true
        result = supabase.table('legal_articles').update({
            'is_verified': True
        }).neq('id', '00000000-0000-0000-0000-000000000000').execute()
        
        logger.info(f"Updated {len(result.data)} articles to verified status")
        logger.info("All articles are now verified and will show in the app!")
        
    except Exception as e:
        logger.error(f"ERROR verifying articles: {str(e)}")

if __name__ == "__main__":
    check_articles()
