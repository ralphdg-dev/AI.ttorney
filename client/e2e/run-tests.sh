#!/bin/bash

# AI.ttorney E2E Test Runner Script
# This script runs automated tests for login and registration features

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ANDROID_DEVICE=${ANDROID_DEVICE:-"emulator"}
TEST_SUITE=${TEST_SUITE:-"all"}
REPORT_DIR="./e2e/test-reports"
SCREENSHOT_DIR="./e2e/screenshots"

echo -e "${BLUE}🚀 AI.ttorney E2E Test Suite${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create directories
print_status "Creating test directories..."
mkdir -p "$REPORT_DIR"
mkdir -p "$SCREENSHOT_DIR"

# Check if Android device/emulator is available
check_android_device() {
    print_status "Checking Android device availability..."
    
    if [ "$ANDROID_DEVICE" = "emulator" ]; then
        # Check if emulator is running
        if ! adb devices | grep -q "emulator"; then
            print_error "No Android emulator found. Please start an emulator first."
            print_status "Available emulators:"
            emulator -list-avds
            exit 1
        fi
    else
        # Check if physical device is connected
        if ! adb devices | grep -q "device$"; then
            print_error "No Android device found. Please connect a device or start an emulator."
            exit 1
        fi
    fi
    
    print_success "Android device is available"
}

# Build the app for testing
build_app() {
    print_status "Building Android app for testing..."
    
    cd android
    if ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug; then
        print_success "App built successfully"
    else
        print_error "Failed to build app"
        exit 1
    fi
    cd ..
}

# Install dependencies
install_dependencies() {
    print_status "Installing test dependencies..."
    
    if npm install; then
        print_success "Dependencies installed"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Run specific test suite
run_tests() {
  local test_pattern="$1"
  local test_name="$2"
  local feature_name="$3"
  
  print_status "Running $test_name tests..."
  
  # Set test configuration based on device type
  local config="android.emu.debug"
  if [ "$ANDROID_DEVICE" = "attached" ]; then
    config="android.att.debug"
  fi
  
  # Set environment variable for feature-specific reporting
  export TEST_FEATURE="$feature_name"
  
  # Run tests with detailed output
  if npx detox test \
    --configuration "$config" \
    --testNamePattern="$test_pattern" \
    --take-screenshots=all \
    --record-logs=all \
    --headless \
    --gpu=swiftshader_indirect \
    --cleanup; then
    print_success "$test_name tests completed successfully"
    print_status "Report generated: ${feature_name}-test-report.html"
    return 0
  else
    print_error "$test_name tests failed"
    return 1
  fi
}

# Generate test report
generate_report() {
    print_status "Generating test report..."
    
    # Create summary report
    cat > "$REPORT_DIR/test-summary.md" << EOF
# AI.ttorney E2E Test Report

**Test Date:** $(date)
**Platform:** Android
**Device:** $ANDROID_DEVICE
**Test Suite:** $TEST_SUITE

## Test Results

EOF

    # Add test results to summary
    if [ -f "$REPORT_DIR/junit.xml" ]; then
        # Parse JUnit XML for summary (basic parsing)
        local total_tests=$(grep -o 'tests="[0-9]*"' "$REPORT_DIR/junit.xml" | grep -o '[0-9]*' | head -1)
        local failed_tests=$(grep -o 'failures="[0-9]*"' "$REPORT_DIR/junit.xml" | grep -o '[0-9]*' | head -1)
        local passed_tests=$((total_tests - failed_tests))
        
        echo "- **Total Tests:** $total_tests" >> "$REPORT_DIR/test-summary.md"
        echo "- **Passed:** $passed_tests" >> "$REPORT_DIR/test-summary.md"
        echo "- **Failed:** $failed_tests" >> "$REPORT_DIR/test-summary.md"
        echo "" >> "$REPORT_DIR/test-summary.md"
        
        if [ "$failed_tests" -eq 0 ]; then
            echo "✅ **All tests passed!**" >> "$REPORT_DIR/test-summary.md"
        else
            echo "❌ **Some tests failed. Check detailed report for more information.**" >> "$REPORT_DIR/test-summary.md"
        fi
    fi
    
    echo "" >> "$REPORT_DIR/test-summary.md"
    echo "## Reports Generated" >> "$REPORT_DIR/test-summary.md"
    
    # List feature-specific reports based on test suite
    case "$TEST_SUITE" in
        "login")
            echo "- HTML Report: \`login-test-report.html\`" >> "$REPORT_DIR/test-summary.md"
            echo "- JUnit XML: \`login-junit.xml\`" >> "$REPORT_DIR/test-summary.md"
            ;;
        "registration")
            echo "- HTML Report: \`registration-test-report.html\`" >> "$REPORT_DIR/test-summary.md"
            echo "- JUnit XML: \`registration-junit.xml\`" >> "$REPORT_DIR/test-summary.md"
            ;;
        "all"|*)
            echo "- Login HTML Report: \`login-test-report.html\`" >> "$REPORT_DIR/test-summary.md"
            echo "- Registration HTML Report: \`registration-test-report.html\`" >> "$REPORT_DIR/test-summary.md"
            echo "- Combined HTML Report: \`all-features-test-report.html\`" >> "$REPORT_DIR/test-summary.md"
            echo "- Login JUnit XML: \`login-junit.xml\`" >> "$REPORT_DIR/test-summary.md"
            echo "- Registration JUnit XML: \`registration-junit.xml\`" >> "$REPORT_DIR/test-summary.md"
            echo "- Combined JUnit XML: \`all-features-junit.xml\`" >> "$REPORT_DIR/test-summary.md"
            ;;
    esac
    
    echo "- Screenshots: \`../screenshots/\`" >> "$REPORT_DIR/test-summary.md"
    
    print_success "Test report generated at $REPORT_DIR/test-summary.md"
}

# Main execution
main() {
    print_status "Starting E2E test execution..."
    echo ""
    
    # Check prerequisites
    check_android_device
    install_dependencies
    build_app
    
    echo ""
    print_status "Test execution started at $(date)"
    echo ""
    
    local test_failed=false
    
    # Run tests based on suite selection
    case "$TEST_SUITE" in
        "login")
            run_tests "Login Feature Tests" "Login" "login" || test_failed=true
            ;;
        "registration")
            run_tests "Registration Feature Tests" "Registration" "registration" || test_failed=true
            ;;
        "all"|*)
            print_status "Running all test suites..."
            # Clear TEST_FEATURE for combined report
            unset TEST_FEATURE
            run_tests "Login Feature Tests" "Login" "login" || test_failed=true
            run_tests "Registration Feature Tests" "Registration" "registration" || test_failed=true
            ;;
    esac
    
    echo ""
    print_status "Test execution completed at $(date)"
    
    # Generate reports
    generate_report
    
    echo ""
    print_status "📊 Test Results Summary:"
    
    # List all generated HTML reports
    if [ "$TEST_SUITE" = "all" ]; then
        echo "  - Login Report: file://$PWD/$REPORT_DIR/login-test-report.html"
        echo "  - Registration Report: file://$PWD/$REPORT_DIR/registration-test-report.html"
        echo "  - Combined Report: file://$PWD/$REPORT_DIR/all-features-test-report.html"
    elif [ "$TEST_SUITE" = "login" ]; then
        echo "  - Login Report: file://$PWD/$REPORT_DIR/login-test-report.html"
    elif [ "$TEST_SUITE" = "registration" ]; then
        echo "  - Registration Report: file://$PWD/$REPORT_DIR/registration-test-report.html"
    fi
    
    echo "  - Summary: $REPORT_DIR/test-summary.md"
    echo "  - Screenshots: $SCREENSHOT_DIR/"
    echo ""
    
    if [ "$test_failed" = true ]; then
        print_error "Some tests failed. Check the reports for details."
        exit 1
    else
        print_success "All tests passed successfully! 🎉"
        exit 0
    fi
}

# Handle script arguments
case "${1:-}" in
    "--help"|"-h")
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --suite=SUITE     Run specific test suite (login|registration|all)"
        echo "  --device=DEVICE   Use specific device (emulator|attached)"
        echo "  --help, -h        Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  ANDROID_DEVICE    Android device type (emulator|attached)"
        echo "  TEST_SUITE        Test suite to run (login|registration|all)"
        echo ""
        echo "Examples:"
        echo "  $0                           # Run all tests on emulator"
        echo "  $0 --suite=login            # Run only login tests"
        echo "  $0 --device=attached        # Run on connected device"
        echo "  TEST_SUITE=login $0         # Run login tests via env var"
        exit 0
        ;;
    --suite=*)
        TEST_SUITE="${1#*=}"
        ;;
    --device=*)
        ANDROID_DEVICE="${1#*=}"
        ;;
esac

# Run main function
main
