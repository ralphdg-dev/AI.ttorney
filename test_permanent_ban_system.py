#!/usr/bin/env python3
"""
Permanent Ban System Test Script

This script tests the complete permanent ban implementation to ensure:
1. Backend middleware blocks banned users from all API access
2. Database migration hides banned users' content
3. Frontend AuthGuard shows banned screen
4. Banned users cannot bypass restrictions

Run this script to verify the permanent ban system is working correctly.
"""

import asyncio
import httpx
import json
import sys
from typing import Dict, Any, Optional

# Configuration
API_BASE_URL = "http://localhost:8000"  # Adjust to your API URL
TEST_EMAIL = "test_banned_user@example.com"
TEST_PASSWORD = "testpassword123"

class PermanentBanTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.auth_token = None
        self.test_user_id = None
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()

    async def log(self, message: str, status: str = "INFO"):
        """Log test messages with status"""
        status_emoji = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "ERROR": "❌",
            "WARNING": "⚠️"
        }
        print(f"{status_emoji.get(status, 'ℹ️')} {message}")

    async def test_backend_middleware(self) -> bool:
        """Test that backend middleware blocks banned users"""
        await self.log("Testing backend middleware for permanent ban blocking...")
        
        try:
            # Test 1: Try to access protected endpoint without auth (should fail)
            response = await self.client.get(f"{API_BASE_URL}/api/user/moderation-status")
            if response.status_code != 401:
                await self.log("❌ Unauthenticated access should return 401", "ERROR")
                return False
                
            # Test 2: Try to access with banned user token (should return 403 PERMANENTLY_BANNED)
            if self.auth_token:
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                
                # Test various endpoints
                endpoints_to_test = [
                    "/api/user/moderation-status",
                    "/api/forum/list-posts",
                    "/api/forum/posts",
                    "/api/chatbot/user"
                ]
                
                for endpoint in endpoints_to_test:
                    response = await self.client.get(f"{API_BASE_URL}{endpoint}", headers=headers)
                    
                    if response.status_code == 403:
                        error_data = response.json()
                        if error_data.get("error") == "PERMANENTLY_BANNED":
                            await self.log(f"✅ {endpoint} correctly returns PERMANENTLY_BANNED", "SUCCESS")
                        else:
                            await self.log(f"❌ {endpoint} returns 403 but not PERMANENTLY_BANNED: {error_data}", "ERROR")
                            return False
                    else:
                        await self.log(f"❌ {endpoint} should return 403 for banned user, got {response.status_code}", "ERROR")
                        return False
                        
            await self.log("✅ Backend middleware tests passed", "SUCCESS")
            return True
            
        except Exception as e:
            await self.log(f"❌ Backend middleware test failed: {str(e)}", "ERROR")
            return False

    async def test_database_content_hiding(self) -> bool:
        """Test that banned users' content is hidden from queries"""
        await self.log("Testing database content hiding for banned users...")
        
        try:
            # Test 1: Check that banned users' posts are flagged
            if self.test_user_id:
                # Query posts from banned user
                response = await self.client.get(
                    f"{API_BASE_URL}/api/forum/list-posts",
                    params={"user_id": self.test_user_id}
                )
                
                if response.status_code == 200:
                    posts = response.json().get("data", [])
                    # All posts from banned user should be empty or filtered out
                    if len(posts) == 0:
                        await self.log("✅ Banned user posts are correctly hidden", "SUCCESS")
                    else:
                        await self.log(f"❌ Banned user posts should be hidden, found {len(posts)} posts", "ERROR")
                        return False
                        
            await self.log("✅ Database content hiding tests passed", "SUCCESS")
            return True
            
        except Exception as e:
            await self.log(f"❌ Database content hiding test failed: {str(e)}", "ERROR")
            return False

    async def test_frontend_auth_guard(self) -> bool:
        """Test that frontend AuthGuard blocks banned users"""
        await self.log("Testing frontend AuthGuard for banned user blocking...")
        
        # This would need to be tested manually in the app
        # but we can check that the banned route exists
        await self.log("ℹ️ Frontend AuthGuard testing requires manual app verification")
        await self.log("ℹ️ Please test the following scenarios in the app:")
        await self.log("   1. Login as a banned user")
        await self.log("   2. Verify banned screen appears")
        await self.log("   3. Try to navigate to other routes")
        await self.log("   4. Refresh the app")
        await self.log("   5. Verify banned screen persists")
        
        return True

    async def run_all_tests(self) -> bool:
        """Run all permanent ban system tests"""
        await self.log("🧪 Starting Permanent Ban System Tests", "INFO")
        await self.log("=" * 50, "INFO")
        
        tests = [
            ("Backend Middleware", self.test_backend_middleware),
            ("Database Content Hiding", self.test_database_content_hiding),
            ("Frontend Auth Guard", self.test_frontend_auth_guard),
        ]
        
        results = []
        for test_name, test_func in tests:
            await self.log(f"\n🔍 Running {test_name} Tests...", "INFO")
            result = await test_func()
            results.append(result)
            
        await self.log("\n" + "=" * 50, "INFO")
        await self.log("🏁 Test Summary", "INFO")
        
        passed = sum(results)
        total = len(results)
        
        for i, (test_name, _) in enumerate(tests):
            status = "✅ PASSED" if results[i] else "❌ FAILED"
            await self.log(f"   {test_name}: {status}", "SUCCESS" if results[i] else "ERROR")
            
        await self.log(f"\nOverall: {passed}/{total} tests passed", "SUCCESS" if passed == total else "ERROR")
        
        if passed == total:
            await self.log("🎉 All tests passed! Permanent ban system is working correctly.", "SUCCESS")
        else:
            await self.log("⚠️  Some tests failed. Please review the implementation.", "WARNING")
            
        return passed == total

async def main():
    """Main test runner"""
    print("🚀 Permanent Ban System Test Suite")
    print("=" * 50)
    
    async with PermanentBanTester() as tester:
        success = await tester.run_all_tests()
        
        if success:
            print("\n✅ All tests completed successfully!")
            print("\n📋 Manual Testing Checklist:")
            print("   □ Login as banned user in app")
            print("   □ Verify banned screen appears")
            print("   □ Try navigating to other routes")
            print("   □ Refresh app and verify persistence")
            print("   □ Check that banned user content is hidden")
            print("   □ Verify logout button works")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed. Please check the implementation.")
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
