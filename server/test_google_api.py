#!/usr/bin/env python3
"""
Test Script for Google Custom Search API Credentials

This script verifies that your GOOGLE_API_KEY and GOOGLE_CSE_ID 
are properly configured in the .env file.

Usage:
    python test_google_api.py
"""

import os
import sys
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

def test_google_api_credentials():
    """Test if Google Custom Search API credentials are working"""
    
    print("=" * 70)
    print("🔍 TESTING GOOGLE CUSTOM SEARCH API CREDENTIALS")
    print("=" * 70)
    print()
    
    # Step 1: Check if environment variables are set
    print("📋 Step 1: Checking environment variables...")
    print("-" * 70)
    
    api_key = os.getenv("GOOGLE_API_KEY")
    cse_id = os.getenv("GOOGLE_CSE_ID")
    
    if not api_key:
        print("❌ GOOGLE_API_KEY is not set in .env file")
        print("   Please add: GOOGLE_API_KEY=your_api_key_here")
        return False
    else:
        print(f"✅ GOOGLE_API_KEY found: {api_key[:20]}...{api_key[-4:]}")
    
    if not cse_id:
        print("❌ GOOGLE_CSE_ID is not set in .env file")
        print("   Please add: GOOGLE_CSE_ID=your_cse_id_here")
        return False
    else:
        print(f"✅ GOOGLE_CSE_ID found: {cse_id}")
    
    print()
    
    # Step 2: Test API connection with a simple query
    print("📋 Step 2: Testing API connection...")
    print("-" * 70)
    
    test_query = "Philippine labor law"
    
    try:
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": api_key,
            "cx": cse_id,
            "q": test_query,
            "num": 3,  # Only fetch 3 results for testing
            "safe": "active"
        }
        
        print(f"🔍 Searching for: '{test_query}'")
        print(f"📡 Making request to: {url}")
        print()
        
        response = requests.get(url, params=params, timeout=10)
        
        # Check response status
        if response.status_code == 200:
            print("✅ API request successful!")
            print()
            
            data = response.json()
            
            # Check if we got results
            if "items" in data:
                print(f"✅ Found {len(data['items'])} search results")
                print()
                print("📄 Sample Results:")
                print("-" * 70)
                
                for i, item in enumerate(data["items"], 1):
                    title = item.get("title", "No title")
                    link = item.get("link", "No link")
                    snippet = item.get("snippet", "No snippet")
                    
                    print(f"\n{i}. {title}")
                    print(f"   URL: {link}")
                    print(f"   Snippet: {snippet[:100]}...")
                
                print()
                print("=" * 70)
                print("✅ SUCCESS! Your Google API credentials are working correctly!")
                print("=" * 70)
                return True
            else:
                print("⚠️  API request succeeded but no results found")
                print("   This might be normal if your Custom Search Engine has no indexed sites")
                if "searchInformation" in data:
                    print(f"   Total results: {data['searchInformation'].get('totalResults', 0)}")
                return True
        
        elif response.status_code == 400:
            print("❌ Bad Request (400)")
            error_data = response.json()
            if "error" in error_data:
                error_msg = error_data["error"].get("message", "Unknown error")
                print(f"   Error: {error_msg}")
                
                if "API key not valid" in error_msg:
                    print("\n💡 Solution:")
                    print("   1. Check your GOOGLE_API_KEY in .env file")
                    print("   2. Verify the API key is enabled in Google Cloud Console")
                    print("   3. Make sure Custom Search API is enabled")
                elif "invalid" in error_msg.lower():
                    print("\n💡 Solution:")
                    print("   1. Check your GOOGLE_CSE_ID in .env file")
                    print("   2. Verify the Custom Search Engine ID is correct")
            return False
        
        elif response.status_code == 403:
            print("❌ Forbidden (403)")
            error_data = response.json()
            if "error" in error_data:
                error_msg = error_data["error"].get("message", "Unknown error")
                print(f"   Error: {error_msg}")
                
                if "quota" in error_msg.lower():
                    print("\n💡 Solution:")
                    print("   You've exceeded your daily quota (100 free searches/day)")
                    print("   Wait 24 hours or upgrade to a paid plan")
                else:
                    print("\n💡 Solution:")
                    print("   1. Enable Custom Search API in Google Cloud Console")
                    print("   2. Check API key permissions")
            return False
        
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
    
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
        print("   Check your internet connection")
        return False
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")
        return False
    
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_web_search_service():
    """Test the WebSearchService class"""
    
    print("\n")
    print("=" * 70)
    print("🧪 TESTING WEB SEARCH SERVICE")
    print("=" * 70)
    print()
    
    try:
        # Import the service
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from services.web_search_service import get_web_search_service
        
        # Get service instance
        web_search = get_web_search_service()
        
        # Check if enabled
        if not web_search.is_enabled():
            print("❌ Web Search Service is disabled")
            print("   Check your API credentials")
            return False
        
        print("✅ Web Search Service is enabled")
        print()
        
        # Test search
        print("🔍 Testing search functionality...")
        test_query = "labor law Philippines"
        results = web_search.search(test_query, num_results=3)
        
        if results:
            print(f"✅ Found {len(results)} results")
            print()
            print("📄 Sample Results:")
            print("-" * 70)
            
            for i, result in enumerate(results, 1):
                print(f"\n{i}. {result.get('title', 'No title')}")
                print(f"   URL: {result.get('url', 'No URL')}")
                print(f"   Source: {result.get('source', 'Unknown')}")
                print(f"   Snippet: {result.get('snippet', 'No snippet')[:100]}...")
            
            print()
            print("=" * 70)
            print("✅ SUCCESS! Web Search Service is working correctly!")
            print("=" * 70)
            return True
        else:
            print("⚠️  No results returned")
            print("   This might indicate an API issue")
            return False
    
    except ImportError as e:
        print(f"❌ Failed to import WebSearchService: {e}")
        return False
    
    except Exception as e:
        print(f"❌ Error testing service: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print()
    
    # Test 1: Direct API credentials
    api_test_passed = test_google_api_credentials()
    
    # Test 2: Web Search Service
    if api_test_passed:
        service_test_passed = test_web_search_service()
    else:
        print("\n⚠️  Skipping Web Search Service test due to API credential issues")
        service_test_passed = False
    
    # Final summary
    print("\n")
    print("=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    print(f"API Credentials Test: {'✅ PASSED' if api_test_passed else '❌ FAILED'}")
    print(f"Web Search Service Test: {'✅ PASSED' if service_test_passed else '❌ FAILED'}")
    print("=" * 70)
    print()
    
    if api_test_passed and service_test_passed:
        print("🎉 All tests passed! Your web search RAG is ready to use.")
        print()
        print("📝 Next steps:")
        print("   1. Start your FastAPI server: uvicorn main:app --reload")
        print("   2. Test the chatbot with a legal question")
        print("   3. Check logs for '🌐 Web search triggered' messages")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Please fix the issues above.")
        print()
        print("📚 Setup Guide:")
        print("   1. GOOGLE_API_KEY: https://console.cloud.google.com/apis/credentials")
        print("   2. GOOGLE_CSE_ID: https://programmablesearchengine.google.com/")
        sys.exit(1)
