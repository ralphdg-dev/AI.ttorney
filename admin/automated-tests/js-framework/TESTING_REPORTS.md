# 📊 AI.ttorney Testing Reports

This document explains how to generate and view HTML test reports for the AI.ttorney lawyer verification system.

## 🚀 Quick Start

### Generate Complete Test Report
```bash
npm run test:report
```
This will:
1. Run Jest unit tests with HTML reporting
2. Run Playwright E2E tests
3. Generate a combined HTML report
4. Output: `reports/combined-report.html`

### View Report in Browser
```bash
npm run report:open
```
This will generate the report and automatically open it in your default browser.

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run Jest unit tests (console output) |
| `npm run test:html` | Run Jest tests with HTML report |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:all` | Run both unit and E2E tests |
| `npm run test:report` | Generate complete HTML report |
| `npm run report:generate` | Generate combined report from existing results |
| `npm run report:open` | Generate and open report in browser |

## 📁 Report Structure

```
reports/
├── combined-report.html      # Main comprehensive report
├── jest-report.html         # Jest unit test results
├── coverage/                # Code coverage reports
│   ├── index.html          # Coverage overview
│   └── lcov-report/        # Detailed coverage
└── playwright-report/       # Playwright E2E results
    └── index.html
```

## 🎨 Report Features

### Combined Report Includes:
- **📊 Overview Tab**: Summary of all test results
- **🧪 Unit Tests Tab**: Jest test results with detailed pass/fail information
- **🎭 E2E Tests Tab**: Playwright browser test results
- **📈 Coverage Tab**: Code coverage metrics and detailed reports

### Visual Features:
- Professional AI.ttorney branding
- Interactive tabs for different test types
- Color-coded status indicators
- Responsive design for all screen sizes
- Embedded test result iframes

## 🔧 Customization

### Modify Report Appearance
Edit `scripts/generate-report.js` to customize:
- Colors and styling
- Logo and branding
- Report sections
- Data presentation

### Jest HTML Reporter Settings
Configure in `package.json` under `jest.reporters`:
```json
{
  "publicPath": "./reports",
  "filename": "jest-report.html",
  "expand": true,
  "pageTitle": "AI.ttorney Lawyer Verification Tests"
}
```

### Playwright Report Settings
Configure in `playwright.config.ts`:
```typescript
reporter: [
  ['html', { outputFolder: 'playwright-report' }],
  ['json', { outputFile: 'test-results/results.json' }]
]
```

## 📊 Understanding Results

### Unit Test Results (Jest)
- **Green**: Tests passed
- **Red**: Tests failed
- **Yellow**: Tests skipped
- **Coverage**: Percentage of code tested

### E2E Test Results (Playwright)
- **Browser compatibility**: Results across Chrome, Firefox, Safari
- **Screenshots**: Failure screenshots automatically captured
- **Videos**: Test execution videos for debugging
- **Traces**: Detailed execution traces

## 🚀 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run tests and generate report
  run: npm run test:report

- name: Upload test results
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: reports/
```

### Jenkins Integration
```groovy
stage('Test & Report') {
    steps {
        sh 'npm run test:report'
        publishHTML([
            allowMissing: false,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: 'reports',
            reportFiles: 'combined-report.html',
            reportName: 'Test Report'
        ])
    }
}
```

## 🔍 Troubleshooting

### Common Issues

**Report not generating:**
```bash
# Ensure dependencies are installed
npm install

# Check if reports directory exists
mkdir -p reports
```

**Missing test results:**
```bash
# Run tests first
npm run test:html
npm run test:e2e

# Then generate report
npm run report:generate
```

**Browser not opening:**
```bash
# Manually open the report
open reports/combined-report.html
# Or on Windows: start reports/combined-report.html
# Or on Linux: xdg-open reports/combined-report.html
```

## 📈 Performance Metrics

The reports include performance metrics:
- Test execution time
- Memory usage
- Browser performance (E2E tests)
- Coverage collection overhead

## 🎯 Best Practices

1. **Run reports after every significant change**
2. **Check coverage trends over time**
3. **Review failed test screenshots**
4. **Monitor performance regression**
5. **Share reports with team members**

---

For more information about the testing framework, see the main [README.md](../README.md).
