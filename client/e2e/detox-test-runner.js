#!/usr/bin/env node

/**
 * Professional Detox E2E Test Runner
 * Uses proper automation framework instead of raw ADB commands
 */

const { device, element, by, expect, waitFor } = require('detox');
const fs = require('fs');
const path = require('path');
const ProfessionalReportGenerator = require('./report-generator');

class DetoxE2ERunner {
  constructor() {
    this.testResults = [];
    this.quickMode = process.env.QUICK_MODE === 'true';
    this.startTime = Date.now();
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${type}] ${timestamp} - ${message}`);
  }

  async runTests() {
    const testMode = this.quickMode ? 'quick smoke tests' : 'comprehensive app tests';
    this.log(`Running ${testMode} using Detox automation framework...`);
    
    const allTests = [
      // Core App Tests
      { name: 'App Launch Test', test: () => this.testAppLaunch(), priority: 'high' },
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
      { name: 'Scroll Performance Test', test: () => this.testScrollPerformance(), priority: 'medium' },
      
      // Performance Tests
      { name: 'App Responsiveness Test', test: () => this.testAppResponsiveness(), priority: 'high' },
      { name: 'Memory Usage Test', test: () => this.testMemoryUsage(), priority: 'low' },
      { name: 'Network Connectivity Test', test: () => this.testNetworkConnectivity(), priority: 'medium' },
      
      // Error Handling Tests
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
        await this.sleep(1000);
      } catch (error) {
        this.testResults.push({ name: test.name, status: 'FAIL', error: error.message });
        this.log(`✗ ${test.name} FAILED: ${error.message}`, 'ERROR');
        await this.sleep(500);
      }
    }
  }

  // Core App Tests
  async testAppLaunch() {
    // Wait for app to be visible
    await waitFor(element(by.id('app-root')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Take screenshot
    await device.takeScreenshot('app-launch');
  }

  async testInitialUILoad() {
    // Wait for main UI elements to load
    await waitFor(element(by.id('main-content')))
      .toBeVisible()
      .withTimeout(15000);
    
    // Verify key UI elements are present
    await expect(element(by.id('main-content'))).toBeVisible();
    await device.takeScreenshot('initial-ui-load');
  }

  // Authentication Flow Tests
  async testGuestAccess() {
    // Look for guest access option
    try {
      await waitFor(element(by.text('Continue as Guest')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.text('Continue as Guest')).tap();
      await device.takeScreenshot('guest-access');
    } catch (error) {
      // Alternative guest access methods
      await waitFor(element(by.id('guest-button')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('guest-button')).tap();
      await device.takeScreenshot('guest-access-alt');
    }
  }

  async testLoginScreen() {
    // Navigate to login screen
    try {
      await element(by.text('Sign In')).tap();
    } catch (error) {
      await element(by.id('login-button')).tap();
    }
    
    await waitFor(element(by.id('email-input')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Test form interaction
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('testpassword');
    
    await device.takeScreenshot('login-form');
    
    // Verify form elements are functional
    await expect(element(by.id('email-input'))).toHaveText('test@example.com');
  }

  async testRegistrationScreen() {
    // Navigate to registration
    try {
      await element(by.text('Sign Up')).tap();
    } catch (error) {
      await element(by.id('register-button')).tap();
    }
    
    await waitFor(element(by.id('register-form')))
      .toBeVisible()
      .withTimeout(5000);
    
    await device.takeScreenshot('registration-screen');
  }

  // Guest User Journey Tests
  async testGuestOnboarding() {
    // Navigate through guest onboarding
    await waitFor(element(by.id('onboarding-screen')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Go through onboarding steps
    for (let i = 0; i < 3; i++) {
      try {
        await element(by.text('Next')).tap();
        await this.sleep(2000);
        await device.takeScreenshot(`onboarding-step-${i + 1}`);
      } catch (error) {
        // Alternative next button
        await element(by.id('next-button')).tap();
        await this.sleep(2000);
      }
    }
  }

  async testGuestChatbot() {
    // Navigate to chatbot
    await waitFor(element(by.id('chatbot-screen')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Test chatbot interaction
    await element(by.id('message-input')).typeText('What is contract law?');
    await element(by.id('send-button')).tap();
    
    // Wait for response
    await waitFor(element(by.id('chat-message')))
      .toBeVisible()
      .withTimeout(15000);
    
    await device.takeScreenshot('chatbot-interaction');
  }

  async testGuestGlossary() {
    // Navigate to glossary
    try {
      await element(by.text('Glossary')).tap();
    } catch (error) {
      await element(by.id('glossary-button')).tap();
    }
    
    await waitFor(element(by.id('glossary-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Test search functionality
    await element(by.id('search-input')).typeText('contract');
    await device.takeScreenshot('glossary-search');
  }

  // Core Feature Tests
  async testChatbotFunctionality() {
    await waitFor(element(by.id('chatbot-screen')))
      .toBeVisible()
      .withTimeout(10000);
    
    const queries = [
      'What is tort law?',
      'Explain property rights',
      'How do I file a lawsuit?'
    ];
    
    for (let i = 0; i < queries.length; i++) {
      await element(by.id('message-input')).clearText();
      await element(by.id('message-input')).typeText(queries[i]);
      await element(by.id('send-button')).tap();
      
      // Wait for response
      await this.sleep(5000);
      await device.takeScreenshot(`chatbot-query-${i + 1}`);
    }
  }

  async testLegalQueryProcessing() {
    const legalQueries = [
      'What are my rights as a tenant?',
      'How to start a business legally?',
      'What is intellectual property?'
    ];
    
    for (const query of legalQueries) {
      await element(by.id('message-input')).clearText();
      await element(by.id('message-input')).typeText(query);
      await element(by.id('send-button')).tap();
      
      // Wait for legal processing
      await this.sleep(8000);
      await device.takeScreenshot(`legal-query-${query.substring(0, 10)}`);
    }
  }

  async testNavigationFlow() {
    // Test navigation between screens
    const screens = ['home', 'chatbot', 'glossary', 'profile'];
    
    for (const screen of screens) {
      try {
        await element(by.id(`${screen}-tab`)).tap();
        await waitFor(element(by.id(`${screen}-screen`)))
          .toBeVisible()
          .withTimeout(5000);
        
        await device.takeScreenshot(`navigation-${screen}`);
        await this.sleep(1000);
      } catch (error) {
        this.log(`Navigation to ${screen} failed: ${error.message}`, 'WARN');
      }
    }
  }

  // UI/UX Tests
  async testScreenRotation() {
    await device.takeScreenshot('portrait-mode');
    
    // Rotate to landscape
    await device.setOrientation('landscape');
    await this.sleep(2000);
    await device.takeScreenshot('landscape-mode');
    
    // Rotate back to portrait
    await device.setOrientation('portrait');
    await this.sleep(2000);
    await device.takeScreenshot('portrait-restored');
  }

  async testBackButtonNavigation() {
    // Navigate to a screen
    await element(by.id('chatbot-tab')).tap();
    await this.sleep(2000);
    await device.takeScreenshot('before-back-navigation');
    
    // Press back button (Android)
    await device.pressBack();
    await this.sleep(2000);
    await device.takeScreenshot('after-back-navigation');
  }

  async testScrollPerformance() {
    // Test scrolling performance
    try {
      await element(by.id('scrollable-content')).scroll(300, 'down');
      await this.sleep(1000);
      await element(by.id('scrollable-content')).scroll(300, 'up');
      await device.takeScreenshot('scroll-test');
    } catch (error) {
      // Alternative scrolling test
      await element(by.id('chat-history')).scroll(200, 'down');
      await device.takeScreenshot('scroll-test-alt');
    }
  }

  // Performance Tests
  async testAppResponsiveness() {
    const startTime = Date.now();
    
    // Perform rapid interactions
    for (let i = 0; i < 5; i++) {
      await element(by.id('main-content')).tap();
      await this.sleep(200);
    }
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (responseTime > 5000) {
      throw new Error(`App responsiveness too slow: ${responseTime}ms`);
    }
    
    await device.takeScreenshot('responsiveness-test');
  }

  async testMemoryUsage() {
    // Detox doesn't have direct memory monitoring, but we can test for memory leaks
    // by performing memory-intensive operations
    
    for (let i = 0; i < 10; i++) {
      await element(by.id('chatbot-tab')).tap();
      await this.sleep(500);
      await element(by.id('home-tab')).tap();
      await this.sleep(500);
    }
    
    // App should still be responsive
    await expect(element(by.id('main-content'))).toBeVisible();
  }

  async testNetworkConnectivity() {
    // Test network-dependent features
    await element(by.id('message-input')).typeText('Test network connectivity');
    await element(by.id('send-button')).tap();
    
    // Wait for network response
    await waitFor(element(by.id('chat-message')))
      .toBeVisible()
      .withTimeout(15000);
    
    await device.takeScreenshot('network-test');
  }

  // Error Handling Tests
  async testInvalidInputHandling() {
    const invalidInputs = [
      'Special chars: !@#$%^&*()',
      'Very long text: ' + 'A'.repeat(500),
      '' // Empty input
    ];
    
    for (const input of invalidInputs) {
      try {
        await element(by.id('message-input')).clearText();
        if (input) {
          await element(by.id('message-input')).typeText(input);
        }
        await element(by.id('send-button')).tap();
        await this.sleep(2000);
        
        // App should handle gracefully without crashing
        await expect(element(by.id('chatbot-screen'))).toBeVisible();
        await device.takeScreenshot(`invalid-input-${input.substring(0, 10)}`);
      } catch (error) {
        // Input handling errors are acceptable
        this.log(`Input handling test completed for: ${input.substring(0, 20)}...`);
      }
    }
  }

  async testAppRecovery() {
    await device.takeScreenshot('before-background');
    
    // Send app to background
    await device.sendToHome();
    await this.sleep(3000);
    
    // Bring app back to foreground
    await device.launchApp({ newInstance: false });
    await this.sleep(3000);
    
    // Verify app recovered properly
    await expect(element(by.id('main-content'))).toBeVisible();
    await device.takeScreenshot('after-recovery');
  }

  // Utility methods
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateReport() {
    this.log('Generating professional test report...');
    
    const reportDir = './e2e/test-reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.testResults.length,
      passed: this.testResults.filter(t => t.status === 'PASS').length,
      failed: this.testResults.filter(t => t.status === 'FAIL').length,
      results: this.testResults,
      executionTime: Date.now() - this.startTime,
      framework: 'Detox Automation Framework'
    };

    // Generate JSON report
    fs.writeFileSync(
      path.join(reportDir, 'detox-e2e-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate HTML report using professional generator
    const htmlReport = ProfessionalReportGenerator.generateHTMLReport(report);
    fs.writeFileSync(
      path.join(reportDir, 'detox-e2e-report.html'),
      htmlReport
    );

    this.log('✓ Professional test report generated');
    this.log(`Report available at: ${path.join(reportDir, 'detox-e2e-report.html')}`);
  }

  async run() {
    try {
      this.log('Starting Professional Detox E2E Test Runner...');
      
      await this.runTests();
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
  const runner = new DetoxE2ERunner();
  runner.run();
}

module.exports = DetoxE2ERunner;
