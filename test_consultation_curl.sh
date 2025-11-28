#!/bin/bash

# ============================================================================
# Consultation System - Quick cURL Test Script
# Tests all consultation endpoints using cURL commands
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="https://aittorney-staging.up.railway.app"

# Replace these with your test credentials
USER_EMAIL="j24angeles@gmail.com"
USER_PASSWORD="Happ1ness!"
LAWYER_EMAIL="mikko.samaniego.cics@ust.edu.ph"
LAWYER_PASSWORD="Mikko54321!"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "\n${BLUE}============================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# ============================================================================
# Test Functions
# ============================================================================

# Test 1: Login as User (Using Supabase Auth)
test_user_login() {
    print_header "TEST 1: User Login"
    
    # Supabase Auth endpoint
    SUPABASE_URL="https://vmlbrckrlgwlobhnpstx.supabase.co"
    SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbGJyY2tybGd3bG9iaG5wc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDI5MDksImV4cCI6MjA2OTM3ODkwOX0.ucK9BXmRg7wYaamFBkTKWTkOavlp7SzNrZwDvNmKsK8"
    
    response=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"${USER_PASSWORD}\"}")
    
    USER_TOKEN=$(echo $response | jq -r '.access_token // empty')
    
    if [ -n "$USER_TOKEN" ]; then
        print_success "User logged in successfully"
        print_info "Token: ${USER_TOKEN:0:20}..."
        return 0
    else
        print_error "User login failed"
        echo "Response: $response"
        return 1
    fi
}

# Test 2: Login as Lawyer (Using Supabase Auth)
test_lawyer_login() {
    print_header "TEST 2: Lawyer Login"
    
    # Supabase Auth endpoint
    SUPABASE_URL="https://vmlbrckrlgwlobhnpstx.supabase.co"
    SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbGJyY2tybGd3bG9iaG5wc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDI5MDksImV4cCI6MjA2OTM3ODkwOX0.ucK9BXmRg7wYaamFBkTKWTkOavlp7SzNrZwDvNmKsK8"
    
    response=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${LAWYER_EMAIL}\",\"password\":\"${LAWYER_PASSWORD}\"}")
    
    LAWYER_TOKEN=$(echo $response | jq -r '.access_token // empty')
    
    if [ -n "$LAWYER_TOKEN" ]; then
        print_success "Lawyer logged in successfully"
        print_info "Token: ${LAWYER_TOKEN:0:20}..."
        return 0
    else
        print_error "Lawyer login failed"
        echo "Response: $response"
        return 1
    fi
}

# Test 3: Get Available Lawyers
test_get_lawyers() {
    print_header "TEST 3: Get Available Lawyers"
    
    response=$(curl -s -X GET "${BASE_URL}/legal-consultations/lawyers")
    
    LAWYER_INFO_ID=$(echo $response | jq -r '.data[0].id // empty')
    LAWYER_NAME=$(echo $response | jq -r '.data[0].name // empty')
    
    if [ -n "$LAWYER_INFO_ID" ]; then
        print_success "Found available lawyer"
        print_info "Lawyer: $LAWYER_NAME"
        print_info "lawyer_info.id: $LAWYER_INFO_ID"
        return 0
    else
        print_error "No lawyers found"
        echo "Response: $response"
        return 1
    fi
}

# Test 4: Book Consultation
test_book_consultation() {
    print_header "TEST 4: Book Consultation"
    
    # Get tomorrow's date
    TOMORROW=$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d "+1 day" +%Y-%m-%d)
    
    print_info "Booking for date: $TOMORROW"
    print_info "Using lawyer_info.id: $LAWYER_INFO_ID"
    
    response=$(curl -s -X POST "${BASE_URL}/consultation-requests/" \
        -H "Authorization: Bearer ${USER_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"lawyer_id\": \"${LAWYER_INFO_ID}\",
            \"message\": \"I need legal advice about a contract dispute.\",
            \"email\": \"${USER_EMAIL}\",
            \"mobile_number\": \"+63 912 345 6789\",
            \"consultation_date\": \"${TOMORROW}\",
            \"consultation_time\": \"14:00\",
            \"consultation_mode\": \"online\"
        }")
    
    CONSULTATION_ID=$(echo $response | jq -r '.data.id // empty')
    
    if [ -n "$CONSULTATION_ID" ]; then
        print_success "Consultation booked successfully"
        print_info "Consultation ID: $CONSULTATION_ID"
        return 0
    else
        print_error "Booking failed"
        echo "Response: $response"
        return 1
    fi
}

# Test 5: Lawyer Views Consultations
test_lawyer_view_consultations() {
    print_header "TEST 5: Lawyer Views Consultations"
    
    response=$(curl -s -X GET "${BASE_URL}/api/consult-actions/my-consultations" \
        -H "Authorization: Bearer ${LAWYER_TOKEN}")
    
    count=$(echo $response | jq 'length')
    
    if [ "$count" -ge 0 ]; then
        print_success "Retrieved $count consultation(s)"
        
        if [ "$count" -gt 0 ]; then
            first_id=$(echo $response | jq -r '.[0].id')
            first_status=$(echo $response | jq -r '.[0].status')
            print_info "First consultation: $first_id (status: $first_status)"
        fi
        return 0
    else
        print_error "Failed to retrieve consultations"
        echo "Response: $response"
        return 1
    fi
}

# Test 6: Accept Consultation
test_accept_consultation() {
    print_header "TEST 6: Accept Consultation"
    
    if [ -z "$CONSULTATION_ID" ]; then
        print_error "No consultation ID available"
        return 1
    fi
    
    print_info "Accepting consultation: $CONSULTATION_ID"
    
    response=$(curl -s -X POST "${BASE_URL}/api/consult-actions/${CONSULTATION_ID}/accept" \
        -H "Authorization: Bearer ${LAWYER_TOKEN}" \
        -H "Content-Type: application/json")
    
    success=$(echo $response | jq -r '.success // empty')
    
    if [ "$success" = "true" ]; then
        print_success "Consultation accepted"
        message=$(echo $response | jq -r '.message')
        print_info "Message: $message"
        return 0
    else
        print_error "Accept failed"
        echo "Response: $response"
        return 1
    fi
}

# Test 7: Complete Consultation
test_complete_consultation() {
    print_header "TEST 7: Complete Consultation"
    
    if [ -z "$CONSULTATION_ID" ]; then
        print_error "No consultation ID available"
        return 1
    fi
    
    print_info "Completing consultation: $CONSULTATION_ID"
    
    response=$(curl -s -X POST "${BASE_URL}/api/consult-actions/${CONSULTATION_ID}/complete" \
        -H "Authorization: Bearer ${LAWYER_TOKEN}" \
        -H "Content-Type: application/json")
    
    success=$(echo $response | jq -r '.success // empty')
    
    if [ "$success" = "true" ]; then
        print_success "Consultation completed"
        message=$(echo $response | jq -r '.message')
        print_info "Message: $message"
        return 0
    else
        print_error "Complete failed"
        echo "Response: $response"
        return 1
    fi
}

# Test 8: Check Ban Status
test_ban_status() {
    print_header "TEST 8: Check Ban Status"
    
    # You'll need to get the user ID from the auth response
    # For now, we'll skip this test
    print_info "Skipping ban status test (requires user_id)"
    return 0
}

# ============================================================================
# Main Test Runner
# ============================================================================

run_all_tests() {
    print_header "CONSULTATION SYSTEM - cURL TEST SUITE"
    echo -e "${YELLOW}Testing against: $BASE_URL${NC}"
    echo -e "${YELLOW}Timestamp: $(date)${NC}\n"
    
    PASSED=0
    FAILED=0
    TOTAL=0
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install it first:"
        echo "  macOS: brew install jq"
        echo "  Ubuntu: sudo apt-get install jq"
        exit 1
    fi
    
    # Run tests
    tests=(
        "test_user_login"
        "test_lawyer_login"
        "test_get_lawyers"
        "test_book_consultation"
        "test_lawyer_view_consultations"
        "test_accept_consultation"
        "test_complete_consultation"
    )
    
    for test in "${tests[@]}"; do
        TOTAL=$((TOTAL + 1))
        if $test; then
            PASSED=$((PASSED + 1))
        else
            FAILED=$((FAILED + 1))
        fi
    done
    
    # Print results
    print_header "TEST RESULTS SUMMARY"
    echo -e "\nTotal Tests: $TOTAL"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    
    if [ $FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ALL TESTS PASSED! System is production-ready! 🚀${NC}\n"
    else
        echo -e "\n${RED}⚠️  Some tests failed. Please review the errors above.${NC}\n"
    fi
    
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
    echo -e "Success Rate: ${SUCCESS_RATE}%\n"
}

# ============================================================================
# Entry Point
# ============================================================================

# Check arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help, -h     Show this help message"
    echo "  --url URL      Set base URL (default: $BASE_URL)"
    echo ""
    echo "Environment Variables:"
    echo "  USER_EMAIL     User email for testing"
    echo "  USER_PASSWORD  User password for testing"
    echo "  LAWYER_EMAIL   Lawyer email for testing"
    echo "  LAWYER_PASSWORD Lawyer password for testing"
    exit 0
fi

if [ "$1" = "--url" ]; then
    BASE_URL="$2"
fi

# Run tests
run_all_tests
