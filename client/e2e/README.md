# AI.ttorney E2E Automation Testing

This directory contains comprehensive end-to-end (E2E) automation tests for the AI.ttorney mobile application, focusing on login and registration features for Android testing.

## 🎯 Test Coverage

### Login Feature Tests
- **UI Elements Validation**: Verify all login form elements are present and functional
- **Input Validation**: Test email/password validation with various invalid inputs
- **Authentication Flow**: Test successful login with valid credentials
- **Error Handling**: Test invalid credentials, non-existent users, network errors
- **Security Features**: Test account lockout, data clearing on app backgrounding
- **Navigation**: Test forgot password and sign-up navigation
- **Performance**: Measure login completion time
- **Accessibility**: Verify accessibility labels and keyboard navigation

### Registration Feature Tests
- **UI Elements Validation**: Verify all registration form elements are present
- **Field Validation**: Test all form fields with various invalid inputs
- **Registration Process**: Test successful registration with valid data
- **Duplicate Prevention**: Test existing email/username handling
- **Role Selection**: Test legal seeker and lawyer role selection
- **Security Features**: Test password strength, age validation, input sanitization
- **Navigation**: Test navigation between login and registration screens
- **Performance**: Measure registration completion time

## 🛠 Setup Instructions

### Prerequisites
1. **Node.js** (v16 or higher)
2. **Android Studio** with SDK
3. **Android Emulator** or physical device
4. **React Native development environment**

### Installation
```bash
# Install dependencies
npm install

# Install Detox CLI globally
npm install -g detox-cli

# Setup Android environment
# Make sure ANDROID_HOME is set in your environment
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Android Emulator Setup
```bash
# List available AVDs
emulator -list-avds

# Start emulator (replace with your AVD name)
emulator -avd Pixel_3a_API_30_x86

# Or create a new AVD through Android Studio
```

## 🚀 Running Tests

### Quick Start
```bash
# Run all tests
npm run e2e:test

# Run specific test suites
npm run e2e:test:login
npm run e2e:test:registration

# Run on connected device
npm run e2e:test:device
```

### Advanced Usage
```bash
# Run with custom configuration
./e2e/run-tests.sh --suite=login --device=emulator

# Run with environment variables
TEST_SUITE=registration ANDROID_DEVICE=attached ./e2e/run-tests.sh

# Build app for testing
npm run e2e:build:android

# Clean and rebuild
npm run e2e:clean
```

### Command Line Options
- `--suite=SUITE`: Run specific test suite (login|registration|all)
- `--device=DEVICE`: Use specific device (emulator|attached)
- `--help`: Show help message

## 📊 Test Reports

After running tests, you'll find comprehensive reports in the `e2e/test-reports/` directory:

### Report Types
1. **Feature-Specific HTML Reports**: 
   - `login-test-report.html`: Login feature test results
   - `registration-test-report.html`: Registration feature test results
   - `all-features-test-report.html`: Combined report when running all tests
2. **Feature-Specific JUnit XML**:
   - `login-junit.xml`: Login feature CI/CD compatible XML
   - `registration-junit.xml`: Registration feature CI/CD compatible XML
   - `all-features-junit.xml`: Combined XML report
3. **Test Summary** (`test-summary.md`): Markdown summary
4. **Screenshots**: Captured during test execution in `e2e/screenshots/`

### Viewing Reports
```bash
# Open specific feature reports
npm run e2e:report:login          # Login feature report
npm run e2e:report:registration   # Registration feature report
npm run e2e:report:all           # Open both feature reports
npm run e2e:report               # Combined report (when running all tests)

# View summary in terminal
cat ./e2e/test-reports/test-summary.md
```

## 🏗 Test Architecture

### File Structure
```
e2e/
├── tests/
│   ├── login.test.js           # Login feature tests
│   └── registration.test.js    # Registration feature tests
├── utils/
│   └── pageObjects.js          # Page Object Model classes
├── test-reports/               # Generated test reports
├── screenshots/                # Test screenshots
├── init.js                     # Test initialization and utilities
├── jest.config.js             # Jest configuration
├── run-tests.sh               # Test runner script
└── README.md                  # This documentation
```

### Page Object Model
Tests use the Page Object Model pattern for maintainability:
- `LoginPage`: Encapsulates login screen elements and actions
- `RegistrationPage`: Encapsulates registration screen elements and actions
- `HomePage`: Encapsulates home screen verification

### Test Utilities
Global utilities available in all tests:
- `testUtils.waitForElement()`: Wait for element with timeout
- `testUtils.typeText()`: Type text with realistic delays
- `testUtils.takeScreenshot()`: Capture screenshots for debugging
- `testUtils.scrollToElement()`: Scroll to make elements visible
- `testUtils.waitForLoading()`: Wait for loading indicators to disappear

## 🧪 Test Data

Test data is centralized in `init.js`:
```javascript
global.testData = {
  users: {
    validUser: { /* valid user data */ },
    invalidUser: { /* invalid user data */ },
    existingUser: { /* existing user data */ }
  },
  validation: {
    emailRequired: "Please enter your email address",
    // ... other validation messages
  }
}
```

## 🔧 Configuration

### Detox Configuration (`.detoxrc.js`)
- **Apps**: Defines Android debug/release builds
- **Devices**: Configures emulator and attached device settings
- **Configurations**: Maps devices to app builds

### Jest Configuration (`jest.config.js`)
- **Reporters**: HTML, JUnit XML, and console reporters
- **Timeout**: 120 seconds for E2E tests
- **Coverage**: Disabled for E2E tests (use unit tests for coverage)

## 🐛 Debugging

### Common Issues
1. **Emulator not found**: Ensure Android emulator is running
2. **App build fails**: Check Android development environment
3. **Tests timeout**: Increase timeout in jest.config.js
4. **Element not found**: Update element selectors in pageObjects.js

### Debug Commands
```bash
# Check connected devices
adb devices

# View emulator logs
adb logcat

# Take manual screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Clear app data
adb shell pm clear com.yourapp.package
```

### Screenshots
Tests automatically capture screenshots at key points:
- Before each test starts
- After each major action
- When tests fail
- At test completion

## 📈 Performance Metrics

Tests measure and report:
- **Login Time**: Should complete within 10 seconds
- **Registration Time**: Should complete within 15 seconds
- **Network Response**: API call response times
- **UI Responsiveness**: Element interaction delays

## 🔒 Security Testing

Automated security tests include:
- **Input Sanitization**: XSS prevention
- **Password Strength**: Enforcement of password policies
- **Age Validation**: Minimum age requirements
- **Account Lockout**: Brute force protection
- **Data Clearing**: Sensitive data cleanup

## 🚀 CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Run E2E Tests
        run: |
          npm install
          ./e2e/run-tests.sh
      - name: Upload Test Reports
        uses: actions/upload-artifact@v3
        with:
          name: e2e-test-reports
          path: e2e/test-reports/
```

### Jenkins Integration
```groovy
pipeline {
    agent any
    stages {
        stage('E2E Tests') {
            steps {
                sh './e2e/run-tests.sh'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'e2e/test-reports',
                        reportFiles: 'test-report.html',
                        reportName: 'E2E Test Report'
                    ])
                    junit 'e2e/test-reports/junit.xml'
                }
            }
        }
    }
}
```

## 📝 Writing New Tests

### Test Structure
```javascript
describe('Feature Name', () => {
  let pageObject;

  beforeAll(async () => {
    pageObject = new FeaturePage();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await pageObject.navigateToFeature();
  });

  it('should test specific functionality', async () => {
    // Arrange
    const testData = { /* test data */ };
    
    // Act
    await pageObject.performAction(testData);
    
    // Assert
    await pageObject.verifyResult();
    
    // Screenshot
    await testUtils.takeScreenshot('test-completed');
  });
});
```

### Best Practices
1. **Use Page Objects**: Encapsulate UI interactions
2. **Take Screenshots**: Document test execution
3. **Handle Async**: Always await async operations
4. **Clean State**: Reset app state between tests
5. **Descriptive Names**: Use clear test and variable names
6. **Error Handling**: Gracefully handle expected failures

## 🤝 Contributing

When adding new tests:
1. Follow the existing Page Object Model pattern
2. Add appropriate test data to `init.js`
3. Include screenshots for debugging
4. Update this README with new test coverage
5. Ensure tests are independent and can run in any order

## 📞 Support

For issues with E2E tests:
1. Check the test reports for detailed error information
2. Review screenshots to understand test failures
3. Verify Android development environment setup
4. Check element selectors in Page Objects match the app UI

---

**Happy Testing! 🧪✨**
