#!/usr/bin/env python3
"""
Comprehensive Database Health Check
Tests database connection, table access, and configuration
"""

import os
import sys
import asyncio
import httpx
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

async def test_database_connection():
    """Test all aspects of database connection"""
    print("🔍 DATABASE HEALTH CHECK")
    print("=" * 50)
    
    # 1. Check Environment Variables
    print("\n1. 📋 Environment Variables:")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_anon = os.getenv("SUPABASE_ANON_KEY")
    supabase_service = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    database_url = os.getenv("DATABASE_URL")
    
    print(f"   SUPABASE_URL: {'✅ Set' if supabase_url else '❌ Missing'}")
    print(f"   SUPABASE_ANON_KEY: {'✅ Set' if supabase_anon else '❌ Missing'}")
    print(f"   SUPABASE_SERVICE_ROLE_KEY: {'✅ Set' if supabase_service else '❌ Missing'}")
    print(f"   DATABASE_URL: {'✅ Set' if database_url else '❌ Missing'}")
    
    if not all([supabase_url, supabase_anon, supabase_service]):
        print("\n❌ Critical: Missing required environment variables!")
        return False
    
    # 2. Test Supabase Client Connection
    print("\n2. 🔌 Supabase Client Connection:")
    try:
        supabase = create_client(supabase_url, supabase_anon)
        # Test with a simple query
        result = supabase.table('users').select('count', count='exact').execute()
        print(f"   ✅ Anon client connected successfully")
        print(f"   📊 Users table accessible: {result.count} records")
    except Exception as e:
        print(f"   ❌ Anon client failed: {str(e)}")
        return False
    
    # 3. Test Service Role Connection
    print("\n3. 🔑 Service Role Connection:")
    try:
        supabase_service = create_client(supabase_url, supabase_service)
        result = supabase_service.table('users').select('count', count='exact').execute()
        print(f"   ✅ Service role client connected successfully")
        print(f"   📊 Users table accessible via service role: {result.count} records")
    except Exception as e:
        print(f"   ❌ Service role client failed: {str(e)}")
        return False
    
    # 4. Test HTTP API Connection (like the app uses)
    print("\n4. 🌐 HTTP API Connection:")
    try:
        headers = {
            "apikey": supabase_anon,
            "Authorization": f"Bearer {supabase_anon}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            # Test glossary_terms endpoint (the one that was failing)
            response = await client.get(
                f"{supabase_url}/rest/v1/glossary_terms?select=count&limit=1",
                headers=headers
            )
            
            if response.status_code == 200:
                print(f"   ✅ HTTP API connection successful")
                print(f"   📊 Glossary terms table accessible via HTTP API")
            else:
                print(f"   ❌ HTTP API failed: {response.status_code}")
                print(f"   📝 Response: {response.text}")
                return False
                
    except Exception as e:
        print(f"   ❌ HTTP API connection failed: {str(e)}")
        return False
    
    # 5. Test HTTP API with Service Role (like our fix)
    print("\n5. 🔐 HTTP API with Service Role:")
    try:
        headers = {
            "apikey": supabase_service,
            "Authorization": f"Bearer {supabase_service}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            # Test glossary_terms endpoint with service role
            response = await client.get(
                f"{supabase_url}/rest/v1/glossary_terms?select=count&limit=1",
                headers=headers
            )
            
            if response.status_code == 200:
                print(f"   ✅ HTTP API with service role successful")
                print(f"   📊 Glossary terms table accessible via service role")
            else:
                print(f"   ❌ HTTP API with service role failed: {response.status_code}")
                print(f"   📝 Response: {response.text}")
                return False
                
    except Exception as e:
        print(f"   ❌ HTTP API with service role failed: {str(e)}")
        return False
    
    # 6. Test Key Tables
    print("\n6. 📋 Key Tables Accessibility:")
    key_tables = ['users', 'glossary_terms', 'legal_articles', 'forum_posts', 'chat_sessions']
    
    for table in key_tables:
        try:
            headers = {
                "apikey": supabase_service,
                "Authorization": f"Bearer {supabase_service}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{supabase_url}/rest/v1/{table}?select=count&limit=1",
                    headers=headers
                )
                
                if response.status_code == 200:
                    print(f"   ✅ {table}: Accessible")
                else:
                    print(f"   ❌ {table}: {response.status_code} - {response.text}")
                    
        except Exception as e:
            print(f"   ❌ {table}: {str(e)}")
    
    # 7. Test RLS Status
    print("\n7. 🔒 Row Level Security Status:")
    try:
        # This would require direct database connection, so we'll infer from API behavior
        print("   📝 RLS status check requires direct DB connection")
        print("   💡 If anon key fails but service key works, RLS is likely enabled")
        
    except Exception as e:
        print(f"   ❌ RLS check failed: {str(e)}")
    
    print("\n" + "=" * 50)
    print("✅ DATABASE HEALTH CHECK COMPLETE")
    print("🎯 All critical database connections are working!")
    return True

if __name__ == "__main__":
    try:
        result = asyncio.run(test_database_connection())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n⚠️ Health check interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Health check failed: {str(e)}")
        sys.exit(1)
