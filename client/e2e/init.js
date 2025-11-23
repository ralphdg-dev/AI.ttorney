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
  validUser: {
    email: 'test.user@example.com',
    password: 'TestPass123!',
    username: 'testuser123',
    firstName: 'Test',
    lastName: 'User',
    birthdate: '1990-01-01'
  },
  
  validLawyer: {
    email: 'test.lawyer@example.com',
    password: 'LawyerPass123!',
    username: 'testlawyer123',
    firstName: 'Test',
    lastName: 'Lawyer',
    birthdate: '1985-01-01',
    role: 'lawyer'
  },
  
  pendingLawyer: {
    email: 'pending.lawyer@example.com',
    password: 'PendingPass123!',
    username: 'pendinglawyer123',
    firstName: 'Pending',
    lastName: 'Lawyer',
    birthdate: '1988-01-01',
    role: 'lawyer',
    status: 'pending'
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
  },
  
  chatbotQueries: {
    contractLaw: 'What are the essential elements of a valid contract?',
    tortLaw: 'Explain negligence in tort law',
    constitutionalLaw: 'What are the key principles of constitutional law?',
    criminalLaw: 'What is the difference between civil and criminal law?',
    complexScenario: 'A person signed a contract to buy a house but the seller failed to disclose that the property has structural damage. What legal options does the buyer have?',
    nonLegal: 'What is the weather like today?',
    followUpQueries: [
      'What is a breach of contract?',
      'What are the remedies for breach of contract?',
      'Can you give me an example of specific performance?'
    ]
  },
  
  glossaryTerms: {
    contract: 'contract',
    tort: 'tort',
    negligence: 'negligence',
    liability: 'liability',
    damages: 'damages'
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
  },
  
  performance: {
    maxLoginTime: 15000,
    maxChatbotResponseTime: 30000,
    maxDashboardLoadTime: 20000,
    maxOnboardingTime: 15000
  }
};
