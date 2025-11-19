const detox = require('detox');
const adapter = require('detox/runners/jest/adapter');
const specReporter = require('detox/runners/jest/specReporter');

// Set the default timeout for all tests
jest.setTimeout(300000);

// Setup Detox adapter
jasmine.getEnv().addReporter(adapter);

// Add spec reporter for better test output
jasmine.getEnv().addReporter(specReporter);

beforeAll(async () => {
  console.log('🚀 Starting E2E Test Suite...');
  await detox.init();
  
  // Add custom matchers for better assertions
  expect.extend({
    toBeVisibleAndTappable: async (element) => {
      try {
        await expect(element).toBeVisible();
        await expect(element).toExist();
        return { pass: true, message: () => 'Element is visible and tappable' };
      } catch (error) {
        return { 
          pass: false, 
          message: () => `Element is not visible or tappable: ${error.message}` 
        };
      }
    },
    
    toHaveValidationError: async (element, errorText) => {
      try {
        await expect(element).toBeVisible();
        await expect(element).toHaveText(errorText);
        return { pass: true, message: () => `Validation error "${errorText}" is displayed` };
      } catch (error) {
        return { 
          pass: false, 
          message: () => `Expected validation error "${errorText}" not found: ${error.message}` 
        };
      }
    }
  });
});

beforeEach(async () => {
  await adapter.beforeEach();
});

afterAll(async () => {
  await adapter.afterAll();
  await detox.cleanup();
  console.log('✅ E2E Test Suite Completed');
});

// Global test utilities
global.testUtils = {
  // Wait for element with timeout
  waitForElement: async (element, timeout = 10000) => {
    await waitFor(element).toBeVisible().withTimeout(timeout);
    return element;
  },
  
  // Type text with delay to simulate real user input
  typeText: async (element, text, delay = 100) => {
    await element.tap();
    await element.clearText();
    
    // Type character by character for more realistic input
    for (let char of text) {
      await element.typeText(char);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  },
  
  // Take screenshot for debugging
  takeScreenshot: async (name) => {
    try {
      await device.takeScreenshot(name);
      console.log(`📸 Screenshot taken: ${name}`);
    } catch (error) {
      console.warn(`Failed to take screenshot: ${error.message}`);
    }
  },
  
  // Scroll to element if not visible
  scrollToElement: async (scrollView, element) => {
    try {
      await scrollView.scroll(200, 'down');
      await expect(element).toBeVisible();
    } catch (error) {
      // Try scrolling up if down didn't work
      await scrollView.scroll(200, 'up');
      await expect(element).toBeVisible();
    }
  },
  
  // Wait for loading to complete
  waitForLoading: async (loadingElement, timeout = 15000) => {
    try {
      await waitFor(loadingElement).not.toBeVisible().withTimeout(timeout);
    } catch (error) {
      console.warn('Loading element still visible after timeout');
    }
  }
};

// Test data constants
global.testData = {
  users: {
    validUser: {
      email: 'test.user@example.com',
      password: 'TestPass123!',
      username: 'testuser123',
      firstName: 'Test',
      lastName: 'User',
      birthdate: '1990-01-01'
    },
    invalidUser: {
      email: 'invalid-email',
      password: '123',
      username: 'tu',
      firstName: '',
      lastName: '',
      birthdate: '2025-01-01'
    },
    existingUser: {
      email: 'existing@example.com',
      password: 'ExistingPass123!'
    }
  },
  
  validation: {
    emailRequired: 'Please enter your email address',
    passwordRequired: 'Please enter your password',
    invalidEmail: 'Please enter a valid email address',
    weakPassword: 'Password must be at least 8 characters with uppercase, lowercase, and a number',
    passwordMismatch: 'Passwords do not match',
    usernameRequired: 'Please enter a username',
    usernameTooShort: 'Username must be at least 3 characters',
    firstNameRequired: 'Please enter your first name',
    lastNameRequired: 'Please enter your last name',
    birthdateRequired: 'Please select your birthdate',
    invalidBirthdate: 'You must be at least 18 years old'
  }
};
