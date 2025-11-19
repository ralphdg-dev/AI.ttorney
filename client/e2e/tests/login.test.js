const { LoginPage, HomePage } = require('../utils/pageObjects');

describe('Login Feature Tests', () => {
  let loginPage;
  let homePage;

  beforeAll(async () => {
    loginPage = new LoginPage();
    homePage = new HomePage();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await loginPage.navigateToLogin();
    await testUtils.takeScreenshot('login-screen-loaded');
  });

  describe('Login UI Elements', () => {
    it('should display all login form elements', async () => {
      // Verify all essential elements are present
      await expect(loginPage.emailInput).toBeVisibleAndTappable();
      await expect(loginPage.passwordInput).toBeVisibleAndTappable();
      await expect(loginPage.loginButton).toBeVisibleAndTappable();
      await expect(loginPage.forgotPasswordLink).toBeVisible();
      await expect(loginPage.signUpLink).toBeVisible();
      
      await testUtils.takeScreenshot('login-ui-elements-verified');
    });

    it('should show/hide password when toggle button is tapped', async () => {
      await loginPage.enterPassword('testpassword');
      
      // Password should be hidden by default
      await expect(loginPage.passwordInput).toHaveText('••••••••••••');
      
      // Toggle to show password
      await loginPage.togglePasswordVisibility();
      await expect(loginPage.passwordInput).toHaveText('testpassword');
      
      // Toggle to hide password again
      await loginPage.togglePasswordVisibility();
      await expect(loginPage.passwordInput).toHaveText('••••••••••••');
      
      await testUtils.takeScreenshot('password-visibility-toggle-tested');
    });
  });

  describe('Login Validation', () => {
    it('should show error for empty email field', async () => {
      await loginPage.enterPassword(testData.users.validUser.password);
      await loginPage.submitLogin();
      
      await loginPage.verifyLoginError(testData.validation.emailRequired);
      await testUtils.takeScreenshot('empty-email-validation');
    });

    it('should show error for empty password field', async () => {
      await loginPage.enterEmail(testData.users.validUser.email);
      await loginPage.submitLogin();
      
      await loginPage.verifyLoginError(testData.validation.passwordRequired);
      await testUtils.takeScreenshot('empty-password-validation');
    });

    it('should show error for invalid email format', async () => {
      await loginPage.enterEmail(testData.users.invalidUser.email);
      await loginPage.enterPassword(testData.users.validUser.password);
      await loginPage.submitLogin();
      
      await loginPage.verifyLoginError(testData.validation.invalidEmail);
      await testUtils.takeScreenshot('invalid-email-format-validation');
    });

    it('should show error for both empty fields', async () => {
      await loginPage.submitLogin();
      
      // Should show error for email (first validation)
      await loginPage.verifyLoginError(testData.validation.emailRequired);
      await testUtils.takeScreenshot('both-fields-empty-validation');
    });
  });

  describe('Login Authentication', () => {
    it('should successfully login with valid credentials', async () => {
      await loginPage.loginWithCredentials(
        testData.users.validUser.email,
        testData.users.validUser.password
      );
      
      await loginPage.waitForLoginComplete();
      await loginPage.verifyLoginSuccess();
      
      // Verify navigation to home screen
      await homePage.verifyHomeScreenLoaded();
      await homePage.verifyUserLoggedIn(testData.users.validUser.username);
      
      await testUtils.takeScreenshot('successful-login-completed');
    });

    it('should show error for invalid credentials', async () => {
      await loginPage.loginWithCredentials(
        'nonexistent@example.com',
        'wrongpassword123'
      );
      
      await loginPage.waitForLoginComplete();
      
      // Should show authentication error
      const authError = 'Invalid email or password';
      await loginPage.verifyLoginError(authError);
      
      await testUtils.takeScreenshot('invalid-credentials-error');
    });

    it('should show error for non-existent user', async () => {
      await loginPage.loginWithCredentials(
        'nonexistent@example.com',
        testData.users.validUser.password
      );
      
      await loginPage.waitForLoginComplete();
      
      const userNotFoundError = 'User not found';
      await loginPage.verifyLoginError(userNotFoundError);
      
      await testUtils.takeScreenshot('user-not-found-error');
    });

    it('should handle network errors gracefully', async () => {
      // Simulate network disconnection
      await device.setURLBlacklist(['.*']);
      
      await loginPage.loginWithCredentials(
        testData.users.validUser.email,
        testData.users.validUser.password
      );
      
      await loginPage.waitForLoginComplete();
      
      // Should show network error
      const networkError = 'Network request failed';
      await loginPage.verifyLoginError(networkError);
      
      // Re-enable network
      await device.setURLBlacklist([]);
      
      await testUtils.takeScreenshot('network-error-handling');
    });
  });

  describe('Login Navigation', () => {
    it('should navigate to forgot password screen', async () => {
      await loginPage.navigateToForgotPassword();
      
      // Verify forgot password screen is loaded
      const forgotPasswordScreen = element(by.id('forgot-password-screen'));
      await testUtils.waitForElement(forgotPasswordScreen);
      await expect(forgotPasswordScreen).toBeVisible();
      
      await testUtils.takeScreenshot('forgot-password-navigation');
    });

    it('should navigate to registration screen', async () => {
      await loginPage.navigateToSignUp();
      
      // Verify registration screen is loaded
      const registrationScreen = element(by.id('registration-screen'));
      await testUtils.waitForElement(registrationScreen);
      await expect(registrationScreen).toBeVisible();
      
      await testUtils.takeScreenshot('registration-navigation');
    });
  });

  describe('Login Security Features', () => {
    it('should handle multiple failed login attempts', async () => {
      const maxAttempts = 5;
      
      for (let i = 0; i < maxAttempts; i++) {
        await loginPage.loginWithCredentials(
          testData.users.validUser.email,
          'wrongpassword'
        );
        
        await loginPage.waitForLoginComplete();
        await testUtils.takeScreenshot(`failed-attempt-${i + 1}`);
        
        // Clear fields for next attempt
        await loginPage.emailInput.clearText();
        await loginPage.passwordInput.clearText();
      }
      
      // After max attempts, should show lockout message
      await loginPage.loginWithCredentials(
        testData.users.validUser.email,
        'wrongpassword'
      );
      
      const lockoutError = 'Too many failed attempts';
      await loginPage.verifyLoginError(lockoutError);
      
      await testUtils.takeScreenshot('account-lockout-security');
    });

    it('should clear sensitive data on app backgrounding', async () => {
      await loginPage.enterEmail(testData.users.validUser.email);
      await loginPage.enterPassword(testData.users.validUser.password);
      
      // Background and foreground app
      await device.sendToHome();
      await device.launchApp({ newInstance: false });
      
      // Verify fields are cleared for security
      await expect(loginPage.emailInput).toHaveText('');
      await expect(loginPage.passwordInput).toHaveText('');
      
      await testUtils.takeScreenshot('security-data-clearing');
    });
  });

  describe('Login Accessibility', () => {
    it('should support accessibility features', async () => {
      // Verify accessibility labels are present
      await expect(loginPage.emailInput).toHaveAccessibilityLabel('Email input field');
      await expect(loginPage.passwordInput).toHaveAccessibilityLabel('Password input field');
      await expect(loginPage.loginButton).toHaveAccessibilityLabel('Login button');
      
      await testUtils.takeScreenshot('accessibility-features-verified');
    });

    it('should support keyboard navigation', async () => {
      // Test tab navigation between fields
      await loginPage.emailInput.tap();
      
      // Simulate tab key press (if supported)
      // This depends on the testing framework capabilities
      
      await testUtils.takeScreenshot('keyboard-navigation-tested');
    });
  });

  describe('Login Performance', () => {
    it('should complete login within acceptable time', async () => {
      const startTime = Date.now();
      
      await loginPage.loginWithCredentials(
        testData.users.validUser.email,
        testData.users.validUser.password
      );
      
      await loginPage.waitForLoginComplete();
      await homePage.verifyHomeScreenLoaded();
      
      const endTime = Date.now();
      const loginDuration = endTime - startTime;
      
      // Login should complete within 10 seconds
      expect(loginDuration).toBeLessThan(10000);
      
      console.log(`Login completed in ${loginDuration}ms`);
      await testUtils.takeScreenshot('login-performance-test');
    });
  });

  afterEach(async () => {
    // Cleanup: logout if logged in
    try {
      await homePage.logout();
    } catch (error) {
      // User might not be logged in
    }
    
    // Reset app state
    await device.reloadReactNative();
  });
});
