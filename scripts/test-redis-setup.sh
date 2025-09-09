#!/bin/bash

# AI.ttorney Redis Setup Test Script
# This script tests Redis setup across different platforms

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

test_redis_connection() {
    print_info "Testing Redis connection..."
    
    # Test Docker Redis first
    if docker exec ai-ttorney-redis redis-cli ping &>/dev/null; then
        print_success "Docker Redis is responding"
        return 0
    fi
    
    # Test native Redis
    if redis-cli ping &>/dev/null; then
        print_success "Native Redis is responding"
        return 0
    fi
    
    print_error "Redis is not responding"
    return 1
}

test_otp_operations() {
    print_info "Testing OTP-like operations..."
    
    local redis_cmd=""
    if docker exec ai-ttorney-redis redis-cli ping &>/dev/null; then
        redis_cmd="docker exec ai-ttorney-redis redis-cli"
    elif redis-cli ping &>/dev/null; then
        redis_cmd="redis-cli"
    else
        print_error "No Redis connection available"
        return 1
    fi
    
    # Test OTP operations
    $redis_cmd set "otp:test:user@example.com" "test_hash" EX 120 >/dev/null
    local stored_value=$($redis_cmd get "otp:test:user@example.com")
    
    if [[ "$stored_value" == "test_hash" ]]; then
        print_success "OTP storage and retrieval working"
        
        # Test TTL
        local ttl=$($redis_cmd ttl "otp:test:user@example.com")
        if [[ $ttl -gt 0 ]]; then
            print_success "TTL functionality working (TTL: ${ttl}s)"
        else
            print_warning "TTL might not be working correctly"
        fi
        
        # Cleanup
        $redis_cmd del "otp:test:user@example.com" >/dev/null
        print_success "OTP cleanup successful"
        return 0
    else
        print_error "OTP operations failed"
        return 1
    fi
}

test_file_existence() {
    print_info "Checking required files..."
    
    local files=(
        "scripts/setup-redis.sh"
        "scripts/setup-redis.bat"
        "scripts/setup-redis.ps1"
        "docker-compose.redis.yml"
        "redis.conf"
    )
    
    local missing_files=()
    
    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            print_success "$file exists"
        else
            print_error "$file missing"
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -eq 0 ]]; then
        print_success "All required files present"
        return 0
    else
        print_error "${#missing_files[@]} files missing"
        return 1
    fi
}

test_script_permissions() {
    print_info "Checking script permissions..."
    
    if [[ -x "scripts/setup-redis.sh" ]]; then
        print_success "setup-redis.sh is executable"
    else
        print_warning "setup-redis.sh is not executable"
        chmod +x scripts/setup-redis.sh
        print_info "Made setup-redis.sh executable"
    fi
}

main() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "   AI.ttorney Redis Setup Test"
    echo "========================================"
    echo -e "${NC}"
    
    local os_type=$(detect_os)
    print_info "Detected OS: $os_type"
    
    local tests_passed=0
    local tests_total=0
    
    # Test 1: File existence
    ((tests_total++))
    if test_file_existence; then
        ((tests_passed++))
    fi
    
    # Test 2: Script permissions (Unix-like systems only)
    if [[ "$os_type" != "windows" ]]; then
        ((tests_total++))
        if test_script_permissions; then
            ((tests_passed++))
        fi
    fi
    
    # Test 3: Redis connection
    ((tests_total++))
    if test_redis_connection; then
        ((tests_passed++))
        
        # Test 4: OTP operations (only if Redis is running)
        ((tests_total++))
        if test_otp_operations; then
            ((tests_passed++))
        fi
    else
        print_warning "Skipping OTP tests (Redis not running)"
        print_info "To start Redis:"
        case $os_type in
            "windows")
                echo "  scripts\\setup-redis.bat --docker"
                echo "  or"
                echo "  scripts\\setup-redis.ps1 -Docker"
                ;;
            *)
                echo "  ./scripts/setup-redis.sh --docker"
                ;;
        esac
    fi
    
    echo ""
    echo "========================================"
    if [[ $tests_passed -eq $tests_total ]]; then
        print_success "All tests passed ($tests_passed/$tests_total)"
        echo "Redis setup is working correctly!"
    else
        print_warning "Some tests failed ($tests_passed/$tests_total)"
        echo "Please check the issues above and run setup scripts if needed."
    fi
    echo "========================================"
}

main "$@"
