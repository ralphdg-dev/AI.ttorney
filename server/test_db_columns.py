"""
Quick test to check if moderation columns exist in users table
"""
import asyncio
import httpx
from services.supabase_service import SupabaseService

async def test_columns():
    supabase = SupabaseService()
    
    print(f"Testing connection to: {supabase.rest_url}")
    print(f"Checking users table...")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Try to get any user with moderation fields
        response = await client.get(
            f"{supabase.rest_url}/users",
            params={
                "select": "id,email,strike_count,suspension_count,account_status",
                "limit": "1"
            },
            headers=supabase._get_headers(use_service_key=True)
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Columns exist!")
        else:
            print("❌ Error - columns might not exist or RLS is blocking")

if __name__ == "__main__":
    asyncio.run(test_columns())
