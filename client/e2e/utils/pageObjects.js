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

module.exports = {
  LoginPage,
  RegistrationPage,
  HomePage
};
