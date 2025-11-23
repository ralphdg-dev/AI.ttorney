# AI.ttorney E2E Test Suite

Comprehensive end-to-end testing framework for the AI.ttorney mobile application using Detox for Android testing.

## Overview

This E2E test suite covers critical user journeys and system-level functionality:

- **Authentication**: Login and registration flows
- **Guest Experience**: Onboarding and tutorial flows
- **Chatbot Interaction**: Legal query processing and responses
- **Lawyer Dashboard**: Timeline, navigation, and lawyer-specific features
- **System Integration**: Cross-feature workflows and error handling

## Test Suites

### Authentication Tests
- `login.test.js` - Login functionality, validation, and error handling
- `registration.test.js` - Registration process, form validation, and OTP verification

### System Journey Tests
- `guest-onboarding.test.js` - Guest user onboarding flow and tutorial
- `chatbot.test.js` - Chatbot interactions for guests and authenticated users
- `lawyer-dashboard.test.js` - Lawyer dashboard, timeline, and navigation

### Test Categories

#### Individual Feature Tests
```bash
npm run e2e:test:login              # Login functionality
npm run e2e:test:registration       # Registration process
npm run e2e:test:guest-onboarding   # Guest onboarding flow
npm run e2e:test:chatbot            # Chatbot interactions
npm run e2e:test:lawyer-dashboard   # Lawyer dashboard features
```

#### System-Level Test Suites
```bash
npm run e2e:test:smoke              # Critical paths (guest + chatbot)
npm run e2e:test:system             # All user journeys (guest + chatbot + lawyer)
npm run e2e:test                    # All tests including authentication
```

#### Device Testing
```bash
npm run e2e:test:device             # Run all tests on connected device
npm run e2e:test:device:smoke       # Run smoke tests on device
npm run e2e:test:device:system      # Run system tests on device
```

## Quick Start

### Prerequisites
- Android Studio with Android SDK
- Node.js and npm
- Android emulator or physical device
- Java Development Kit (JDK 17+)

### Setup
```bash
# Install dependencies
npm install

# Build the app for testing
npm run e2e:setup

# Run smoke tests (recommended first run)
npm run e2e:test:smoke
```

### Running Tests

#### For System Testing (Recommended)
```bash
# Run critical user journeys
npm run e2e:test:smoke

# Run comprehensive system tests
npm run e2e:test:system
```

#### For Feature Testing
```bash
# Test guest onboarding flow
npm run e2e:test:guest-onboarding

# Test chatbot functionality
npm run e2e:test:chatbot

# Test lawyer dashboard
npm run e2e:test:lawyer-dashboard
```

#### Using Test Runner Directly
```bash
# Show all available options
./e2e/run-tests.sh --help

# Run specific test suite
./e2e/run-tests.sh --suite=smoke

# Run on physical device
./e2e/run-tests.sh --device=attached --suite=system
```

## Test Reports

### Viewing Reports
```bash
# Open individual feature reports
npm run e2e:report:guest-onboarding
npm run e2e:report:chatbot
npm run e2e:report:lawyer-dashboard

# Open system test reports
npm run e2e:report:smoke
npm run e2e:report:system

# Open all reports
npm run e2e:report:all
```

### Report Types
- **HTML Reports**: Interactive web-based test results with screenshots
- **JUnit XML**: CI/CD compatible format for automated systems
- **Test Summary**: Markdown overview with pass/fail statistics
- **Screenshots**: Visual documentation of test execution steps

## Test Architecture

### Page Object Model
Tests use the Page Object Model pattern for maintainable and reusable code:

```javascript
// Example usage
const { GuestOnboardingPage, ChatbotPage } = require('../utils/pageObjects');

const guestPage = new GuestOnboardingPage();
const chatbotPage = new ChatbotPage();

await guestPage.navigateToGuestOnboarding();
await guestPage.startExploring();
await chatbotPage.sendMessage('What is contract law?');
```

### Test Data Management
Centralized test data in `init.js`:
- User credentials for different roles
- Legal queries for chatbot testing
- Validation messages and error scenarios
- Performance benchmarks

### Utilities
Common test utilities for:
- Element waiting and interaction
- Screenshot capture
- Text input simulation
- Loading state handling
- Performance measurement

## Test Coverage

### Guest User Journey
1. **Onboarding**: Welcome screen → Feature overview → Tutorial
2. **Chatbot Access**: Navigate to chatbot → Send queries → Receive responses
3. **Glossary**: Search legal terms → View definitions
4. **Session Management**: App lifecycle and persistence

### Authenticated User Journey
1. **Authentication**: Login → Dashboard access
2. **Chatbot Enhanced**: Personalized responses → Conversation history
3. **Lawyer Features**: Timeline → Forum → Profile → Consultations

### System Integration
1. **Cross-Feature Navigation**: Seamless transitions between features
2. **Error Handling**: Network issues → Authentication errors → Data loading
3. **Performance**: Response times → Loading states → User experience
4. **Accessibility**: Screen readers → Keyboard navigation → Labels

## Performance Benchmarks

Tests include performance assertions:
- Guest onboarding: < 15 seconds
- Chatbot response: < 30 seconds
- Dashboard loading: < 20 seconds
- Login process: < 15 seconds

## Error Scenarios Tested

### Network Issues
- Connection timeouts
- Server unavailability
- Intermittent connectivity
- SSE stream interruptions

### Authentication Errors
- Invalid credentials
- Session expiration
- Token refresh failures
- Account lockout scenarios

### Data Loading Errors
- Empty states
- Loading failures
- Retry mechanisms
- Graceful degradation

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Smoke Tests
  run: npm run e2e:test:smoke

- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  with:
    name: e2e-reports
    path: client/e2e/test-reports/
```

### Jenkins Integration
```groovy
stage('E2E Tests') {
    steps {
        sh 'npm run e2e:test:system'
    }
    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'client/e2e/test-reports',
                reportFiles: '*.html',
                reportName: 'E2E Test Report'
            ])
        }
    }
}
```

## Troubleshooting

### Common Issues

#### Emulator Not Found
```bash
# Check available emulators
emulator -list-avds

# Start an emulator
emulator -avd <emulator_name>
```

#### Build Failures
```bash
# Clean and rebuild
npm run e2e:clean
npm run e2e:setup
```

#### Test Timeouts
- Increase timeout in `init.js`
- Check network connectivity
- Verify server availability

#### Element Not Found
- Update element selectors in Page Objects
- Add proper test IDs to React Native components
- Check for dynamic content loading

### Debug Mode
```bash
# Run with verbose logging
DEBUG=detox* npm run e2e:test:smoke

# Take manual screenshots
await testUtils.takeScreenshot('debug-point');
```

## Best Practices

### Writing Tests
1. **Use Page Objects**: Centralize element selectors and actions
2. **Add Screenshots**: Document test execution visually
3. **Handle Async Operations**: Wait for elements and loading states
4. **Test Error Scenarios**: Include negative test cases
5. **Performance Assertions**: Verify response times

### Maintaining Tests
1. **Keep Selectors Updated**: Sync with UI changes
2. **Modular Test Data**: Use centralized test data
3. **Regular Cleanup**: Remove obsolete tests
4. **Documentation**: Update README with changes

### Running in CI
1. **Use Headless Mode**: Faster execution without UI
2. **Parallel Execution**: Run test suites in parallel
3. **Artifact Collection**: Save reports and screenshots
4. **Failure Analysis**: Detailed error reporting

## File Structure

```
e2e/
├── tests/
│   ├── login.test.js                 # Authentication tests
│   ├── registration.test.js          # Registration flow tests
│   ├── guest-onboarding.test.js      # Guest user journey
│   ├── chatbot.test.js               # Chatbot functionality
│   └── lawyer-dashboard.test.js      # Lawyer features
├── utils/
│   └── pageObjects.js                # Page Object Model classes
├── test-reports/                     # Generated HTML and XML reports
├── screenshots/                      # Test execution screenshots
├── init.js                          # Test setup and utilities
├── jest.config.js                   # Jest configuration
├── run-tests.sh                     # Test runner script
└── README.md                        # This documentation
```

## Contributing

### Adding New Tests
1. Create test file in `tests/` directory
2. Add Page Object classes to `pageObjects.js`
3. Update test runner script with new suite
4. Add NPM scripts to `e2e-package-scripts.json`
5. Update this README documentation

### Test Naming Convention
- Test files: `feature-name.test.js`
- Test suites: `Feature Name Tests`
- Test cases: `should perform specific action`
- Screenshots: `descriptive-action-name`

## Support

For issues with the E2E test suite:
1. Check this README for troubleshooting steps
2. Review test logs and screenshots
3. Verify app and test environment setup
4. Create issue with detailed error information

---

**Last Updated**: November 2024
**Framework Version**: Detox 20.13.0
**Platform Support**: Android (iOS support can be added)
