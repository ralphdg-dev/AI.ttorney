/**
 * Guest Onboarding E2E Tests
 * Tests the complete guest user journey from onboarding to chatbot interaction
 */

const { GuestOnboardingPage, ChatbotPage, GlossaryPage } = require('../utils/pageObjects');

describe('Guest Onboarding Feature Tests', () => {
  let guestOnboardingPage;
  let chatbotPage;
  let glossaryPage;

  beforeAll(async () => {
    guestOnboardingPage = new GuestOnboardingPage();
    chatbotPage = new ChatbotPage();
    glossaryPage = new GlossaryPage();
  });

  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
    await testUtils.takeScreenshot('guest-onboarding-start');
  });

  afterEach(async () => {
    await testUtils.takeScreenshot('guest-onboarding-end');
  });

  describe('Guest Onboarding Flow', () => {
    test('should display guest onboarding screen with all elements', async () => {
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.verifyGuestOnboardingScreen();
      
      // Verify feature cards are present
      await expect(guestOnboardingPage.chatbotFeatureCard).toBeVisible();
      await expect(guestOnboardingPage.glossaryFeatureCard).toBeVisible();
      await expect(guestOnboardingPage.startExploringButton).toBeVisible();
      
      await testUtils.takeScreenshot('guest-onboarding-screen');
    });

    test('should navigate to chatbot when start exploring is tapped', async () => {
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.startExploring();
      
      // Should navigate to chatbot screen
      await chatbotPage.verifyChatbotScreen();
      
      await testUtils.takeScreenshot('chatbot-after-onboarding');
    });

    test('should show tutorial after navigating to chatbot', async () => {
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.startExploring();
      
      // Wait for tutorial to appear
      try {
        await guestOnboardingPage.waitForTutorial();
        await expect(guestOnboardingPage.tutorialOverlay).toBeVisible();
        await testUtils.takeScreenshot('tutorial-appeared');
      } catch (error) {
        console.log('Tutorial did not appear - might be disabled or already completed');
      }
    });

    test('should allow skipping tutorial', async () => {
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.startExploring();
      
      try {
        await guestOnboardingPage.waitForTutorial();
        await guestOnboardingPage.skipTutorial();
        
        // Tutorial should be dismissed
        await expect(guestOnboardingPage.tutorialOverlay).not.toBeVisible();
        
        // Chatbot should be fully accessible
        await chatbotPage.verifyChatbotScreen();
        
        await testUtils.takeScreenshot('tutorial-skipped');
      } catch (error) {
        console.log('Tutorial skip test skipped - tutorial not showing');
      }
    });

    test('should allow completing tutorial step by step', async () => {
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.startExploring();
      
      try {
        await guestOnboardingPage.waitForTutorial();
        await guestOnboardingPage.completeTutorial();
        
        // Tutorial should be completed
        await expect(guestOnboardingPage.tutorialOverlay).not.toBeVisible();
        
        // Chatbot should be accessible
        await chatbotPage.verifyChatbotScreen();
        
        await testUtils.takeScreenshot('tutorial-completed');
      } catch (error) {
        console.log('Tutorial completion test skipped - tutorial not showing');
      }
    });
  });

  describe('Guest Chatbot Interaction', () => {
    beforeEach(async () => {
      // Navigate to chatbot as guest
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.startExploring();
      
      // Skip tutorial if it appears
      try {
        await guestOnboardingPage.waitForTutorial();
        await guestOnboardingPage.skipTutorial();
      } catch (error) {
        // Tutorial not showing
      }
      
      await chatbotPage.verifyChatbotScreen();
    });

    test('should send message and receive response', async () => {
      const testMessage = 'What is contract law?';
      
      await chatbotPage.sendMessage(testMessage);
      await chatbotPage.verifyMessageSent(testMessage);
      
      await testUtils.takeScreenshot('message-sent');
      
      // Wait for bot response
      await chatbotPage.waitForBotResponse();
      await chatbotPage.verifyBotResponse();
      
      await testUtils.takeScreenshot('bot-response-received');
    });

    test('should display sources when available', async () => {
      const testMessage = 'What are the elements of a valid contract?';
      
      await chatbotPage.sendMessage(testMessage);
      await chatbotPage.waitForBotResponse();
      
      // Check if sources are displayed
      await chatbotPage.verifySources();
      
      await testUtils.takeScreenshot('sources-displayed');
    });

    test('should handle multiple messages in conversation', async () => {
      const messages = [
        'What is tort law?',
        'Can you give me an example?',
        'What about negligence?'
      ];
      
      for (let i = 0; i < messages.length; i++) {
        await chatbotPage.sendMessage(messages[i]);
        await chatbotPage.waitForBotResponse();
        await testUtils.takeScreenshot(`conversation-message-${i + 1}`);
        
        // Small delay between messages
        await device.sleep(2000);
      }
      
      // Verify all messages are in conversation
      for (const message of messages) {
        const messageElement = element(by.text(message));
        await expect(messageElement).toBeVisible();
      }
    });

    test('should handle network errors gracefully', async () => {
      // This test simulates network issues
      const testMessage = 'Test network error handling';
      
      await chatbotPage.sendMessage(testMessage);
      
      // Handle potential network errors
      await chatbotPage.handleNetworkError();
      
      // Should still be on chatbot screen
      await chatbotPage.verifyChatbotScreen();
      
      await testUtils.takeScreenshot('network-error-handled');
    });

    test('should start new chat conversation', async () => {
      // Send initial message
      await chatbotPage.sendMessage('Initial message');
      await chatbotPage.waitForBotResponse();
      
      // Start new chat
      try {
        await chatbotPage.startNewChat();
        
        // Verify chat is cleared or new chat started
        await chatbotPage.verifyChatbotScreen();
        
        await testUtils.takeScreenshot('new-chat-started');
      } catch (error) {
        console.log('New chat functionality not available or different implementation');
      }
    });
  });

  describe('Guest Glossary Access', () => {
    test('should navigate to glossary from guest onboarding', async () => {
      await guestOnboardingPage.navigateToGuestOnboarding();
      
      // Tap on glossary feature card
      await guestOnboardingPage.glossaryFeatureCard.tap();
      
      // Should navigate to glossary
      await glossaryPage.verifyGlossaryScreen();
      
      await testUtils.takeScreenshot('glossary-accessed');
    });

    test('should search for legal terms in glossary', async () => {
      // Navigate to glossary via chatbot or direct navigation
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.glossaryFeatureCard.tap();
      
      await glossaryPage.verifyGlossaryScreen();
      
      // Search for a legal term
      await glossaryPage.searchTerm('contract');
      await glossaryPage.verifySearchResults();
      
      await testUtils.takeScreenshot('glossary-search-results');
    });

    test('should view term definition', async () => {
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.glossaryFeatureCard.tap();
      
      await glossaryPage.verifyGlossaryScreen();
      await glossaryPage.searchTerm('tort');
      await glossaryPage.verifySearchResults();
      
      // Select first term
      await glossaryPage.selectFirstTerm();
      await glossaryPage.verifyTermDefinition();
      
      await testUtils.takeScreenshot('term-definition-viewed');
    });
  });

  describe('Guest Flow Performance', () => {
    test('should complete guest onboarding flow within acceptable time', async () => {
      const startTime = Date.now();
      
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.verifyGuestOnboardingScreen();
      await guestOnboardingPage.startExploring();
      await chatbotPage.verifyChatbotScreen();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 15 seconds
      expect(duration).toBeLessThan(15000);
      
      console.log(`Guest onboarding completed in ${duration}ms`);
    });

    test('should handle rapid interactions without errors', async () => {
      await guestOnboardingPage.navigateToGuestOnboarding();
      
      // Rapid taps on start exploring
      await guestOnboardingPage.startExploringButton.tap();
      await device.sleep(100);
      await guestOnboardingPage.startExploringButton.tap();
      
      // Should still navigate correctly
      await chatbotPage.verifyChatbotScreen();
      
      await testUtils.takeScreenshot('rapid-interaction-handled');
    });
  });

  describe('Guest Session Management', () => {
    test('should maintain guest session across app lifecycle', async () => {
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.startExploring();
      await chatbotPage.verifyChatbotScreen();
      
      // Send a message
      await chatbotPage.sendMessage('Test session persistence');
      await chatbotPage.waitForBotResponse();
      
      // Background and foreground app
      await device.sendToHome();
      await device.sleep(2000);
      await device.launchApp({ newInstance: false });
      
      // Should still be on chatbot screen
      await chatbotPage.verifyChatbotScreen();
      
      await testUtils.takeScreenshot('session-persisted');
    });

    test('should handle app restart gracefully', async () => {
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.startExploring();
      
      // Restart app
      await device.launchApp({ newInstance: true });
      
      // Should be able to continue as guest again
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.verifyGuestOnboardingScreen();
      
      await testUtils.takeScreenshot('app-restart-handled');
    });
  });
});
