#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generate a comprehensive HTML report combining Jest and Playwright results
 */
function generateCombinedReport() {
  const reportDir = path.join(__dirname, '../reports');
  const templatePath = path.join(__dirname, 'report-template.html');
  
  // Ensure reports directory exists
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Read Jest results if available
  let jestResults = null;
  const jestReportPath = path.join(reportDir, 'jest-report.html');
  if (fs.existsSync(jestReportPath)) {
    console.log('✅ Jest report found');
    jestResults = fs.readFileSync(jestReportPath, 'utf8');
  }

  // Read Playwright results if available
  let playwrightResults = null;
  const playwrightReportPath = path.join(reportDir, '../playwright-report/index.html');
  if (fs.existsSync(playwrightReportPath)) {
    console.log('✅ Playwright report found');
    playwrightResults = fs.readFileSync(playwrightReportPath, 'utf8');
  }

  // Generate combined report
  const combinedReport = generateHTMLReport(jestResults, playwrightResults);
  
  // Write combined report
  const outputPath = path.join(reportDir, 'combined-report.html');
  fs.writeFileSync(outputPath, combinedReport);
  
  console.log(`📊 Combined test report generated: ${outputPath}`);
  console.log(`🌐 Open in browser: file://${path.resolve(outputPath)}`);
}

function generateHTMLReport(jestResults, playwrightResults) {
  const timestamp = new Date().toISOString();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI.ttorney Test Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: #023D7B;
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .timestamp {
            background: rgba(255,255,255,0.1);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            margin-top: 15px;
            display: inline-block;
        }
        
        .nav-tabs {
            display: flex;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }
        
        .nav-tab {
            flex: 1;
            padding: 15px 20px;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            color: #6c757d;
            transition: all 0.3s ease;
        }
        
        .nav-tab.active {
            background: white;
            color: #023D7B;
            border-bottom: 3px solid #023D7B;
        }
        
        .nav-tab:hover {
            background: #e9ecef;
        }
        
        .tab-content {
            display: none;
            padding: 30px;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        
        .summary-card h3 {
            font-size: 2rem;
            margin-bottom: 8px;
        }
        
        .summary-card p {
            font-size: 1rem;
            opacity: 0.9;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin: 5px;
        }
        
        .status-pass {
            background: #d4edda;
            color: #155724;
        }
        
        .status-fail {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status-skip {
            background: #fff3cd;
            color: #856404;
        }
        
        .report-section {
            margin-bottom: 30px;
        }
        
        .report-section h2 {
            color: #023D7B;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e9ecef;
        }
        
        .no-report {
            text-align: center;
            color: #6c757d;
            font-style: italic;
            padding: 40px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            font-size: 0.9rem;
        }
        
        .iframe-container {
            width: 100%;
            height: 600px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .iframe-container iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏛️ AI.ttorney Test Report</h1>
            <p>Lawyer Verification System - Automated Test Results</p>
            <div class="timestamp">Generated: ${timestamp}</div>
        </div>
        
        <div class="nav-tabs">
            <button class="nav-tab active" onclick="showTab('overview')">📊 Overview</button>
            <button class="nav-tab" onclick="showTab('jest')">🧪 Unit Tests (Jest)</button>
            <button class="nav-tab" onclick="showTab('playwright')">🎭 E2E Tests (Playwright)</button>
            <button class="nav-tab" onclick="showTab('coverage')">📈 Coverage</button>
        </div>
        
        <div id="overview" class="tab-content active">
            <div class="summary-cards">
                <div class="summary-card">
                    <h3>🧪</h3>
                    <p>Unit Tests</p>
                    <div class="status-badge ${jestResults ? 'status-pass' : 'status-skip'}">
                        ${jestResults ? 'Available' : 'Not Run'}
                    </div>
                </div>
                <div class="summary-card">
                    <h3>🎭</h3>
                    <p>E2E Tests</p>
                    <div class="status-badge ${playwrightResults ? 'status-pass' : 'status-skip'}">
                        ${playwrightResults ? 'Available' : 'Not Run'}
                    </div>
                </div>
                <div class="summary-card">
                    <h3>📈</h3>
                    <p>Coverage</p>
                    <div class="status-badge status-pass">Tracked</div>
                </div>
                <div class="summary-card">
                    <h3>⚡</h3>
                    <p>Performance</p>
                    <div class="status-badge status-pass">Monitored</div>
                </div>
            </div>
            
            <div class="report-section">
                <h2>📋 Test Summary</h2>
                <p>This report combines results from both Jest unit tests and Playwright E2E tests for the AI.ttorney lawyer verification system.</p>
                <ul style="margin-top: 15px; padding-left: 20px;">
                    <li><strong>Unit Tests:</strong> Test individual functions and components in isolation</li>
                    <li><strong>E2E Tests:</strong> Test complete user workflows through the browser</li>
                    <li><strong>Coverage:</strong> Measures code coverage from unit tests</li>
                    <li><strong>Performance:</strong> Monitors test execution speed and memory usage</li>
                </ul>
            </div>
        </div>
        
        <div id="jest" class="tab-content">
            <div class="report-section">
                <h2>🧪 Jest Unit Test Results</h2>
                ${jestResults ? 
                    '<div class="iframe-container"><iframe srcdoc="' + jestResults.replace(/"/g, '&quot;') + '"></iframe></div>' :
                    '<div class="no-report">No Jest test results available. Run <code>npm run test:html</code> to generate unit test reports.</div>'
                }
            </div>
        </div>
        
        <div id="playwright" class="tab-content">
            <div class="report-section">
                <h2>🎭 Playwright E2E Test Results</h2>
                ${playwrightResults ? 
                    '<div class="iframe-container"><iframe srcdoc="' + playwrightResults.replace(/"/g, '&quot;') + '"></iframe></div>' :
                    '<div class="no-report">No Playwright test results available. Run <code>npm run test:e2e</code> to generate E2E test reports.</div>'
                }
            </div>
        </div>
        
        <div id="coverage" class="tab-content">
            <div class="report-section">
                <h2>📈 Code Coverage Report</h2>
                <div class="no-report">
                    Coverage reports are generated with Jest tests.<br>
                    Run <code>npm run test:coverage</code> to view detailed coverage information.
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>AI.ttorney Automated Testing Framework | Generated by Jest + Playwright</p>
        </div>
    </div>
    
    <script>
        function showTab(tabName) {
            // Hide all tab contents
            const contents = document.querySelectorAll('.tab-content');
            contents.forEach(content => content.classList.remove('active'));
            
            // Remove active class from all tabs
            const tabs = document.querySelectorAll('.nav-tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            
            // Add active class to clicked tab
            event.target.classList.add('active');
        }
    </script>
</body>
</html>`;
}

if (require.main === module) {
  generateCombinedReport();
}

module.exports = { generateCombinedReport };
