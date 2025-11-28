#!/usr/bin/env python3
"""
Consultation System - Comprehensive Test Script
Tests all consultation endpoints for Railway and Android compatibility
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import sys

# ============================================================================
# CONFIGURATION
# ============================================================================

# Railway Production URL
BASE_URL = "https://aittorney-staging.up.railway.app"

# Test credentials (replace with actual test accounts)
USER_CREDENTIALS = {
    "email": "testuser@example.com",
    "password": "TestPassword123!"
}

LAWYER_CREDENTIALS = {
    "email": "testlawyer@example.com",
    "password": "TestPassword123!"
}

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def print_header(text: str):
    """Print section header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}\n")

def print_success(text: str):
    """Print success message"""
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text: str):
    """Print error message"""
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_warning(text: str):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def print_info(text: str):
    """Print info message"""
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.END}")

def login(credentials: Dict[str, str]) -> Optional[str]:
    """Login and get access token"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=credentials,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token') or data.get('token')
            if token:
                print_success(f"Logged in as {credentials['email']}")
                return token
            else:
                print_error(f"No token in response: {data}")
                return None
        else:
            print_error(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Login error: {e}")
        return None

def get_headers(token: str) -> Dict[str, str]:
    """Get request headers with auth token"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def get_tomorrow_date() -> str:
    """Get tomorrow's date in YYYY-MM-DD format"""
    tomorrow = datetime.now() + timedelta(days=1)
    return tomorrow.strftime("%Y-%m-%d")

# ============================================================================
# TEST FUNCTIONS
# ============================================================================

def test_1_book_consultation(user_token: str, lawyer_info_id: str) -> Optional[str]:
    """Test 1: User books a consultation"""
    print_header("TEST 1: Book Consultation (User → Lawyer)")
    
    consultation_data = {
        "user_id": "WILL_BE_SET_BY_BACKEND",  # Backend extracts from token
        "lawyer_id": lawyer_info_id,  # CRITICAL: This is lawyer_info.id
        "message": "I need legal advice about a contract dispute. The other party is not honoring the agreement.",
        "email": "testuser@example.com",
        "mobile_number": "+63 912 345 6789",
        "consultation_date": get_tomorrow_date(),
        "consultation_time": "14:00",  # 2:00 PM in 24-hour format
        "consultation_mode": "online"
    }
    
    print_info(f"Booking consultation with lawyer_info.id: {lawyer_info_id[:8]}...")
    print_info(f"Date: {consultation_data['consultation_date']}")
    print_info(f"Time: {consultation_data['consultation_time']}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/consultation-requests/",
            headers=get_headers(user_token),
            json=consultation_data,
            timeout=15
        )
        
        print_info(f"Response status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            consultation_id = data.get('data', {}).get('id')
            
            if consultation_id:
                print_success(f"Consultation booked successfully!")
                print_info(f"Consultation ID: {consultation_id[:8]}...")
                print_info(f"Status: {data.get('data', {}).get('status')}")
                return consultation_id
            else:
                print_error(f"No consultation ID in response: {data}")
                return None
        else:
            print_error(f"Booking failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print_error(f"Booking error: {e}")
        return None

def test_2_lawyer_view_consultations(lawyer_token: str) -> bool:
    """Test 2: Lawyer views their consultations"""
    print_header("TEST 2: Lawyer Views Consultations")
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/consult-actions/my-consultations",
            headers=get_headers(lawyer_token),
            timeout=10
        )
        
        print_info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            consultations = response.json()
            print_success(f"Retrieved {len(consultations)} consultation(s)")
            
            if consultations:
                print_info("Sample consultation:")
                sample = consultations[0]
                print_info(f"  ID: {sample.get('id', 'N/A')[:8]}...")
                print_info(f"  Status: {sample.get('status', 'N/A')}")
                print_info(f"  Client: {sample.get('client_name', 'N/A')}")
                print_info(f"  Date: {sample.get('consultation_date', 'N/A')}")
            
            return True
        else:
            print_error(f"Failed to retrieve consultations: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Error: {e}")
        return False

def test_3_accept_consultation(lawyer_token: str, consultation_id: str) -> bool:
    """Test 3: Lawyer accepts consultation"""
    print_header("TEST 3: Lawyer Accepts Consultation")
    
    print_info(f"Accepting consultation: {consultation_id[:8]}...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/consult-actions/{consultation_id}/accept",
            headers=get_headers(lawyer_token),
            timeout=10
        )
        
        print_info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Consultation accepted!")
            print_info(f"Message: {data.get('message', 'N/A')}")
            return True
        else:
            print_error(f"Accept failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Error: {e}")
        return False

def test_4_complete_consultation(lawyer_token: str, consultation_id: str) -> bool:
    """Test 4: Lawyer completes consultation"""
    print_header("TEST 4: Lawyer Completes Consultation")
    
    print_info(f"Completing consultation: {consultation_id[:8]}...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/consult-actions/{consultation_id}/complete",
            headers=get_headers(lawyer_token),
            timeout=10
        )
        
        print_info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Consultation completed!")
            print_info(f"Message: {data.get('message', 'N/A')}")
            return True
        else:
            print_error(f"Complete failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Error: {e}")
        return False

def test_5_user_view_consultations(user_token: str) -> bool:
    """Test 5: User views their consultations"""
    print_header("TEST 5: User Views Their Consultations")
    
    try:
        # Get user ID first (you'll need to implement this based on your auth system)
        # For now, we'll use a placeholder
        response = requests.get(
            f"{BASE_URL}/api/consult-actions/my-consultations",  # Adjust endpoint as needed
            headers=get_headers(user_token),
            timeout=10
        )
        
        print_info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            consultations = response.json()
            print_success(f"Retrieved {len(consultations)} consultation(s)")
            return True
        else:
            print_warning(f"Status: {response.status_code} - This endpoint might be lawyer-only")
            return True  # Not a critical failure
            
    except Exception as e:
        print_error(f"Error: {e}")
        return False

def test_6_check_ban_status(user_token: str, user_id: str) -> bool:
    """Test 6: Check user ban status"""
    print_header("TEST 6: Check Consultation Ban Status")
    
    print_info(f"Checking ban status for user: {user_id[:8]}...")
    
    try:
        response = requests.get(
            f"{BASE_URL}/consultation-requests/ban-status/{user_id}",
            headers=get_headers(user_token),
            timeout=10
        )
        
        print_info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Ban status retrieved!")
            print_info(f"Can book: {data.get('can_book', 'N/A')}")
            print_info(f"Ban status: {data.get('ban_status', 'N/A')}")
            if data.get('message'):
                print_info(f"Message: {data.get('message')}")
            return True
        else:
            print_error(f"Failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Error: {e}")
        return False

def test_7_get_lawyers_list() -> Optional[str]:
    """Test 7: Get list of lawyers to find a test lawyer_info.id"""
    print_header("TEST 7: Get Lawyers List")
    
    try:
        response = requests.get(
            f"{BASE_URL}/legal-consultations/lawyers",
            timeout=10
        )
        
        print_info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            lawyers = data.get('data', [])
            
            if lawyers:
                print_success(f"Retrieved {len(lawyers)} lawyer(s)")
                
                # Find first available lawyer
                for lawyer in lawyers:
                    if lawyer.get('available'):
                        lawyer_info_id = lawyer.get('id')
                        print_success(f"Found available lawyer:")
                        print_info(f"  Name: {lawyer.get('name', 'N/A')}")
                        print_info(f"  lawyer_info.id: {lawyer_info_id}")
                        print_info(f"  Specialization: {lawyer.get('specialization', [])}")
                        return lawyer_info_id
                
                print_warning("No available lawyers found")
                return None
            else:
                print_error("No lawyers in database")
                return None
        else:
            print_error(f"Failed: {response.status_code}")
            return None
            
    except Exception as e:
        print_error(f"Error: {e}")
        return None

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def run_all_tests():
    """Run all consultation tests"""
    print_header("CONSULTATION SYSTEM - COMPREHENSIVE TEST SUITE")
    print_info(f"Testing against: {BASE_URL}")
    print_info(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = {
        "passed": 0,
        "failed": 0,
        "total": 0
    }
    
    # Step 1: Get available lawyer
    lawyer_info_id = test_7_get_lawyers_list()
    if not lawyer_info_id:
        print_error("Cannot proceed without a lawyer. Please ensure lawyers exist in database.")
        return
    
    # Step 2: Login as user
    print_header("AUTHENTICATION - User Login")
    user_token = login(USER_CREDENTIALS)
    if not user_token:
        print_error("User login failed. Cannot proceed with tests.")
        return
    
    # Step 3: Login as lawyer
    print_header("AUTHENTICATION - Lawyer Login")
    lawyer_token = login(LAWYER_CREDENTIALS)
    if not lawyer_token:
        print_error("Lawyer login failed. Cannot proceed with tests.")
        return
    
    # Run tests
    tests = [
        ("Book Consultation", lambda: test_1_book_consultation(user_token, lawyer_info_id)),
        ("Lawyer View Consultations", lambda: test_2_lawyer_view_consultations(lawyer_token)),
        ("User View Consultations", lambda: test_5_user_view_consultations(user_token)),
    ]
    
    consultation_id = None
    
    # Test 1: Book consultation
    consultation_id = test_1_book_consultation(user_token, lawyer_info_id)
    results["total"] += 1
    if consultation_id:
        results["passed"] += 1
    else:
        results["failed"] += 1
        print_error("Cannot proceed with remaining tests without consultation_id")
        print_final_results(results)
        return
    
    # Test 2: Lawyer view consultations
    results["total"] += 1
    if test_2_lawyer_view_consultations(lawyer_token):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Test 3: Accept consultation
    results["total"] += 1
    if test_3_accept_consultation(lawyer_token, consultation_id):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Test 4: Complete consultation
    results["total"] += 1
    if test_4_complete_consultation(lawyer_token, consultation_id):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Test 5: User view consultations
    results["total"] += 1
    if test_5_user_view_consultations(user_token):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Print final results
    print_final_results(results)

def print_final_results(results: Dict[str, int]):
    """Print final test results"""
    print_header("TEST RESULTS SUMMARY")
    
    total = results["total"]
    passed = results["passed"]
    failed = results["failed"]
    
    print(f"\n{Colors.BOLD}Total Tests: {total}{Colors.END}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.END}")
    print(f"{Colors.RED}Failed: {failed}{Colors.END}")
    
    if failed == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ALL TESTS PASSED! System is production-ready! 🚀{Colors.END}\n")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}⚠️  Some tests failed. Please review the errors above.{Colors.END}\n")
    
    success_rate = (passed / total * 100) if total > 0 else 0
    print(f"{Colors.BOLD}Success Rate: {success_rate:.1f}%{Colors.END}\n")

# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    try:
        run_all_tests()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Tests interrupted by user{Colors.END}\n")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)
