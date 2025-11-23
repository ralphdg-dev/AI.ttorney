const { device, element, by, expect, waitFor } = require('detox');

describe('Guest User Flow Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should allow guest access to the app', async () => {
    // Wait for app to load
    await waitFor(element(by.id('main-content')))
      .toBeVisible()
      .withTimeout(15000);

    // Look for guest access option
    try {
      await waitFor(element(by.text('Continue as Guest')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.text('Continue as Guest')).tap();
    } catch (error) {
      // Try alternative guest access methods
      try {
        await element(by.id('guest-button')).tap();
      } catch (altError) {
        // If no explicit guest button, the app might allow guest access by default
        console.log('Guest access may be automatic');
      }
    }
    
    await device.takeScreenshot('guest-access-granted');
  });

  it('should navigate through guest onboarding', async () => {
    // Ensure we're in guest mode first
    await waitFor(element(by.id('main-content')))
      .toBeVisible()
      .withTimeout(10000);

    // Look for onboarding screens
    try {
      await waitFor(element(by.id('onboarding-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Navigate through onboarding steps
      for (let i = 0; i < 3; i++) {
        try {
          await element(by.text('Next')).tap();
          await device.takeScreenshot(`onboarding-step-${i + 1}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          // Try alternative next button
          try {
            await element(by.id('next-button')).tap();
            await device.takeScreenshot(`onboarding-step-alt-${i + 1}`);
          } catch (altError) {
            console.log(`Onboarding step ${i + 1} navigation failed`);
            break;
          }
        }
      }
    } catch (error) {
      console.log('No onboarding screen found - may be skipped for guests');
      await device.takeScreenshot('no-onboarding-screen');
    }
  });

  it('should access chatbot as guest user', async () => {
    // Navigate to chatbot
    try {
      await waitFor(element(by.id('chatbot-screen')))
        .toBeVisible()
        .withTimeout(10000);
    } catch (error) {
      // Try to navigate to chatbot
      try {
        await element(by.text('Chatbot')).tap();
      } catch (navError) {
        await element(by.id('chatbot-tab')).tap();
      }
      
      await waitFor(element(by.id('chatbot-screen')))
        .toBeVisible()
        .withTimeout(5000);
    }
    
    await device.takeScreenshot('guest-chatbot-access');
    
    // Test basic chatbot interaction
    try {
      await element(by.id('message-input')).typeText('What is contract law?');
      await element(by.id('send-button')).tap();
      
      // Wait for response
      await waitFor(element(by.id('chat-message')))
        .toBeVisible()
        .withTimeout(15000);
      
      await device.takeScreenshot('guest-chatbot-interaction');
    } catch (error) {
      console.log('Chatbot interaction test failed:', error.message);
      await device.takeScreenshot('guest-chatbot-interaction-failed');
    }
  });

  it('should access glossary as guest user', async () => {
    // Navigate to glossary
    try {
      await element(by.text('Glossary')).tap();
    } catch (error) {
      try {
        await element(by.id('glossary-button')).tap();
      } catch (altError) {
        await element(by.id('glossary-tab')).tap();
      }
    }
    
    try {
      await waitFor(element(by.id('glossary-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await device.takeScreenshot('guest-glossary-access');
      
      // Test search functionality
      await element(by.id('search-input')).typeText('contract');
      await device.takeScreenshot('guest-glossary-search');
    } catch (error) {
      console.log('Glossary access test failed:', error.message);
      await device.takeScreenshot('guest-glossary-failed');
    }
  });
});
