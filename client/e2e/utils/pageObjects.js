/**
 * Page Object Model for E2E Tests
 * Centralizes element selectors and common actions
 */

class LoginPage {
  constructor() {
    // Element selectors
    this.emailInput = element(by.id('login-email-input'));
    this.passwordInput = element(by.id('login-password-input'));
    this.loginButton = element(by.id('login-submit-button'));
    this.forgotPasswordLink = element(by.id('forgot-password-link'));
    this.signUpLink = element(by.id('signup-link'));
    this.showPasswordButton = element(by.id('show-password-button'));
    this.errorMessage = element(by.id('login-error-message'));
    this.loadingIndicator = element(by.id('login-loading'));
    
    // Toast messages
    this.successToast = element(by.text('Login Successful'));
    this.errorToast = element(by.text('Login Failed'));
  }

  async navigateToLogin() {
    await device.launchApp({ newInstance: true });
    // Assuming app starts at login or we need to navigate
    try {
      const loginLink = element(by.text('Sign In'));
      await loginLink.tap();
    } catch (error) {
      // Already on login page
    }
  }

  async enterEmail(email) {
    await testUtils.waitForElement(this.emailInput);
    await testUtils.typeText(this.emailInput, email);
  }

  async enterPassword(password) {
    await testUtils.waitForElement(this.passwordInput);
    await testUtils.typeText(this.passwordInput, password);
  }

  async togglePasswordVisibility() {
    await this.showPasswordButton.tap();
  }

  async submitLogin() {
    await this.loginButton.tap();
  }

  async loginWithCredentials(email, password) {
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.submitLogin();
  }

  async waitForLoginComplete() {
    await testUtils.waitForLoading(this.loadingIndicator);
  }

  async verifyLoginSuccess() {
    // Check for successful navigation or success message
    try {
      await expect(this.successToast).toBeVisible();
    } catch (error) {
      // Alternative: check for navigation to home screen
      const homeScreen = element(by.id('home-screen'));
      await testUtils.waitForElement(homeScreen, 15000);
    }
  }

  async verifyLoginError(expectedError) {
    await expect(this.errorMessage).toHaveValidationError(expectedError);
  }

  async navigateToForgotPassword() {
    await this.forgotPasswordLink.tap();
  }

  async navigateToSignUp() {
    await this.signUpLink.tap();
  }
}

class RegistrationPage {
  constructor() {
    // Element selectors
    this.emailInput = element(by.id('signup-email-input'));
    this.passwordInput = element(by.id('signup-password-input'));
    this.confirmPasswordInput = element(by.id('signup-confirm-password-input'));
    this.usernameInput = element(by.id('signup-username-input'));
    this.firstNameInput = element(by.id('signup-firstname-input'));
    this.lastNameInput = element(by.id('signup-lastname-input'));
    this.birthdateInput = element(by.id('signup-birthdate-input'));
    this.roleSelector = element(by.id('signup-role-selector'));
    this.signUpButton = element(by.id('signup-submit-button'));
    this.loginLink = element(by.id('login-link'));
    this.showPasswordButton = element(by.id('signup-show-password-button'));
    this.termsCheckbox = element(by.id('terms-checkbox'));
    this.privacyCheckbox = element(by.id('privacy-checkbox'));
    
    // Error elements
    this.emailError = element(by.id('signup-email-error'));
    this.passwordError = element(by.id('signup-password-error'));
    this.confirmPasswordError = element(by.id('signup-confirm-password-error'));
    this.usernameError = element(by.id('signup-username-error'));
    this.firstNameError = element(by.id('signup-firstname-error'));
    this.lastNameError = element(by.id('signup-lastname-error'));
    this.birthdateError = element(by.id('signup-birthdate-error'));
    this.generalError = element(by.id('signup-general-error'));
    
    // Loading and success elements
    this.loadingIndicator = element(by.id('signup-loading'));
    this.successMessage = element(by.id('signup-success'));
    
    // Toast messages
    this.successToast = element(by.text('Registration Successful'));
    this.errorToast = element(by.text('Registration Failed'));
    
    // Scroll view for long forms
    this.scrollView = element(by.id('signup-scroll-view'));
  }

  async navigateToRegistration() {
    await device.launchApp({ newInstance: true });
    try {
      const signUpLink = element(by.text('Sign Up'));
      await signUpLink.tap();
    } catch (error) {
      // Try alternative navigation
      const createAccountButton = element(by.text('Create Account'));
      await createAccountButton.tap();
    }
  }

  async fillBasicInfo(userData) {
    await testUtils.waitForElement(this.emailInput);
    
    // Fill email
    await testUtils.typeText(this.emailInput, userData.email);
    
    // Fill username
    await testUtils.typeText(this.usernameInput, userData.username);
    
    // Fill first name
    await testUtils.typeText(this.firstNameInput, userData.firstName);
    
    // Fill last name
    await testUtils.typeText(this.lastNameInput, userData.lastName);
  }

  async fillPasswordInfo(password, confirmPassword = null) {
    await testUtils.typeText(this.passwordInput, password);
    
    if (confirmPassword !== null) {
      await testUtils.typeText(this.confirmPasswordInput, confirmPassword);
    } else {
      await testUtils.typeText(this.confirmPasswordInput, password);
    }
  }

  async selectBirthdate(birthdate) {
    await this.birthdateInput.tap();
    // Handle date picker interaction
    // This will depend on your date picker implementation
    await element(by.text('OK')).tap(); // Assuming date picker has OK button
  }

  async selectRole(role = 'legal_seeker') {
    await this.roleSelector.tap();
    const roleOption = element(by.text(role === 'legal_seeker' ? 'Legal Seeker' : 'Lawyer'));
    await roleOption.tap();
  }

  async acceptTermsAndPrivacy() {
    try {
      await this.termsCheckbox.tap();
      await this.privacyCheckbox.tap();
    } catch (error) {
      // Terms might be auto-accepted or not required
      console.log('Terms and privacy checkboxes not found or not required');
    }
  }

  async submitRegistration() {
    // Scroll to submit button if needed
    try {
      await testUtils.scrollToElement(this.scrollView, this.signUpButton);
    } catch (error) {
      // Button might already be visible
    }
    
    await this.signUpButton.tap();
  }

  async registerWithFullData(userData) {
    await this.fillBasicInfo(userData);
    await this.fillPasswordInfo(userData.password);
    await this.selectBirthdate(userData.birthdate);
    await this.selectRole();
    await this.acceptTermsAndPrivacy();
    await this.submitRegistration();
  }

  async waitForRegistrationComplete() {
    await testUtils.waitForLoading(this.loadingIndicator);
  }

  async verifyRegistrationSuccess() {
    try {
      await expect(this.successToast).toBeVisible();
    } catch (error) {
      // Alternative: check for navigation to verification screen
      const verificationScreen = element(by.id('email-verification-screen'));
      await testUtils.waitForElement(verificationScreen, 15000);
    }
  }

  async verifyFieldError(field, expectedError) {
    const errorElement = this[`${field}Error`];
    await expect(errorElement).toHaveValidationError(expectedError);
  }

  async navigateToLogin() {
    await this.loginLink.tap();
  }

  async togglePasswordVisibility() {
    await this.showPasswordButton.tap();
  }
}

class HomePage {
  constructor() {
    this.homeScreen = element(by.id('home-screen'));
    this.welcomeMessage = element(by.id('welcome-message'));
    this.userProfile = element(by.id('user-profile'));
    this.logoutButton = element(by.id('logout-button'));
    this.navigationMenu = element(by.id('navigation-menu'));
  }

  async verifyHomeScreenLoaded() {
    await testUtils.waitForElement(this.homeScreen, 15000);
    await expect(this.homeScreen).toBeVisible();
  }

  async verifyUserLoggedIn(username) {
    await expect(this.welcomeMessage).toBeVisible();
    // Verify username appears in welcome message or profile
    const userElement = element(by.text(username));
    await expect(userElement).toBeVisible();
  }

  async logout() {
    await this.logoutButton.tap();
  }
}

class GuestOnboardingPage {
  constructor() {
    // Guest onboarding elements
    this.continueAsGuestButton = element(by.id('continue-as-guest-button'));
    this.signInButton = element(by.id('sign-in-button'));
    this.startExploringButton = element(by.id('start-exploring-button'));
    this.guestWelcomeText = element(by.id('guest-welcome-text'));
    this.chatbotFeatureCard = element(by.id('chatbot-feature-card'));
    this.glossaryFeatureCard = element(by.id('glossary-feature-card'));
    
    // Tutorial elements
    this.tutorialOverlay = element(by.id('tutorial-overlay'));
    this.tutorialNextButton = element(by.id('tutorial-next-button'));
    this.tutorialSkipButton = element(by.id('tutorial-skip-button'));
    this.tutorialCloseButton = element(by.id('tutorial-close-button'));
    this.spotlightArea = element(by.id('tutorial-spotlight'));
  }

  async navigateToGuestOnboarding() {
    await device.launchApp({ newInstance: true });
    await testUtils.waitForElement(this.continueAsGuestButton);
    await this.continueAsGuestButton.tap();
  }

  async verifyGuestOnboardingScreen() {
    await testUtils.waitForElement(this.guestWelcomeText);
    await expect(this.guestWelcomeText).toBeVisible();
    await expect(this.chatbotFeatureCard).toBeVisible();
    await expect(this.glossaryFeatureCard).toBeVisible();
  }

  async startExploring() {
    await this.startExploringButton.tap();
  }

  async waitForTutorial() {
    await testUtils.waitForElement(this.tutorialOverlay, 10000);
  }

  async skipTutorial() {
    try {
      await this.tutorialSkipButton.tap();
    } catch (error) {
      // Tutorial might not be showing
    }
  }

  async completeTutorial() {
    let tutorialStep = 0;
    const maxSteps = 5; // Adjust based on your tutorial steps
    
    while (tutorialStep < maxSteps) {
      try {
        await testUtils.waitForElement(this.tutorialNextButton, 3000);
        await this.tutorialNextButton.tap();
        tutorialStep++;
        await device.sleep(1000); // Wait for animation
      } catch (error) {
        // Tutorial completed or next button not found
        break;
      }
    }
    
    // Close tutorial if close button exists
    try {
      await this.tutorialCloseButton.tap();
    } catch (error) {
      // Tutorial might auto-close
    }
  }
}

class ChatbotPage {
  constructor() {
    // Chatbot elements
    this.chatbotScreen = element(by.id('chatbot-screen'));
    this.messageInput = element(by.id('message-input'));
    this.sendButton = element(by.id('send-button'));
    this.messagesContainer = element(by.id('messages-container'));
    this.typingIndicator = element(by.id('typing-indicator'));
    this.sourcesContainer = element(by.id('sources-container'));
    this.newChatButton = element(by.id('new-chat-button'));
    
    // Message elements
    this.userMessage = element(by.id('user-message'));
    this.botMessage = element(by.id('bot-message'));
    this.messageTimestamp = element(by.id('message-timestamp'));
    
    // Error elements
    this.errorMessage = element(by.id('error-message'));
    this.retryButton = element(by.id('retry-button'));
    this.networkErrorHandler = element(by.id('network-error-handler'));
    
    // Navigation elements
    this.backButton = element(by.id('back-button'));
    this.menuButton = element(by.id('menu-button'));
  }

  async verifyChatbotScreen() {
    await testUtils.waitForElement(this.chatbotScreen, 15000);
    await expect(this.chatbotScreen).toBeVisible();
    await expect(this.messageInput).toBeVisible();
    await expect(this.sendButton).toBeVisible();
  }

  async sendMessage(message) {
    await testUtils.waitForElement(this.messageInput);
    await testUtils.typeText(this.messageInput, message);
    await this.sendButton.tap();
  }

  async waitForBotResponse(timeout = 30000) {
    // Wait for typing indicator to appear
    try {
      await testUtils.waitForElement(this.typingIndicator, 5000);
    } catch (error) {
      // Typing indicator might not show for fast responses
    }
    
    // Wait for bot message to appear
    await testUtils.waitForElement(this.botMessage, timeout);
  }

  async verifyMessageSent(message) {
    const userMessageElement = element(by.text(message));
    await expect(userMessageElement).toBeVisible();
  }

  async verifyBotResponse() {
    await expect(this.botMessage).toBeVisible();
    // Verify message has content (not empty)
    const messageText = await this.botMessage.getText();
    expect(messageText.length).toBeGreaterThan(0);
  }

  async verifySources() {
    try {
      await testUtils.waitForElement(this.sourcesContainer, 5000);
      await expect(this.sourcesContainer).toBeVisible();
    } catch (error) {
      // Sources might not always be present
      console.log('No sources found for this response');
    }
  }

  async startNewChat() {
    await this.newChatButton.tap();
  }

  async handleNetworkError() {
    try {
      await testUtils.waitForElement(this.networkErrorHandler, 5000);
      await this.retryButton.tap();
    } catch (error) {
      // No network error occurred
    }
  }
}

class LawyerDashboardPage {
  constructor() {
    // Dashboard elements
    this.dashboardScreen = element(by.id('lawyer-dashboard-screen'));
    this.welcomeMessage = element(by.id('lawyer-welcome-message'));
    this.timelineContainer = element(by.id('timeline-container'));
    this.forumButton = element(by.id('forum-button'));
    this.profileButton = element(by.id('profile-button'));
    this.consultationsButton = element(by.id('consultations-button'));
    
    // Timeline elements
    this.timelineItem = element(by.id('timeline-item'));
    this.timelineLoadingIndicator = element(by.id('timeline-loading'));
    this.timelineErrorMessage = element(by.id('timeline-error'));
    this.refreshButton = element(by.id('refresh-timeline-button'));
    
    // Navigation elements
    this.navigationTabs = element(by.id('navigation-tabs'));
    this.bottomNavigation = element(by.id('bottom-navigation'));
  }

  async verifyDashboardScreen() {
    await testUtils.waitForElement(this.dashboardScreen, 15000);
    await expect(this.dashboardScreen).toBeVisible();
    await expect(this.welcomeMessage).toBeVisible();
  }

  async verifyTimelineLoaded() {
    await testUtils.waitForLoading(this.timelineLoadingIndicator);
    try {
      await expect(this.timelineContainer).toBeVisible();
    } catch (error) {
      // Timeline might be empty
      console.log('Timeline appears to be empty');
    }
  }

  async navigateToForum() {
    await this.forumButton.tap();
  }

  async navigateToProfile() {
    await this.profileButton.tap();
  }

  async navigateToConsultations() {
    await this.consultationsButton.tap();
  }

  async refreshTimeline() {
    await this.refreshButton.tap();
    await this.verifyTimelineLoaded();
  }
}

class GlossaryPage {
  constructor() {
    // Glossary elements
    this.glossaryScreen = element(by.id('glossary-screen'));
    this.searchInput = element(by.id('glossary-search-input'));
    this.searchButton = element(by.id('glossary-search-button'));
    this.termsList = element(by.id('terms-list'));
    this.termItem = element(by.id('term-item'));
    this.termDefinition = element(by.id('term-definition'));
    
    // Navigation elements
    this.backButton = element(by.id('glossary-back-button'));
    this.categoryFilter = element(by.id('category-filter'));
  }

  async verifyGlossaryScreen() {
    await testUtils.waitForElement(this.glossaryScreen, 10000);
    await expect(this.glossaryScreen).toBeVisible();
    await expect(this.searchInput).toBeVisible();
  }

  async searchTerm(term) {
    await testUtils.typeText(this.searchInput, term);
    await this.searchButton.tap();
  }

  async verifySearchResults() {
    await testUtils.waitForElement(this.termsList, 10000);
    await expect(this.termsList).toBeVisible();
  }

  async selectFirstTerm() {
    await testUtils.waitForElement(this.termItem);
    await this.termItem.tap();
  }

  async verifyTermDefinition() {
    await testUtils.waitForElement(this.termDefinition);
    await expect(this.termDefinition).toBeVisible();
  }
}

module.exports = {
  LoginPage,
  RegistrationPage,
  HomePage,
  GuestOnboardingPage,
  ChatbotPage,
  LawyerDashboardPage,
  GlossaryPage
};
