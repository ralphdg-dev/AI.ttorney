#!/bin/bash

# AI.ttorney Load Testing Script
# This script runs different load testing scenarios

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${BASE_URL:-http://localhost:8000}"
RESULTS_DIR="${SCRIPT_DIR}/performance-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Create custom test plans
create_test_plan() {
    local threads=$1
    local rampup=$2
    local loops=$3
    local test_name=$4
    local output_file="${RESULTS_DIR}/custom_${test_name}_${TIMESTAMP}.jmx"
    
    log_info "Creating custom test plan: $test_name"
    log_info "Threads: $threads, Ramp-up: ${rampup}s, Loops: $loops"
    
    # Create a simplified test plan based on template
    cat > "$output_file" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="AI.ttorney Load Test - ${test_name}" enabled="true">
      <stringProp name="TestPlan.comments">Custom load test: ${test_name}</stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.tearDown_on_shutdown">true</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
        <collectionProp name="Arguments.arguments">
          <elementProp name="BASE_URL" elementType="Argument">
            <stringProp name="Argument.name">BASE_URL</stringProp>
            <stringProp name="Argument.value">${BASE_URL}</stringProp>
            <stringProp name="Argument.metadata">=</stringProp>
          </elementProp>
        </collectionProp>
      </elementProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="${test_name} Load Test" enabled="true">
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
        <stringProp name="ThreadGroup.num_threads">${threads}</stringProp>
        <stringProp name="ThreadGroup.ramp_time">${rampup}</stringProp>
        <boolProp name="ThreadGroup.scheduler">false</boolProp>
        <stringProp name="ThreadGroup.duration"></stringProp>
        <stringProp name="ThreadGroup.delay"></stringProp>
        <boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Loop Controller" enabled="true">
          <boolProp name="LoopController.continue_forever">false</boolProp>
          <stringProp name="LoopController.loops">${loops}</stringProp>
        </elementProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="Health Check" enabled="true">
          <stringProp name="HTTPSampler.domain">${BASE_URL}</stringProp>
          <stringProp name="HTTPSampler.port">8000</stringProp>
          <stringProp name="HTTPSampler.protocol">http</stringProp>
          <stringProp name="HTTPSampler.contentEncoding">UTF-8</stringProp>
          <stringProp name="HTTPSampler.path">/health</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <boolProp name="HTTPSampler.auto_redirects">false</boolProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
          <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
          <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
          <stringProp name="HTTPSampler.connect_timeout">10000</stringProp>
          <stringProp name="HTTPSampler.response_timeout">30000</stringProp>
        </HTTPSamplerProxy>
        <hashTree/>
      </hashTree>
      <ResultCollector guiclass="SummaryReport" testclass="ResultCollector" testname="Summary Report" enabled="true">
        <boolProp name="ResultCollector.error_logging">false</boolProp>
        <objProp>
          <name>saveConfig</name>
          <value class="SampleSaveConfiguration">
            <time>true</time>
            <latency>true</latency>
            <timestamp>true</timestamp>
            <success>true</success>
            <label>true</label>
            <code>true</code>
            <message>true</message>
            <threadName>true</threadName>
            <dataType>true</dataType>
            <encoding>false</encoding>
            <assertions>true</assertions>
            <subresults>true</subresults>
            <responseData>false</responseData>
            <samplerData>false</samplerData>
            <xml>false</xml>
            <fieldNames>true</fieldNames>
            <responseHeaders>false</responseHeaders>
            <requestHeaders>false</requestHeaders>
            <responseDataOnError>false</responseDataOnError>
            <saveAssertionResultsFailureMessage>true</saveAssertionResultsFailureMessage>
            <assertionsResultsToSave>0</assertionsResultsToSave>
            <bytes>true</bytes>
            <sentBytes>true</sentBytes>
            <url>true</url>
            <threadCounts>true</threadCounts>
            <idleTime>true</idleTime>
            <connectTime>true</connectTime>
          </value>
        </objProp>
        <stringProp name="filename">${RESULTS_DIR}/results_${test_name}_${TIMESTAMP}.jtl</stringProp>
      </ResultCollector>
      <hashTree/>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
EOF
    
    echo "$output_file"
}

# Run custom load test
run_custom_test() {
    local test_name=$1
    local threads=$2
    local rampup=$3
    local loops=$4
    
    log_info "Running ${test_name} load test..."
    
    local test_plan=$(create_test_plan $threads $rampup $loops $test_name)
    local results_file="${RESULTS_DIR}/results_${test_name}_${TIMESTAMP}.jtl"
    
    jmeter -n -t "$test_plan" -l "$results_file" -j "${RESULTS_DIR}/jmeter_${test_name}_${TIMESTAMP}.log"
    
    if [ $? -eq 0 ]; then
        log_success "$test_name test completed"
        jmeter -g "$results_file" -o "${RESULTS_DIR}/report_${test_name}_${TIMESTAMP}"
        log_success "Report generated: ${RESULTS_DIR}/report_${test_name}_${TIMESTAMP}"
    else
        log_error "$test_name test failed"
        return 1
    fi
}

# Main scenarios
run_smoke_test() {
    log_info "Running smoke test (light load)..."
    run_custom_test "smoke" 10 5 2
}

run_normal_load() {
    log_info "Running normal load test..."
    run_custom_test "normal" 50 10 5
}

run_peak_load() {
    log_info "Running peak load test..."
    run_custom_test "peak" 100 20 3
}

run_stress_test() {
    log_info "Running stress test..."
    run_custom_test "stress" 200 10 2
}

run_endurance_test() {
    log_info "Running endurance test (sustained load)..."
    run_custom_test "endurance" 30 5 20
}

# Quick performance check
quick_check() {
    log_info "Running quick performance check..."
    
    # Simple curl test
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "$BASE_URL/health" || echo "999")
    
    if (( $(echo "$response_time < 1.0" | bc -l) )); then
        log_success表 "Health check response time: ${response_time}s - GOOD"
    elif (( $(echofile:///Users/lycristobal/Documents/GitHub/AI.ttorney/performance-testing/run-performance-test.sh("$response_time < 2.0" | bc -l) )); then
        log_warning "Health check response time: ${response_time}s - SLOW"
    else
inges
        log_error "Health check constitution check response time: ${response_time}s - VERY SLOW"
    fi
}

# Show usage
show_usage() {
    echo "AI.ttorney Load Testing Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  smoke       Light load test (10 users)"
    echo "  normal      Normal load test (50 users)"
    echo "  peak        Peak load test (100 users)"
    echo "  stress      Stress test (200 users)"
    echo "  endurance   Endurance test (30 users, 20 loops)"
    echo "  quick       Quick performance check"
    echo "  all         Run all scenarios"
    echo "  help        Show this help"
    echo ""
    echo "Environment variables:"
    echo "  BASE_URL    Server URL (default: http://localhost:8000)"
    echo ""
    echo "Examples:"
    echo "  $0 smoke"
    echo "  $0 normal"
    echo "  BASE_URL=http://staging.example.com $0 peak"
}

# Main execution
main() {
    mkdir -p "$RESULTS_DIR"
    
    case "${1:-help}" in
        "smoke")
            run_smoke_test
            ;;
        "normal")
            run_normal_load
            ;;
        "peak")
            run_peak_test
            ;;
        "stress")
            run_stress_test
            ;;
        "endurance")
            run_endurance_test
            ;;
        "quick")
            quick_check
            ;;
        "all")
            run_smoke_test
            run_normal_load
            run_peak_load
            run_stress_test
            run_endurance_test
            log_success "All load tests completed!"
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            log_error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
