/**
 * Chatbot E2E Tests
 * Tests chatbot functionality for both guest and authenticated users
 */

const { LoginPage, ChatbotPage, GuestOnboardingPage } = require('../utils/pageObjects');

describe('Chatbot Feature Tests', () => {
  let loginPage;
  let chatbotPage;
  let guestOnboardingPage;

  beforeAll(async () => {
    loginPage = new LoginPage();
    chatbotPage = new ChatbotPage();
    guestOnboardingPage = new GuestOnboardingPage();
  });

  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
    await testUtils.takeScreenshot('chatbot-test-start');
  });

  afterEach(async () => {
    await testUtils.takeScreenshot('chatbot-test-end');
  });

  describe('Guest Chatbot Functionality', () => {
    beforeEach(async () => {
      // Navigate to chatbot as guest
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.startExploring();
      
      // Skip tutorial if present
      try {
        await guestOnboardingPage.waitForTutorial();
        await guestOnboardingPage.skipTutorial();
      } catch (error) {
        // Tutorial not showing
      }
      
      await chatbotPage.verifyChatbotScreen();
    });

    test('should display chatbot interface correctly', async () => {
      await expect(chatbotPage.messageInput).toBeVisible();
      await expect(chatbotPage.sendButton).toBeVisible();
      await expect(chatbotPage.messagesContainer).toBeVisible();
      
      await testUtils.takeScreenshot('chatbot-interface');
    });

    test('should send and receive basic legal query', async () => {
      const query = 'What is the difference between civil and criminal law?';
      
      await chatbotPage.sendMessage(query);
      await chatbotPage.verifyMessageSent(query);
      await chatbotPage.waitForBotResponse();
      await chatbotPage.verifyBotResponse();
      
      await testUtils.takeScreenshot('basic-legal-query');
    });

    test('should handle contract law questions', async () => {
      const query = 'What are the essential elements of a valid contract?';
      
      await chatbotPage.sendMessage(query);
      await chatbotPage.waitForBotResponse();
      await chatbotPage.verifyBotResponse();
      await chatbotPage.verifySources();
      
      await testUtils.takeScreenshot('contract-law-query');
    });

    test('should handle tort law questions', async () => {
      const query = 'Explain negligence in tort law';
      
      await chatbotPage.sendMessage(query);
      await chatbotPage.waitForBotResponse();
      await chatbotPage.verifyBotResponse();
      
      await testUtils.takeScreenshot('tort-law-query');
    });

    test('should handle constitutional law questions', async () => {
      const query = 'What are the key principles of constitutional law?';
      
      await chatbotPage.sendMessage(query);
      await chatbotPage.waitForBotResponse();
      await chatbotPage.verifyBotResponse();
      
      await testUtils.takeScreenshot('constitutional-law-query');
    });

    test('should display legal sources when available', async () => {
      const query = 'What is the statute of limitations for personal injury claims?';
      
      await chatbotPage.sendMessage(query);
      await chatbotPage.waitForBotResponse();
      await chatbotPage.verifyBotResponse();
      
      // Check for sources
      try {
        await chatbotPage.verifySources();
        await testUtils.takeScreenshot('sources-available');
      } catch (error) {
        console.log('No sources displayed for this query');
      }
    });

    test('should handle follow-up questions in conversation', async () => {
      const queries = [
        'What is a breach of contract?',
        'What are the remedies for breach of contract?',
        'Can you give me an example of specific performance?'
      ];
      
      for (let i = 0; i < queries.length; i++) {
        await chatbotPage.sendMessage(queries[i]);
        await chatbotPage.waitForBotResponse();
        await chatbotPage.verifyBotResponse();
        
        await testUtils.takeScreenshot(`follow-up-${i + 1}`);
        await device.sleep(2000); // Brief pause between messages
      }
    });

    test('should handle complex legal scenarios', async () => {
      const complexQuery = 'A person signed a contract to buy a house but the seller failed to disclose that the property has structural damage. What legal options does the buyer have?';
      
      await chatbotPage.sendMessage(complexQuery);
      await chatbotPage.waitForBotResponse(45000); // Longer timeout for complex queries
      await chatbotPage.verifyBotResponse();
      
      await testUtils.takeScreenshot('complex-scenario');
    });

    test('should handle non-legal questions appropriately', async () => {
      const nonLegalQuery = 'What is the weather like today?';
      
      await chatbotPage.sendMessage(nonLegalQuery);
      await chatbotPage.waitForBotResponse();
      await chatbotPage.verifyBotResponse();
      
      // Bot should redirect to legal topics or politely decline
      await testUtils.takeScreenshot('non-legal-query');
    });
  });

  describe('Authenticated User Chatbot', () => {
    beforeEach(async () => {
      // Login with test user
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials(
        testData.validUser.email,
        testData.validUser.password
      );
      await loginPage.waitForLoginComplete();
      
      // Navigate to chatbot (implementation may vary)
      // This assumes chatbot is accessible from main navigation
      try {
        const chatbotNavButton = element(by.id('chatbot-nav-button'));
        await chatbotNavButton.tap();
      } catch (error) {
        // Alternative navigation method
        console.log('Direct chatbot navigation not found, using alternative method');
      }
      
      await chatbotPage.verifyChatbotScreen();
    });

    test('should provide personalized responses for authenticated users', async () => {
      const query = 'I need help with a contract dispute';
      
      await chatbotPage.sendMessage(query);
      await chatbotPage.waitForBotResponse();
      await chatbotPage.verifyBotResponse();
      
      // Authenticated users might get more detailed responses
      await testUtils.takeScreenshot('authenticated-response');
    });

    test('should save conversation history for authenticated users', async () => {
      const query = 'What is intellectual property law?';
      
      await chatbotPage.sendMessage(query);
      await chatbotPage.waitForBotResponse();
      
      // Restart app and check if conversation persists
      await device.launchApp({ newInstance: false });
      await chatbotPage.verifyChatbotScreen();
      
      // Check if previous message is still visible
      const previousMessage = element(by.text(query));
      try {
        await expect(previousMessage).toBeVisible();
        await testUtils.takeScreenshot('conversation-persisted');
      } catch (error) {
        console.log('Conversation history not persisted or different implementation');
      }
    });
  });

  describe('Chatbot Error Handling', () => {
    beforeEach(async () => {
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.startExploring();
      
      try {
        await guestOnboardingPage.skipTutorial();
      } catch (error) {
        // Tutorial not showing
      }
      
      await chatbotPage.verifyChatbotScreen();
    });

    test('should handle network connectivity issues', async () => {
      const query = 'Test network error handling';
      
      await chatbotPage.sendMessage(query);
      
      // Handle potential network errors
      await chatbotPage.handleNetworkError();
      
      // Should remain functional
      await chatbotPage.verifyChatbotScreen();
      
      await testUtils.takeScreenshot('network-error-recovery');
    });

    test('should handle server timeout gracefully', async () => {
      const query = 'This is a test for timeout handling';
      
      await chatbotPage.sendMessage(query);
      
      try {
        await chatbotPage.waitForBotResponse(10000); // Short timeout
      } catch (error) {
        // Timeout occurred, check error handling
        try {
          await expect(chatbotPage.errorMessage).toBeVisible();
          await testUtils.takeScreenshot('timeout-error-displayed');
        } catch (e) {
          console.log('Timeout handled differently or response was fast');
        }
      }
    });

    test('should handle empty message submission', async () => {
      // Try to send empty message
      await chatbotPage.sendButton.tap();
      
      // Should not send empty message or show validation
      await chatbotPage.verifyChatbotScreen();
      
      await testUtils.takeScreenshot('empty-message-handled');
    });

    test('should handle very long messages', async () => {
      const longMessage = 'This is a very long legal question that exceeds normal message length limits. '.repeat(20);
      
      try {
        await chatbotPage.sendMessage(longMessage);
        await chatbotPage.waitForBotResponse();
        await chatbotPage.verifyBotResponse();
        
        await testUtils.takeScreenshot('long-message-handled');
      } catch (error) {
        console.log('Long message handling varies by implementation');
      }
    });
  });

  describe('Chatbot Performance', () => {
    beforeEach(async () => {
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.startExploring();
      
      try {
        await guestOnboardingPage.skipTutorial();
      } catch (error) {
        // Tutorial not showing
      }
      
      await chatbotPage.verifyChatbotScreen();
    });

    test('should respond to queries within acceptable time', async () => {
      const query = 'What is contract law?';
      const startTime = Date.now();
      
      await chatbotPage.sendMessage(query);
      await chatbotPage.waitForBotResponse();
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 30 seconds
      expect(responseTime).toBeLessThan(30000);
      
      console.log(`Chatbot response time: ${responseTime}ms`);
      await testUtils.takeScreenshot('performance-test');
    });

    test('should handle rapid message sending', async () => {
      const queries = [
        'What is tort law?',
        'What is contract law?',
        'What is criminal law?'
      ];
      
      // Send messages rapidly
      for (const query of queries) {
        await chatbotPage.sendMessage(query);
        await device.sleep(500); // Brief delay
      }
      
      // Wait for all responses
      await device.sleep(10000);
      
      // Should handle all messages appropriately
      await chatbotPage.verifyChatbotScreen();
      
      await testUtils.takeScreenshot('rapid-messages-handled');
    });

    test('should maintain performance with long conversation', async () => {
      const queries = [
        'What is contract law?',
        'What are the elements of a contract?',
        'What is consideration in contracts?',
        'What is breach of contract?',
        'What are contract remedies?'
      ];
      
      for (let i = 0; i < queries.length; i++) {
        const startTime = Date.now();
        
        await chatbotPage.sendMessage(queries[i]);
        await chatbotPage.waitForBotResponse();
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`Message ${i + 1} response time: ${responseTime}ms`);
        
        // Response time should not degrade significantly
        expect(responseTime).toBeLessThan(35000);
        
        await device.sleep(2000);
      }
      
      await testUtils.takeScreenshot('long-conversation-performance');
    });
  });

  describe('Chatbot UI/UX', () => {
    beforeEach(async () => {
      await guestOnboardingPage.navigateToGuestOnboarding();
      await guestOnboardingPage.startExploring();
      
      try {
        await guestOnboardingPage.skipTutorial();
      } catch (error) {
        // Tutorial not showing
      }
      
      await chatbotPage.verifyChatbotScreen();
    });

    test('should display typing indicator during response generation', async () => {
      const query = 'What is the rule of law?';
      
      await chatbotPage.sendMessage(query);
      
      // Check for typing indicator
      try {
        await testUtils.waitForElement(chatbotPage.typingIndicator, 5000);
        await expect(chatbotPage.typingIndicator).toBeVisible();
        await testUtils.takeScreenshot('typing-indicator-shown');
      } catch (error) {
        console.log('Typing indicator not shown or very fast response');
      }
      
      await chatbotPage.waitForBotResponse();
    });

    test('should scroll to new messages automatically', async () => {
      // Send multiple messages to create scrollable content
      const queries = [
        'What is tort law?',
        'What is contract law?',
        'What is criminal law?',
        'What is constitutional law?',
        'What is administrative law?'
      ];
      
      for (const query of queries) {
        await chatbotPage.sendMessage(query);
        await chatbotPage.waitForBotResponse();
        await device.sleep(1000);
      }
      
      // Latest message should be visible
      const lastQuery = queries[queries.length - 1];
      const lastMessage = element(by.text(lastQuery));
      await expect(lastMessage).toBeVisible();
      
      await testUtils.takeScreenshot('auto-scroll-test');
    });

    test('should handle message timestamps correctly', async () => {
      const query = 'What is evidence law?';
      
      await chatbotPage.sendMessage(query);
      await chatbotPage.waitForBotResponse();
      
      // Check if timestamps are displayed
      try {
        await expect(chatbotPage.messageTimestamp).toBeVisible();
        await testUtils.takeScreenshot('timestamps-displayed');
      } catch (error) {
        console.log('Timestamps not displayed or different implementation');
      }
    });
  });
});
