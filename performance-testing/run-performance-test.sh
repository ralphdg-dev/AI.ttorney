#!/bin/bash

# AI.ttorney Performance Testing Script
# This script runs comprehensive performance tests using JMeter

set -e

# Configuration
BASE_URL="http://localhost:8000"
JMETER_PLAN="ai-attorney-jmeter-test.jmx"
RESULTS_DIR="performance-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_FILE="${RESULTS_DIR}/results_${TIMESTAMP}.jtl"
REPORT_DIR="${RESULTS_DIR}/report_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if JMeter is installed
    if ! command -v jmeter &> /dev/null; then
        log_error "JMeter is not installed or not in PATH"
        log_info "Please install JMeter from https://jmeter.apache.org/"
        exit 1
    fi
    
    log_success "JMeter found: $(jmeter --version | head -n1)"
    
    # Check if test plan exists
    if [ ! -f "$JMETER_PLAN" ]; then
        log_error "Test plan file not found: $JMETER_PLAN"
        exit 1
    fi
    
    log_success "Test plan found: $JMETER_PLAN"
    
    # Check if server is running
    if ! curl -s "$BASE_URL/health" > /dev/null; then
        log_warning "Server might not be running at $BASE_URL"
        log_info "Attempting to start server..."
        
        # Try to start the server (adjust path as needed)
        cd server 2>/dev/null || {
            log_error "Server directory not found"
            exit 1
        }
        
        python main.py &
        SERVER_PID=$!
        cd ..
        
        # Wait for server to start
        log_info "Waiting for server to start..."
        for i in {1..30}; do
            if curl -s "$BASE_URL/health" > /dev/null; then
                log_success "Server started successfully"
                break
            fi
            if [ $i -eq 30 ]; then
                log_error "Server failed to start within 30 seconds"
                kill $SERVER_PID 2>/dev/null
                exit 1
            fi
            sleep 1
        done
    else
        log_success "Server is running at $BASE_URL"
    fi
}

# Create results directory
setup_results() {
    log_info "Setting up results directory..."
    mkdir -p "$RESULTS_DIR"
    log_success "Results directory created: $RESULTS_DIR"
}

# Run performance test
run_test() {
    log_info "Starting performance test..."
    log_info "Test plan: $JMETER_PLAN"
    log_info "Results file: $RESULTS_FILE"
    
    # Run JMeter test
    jmeter -n -t "$JMETER_PLAN" \
           -JBASE_URL="$BASE_URL" \
           -l "$RESULTS_FILE" \
           -j "${RESULTS_DIR}/jmeter_${TIMESTAMP}.log"
    
    if [ $? -eq 0 ]; then
        log_success "Performance test completed successfully"
    else
        log_error "Performance test failed"
        exit 1
    fi
}

# Generate HTML report
generate_report() {
    log_info "Generating HTML report..."
    
    jmeter -g "$RESULTS_FILE" -o "$REPORT_DIR"
    
    if [ $? -eq 0 ]; then
        log_success "HTML report generated: $REPORT_DIR"
        log_info "Open $REPORT_DIR/index.html to view the report"
    else
        log_error "Failed to generate HTML report"
        exit 1
    fi
}

# Analyze results
analyze_results() {
    log_info "Analyzing results..."
    
    # Extract key metrics using JMeter plugins or custom scripts
    if command -v jmeter-plugins &> /dev/null; then
        log_info "Generating additional metrics with JMeter plugins..."
        # Add plugin-based analysis here
    fi
    
    # Simple analysis
    TOTAL_REQUESTS=$(grep -c "^[^#]" "$RESULTS_FILE" 2>/dev/null || echo "0")
    ERROR_COUNT=$(grep -c ",false," "$RESULTS_FILE" 2>/dev/null || echo "0")
    
    log_info "Total requests: $TOTAL_REQUESTS"
    log_info "Failed requests: $ERROR_COUNT"
    
    if [ "$TOTAL_REQUESTS" -gt 0 ]; then
        ERROR_RATE=$(echo "scale=2; $ERROR_COUNT * 100 / $TOTAL_REQUESTS" | bc 2>/dev/null || echo "N/A")
        log_info "Error rate: ${ERROR_RATE}%"
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    
    # Stop server if we started it
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
        log_info "Server stopped"
    fi
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Main execution
main() {
    log_info "AI.ttorney Performance Testing Started"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Base URL: $BASE_URL"
    
    check_prerequisites
    setup_results
    run_test
    generate_report
    analyze_results
    
    log_success "Performance testing completed successfully!"
    log_info "Results available in: $RESULTS_DIR"
    log_info "HTML report: $REPORT_DIR/index.html"
}

# Parse command line arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  help, -h, --help    Show this help message"
        echo "  setup-only         Only check prerequisites and setup"
        echo "  report-only        Generate report from existing results"
        echo ""
        echo "Environment variables:"
        echo "  BASE_URL           Server URL (default: http://localhost:8000)"
        echo "  JMETER_PLAN        Test plan file (default: ai-attorney-jmeter-test.jmx)"
        echo ""
        exit 0
        ;;
    "setup-only")
        check_prerequisites
        setup_results
        exit 0
        ;;
    "report-only")
        if [ ! -f "$RESULTS_FILE" ]; then
            log_error "Results file not found: $RESULTS_FILE"
            exit 1
        fi
        generate_report
        analyze_results
        exit 0
        ;;
    "")
        # Default behavior - run full test
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
