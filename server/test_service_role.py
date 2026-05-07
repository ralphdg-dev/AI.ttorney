#!/usr/bin/env python3
"""
Simple test to debug service role HTTP API issue
"""

import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

async def test_service_role():
    """Test service role connection with detailed debugging"""
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    print("🔍 SERVICE ROLE DEBUG TEST")
    print(f"URL: {supabase_url}")
    print(f"Service Key: {supabase_service[:20]}..." if supabase_service else "None")
    
    # Test 1: Simple headers
    headers = {
        "apikey": supabase_service,
        "Authorization": f"Bearer {supabase_service}",
        "Content-Type": "application/json"
    }
    
    print(f"\nHeaders: {headers}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase_url}/rest/v1/glossary_terms?select=count&limit=1",
                headers=headers
            )
            print(f"✅ Success: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print(f"Error type: {type(e)}")
        
        # Try alternative approach
        print("\n🔄 Trying alternative approach...")
        try:
            client = httpx.AsyncClient()
            response = await client.get(
                f"{supabase_url}/rest/v1/glossary_terms?select=count&limit=1",
                headers=headers
            )
            print(f"✅ Alternative Success: {response.status_code}")
            await client.aclose()
            
        except Exception as e2:
            print(f"❌ Alternative Error: {str(e2)}")

if __name__ == "__main__":
    asyncio.run(test_service_role())
