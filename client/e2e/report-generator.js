/**
 * Professional E2E Test Report Generator
 * Generates formal documentation-ready test reports
 */

class ProfessionalReportGenerator {
  static generateHTMLReport(report) {
    const passRate = ((report.passed / report.totalTests) * 100).toFixed(1);
    const failRate = ((report.failed / report.totalTests) * 100).toFixed(1);
    
    // Group tests by category
    const testCategories = {
      'Core Application Tests': ['App Launch Test', 'UI Elements Test', 'App Startup Performance'],
      'Authentication & Registration': ['User Registration Flow', 'Login Authentication', 'Role-Based Access Control', 'Guest Access Test', 'Authentication Edge Cases'],
      'Guest User Features': ['Guest Onboarding Flow', 'Guest Chatbot Access', 'Guest Legal Glossary Access', 'Guest Session Limits'],
      'AI Chatbot System': ['User-Side AI Chatbot', 'Lawyer-Side AI Chatbot', 'Chatbot Bilingual Support', 'Chatbot Context Handling'],
      'Legal Knowledge Base': ['Legal Articles Management', 'Legal Glossary Management', 'Knowledge Base Search', 'FAQ System'],
      'Consultation System': ['Consultation Request Creation', 'Consultation Response Tracking', 'Lawyer Consultation Management', 'Consultation Accept Flow', 'Consultation Reject Flow', 'Consultation Status Updates'],
      'Law Firm Locator': ['Law Firm Location Accuracy', 'Law Firm Search Results', 'Law Firm Filtering'],
      'Community Forum': ['Forum Post Creation', 'Forum Commenting System', 'Forum Content Reporting', 'Forum Discussion Viewing'],
      'Lawyer Application System': ['Lawyer Credential Upload', 'Lawyer Application Submission', 'Lawyer Verification Status'],
      'AI Moderation System': ['Chatbot AI Moderation', 'Forum AI Moderation'],
      'Administrative CMS': ['Admin Lawyer Management', 'Admin Legal Seeker Management', 'Admin Content Management', 'Admin Forum Management', 'Admin Appeals Management', 'Admin Account Management', 'Admin Audit Logs', 'Admin Dashboard Statistics', 'Lawyer Verification Management'],
      'Help & Support': ['Help Support Requests', 'Support FAQ Display', 'Support Request Processing'],
      'User Interface & Experience': ['Screen Rotation Test', 'Back Button Navigation', 'Multi-Touch Gestures', 'Accessibility Features'],
      'Performance & Reliability': ['App Responsiveness Test', 'Network Connectivity Test', 'Memory Usage Test', 'Battery Usage Test'],
      'Security & Privacy': ['Data Privacy Test', 'Session Security Test', 'Input Sanitization Test'],
      'Stress & Load Testing': ['Rapid Input Stress Test', 'Long Session Stress Test', 'Concurrent Operations Test', 'Large Data Handling'],
      'Edge Cases & Error Handling': ['Invalid Input Handling', 'App Recovery Test', 'Network Interruption Test', 'Low Storage Conditions', 'Device Resource Limits', 'Malformed Data Handling'],
      'Compatibility Testing': ['Different Screen Sizes', 'System Theme Changes', 'Language Switching']
    };

    // Determine framework type from report data
    const isHybridFramework = report.framework && report.framework.includes('Hybrid');
    const isDetoxFramework = report.framework && report.framework.includes('Detox');
    
    const testingFramework = {
      name: isHybridFramework ? 'Hybrid Detox + UI Automator Framework' : 
            isDetoxFramework ? 'Professional Detox Automation Framework' :
            'Interim ADB-Based E2E Testing Framework',
      version: '1.0.0',
      platform: 'Android',
      automation: isHybridFramework ? 'UI Automator + Detox Concepts' :
                  isDetoxFramework ? 'Detox Framework (Industry Standard)' :
                  'ADB (Android Debug Bridge) - Interim Solution',
      language: 'Node.js',
      reportingEngine: 'Custom HTML Generator',
      note: isHybridFramework ? 'Enhanced automation using UI Automator with Detox testing patterns.' :
            isDetoxFramework ? 'Professional React Native automation framework with element-based testing.' :
            'Currently using ADB due to Detox build issues. Recommended migration to Detox framework.'
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI.ttorney Mobile Application - End-to-End Test Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Arial', sans-serif; 
            line-height: 1.4; 
            color: #000; 
            background: white; 
            font-size: 12px;
        }
        .container { 
            max-width: 1000px; 
            margin: 0 auto; 
            background: white; 
            border: 1px solid #000;
        }
        
        /* Header Styles */
        .header { 
            background: white; 
            color: black; 
            padding: 20px; 
            text-align: center; 
            border-bottom: 2px solid #000;
        }
        .header h1 { 
            font-size: 18px; 
            margin-bottom: 8px; 
            font-weight: bold; 
            text-transform: uppercase;
        }
        .header .subtitle { 
            font-size: 14px; 
            margin-bottom: 10px; 
            font-weight: normal;
        }
        .header .meta { 
            font-size: 10px; 
        }
        
        /* Content Styles */
        .content { padding: 20px; }
        .section { margin-bottom: 25px; }
        .section h2 { 
            color: black; 
            border-bottom: 1px solid #000; 
            padding-bottom: 5px; 
            margin-bottom: 15px; 
            font-size: 14px; 
            font-weight: bold;
            text-transform: uppercase;
        }
        .section h3 { 
            color: black; 
            margin-bottom: 10px; 
            font-size: 12px; 
            font-weight: bold;
        }
        
        /* Executive Summary */
        .executive-summary { 
            background: white; 
            padding: 15px; 
            border: 1px solid #000; 
            margin-bottom: 25px; 
        }
        .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 10px; 
            margin-top: 10px; 
        }
        .summary-card { 
            background: white; 
            padding: 10px; 
            text-align: center; 
            border: 1px solid #000; 
        }
        .summary-number { 
            font-size: 20px; 
            font-weight: bold; 
            margin-bottom: 3px; 
            color: black;
        }
        
        /* Tables */
        .test-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0; 
            background: white; 
            font-size: 10px;
        }
        .test-table th, .test-table td { 
            padding: 6px 8px; 
            text-align: left; 
            border: 1px solid #000; 
        }
        .test-table th { 
            background: white; 
            color: black; 
            font-weight: bold; 
            text-transform: uppercase;
        }
        
        /* Status Badges */
        .status-badge { 
            display: inline-block; 
            padding: 2px 6px; 
            font-size: 9px; 
            font-weight: bold; 
            text-transform: uppercase; 
            border: 1px solid #000;
            background: white;
            color: black;
        }
        
        /* Framework Info */
        .framework-info { 
            background: white; 
            border: 1px solid #000; 
            padding: 15px; 
        }
        .framework-table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 10px;
        }
        .framework-table td { 
            padding: 4px 8px; 
            border-bottom: 1px solid #000; 
        }
        .framework-table td:first-child { 
            font-weight: bold; 
            width: 150px; 
        }
        
        /* Charts - Simple text-based */
        .chart-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin: 20px 0;
            gap: 20px;
        }
        
        .chart-section {
            flex: 1;
            text-align: center;
            padding: 15px;
            border: 1px solid #000;
        }
        
        .chart-canvas {
            max-width: 200px;
            max-height: 200px;
            margin: 5px auto;
        }
        
        .chart-text {
            text-align: center;
            padding: 20px;
            border: 1px solid #000;
            margin-right: 20px;
        }
        
        .chart-number {
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .progress-charts {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
            gap: 15px;
        }
        
        .progress-chart {
            flex: 1;
            text-align: center;
            padding: 10px;
            border: 1px solid #ccc;
            background: #f9f9f9;
        }
        
        .progress-chart h4 {
            font-size: 11px;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        /* Category Results */
        .category-section { 
            margin: 20px 0; 
            border: 1px solid #000; 
        }
        .category-header { 
            background: white; 
            padding: 8px 15px; 
            border-bottom: 1px solid #000; 
            font-weight: bold; 
            font-size: 11px;
            text-transform: uppercase;
        }
        .category-content { padding: 0; }
        
        /* Test Results */
        .test-results {
            margin: 20px 0;
        }
        
        .test-item {
            margin: 15px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 3px;
            background: #f9f9f9;
            page-break-inside: avoid;
        }
        
        .test-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 8px;
        }
        
        .test-name {
            font-weight: bold;
            font-size: 12px;
            margin: 0;
        }
        
        .test-meta {
            font-size: 9px;
            color: #666;
        }
        
        .test-status {
            font-size: 10px;
            padding: 3px 8px;
            border-radius: 2px;
            display: inline-block;
            font-weight: bold;
        }
        
        .status-pass {
            background: #f0f0f0;
            border: 1px solid #999;
        }
        
        .status-fail {
            background: #f5f5f5;
            border: 1px solid #666;
        }
        
        .test-description {
            font-size: 10px;
            margin: 8px 0;
            line-height: 1.4;
            color: #444;
            font-style: italic;
        }
        
        .test-steps {
            margin: 10px 0;
        }
        
        .test-steps h4 {
            font-size: 10px;
            margin: 5px 0;
            font-weight: bold;
        }
        
        .step-item {
            font-size: 9px;
            margin: 3px 0;
            padding: 3px 8px;
            background: #fff;
            border-left: 2px solid #ccc;
            line-height: 1.3;
        }
        
        .step-order {
            font-weight: bold;
            margin-right: 5px;
            color: #666;
        }
        
        .test-comments {
            margin: 10px 0;
        }
        
        .comment-item {
            font-size: 9px;
            margin: 3px 0;
            padding: 3px 8px;
            background: #f8f8f8;
            border-left: 2px solid #999;
            font-style: italic;
            line-height: 1.3;
        }
        
        .test-duration {
            font-size: 9px;
            color: #666;
            margin: 5px 0;
        }
        
        .test-error {
            font-size: 9px;
            margin-top: 8px;
            padding: 8px;
            background: #f8f8f8;
            border: 1px solid #ccc;
            border-radius: 2px;
            line-height: 1.3;
        }
        
        /* Footer */
        .footer { 
            background: white; 
            color: black; 
            text-align: center; 
            padding: 15px; 
            border-top: 2px solid #000;
            font-size: 10px;
        }
        .footer p { margin: 3px 0; }
        
        /* Print Styles */
        @media print {
            body { background: white; }
            .container { box-shadow: none; border: 1px solid #000; }
            .test-table { break-inside: avoid; }
            .category-section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>AI.ttorney Mobile Application</h1>
            <div class="subtitle">End-to-End Test Execution Report</div>
            <div class="meta">
                <div>Report Generated: ${new Date(report.timestamp).toLocaleString()}</div>
                <div>Test Environment: Android Emulator</div>
                <div>Application Version: Production Build</div>
            </div>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Executive Summary -->
            <div class="section">
                <h2>Executive Summary</h2>
                <div class="executive-summary">
                    <p>This report presents the results of comprehensive end-to-end testing performed on the AI.ttorney mobile application. The testing framework validates critical user journeys, system functionality, and application reliability across multiple test categories.</p>
                    
                    <div class="summary-grid">
                        <div class="summary-card">
                            <div class="summary-number">${report.totalTests}</div>
                            <div>Total Test Cases</div>
                        </div>
                        <div class="summary-card success">
                            <div class="summary-number success">${report.passed}</div>
                            <div>Passed</div>
                        </div>
                        <div class="summary-card failure">
                            <div class="summary-number failure">${report.failed}</div>
                            <div>Failed</div>
                        </div>
                        <div class="summary-card info">
                            <div class="summary-number info">${passRate}%</div>
                            <div>Success Rate</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Testing Framework Information -->
            <div class="section">
                <h2>Testing Framework & Methodology</h2>
                <div class="framework-info">
                    <table class="framework-table">
                        <tr>
                            <td>Framework Name</td>
                            <td>${testingFramework.name}</td>
                        </tr>
                        <tr>
                            <td>Framework Version</td>
                            <td>${testingFramework.version}</td>
                        </tr>
                        <tr>
                            <td>Target Platform</td>
                            <td>${testingFramework.platform}</td>
                        </tr>
                        <tr>
                            <td>Automation Technology</td>
                            <td>${testingFramework.automation}</td>
                        </tr>
                        <tr>
                            <td>Implementation Language</td>
                            <td>${testingFramework.language}</td>
                        </tr>
                        <tr>
                            <td>Reporting Engine</td>
                            <td>${testingFramework.reportingEngine}</td>
                        </tr>
                        <tr>
                            <td>Test Execution Mode</td>
                            <td>${report.totalTests > 10 ? 'Comprehensive Suite' : 'Quick Smoke Tests'}</td>
                        </tr>
                        <tr>
                            <td>Screenshot Capture</td>
                            <td>Enabled - Visual verification at key test points</td>
                        </tr>
                        <tr>
                            <td>Framework Note</td>
                            <td>${testingFramework.note}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Test Results Overview -->
            <div class="section">
                <h2>Test Results Overview</h2>
                <div class="chart-container">
                    <div class="chart-section">
                        <h3>Overall Pass Rate</h3>
                        <canvas id="passRateChart" class="chart-canvas"></canvas>
                        <div class="chart-number">${passRate}%</div>
                        <div>Success Rate</div>
                    </div>
                    <div class="chart-section">
                        <h3>Test Distribution</h3>
                        <canvas id="testDistributionChart" class="chart-canvas"></canvas>
                    </div>
                    <div class="chart-section">
                        <h3>Test Execution Statistics</h3>
                        <table class="test-table" style="width: 100%;">
                            <tr>
                                <th>Metric</th>
                                <th>Value</th>
                                <th>Percentage</th>
                            </tr>
                            <tr>
                                <td>Successful Tests</td>
                                <td>${report.passed}</td>
                                <td>${passRate}%</td>
                            </tr>
                            <tr>
                                <td>Failed Tests</td>
                                <td>${report.failed}</td>
                                <td>${failRate}%</td>
                            </tr>
                            <tr>
                                <td>Total Executed</td>
                                <td>${report.totalTests}</td>
                                <td>100%</td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>


            <!-- Detailed Test Results by Category -->
            <div class="section">
                <h2>Detailed Test Results by Category</h2>
                ${Object.entries(testCategories).map(([category, testNames]) => {
                  const categoryTests = report.results.filter(test => testNames.includes(test.name));
                  if (categoryTests.length === 0) return '';
                  
                  const categoryPassed = categoryTests.filter(t => t.status === 'PASS').length;
                  const categoryTotal = categoryTests.length;
                  const categoryPassRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
                  
                  return `
                    <div class="category-section">
                        <div class="category-header">
                            ${category} (${categoryPassed}/${categoryTotal} passed - ${categoryPassRate}%)
                        </div>
                        <div class="category-content">
                            <table class="test-table">
                                <thead>
                                    <tr>
                                        <th>Test Case</th>
                                        <th>Description</th>
                                        <th>Steps</th>
                                        <th>Comments</th>
                                        <th>Duration</th>
                                        <th>Status</th>
                                        <th>Error Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${categoryTests.map((test, index) => `
                                        <tr>
                                            <td style="font-weight: bold;">${test.name}</td>
                                            <td style="font-size: 9px; max-width: 200px;">${test.description || 'Test case validation and functionality verification.'}</td>
                                            <td style="font-size: 8px; max-width: 150px;">
                                                ${test.steps && test.steps.length > 0 ? 
                                                    test.steps.map(step => `${step.order}. ${step.step}`).join('<br>') : 
                                                    'Standard test execution'
                                                }
                                            </td>
                                            <td style="font-size: 8px; max-width: 120px; font-style: italic;">
                                                ${test.comments && test.comments.length > 0 ? 
                                                    test.comments.map(comment => comment.comment).join('<br>') : 
                                                    'No additional comments'
                                                }
                                            </td>
                                            <td style="font-size: 9px;">${test.duration ? `${test.duration}ms` : 'N/A'}</td>
                                            <td><span class="status-badge ${test.status.toLowerCase()}">${test.status}</span></td>
                                            <td style="font-size: 8px; max-width: 150px;">${test.error || 'N/A'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                  `;
                }).join('')}
            </div>

            <!-- Test Coverage & Scope -->
            <div class="section">
                <h2>Test Coverage & Scope</h2>
                <table class="test-table">
                    <thead>
                        <tr>
                            <th>Test Category</th>
                            <th>Coverage Area</th>
                            <th>Test Count</th>
                            <th>Business Impact</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Core Application Tests</td>
                            <td>Application lifecycle, startup, UI initialization</td>
                            <td>3</td>
                            <td>Critical - Core functionality</td>
                        </tr>
                        <tr>
                            <td>Authentication & Access Control</td>
                            <td>User authentication, guest access, security</td>
                            <td>3</td>
                            <td>High - User access management</td>
                        </tr>
                        <tr>
                            <td>Guest User Journey</td>
                            <td>Guest onboarding, feature access, user flow</td>
                            <td>3</td>
                            <td>High - User acquisition</td>
                        </tr>
                        <tr>
                            <td>Core Feature Validation</td>
                            <td>Chatbot functionality, legal queries, navigation</td>
                            <td>3</td>
                            <td>Critical - Primary features</td>
                        </tr>
                        <tr>
                            <td>Legal Platform Features</td>
                            <td>Forum, glossary, articles, lawyer directory, law firm map</td>
                            <td>11</td>
                            <td>Critical - Main legal features</td>
                        </tr>
                        <tr>
                            <td>Consultation System</td>
                            <td>Request creation, lawyer management, accept/reject flows</td>
                            <td>6</td>
                            <td>Critical - Core business functionality</td>
                        </tr>
                        <tr>
                            <td>User Interface & Experience</td>
                            <td>UI responsiveness, accessibility, device compatibility</td>
                            <td>4</td>
                            <td>Medium - User experience</td>
                        </tr>
                        <tr>
                            <td>Performance & Reliability</td>
                            <td>App performance, memory usage, network handling</td>
                            <td>4</td>
                            <td>High - System reliability</td>
                        </tr>
                        <tr>
                            <td>Security & Privacy</td>
                            <td>Data protection, session security, input sanitization</td>
                            <td>3</td>
                            <td>High - Security compliance</td>
                        </tr>
                        <tr>
                            <td>Stress & Load Testing</td>
                            <td>High-frequency operations, extended sessions, data handling</td>
                            <td>4</td>
                            <td>Medium - Performance validation</td>
                        </tr>
                        <tr>
                            <td>Edge Cases & Error Handling</td>
                            <td>Error scenarios, recovery mechanisms, resilience</td>
                            <td>6</td>
                            <td>Medium - System robustness</td>
                        </tr>
                        <tr>
                            <td>Compatibility Testing</td>
                            <td>Screen sizes, themes, language support</td>
                            <td>3</td>
                            <td>Low - Cross-platform compatibility</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Recommendations & Next Steps -->
            <div class="section">
                <h2>Recommendations & Next Steps</h2>
                <div class="framework-info">
                    <h3>Quality Assessment</h3>
                    <p><strong>Overall Quality Score:</strong> ${passRate}% - ${passRate >= 95 ? 'Excellent' : passRate >= 85 ? 'Good' : passRate >= 70 ? 'Acceptable' : 'Needs Improvement'}</p>
                    
                    <h3>Recommendations</h3>
                    <ul style="margin: 15px 0; padding-left: 20px;">
                        ${report.failed === 0 ? 
                          '<li>All tests passed successfully. Application is ready for production deployment.</li><li>Consider expanding test coverage to include edge cases and stress testing.</li><li>Implement continuous integration to run these tests automatically.</li>' :
                          '<li>Address failed test cases before production deployment.</li><li>Review error logs and implement necessary fixes.</li><li>Re-run failed tests after implementing corrections.</li>'
                        }
                        <li>Maintain regular test execution schedule for regression testing.</li>
                        <li>Consider performance optimization based on responsiveness test results.</li>
                        <li>Expand test coverage to include iOS platform testing.</li>
                    </ul>
                    
                    <h3>Test Artifacts</h3>
                    <p>Screenshots and detailed logs are available in the <code>e2e/screenshots/</code> directory for further analysis and debugging purposes.</p>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>AI.ttorney Quality Assurance Team</strong></p>
            <p>End-to-End Testing Framework | Automated System Validation</p>
            <p>Report generated on ${new Date(report.timestamp).toLocaleDateString()} at ${new Date(report.timestamp).toLocaleTimeString()}</p>
        </div>
    </div>

    <script>
        // Chart.js configuration for black and white professional charts
        Chart.defaults.color = '#000';
        Chart.defaults.borderColor = '#ccc';
        Chart.defaults.backgroundColor = '#f5f5f5';

        // Pass Rate Donut Chart
        const passRateCtx = document.getElementById('passRateChart').getContext('2d');
        new Chart(passRateCtx, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Failed'],
                datasets: [{
                    data: [${report.passed}, ${report.failed}],
                    backgroundColor: ['#e0e0e0', '#999999'],
                    borderColor: ['#000', '#000'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#000',
                            font: { size: 10 }
                        }
                    }
                }
            }
        });

        // Test Distribution Bar Chart
        const distributionCtx = document.getElementById('testDistributionChart').getContext('2d');
        new Chart(distributionCtx, {
            type: 'bar',
            data: {
                labels: ['Passed', 'Failed'],
                datasets: [{
                    label: 'Test Count',
                    data: [${report.passed}, ${report.failed}],
                    backgroundColor: ['#e0e0e0', '#999999'],
                    borderColor: ['#000', '#000'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#000', font: { size: 9 } },
                        grid: { color: '#ccc' }
                    },
                    x: {
                        ticks: { color: '#000', font: { size: 9 } },
                        grid: { color: '#ccc' }
                    }
                }
            }
        });

    </script>
</body>
</html>`;
  }
}

module.exports = ProfessionalReportGenerator;
