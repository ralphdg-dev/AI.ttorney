#!/bin/bash

# AI.ttorney Stress Testing Script
# Enhanced for production stress testing with multiple scenarios

set -e

# Configuration
CONFIG_FILE="stress-test-config.properties"
RESULTS_DIR="stress-test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${RESULTS_DIR}/stress_test_${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Load configuration
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
        log_info "Configuration loaded from $CONFIG_FILE"
    else
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_scenario() {
    echo -e "${PURPLE}[SCENARIO]${NC} $1" | tee -a "$LOG_FILE"
}

log_metric() {
    echo -e "${CYAN}[METRIC]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if JMeter is installed
    if ! command -v jmeter &> /dev/null; then
        log_error "JMeter is not installed or not in PATH"
        log_info "Install JMeter: brew install jmeter (macOS) or visit https://jmeter.apache.org/"
        exit 1
    fi
    
    log_success "JMeter found: $(jmeter --version | head -n1)"
    
    # Check if test plan exists
    if [ ! -f "ai-attorney-comprehensive-test.jmx" ]; then
        log_error "Test plan file not found: ai-attorney-comprehensive-test.jmx"
        exit 1
    fi
    
    log_success "Test plan found: ai-attorney-comprehensive-test.jmx"
    
    # Check server connectivity
    if ! curl -s --connect-timeout 10 "$BASE_URL/health" > /dev/null; then
        log_error "Cannot connect to server at $BASE_URL"
        log_info "Please check if the server is running and accessible"
        exit 1
    fi
    
    log_success "Server is accessible at $BASE_URL"
}

# Create results directory
setup_results() {
    log_info "Setting up results directory..."
    mkdir -p "$RESULTS_DIR"
    log_success "Results directory created: $RESULTS_DIR"
}

# Run stress test scenario
run_stress_scenario() {
    local scenario_name="$1"
    local users="$2"
    local ramp_time="$3"
    local duration="$4"
    local loops="$5"
    
    log_scenario "Running $scenario_name scenario"
    log_metric "Users: $users, Ramp-up: ${ramp_time}s, Duration: ${duration}s, Loops: $loops"
    
    local results_file="${RESULTS_DIR}/${scenario_name}_${TIMESTAMP}.jtl"
    local report_dir="${RESULTS_DIR}/${scenario_name}_report_${TIMESTAMP}"
    
    # Create temporary JMX with updated parameters
    local temp_jmx="${RESULTS_DIR}/${scenario_name}_temp.jmx"
    sed "s/aittorney-staging.up.railway.app/${BASE_URL#https:\/\//}/g" ai-attorney-comprehensive-test.jmx > "$temp_jmx"
    sed -i '' "s/20<\/intProp>/${users}<\/intProp>/g" "$temp_jmx"
    sed -i '' "s/5<\/intProp>/${ramp_time}<\/intProp>/g" "$temp_jmx"
    sed -i '' "s/10<\/stringProp>/${loops}<\/stringProp>/g" "$temp_jmx"
    
    log_info "Executing stress test..."
    
    # Run JMeter test
    jmeter -n -t "$temp_jmx" \
           -JBASE_URL="$BASE_URL" \
           -JTHREADS="$users" \
           -JRAMP_TIME="$ramp_time" \
           -JLOOPS="$loops" \
           -l "$results_file" \
           -j "${RESULTS_DIR}/jmeter_${scenario_name}_${TIMESTAMP}.log" \
           -JCONNECT_TIMEOUT="$CONNECT_TIMEOUT" \
           -JRESPONSE_TIMEOUT="$RESPONSE_TIMEOUT"
    
    if [ $? -eq 0 ]; then
        log_success "$scenario_name scenario completed"
        
        # Generate HTML report
        if [ "$GENERATE_HTML_REPORT" = "true" ]; then
            log_info "Generating HTML report for $scenario_name..."
            jmeter -g "$results_file" -o "$report_dir" 2>/dev/null
            
            if [ $? -eq 0 ]; then
                log_success "Report generated: $report_dir/index.html"
            else
                log_warning "Failed to generate HTML report for $scenario_name"
            fi
        fi
        
        # Analyze results
        analyze_scenario_results "$scenario_name" "$results_file"
        
    else
        log_error "$scenario_name scenario failed"
        return 1
    fi
    
    # Cleanup temporary file
    rm -f "$temp_jmx"
    
    # Wait between scenarios
    if [ "$scenario_name" != "soak" ]; then
        log_info "Waiting 60 seconds before next scenario..."
        sleep 60
    fi
}

# Analyze scenario results
analyze_scenario_results() {
    local scenario_name="$1"
    local results_file="$2"
    
    log_metric "Analyzing results for $scenario_name..."
    
    if [ ! -f "$results_file" ]; then
        log_error "Results file not found: $results_file"
        return 1
    fi
    
    # Extract metrics (skip header line starting with #)
    local total_requests=$(grep -c "^[^#]" "$results_file" 2>/dev/null || echo "0")
    local success_requests=$(grep -c ",true," "$results_file" 2>/dev/null || echo "0")
    local error_requests=$(grep -c ",false," "$results_file" 2>/dev/null || echo "0")
    
    if [ "$total_requests" -gt 0 ]; then
        local error_rate=$(echo "scale=2; $error_requests * 100 / $total_requests" | bc 2>/dev/null || echo "N/A")
        local success_rate=$(echo "scale=2; $success_requests * 100 / $total_requests" | bc 2>/dev/null || echo "N/A")
        
        log_metric "Total requests: $total_requests"
        log_metric "Successful requests: $success_requests"
        log_metric "Failed requests: $error_requests"
        log_metric "Success rate: ${success_rate}%"
        log_metric "Error rate: ${error_rate}%"
        
        # Check if error rate is acceptable
        if (( $(echo "$error_rate > $MAX_ERROR_RATE" | bc -l 2>/dev/null || echo 0) )); then
            log_warning "Error rate (${error_rate}%) exceeds threshold (${MAX_ERROR_RATE}%)"
        else
            log_success "Error rate (${error_rate}%) is within acceptable range"
        fi
    else
        log_warning "No requests found in results file"
    fi
}

# Generate summary report
generate_summary_report() {
    local summary_file="${RESULTS_DIR}/stress_test_summary_${TIMESTAMP}.html"
    
    log_info "Generating summary report..."
    
    cat > "$summary_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>AI.ttorney Stress Test Summary - $TIMESTAMP</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .scenario { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background: #d4edda; }
        .warning { background: #fff3cd; }
        .error { background: #f8d7da; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0; }
        .metric { background: #f8f9fa; padding: 10px; border-radius: 3px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .metric-label { font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AI.ttorney Stress Test Summary</h1>
        <p>Test Date: $(date)</p>
        <p>Target Server: $BASE_URL</p>
    </div>
    
    <div class="scenario">
        <h2>Test Configuration</h2>
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">$LIGHT_USERS</div>
                <div class="metric-label">Light Load Users</div>
            </div>
            <div class="metric">
                <div class="metric-value">$MEDIUM_USERS</div>
                <div class="metric-label">Medium Load Users</div>
            </div>
            <div class="metric">
                <div class="metric-value">$HEAVY_USERS</div>
                <div class="metric-label">Heavy Load Users</div>
            </div>
            <div class="metric">
                <div class="metric-value">$STRESS_USERS</div>
                <div class="metric-label">Stress Test Users</div>
            </div>
        </div>
    </div>
    
    <div class="scenario">
        <h2>Performance Targets</h2>
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${MAX_ERROR_RATE}%</div>
                <div class="metric-label">Max Error Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${MAX_RESPONSE_TIME}ms</div>
                <div class="metric-label">Max Response Time</div>
            </div>
            <div class="metric">
                <div class="metric-value">${CONNECT_TIMEOUT}ms</div>
                <div class="metric-label">Connection Timeout</div>
            </div>
            <div class="metric">
                <div class="metric-value">${RESPONSE_TIMEOUT}ms</div>
                <div class="metric-label">Response Timeout</div>
            </div>
        </div>
    </div>
    
    <div class="scenario">
        <h2>Test Results</h2>
        <p>Detailed results are available in the individual scenario reports and log files.</p>
        <p><strong>Log File:</strong> <a href="$LOG_FILE">$LOG_FILE</a></p>
    </div>
</body>
</html>
EOF
    
    log_success "Summary report generated: $summary_file"
}

# System health check
system_health_check() {
    log_info "Running system health check..."
    
    # Check system resources
    if command -v top &> /dev/null; then
        log_metric "CPU Usage: $(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')"
        log_metric "Memory Usage: $(top -l 1 | grep "PhysMem" | awk '{print $2}')"
    fi
    
    # Check disk space
    log_metric "Disk Space: $(df -h . | tail -1 | awk '{print $4}') available"
    
    # Check network connectivity
    local ping_result=$(ping -c 1 $(echo "$BASE_URL" | sed 's|https://||' | sed 's|/.*||') 2>/dev/null | grep "time=" | awk '{print $8}' || echo "N/A")
    log_metric "Network Latency: $ping_result"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    find "$RESULTS_DIR" -name "*_temp.jmx" -delete 2>/dev/null || true
}

# Main execution
main() {
    echo -e "${PURPLE}AI.ttorney Stress Testing Suite${NC}"
    echo -e "${CYAN}================================${NC}"
    
    load_config
    setup_results
    check_prerequisites
    system_health_check
    
    echo -e "${PURPLE}Starting Stress Test Scenarios...${NC}"
    echo
    
    # Run scenarios based on input
    case "${SCENARIO:-all}" in
        "light")
            run_stress_scenario "light" "$LIGHT_USERS" "$LIGHT_RAMP_TIME" "$LIGHT_DURATION" "$LIGHT_LOOPS"
            ;;
        "medium")
            run_stress_scenario "medium" "$MEDIUM_USERS" "$MEDIUM_RAMP_TIME" "$MEDIUM_DURATION" "$MEDIUM_LOOPS"
            ;;
        "heavy")
            run_stress_scenario "heavy" "$HEAVY_USERS" "$HEAVY_RAMP_TIME" "$HEAVY_DURATION" "$HEAVY_LOOPS"
            ;;
        "stress")
            run_stress_scenario "stress" "$STRESS_USERS" "$STRESS_RAMP_TIME" "$STRESS_DURATION" "$STRESS_LOOPS"
            ;;
        "soak")
            run_stress_scenario "soak" "$SOAK_USERS" "$SOAK_RAMP_TIME" "$SOAK_DURATION" "$SOAK_LOOPS"
            ;;
        "all")
            log_info "Running complete stress test suite..."
            run_stress_scenario "light" "$LIGHT_USERS" "$LIGHT_RAMP_TIME" "$LIGHT_DURATION" "$LIGHT_LOOPS"
            run_stress_scenario "medium" "$MEDIUM_USERS" "$MEDIUM_RAMP_TIME" "$MEDIUM_DURATION" "$MEDIUM_LOOPS"
            run_stress_scenario "heavy" "$HEAVY_USERS" "$HEAVY_RAMP_TIME" "$HEAVY_DURATION" "$HEAVY_LOOPS"
            run_stress_scenario "stress" "$STRESS_USERS" "$STRESS_RAMP_TIME" "$STRESS_DURATION" "$STRESS_LOOPS"
            # Note: Soak test is commented out by default due to long duration
            # Uncomment the line below if you want to include it
            # run_stress_scenario "soak" "$SOAK_USERS" "$SOAK_RAMP_TIME" "$SOAK_DURATION" "$SOAK_LOOPS"
            ;;
        *)
            log_error "Unknown scenario: $SCENARIO"
            show_usage
            exit 1
            ;;
    esac
    
    generate_summary_report
    
    echo
    echo -e "${GREEN}Stress testing completed successfully!${NC}"
    echo -e "${CYAN}Results available in: $RESULTS_DIR${NC}"
    echo -e "${CYAN}Summary report: ${RESULTS_DIR}/stress_test_summary_${TIMESTAMP}.html${NC}"
}

# Show usage
show_usage() {
    echo "Usage: $0 [scenario]"
    echo ""
    echo "Scenarios:"
    echo "  light    - Light load test (10 users)"
    echo "  medium   - Medium load test (50 users)"
    echo "  heavy    - Heavy load test (100 users)"
    echo "  stress   - Stress test (200 users)"
    echo "  soak     - Soak test (75 users, 1 hour)"
    echo "  all      - Run all scenarios (default)"
    echo ""
    echo "Examples:"
    echo "  $0              # Run all scenarios"
    echo "  $0 light        # Run only light load test"
    echo "  $0 stress       # Run only stress test"
    echo ""
    echo "Environment variables:"
    echo "  SCENARIO        Test scenario to run (default: all)"
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Parse command line arguments
if [ $# -gt 0 ]; then
    case "$1" in
        "help"|"-h"|"--help")
            show_usage
            exit 0
            ;;
        *)
            export SCENARIO="$1"
            ;;
    esac
fi

# Execute main function
main
