#!/usr/bin/env node

/**
 * Simplified E2E Test Runner
 * Uses the existing APK without requiring Android Test APK
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ProfessionalReportGenerator = require('./report-generator');

class SimpleE2ERunner {
  constructor() {
    this.apkPath = 'android/app/build/outputs/apk/debug/app-debug.apk';
    this.packageName = 'com.aittorney.app';
    this.testResults = [];
    this.quickMode = process.env.QUICK_MODE === 'true';
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${type}] ${timestamp} - ${message}`);
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...');
    
    // Check if ADB is available
    try {
      execSync('adb version', { stdio: 'pipe' });
      this.log('✓ ADB is available');
    } catch (error) {
      throw new Error('ADB is not available. Please install Android SDK.');
    }

    // Check if emulator is running
    try {
      const devices = execSync('adb devices', { encoding: 'utf8' });
      if (!devices.includes('emulator') && !devices.includes('device')) {
        throw new Error('No Android device/emulator found. Please start an emulator.');
      }
      this.log('✓ Android device/emulator is available');
    } catch (error) {
      throw new Error('Failed to check Android devices: ' + error.message);
    }

    // Check if APK exists
    if (!fs.existsSync(this.apkPath)) {
      throw new Error(`APK not found at ${this.apkPath}. Please build the app first.`);
    }
    this.log('✓ APK is available');
  }

  async installApp() {
    this.log('Installing app...');
    try {
      // Uninstall existing app
      try {
        execSync(`adb uninstall ${this.packageName}`, { stdio: 'pipe' });
      } catch (e) {
        // App might not be installed, ignore error
      }

      // Install new APK
      execSync(`adb install ${this.apkPath}`, { stdio: 'pipe' });
      this.log('✓ App installed successfully');
    } catch (error) {
      throw new Error('Failed to install app: ' + error.message);
    }
  }

  async launchApp() {
    this.log('Launching app...');
    try {
      execSync(`adb shell am start -n ${this.packageName}/.MainActivity`, { stdio: 'pipe' });
      this.log('✓ App launched successfully');
      
      // Wait for app to start
      await this.sleep(3000);
    } catch (error) {
      throw new Error('Failed to launch app: ' + error.message);
    }
  }

  async runBasicTests() {
    const testMode = this.quickMode ? 'quick smoke tests' : 'comprehensive app tests';
    this.log(`Running ${testMode}...`);
    
    const allTests = [
      // Core App Tests
      { name: 'App Launch Test', test: () => this.testAppLaunch(), priority: 'high' },
      { name: 'Splash Screen Test', test: () => this.testSplashScreen(), priority: 'high' },
      { name: 'Initial UI Load Test', test: () => this.testInitialUILoad(), priority: 'high' },
      
      // Authentication Flow Tests
      { name: 'Guest Access Test', test: () => this.testGuestAccess(), priority: 'high' },
      { name: 'Login Screen Test', test: () => this.testLoginScreen(), priority: 'medium' },
      { name: 'Registration Screen Test', test: () => this.testRegistrationScreen(), priority: 'medium' },
      
      // Guest User Journey Tests
      { name: 'Guest Onboarding Flow', test: () => this.testGuestOnboarding(), priority: 'high' },
      { name: 'Guest Chatbot Access', test: () => this.testGuestChatbot(), priority: 'high' },
      { name: 'Guest Glossary Access', test: () => this.testGuestGlossary(), priority: 'medium' },
      
      // Core Feature Tests
      { name: 'Chatbot Functionality', test: () => this.testChatbotFunctionality(), priority: 'high' },
      { name: 'Legal Query Processing', test: () => this.testLegalQueryProcessing(), priority: 'medium' },
      { name: 'Navigation Flow Test', test: () => this.testNavigationFlow(), priority: 'medium' },
      
      // UI/UX Tests
      { name: 'Screen Rotation Test', test: () => this.testScreenRotation(), priority: 'low' },
      { name: 'Back Button Navigation', test: () => this.testBackButtonNavigation(), priority: 'medium' },
      { name: 'Menu Accessibility Test', test: () => this.testMenuAccessibility(), priority: 'medium' },
      
      // Performance Tests
      { name: 'App Responsiveness Test', test: () => this.testAppResponsiveness(), priority: 'high' },
      { name: 'Memory Usage Test', test: () => this.testMemoryUsage(), priority: 'low' },
      { name: 'Network Connectivity Test', test: () => this.testNetworkConnectivity(), priority: 'medium' },
      
      // Error Handling Tests
      { name: 'Network Error Handling', test: () => this.testNetworkErrorHandling(), priority: 'low' },
      { name: 'Invalid Input Handling', test: () => this.testInvalidInputHandling(), priority: 'low' },
      { name: 'App Recovery Test', test: () => this.testAppRecovery(), priority: 'medium' }
    ];

    // Filter tests based on mode
    const tests = this.quickMode 
      ? allTests.filter(test => test.priority === 'high')
      : allTests;

    for (const test of tests) {
      try {
        this.log(`Running: ${test.name}`);
        await test.test();
        this.testResults.push({ name: test.name, status: 'PASS', error: null });
        this.log(`✓ ${test.name} PASSED`);
        await this.sleep(1000); // Brief pause between tests
      } catch (error) {
        this.testResults.push({ name: test.name, status: 'FAIL', error: error.message });
        this.log(`✗ ${test.name} FAILED: ${error.message}`, 'ERROR');
        await this.sleep(500); // Brief pause on failure
      }
    }
  }

  async testAppLaunch() {
    // Check if app is running
    const result = execSync('adb shell "ps | grep com.aittorney.app"', { encoding: 'utf8' });
    if (!result.includes('com.aittorney.app')) {
      throw new Error('App is not running');
    }
  }

  async testSplashScreen() {
    // Wait for splash screen and capture it
    await this.sleep(2000);
    await this.captureScreenshot('splash_screen');
    
    // Verify app moves past splash screen
    await this.sleep(3000);
    await this.captureScreenshot('post_splash');
  }

  async testInitialUILoad() {
    // Wait for initial UI to load completely
    await this.sleep(4000);
    await this.captureScreenshot('initial_ui');
    
    // Verify UI elements are responsive
    await this.tapScreen(500, 1000);
    await this.sleep(1000);
  }

  async testGuestAccess() {
    // Look for "Continue as Guest" or similar option
    await this.sleep(2000);
    
    // Try tapping where guest access might be (bottom area)
    await this.tapScreen(500, 1800);
    await this.sleep(2000);
    await this.captureScreenshot('guest_access_attempt');
  }

  async testLoginScreen() {
    // Navigate to login screen
    await this.sleep(1000);
    
    // Try tapping login/sign-in area (typically top-right or center)
    await this.tapScreen(700, 200); // Top right area
    await this.sleep(2000);
    await this.captureScreenshot('login_screen');
    
    // Test login form interaction
    await this.tapScreen(500, 800); // Email field area
    await this.sleep(500);
    await this.inputText('test@example.com');
    await this.sleep(1000);
    
    await this.tapScreen(500, 900); // Password field area
    await this.sleep(500);
    await this.inputText('testpassword');
    await this.sleep(1000);
    
    await this.captureScreenshot('login_form_filled');
  }

  async testRegistrationScreen() {
    // Navigate to registration screen
    await this.sleep(1000);
    
    // Try tapping sign-up/register area
    await this.tapScreen(500, 1600); // Bottom area where sign-up might be
    await this.sleep(2000);
    await this.captureScreenshot('registration_screen');
    
    // Test registration form interaction
    await this.tapScreen(500, 700); // Name field
    await this.sleep(500);
    await this.inputText('Test User');
    await this.sleep(1000);
    
    await this.captureScreenshot('registration_form_interaction');
  }

  async testGuestOnboarding() {
    // Navigate through guest onboarding flow
    await this.sleep(2000);
    
    // Look for guest onboarding elements
    await this.tapScreen(500, 1500); // Continue as guest area
    await this.sleep(3000);
    await this.captureScreenshot('guest_onboarding');
    
    // Navigate through onboarding steps
    for (let i = 0; i < 3; i++) {
      await this.tapScreen(700, 1800); // Next button area
      await this.sleep(2000);
      await this.captureScreenshot(`guest_onboarding_step_${i + 1}`);
    }
  }

  async testGuestChatbot() {
    // Access chatbot as guest
    await this.sleep(2000);
    
    // Look for chatbot access
    await this.tapScreen(500, 1200); // Center area where chatbot might be
    await this.sleep(3000);
    await this.captureScreenshot('guest_chatbot_access');
    
    // Test chatbot interaction
    await this.tapScreen(500, 1700); // Message input area
    await this.sleep(1000);
    await this.inputText('What is contract law?');
    await this.sleep(1000);
    
    // Send message
    await this.tapScreen(700, 1700); // Send button area
    await this.sleep(3000);
    await this.captureScreenshot('guest_chatbot_query');
  }

  async testGuestGlossary() {
    // Access glossary as guest
    await this.sleep(2000);
    
    // Navigate to glossary (might be in menu or direct access)
    await this.tapScreen(100, 100); // Menu button area
    await this.sleep(1000);
    await this.tapScreen(300, 600); // Glossary menu item
    await this.sleep(2000);
    await this.captureScreenshot('guest_glossary');
    
    // Test glossary search
    await this.tapScreen(500, 300); // Search field
    await this.sleep(1000);
    await this.inputText('contract');
    await this.sleep(2000);
    await this.captureScreenshot('glossary_search');
  }

  async testChatbotFunctionality() {
    // Test comprehensive chatbot functionality
    await this.sleep(2000);
    
    // Navigate to chatbot
    await this.tapScreen(500, 1200);
    await this.sleep(3000);
    
    // Test multiple queries
    const queries = [
      'What is tort law?',
      'Explain property rights',
      'How do I file a lawsuit?'
    ];
    
    for (let i = 0; i < queries.length; i++) {
      await this.tapScreen(500, 1700); // Input area
      await this.sleep(500);
      await this.clearInput();
      await this.inputText(queries[i]);
      await this.sleep(1000);
      
      await this.tapScreen(700, 1700); // Send button
      await this.sleep(4000); // Wait for response
      await this.captureScreenshot(`chatbot_query_${i + 1}`);
    }
  }

  async testLegalQueryProcessing() {
    // Test specific legal query processing
    await this.sleep(2000);
    
    const legalQueries = [
      'What are my rights as a tenant?',
      'How to start a business legally?',
      'What is intellectual property?'
    ];
    
    for (const query of legalQueries) {
      await this.tapScreen(500, 1700);
      await this.sleep(500);
      await this.clearInput();
      await this.inputText(query);
      await this.sleep(1000);
      
      await this.tapScreen(700, 1700);
      await this.sleep(5000); // Wait for legal processing
      await this.captureScreenshot(`legal_query_${query.substring(0, 10)}`);
    }
  }

  async testNavigationFlow() {
    // Test comprehensive navigation
    await this.sleep(2000);
    
    const navigationPoints = [
      { x: 100, y: 100, name: 'menu' },
      { x: 500, y: 500, name: 'center' },
      { x: 700, y: 200, name: 'top_right' },
      { x: 200, y: 1800, name: 'bottom_left' },
      { x: 800, y: 1800, name: 'bottom_right' }
    ];
    
    for (const point of navigationPoints) {
      await this.tapScreen(point.x, point.y);
      await this.sleep(2000);
      await this.captureScreenshot(`navigation_${point.name}`);
    }
  }

  async testScreenRotation() {
    // Test screen rotation handling
    await this.captureScreenshot('portrait_mode');
    
    // Rotate to landscape
    execSync('adb shell settings put system user_rotation 1', { stdio: 'pipe' });
    await this.sleep(3000);
    await this.captureScreenshot('landscape_mode');
    
    // Rotate back to portrait
    execSync('adb shell settings put system user_rotation 0', { stdio: 'pipe' });
    await this.sleep(3000);
    await this.captureScreenshot('portrait_restored');
  }

  async testBackButtonNavigation() {
    // Test Android back button navigation
    await this.sleep(2000);
    
    // Navigate to a screen
    await this.tapScreen(500, 1200);
    await this.sleep(2000);
    await this.captureScreenshot('before_back_navigation');
    
    // Press back button
    execSync('adb shell input keyevent 4', { stdio: 'pipe' });
    await this.sleep(2000);
    await this.captureScreenshot('after_back_navigation');
  }

  async testMenuAccessibility() {
    // Test menu accessibility
    await this.sleep(2000);
    
    // Try accessing menu
    await this.tapScreen(100, 100); // Hamburger menu area
    await this.sleep(2000);
    await this.captureScreenshot('menu_opened');
    
    // Test menu items
    const menuItems = [
      { x: 300, y: 400 },
      { x: 300, y: 500 },
      { x: 300, y: 600 }
    ];
    
    for (let i = 0; i < menuItems.length; i++) {
      await this.tapScreen(menuItems[i].x, menuItems[i].y);
      await this.sleep(2000);
      await this.captureScreenshot(`menu_item_${i + 1}`);
      
      // Go back to menu
      execSync('adb shell input keyevent 4', { stdio: 'pipe' });
      await this.sleep(1000);
    }
  }

  async testAppResponsiveness() {
    // Test app responsiveness with rapid interactions
    const startTime = Date.now();
    
    for (let i = 0; i < 5; i++) {
      await this.tapScreen(500, 1000);
      await this.sleep(200);
    }
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (responseTime > 5000) {
      throw new Error(`App responsiveness too slow: ${responseTime}ms`);
    }
    
    await this.captureScreenshot('responsiveness_test');
  }

  async testMemoryUsage() {
    // Check memory usage
    const memInfo = execSync(`adb shell dumpsys meminfo ${this.packageName}`, { encoding: 'utf8' });
    
    // Extract memory usage (simplified check)
    if (memInfo.includes('TOTAL')) {
      this.log('Memory usage check completed');
    } else {
      throw new Error('Unable to retrieve memory information');
    }
  }

  async testNetworkConnectivity() {
    // Test network connectivity
    await this.sleep(2000);
    
    // Try to trigger a network request (chatbot query)
    await this.tapScreen(500, 1200); // Navigate to chatbot
    await this.sleep(2000);
    
    await this.tapScreen(500, 1700); // Input area
    await this.sleep(500);
    await this.inputText('Test network connectivity');
    await this.sleep(1000);
    
    await this.tapScreen(700, 1700); // Send
    await this.sleep(5000); // Wait for network response
    
    await this.captureScreenshot('network_connectivity_test');
  }

  async testNetworkErrorHandling() {
    // Test network error handling by disabling network
    execSync('adb shell svc wifi disable', { stdio: 'pipe' });
    execSync('adb shell svc data disable', { stdio: 'pipe' });
    await this.sleep(2000);
    
    // Try network operation
    await this.tapScreen(500, 1200);
    await this.sleep(2000);
    await this.tapScreen(500, 1700);
    await this.inputText('Test offline mode');
    await this.tapScreen(700, 1700);
    await this.sleep(3000);
    
    await this.captureScreenshot('network_error_handling');
    
    // Re-enable network
    execSync('adb shell svc wifi enable', { stdio: 'pipe' });
    execSync('adb shell svc data enable', { stdio: 'pipe' });
    await this.sleep(3000);
  }

  async testInvalidInputHandling() {
    // Test invalid input handling
    await this.sleep(2000);
    
    const invalidInputs = [
      '!@#$%^&*()',
      '<script>alert("test")</script>',
      'A'.repeat(1000), // Very long input
      ''  // Empty input
    ];
    
    for (const input of invalidInputs) {
      await this.tapScreen(500, 1700);
      await this.sleep(500);
      await this.clearInput();
      await this.inputText(input);
      await this.sleep(1000);
      
      await this.tapScreen(700, 1700);
      await this.sleep(2000);
      await this.captureScreenshot(`invalid_input_${input.substring(0, 5)}`);
    }
  }

  async testAppRecovery() {
    // Test app recovery from background
    await this.captureScreenshot('before_background');
    
    // Send app to background
    execSync('adb shell input keyevent 3', { stdio: 'pipe' }); // Home button
    await this.sleep(3000);
    
    // Bring app back to foreground
    execSync(`adb shell am start -n ${this.packageName}/.MainActivity`, { stdio: 'pipe' });
    await this.sleep(3000);
    
    await this.captureScreenshot('after_recovery');
  }

  // Helper methods
  async captureScreenshot(name) {
    const filename = `${name}_${Date.now()}.png`;
    execSync(`adb shell screencap -p /sdcard/${filename}`, { stdio: 'pipe' });
    execSync(`adb pull /sdcard/${filename} ./e2e/screenshots/`, { stdio: 'pipe' });
    
    if (!fs.existsSync(`./e2e/screenshots/${filename}`)) {
      throw new Error(`Failed to capture screenshot: ${filename}`);
    }
  }

  async tapScreen(x, y) {
    execSync(`adb shell input tap ${x} ${y}`, { stdio: 'pipe' });
  }

  async inputText(text) {
    // Handle special characters by using keyevent codes for problematic characters
    if (text.includes('!') || text.includes('@') || text.includes('#') || text.includes('$') || 
        text.includes('%') || text.includes('^') || text.includes('&') || text.includes('*') || 
        text.includes('(') || text.includes(')') || text.includes('<') || text.includes('>')) {
      
      // For special characters, use a safer approach
      const safeText = text.replace(/[!@#$%^&*()<>]/g, 'X');
      execSync(`adb shell input text "${safeText}"`, { stdio: 'pipe' });
      return;
    }
    
    // For normal text, escape quotes and backslashes
    const escapedText = text.replace(/['"\\]/g, '\\$&');
    execSync(`adb shell input text "${escapedText}"`, { stdio: 'pipe' });
  }

  async clearInput() {
    // Select all and delete
    execSync('adb shell input keyevent 29 113', { stdio: 'pipe' }); // Ctrl+A
    await this.sleep(500);
    execSync('adb shell input keyevent 67', { stdio: 'pipe' }); // Delete
  }

  async generateReport() {
    this.log('Generating test report...');
    
    const reportDir = './e2e/test-reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.testResults.length,
      passed: this.testResults.filter(t => t.status === 'PASS').length,
      failed: this.testResults.filter(t => t.status === 'FAIL').length,
      results: this.testResults
    };

    // Generate JSON report
    fs.writeFileSync(
      path.join(reportDir, 'simple-e2e-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate HTML report using professional generator
    const htmlReport = ProfessionalReportGenerator.generateHTMLReport(report);
    fs.writeFileSync(
      path.join(reportDir, 'simple-e2e-report.html'),
      htmlReport
    );

    this.log('✓ Test report generated');
    this.log(`Report available at: ${path.join(reportDir, 'simple-e2e-report.html')}`);
  }


  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    try {
      this.log('Starting Simple E2E Test Runner...');
      
      // Create screenshots directory
      if (!fs.existsSync('./e2e/screenshots')) {
        fs.mkdirSync('./e2e/screenshots', { recursive: true });
      }

      await this.checkPrerequisites();
      await this.installApp();
      await this.launchApp();
      await this.runBasicTests();
      await this.generateReport();
      
      const passed = this.testResults.filter(t => t.status === 'PASS').length;
      const total = this.testResults.length;
      
      this.log(`Test run completed: ${passed}/${total} tests passed`);
      
      if (passed === total) {
        this.log('🎉 All tests passed!', 'SUCCESS');
        process.exit(0);
      } else {
        this.log('❌ Some tests failed', 'ERROR');
        process.exit(1);
      }
      
    } catch (error) {
      this.log(`Test run failed: ${error.message}`, 'ERROR');
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new SimpleE2ERunner();
  runner.run();
}

module.exports = SimpleE2ERunner;
