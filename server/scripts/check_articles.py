#!/usr/bin/env python3
"""
Script to check and fix legal articles in the database
"""
import os
import sys
from supabase import create_client

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def check_articles():
    """Check articles in database"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
        return
    
    supabase = create_client(supabase_url, supabase_key)
    
    # Check total articles
    print("\n📊 CHECKING LEGAL ARTICLES DATABASE...")
    print("=" * 60)
    
    try:
        # Get all articles (including unverified)
        all_articles = supabase.table('legal_articles').select('id, title_en, is_verified, created_at').execute()
        print(f"\n✅ Total articles in database: {len(all_articles.data)}")
        
        if len(all_articles.data) == 0:
            print("\n❌ ERROR: No articles found in database!")
            print("\n💡 SOLUTION: You need to add articles to the 'legal_articles' table in Supabase")
            return
        
        # Count verified vs unverified
        verified = [a for a in all_articles.data if a.get('is_verified') == True]
        unverified = [a for a in all_articles.data if a.get('is_verified') != True]
        
        print(f"   ✓ Verified articles: {len(verified)}")
        print(f"   ✗ Unverified articles: {len(unverified)}")
        
        if len(verified) == 0:
            print("\n❌ ERROR: No verified articles found!")
            print(f"\n💡 SOLUTION: Set is_verified=true for {len(unverified)} articles")
            print("\nShowing first 5 unverified articles:")
            for i, article in enumerate(unverified[:5], 1):
                print(f"   {i}. {article.get('title_en', 'No title')} (ID: {article.get('id')})")
            
            response = input("\n🔧 Do you want to verify ALL articles? (yes/no): ")
            if response.lower() == 'yes':
                verify_all_articles(supabase)
        else:
            print("\n✅ Verified articles found! Showing first 5:")
            for i, article in enumerate(verified[:5], 1):
                print(f"   {i}. {article.get('title_en', 'No title')}")
    
    except Exception as e:
        print(f"\n❌ ERROR checking database: {str(e)}")
        print(f"   Error type: {type(e).__name__}")

def verify_all_articles(supabase):
    """Set is_verified=true for all articles"""
    try:
        print("\n🔧 Verifying all articles...")
        
        # Update all articles to set is_verified=true
        result = supabase.table('legal_articles').update({
            'is_verified': True
        }).neq('id', '00000000-0000-0000-0000-000000000000').execute()
        
        print(f"✅ Updated {len(result.data)} articles to verified status")
        print("\n🎉 All articles are now verified and will show in the app!")
        
    except Exception as e:
        print(f"❌ ERROR verifying articles: {str(e)}")

if __name__ == "__main__":
    check_articles()
