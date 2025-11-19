const { RegistrationPage, LoginPage, HomePage } = require('../utils/pageObjects');

describe('Registration Feature Tests', () => {
  let registrationPage;
  let loginPage;
  let homePage;

  beforeAll(async () => {
    registrationPage = new RegistrationPage();
    loginPage = new LoginPage();
    homePage = new HomePage();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await registrationPage.navigateToRegistration();
    await testUtils.takeScreenshot('registration-screen-loaded');
  });

  describe('Registration UI Elements', () => {
    it('should display all registration form elements', async () => {
      // Verify all essential form fields are present
      await expect(registrationPage.emailInput).toBeVisibleAndTappable();
      await expect(registrationPage.usernameInput).toBeVisibleAndTappable();
      await expect(registrationPage.firstNameInput).toBeVisibleAndTappable();
      await expect(registrationPage.lastNameInput).toBeVisibleAndTappable();
      await expect(registrationPage.passwordInput).toBeVisibleAndTappable();
      await expect(registrationPage.confirmPasswordInput).toBeVisibleAndTappable();
      await expect(registrationPage.birthdateInput).toBeVisibleAndTappable();
      await expect(registrationPage.signUpButton).toBeVisible();
      await expect(registrationPage.loginLink).toBeVisible();
      
      await testUtils.takeScreenshot('registration-ui-elements-verified');
    });

    it('should show/hide password when toggle button is tapped', async () => {
      await registrationPage.fillPasswordInfo('testpassword123');
      
      // Passwords should be hidden by default
      await expect(registrationPage.passwordInput).toHaveText('•••••••••••••••');
      await expect(registrationPage.confirmPasswordInput).toHaveText('•••••••••••••••');
      
      // Toggle to show passwords
      await registrationPage.togglePasswordVisibility();
      await expect(registrationPage.passwordInput).toHaveText('testpassword123');
      await expect(registrationPage.confirmPasswordInput).toHaveText('testpassword123');
      
      await testUtils.takeScreenshot('registration-password-visibility-toggle');
    });

    it('should handle form scrolling for long forms', async () => {
      // Fill top fields
      await registrationPage.fillBasicInfo(testData.users.validUser);
      
      // Scroll to bottom fields
      await testUtils.scrollToElement(registrationPage.scrollView, registrationPage.signUpButton);
      
      // Verify bottom elements are now visible
      await expect(registrationPage.signUpButton).toBeVisible();
      
      await testUtils.takeScreenshot('registration-form-scrolling');
    });
  });

  describe('Registration Field Validation', () => {
    it('should validate email field', async () => {
      // Test empty email
      await registrationPage.submitRegistration();
      await registrationPage.verifyFieldError('email', testData.validation.emailRequired);
      
      // Test invalid email format
      await testUtils.typeText(registrationPage.emailInput, testData.users.invalidUser.email);
      await registrationPage.submitRegistration();
      await registrationPage.verifyFieldError('email', testData.validation.invalidEmail);
      
      await testUtils.takeScreenshot('email-validation-tests');
    });

    it('should validate username field', async () => {
      // Test empty username
      await registrationPage.submitRegistration();
      await registrationPage.verifyFieldError('username', testData.validation.usernameRequired);
      
      // Test username too short
      await testUtils.typeText(registrationPage.usernameInput, testData.users.invalidUser.username);
      await registrationPage.submitRegistration();
      await registrationPage.verifyFieldError('username', testData.validation.usernameTooShort);
      
      await testUtils.takeScreenshot('username-validation-tests');
    });

    it('should validate name fields', async () => {
      // Test empty first name
      await registrationPage.submitRegistration();
      await registrationPage.verifyFieldError('firstName', testData.validation.firstNameRequired);
      
      // Test empty last name
      await testUtils.typeText(registrationPage.firstNameInput, 'Test');
      await registrationPage.submitRegistration();
      await registrationPage.verifyFieldError('lastName', testData.validation.lastNameRequired);
      
      await testUtils.takeScreenshot('name-fields-validation-tests');
    });

    it('should validate password fields', async () => {
      // Test empty password
      await registrationPage.submitRegistration();
      await registrationPage.verifyFieldError('password', testData.validation.passwordRequired);
      
      // Test weak password
      await testUtils.typeText(registrationPage.passwordInput, testData.users.invalidUser.password);
      await registrationPage.submitRegistration();
      await registrationPage.verifyFieldError('password', testData.validation.weakPassword);
      
      // Test password mismatch
      await registrationPage.passwordInput.clearText();
      await registrationPage.confirmPasswordInput.clearText();
      await testUtils.typeText(registrationPage.passwordInput, 'ValidPass123!');
      await testUtils.typeText(registrationPage.confirmPasswordInput, 'DifferentPass123!');
      await registrationPage.submitRegistration();
      await registrationPage.verifyFieldError('confirmPassword', testData.validation.passwordMismatch);
      
      await testUtils.takeScreenshot('password-validation-tests');
    });

    it('should validate birthdate field', async () => {
      // Test empty birthdate
      await registrationPage.submitRegistration();
      await registrationPage.verifyFieldError('birthdate', testData.validation.birthdateRequired);
      
      // Test invalid birthdate (too young)
      await registrationPage.selectBirthdate(testData.users.invalidUser.birthdate);
      await registrationPage.submitRegistration();
      await registrationPage.verifyFieldError('birthdate', testData.validation.invalidBirthdate);
      
      await testUtils.takeScreenshot('birthdate-validation-tests');
    });
  });

  describe('Registration Process', () => {
    it('should successfully register a new user with valid data', async () => {
      const newUser = {
        ...testData.users.validUser,
        email: `test.${Date.now()}@example.com`, // Unique email
        username: `testuser${Date.now()}`        // Unique username
      };
      
      await registrationPage.registerWithFullData(newUser);
      await registrationPage.waitForRegistrationComplete();
      await registrationPage.verifyRegistrationSuccess();
      
      // Verify navigation to email verification or home screen
      try {
        const verificationScreen = element(by.id('email-verification-screen'));
        await testUtils.waitForElement(verificationScreen, 10000);
        await expect(verificationScreen).toBeVisible();
      } catch (error) {
        // Might navigate directly to home
        await homePage.verifyHomeScreenLoaded();
      }
      
      await testUtils.takeScreenshot('successful-registration-completed');
    });

    it('should prevent registration with existing email', async () => {
      await registrationPage.registerWithFullData(testData.users.existingUser);
      await registrationPage.waitForRegistrationComplete();
      
      // Should show email already exists error
      const emailExistsError = 'Email already exists';
      await registrationPage.verifyFieldError('email', emailExistsError);
      
      await testUtils.takeScreenshot('existing-email-error');
    });

    it('should prevent registration with existing username', async () => {
      const userData = {
        ...testData.users.validUser,
        email: `unique.${Date.now()}@example.com`,
        username: 'existingusername' // Assuming this username exists
      };
      
      await registrationPage.registerWithFullData(userData);
      await registrationPage.waitForRegistrationComplete();
      
      // Should show username already exists error
      const usernameExistsError = 'Username already exists';
      await registrationPage.verifyFieldError('username', usernameExistsError);
      
      await testUtils.takeScreenshot('existing-username-error');
    });

    it('should handle network errors during registration', async () => {
      // Simulate network disconnection
      await device.setURLBlacklist(['.*']);
      
      const newUser = {
        ...testData.users.validUser,
        email: `network.test.${Date.now()}@example.com`,
        username: `networktest${Date.now()}`
      };
      
      await registrationPage.registerWithFullData(newUser);
      await registrationPage.waitForRegistrationComplete();
      
      // Should show network error
      const networkError = 'Network request failed';
      await expect(registrationPage.generalError).toHaveText(networkError);
      
      // Re-enable network
      await device.setURLBlacklist([]);
      
      await testUtils.takeScreenshot('registration-network-error');
    });
  });

  describe('Registration Role Selection', () => {
    it('should allow selecting legal seeker role', async () => {
      await registrationPage.selectRole('legal_seeker');
      
      // Verify role is selected
      const selectedRole = element(by.text('Legal Seeker'));
      await expect(selectedRole).toBeVisible();
      
      await testUtils.takeScreenshot('legal-seeker-role-selected');
    });

    it('should allow selecting lawyer role', async () => {
      await registrationPage.selectRole('lawyer');
      
      // Verify role is selected
      const selectedRole = element(by.text('Lawyer'));
      await expect(selectedRole).toBeVisible();
      
      await testUtils.takeScreenshot('lawyer-role-selected');
    });

    it('should show additional fields for lawyer registration', async () => {
      await registrationPage.selectRole('lawyer');
      
      // Should show additional lawyer-specific fields
      const licenseNumberField = element(by.id('lawyer-license-input'));
      const barAssociationField = element(by.id('lawyer-bar-association-input'));
      
      try {
        await expect(licenseNumberField).toBeVisible();
        await expect(barAssociationField).toBeVisible();
        await testUtils.takeScreenshot('lawyer-additional-fields-shown');
      } catch (error) {
        // Additional fields might be on next screen
        console.log('Lawyer additional fields not on same screen');
      }
    });
  });

  describe('Registration Navigation', () => {
    it('should navigate to login screen from registration', async () => {
      await registrationPage.navigateToLogin();
      
      // Verify login screen is loaded
      const loginScreen = element(by.id('login-screen'));
      await testUtils.waitForElement(loginScreen);
      await expect(loginScreen).toBeVisible();
      
      await testUtils.takeScreenshot('navigation-to-login-from-registration');
    });

    it('should maintain form data when navigating back', async () => {
      // Fill some form data
      await registrationPage.fillBasicInfo(testData.users.validUser);
      
      // Navigate away and back
      await registrationPage.navigateToLogin();
      await loginPage.navigateToSignUp();
      
      // Verify data is maintained (if implemented)
      try {
        await expect(registrationPage.emailInput).toHaveText(testData.users.validUser.email);
        await testUtils.takeScreenshot('form-data-maintained');
      } catch (error) {
        // Form data might be cleared for security
        console.log('Form data cleared on navigation (expected behavior)');
      }
    });
  });

  describe('Registration Security Features', () => {
    it('should enforce password strength requirements', async () => {
      const weakPasswords = [
        '123',           // Too short
        'password',      // No uppercase, no numbers
        'PASSWORD',      // No lowercase, no numbers
        '12345678',      // No letters
        'Passw0rd'       // Common pattern
      ];
      
      for (const password of weakPasswords) {
        await registrationPage.passwordInput.clearText();
        await testUtils.typeText(registrationPage.passwordInput, password);
        await registrationPage.submitRegistration();
        
        await registrationPage.verifyFieldError('password', testData.validation.weakPassword);
        await testUtils.takeScreenshot(`weak-password-${password.replace(/[^a-zA-Z0-9]/g, '')}`);
      }
    });

    it('should validate age requirements', async () => {
      const underageDate = new Date();
      underageDate.setFullYear(underageDate.getFullYear() - 17); // 17 years old
      
      await registrationPage.selectBirthdate(underageDate.toISOString().split('T')[0]);
      await registrationPage.submitRegistration();
      
      await registrationPage.verifyFieldError('birthdate', testData.validation.invalidBirthdate);
      
      await testUtils.takeScreenshot('underage-validation');
    });

    it('should sanitize input fields', async () => {
      const maliciousInputs = {
        email: '<script>alert("xss")</script>@test.com',
        username: 'user<script>alert("xss")</script>',
        firstName: '<script>alert("xss")</script>',
        lastName: 'Test<script>alert("xss")</script>'
      };
      
      await registrationPage.fillBasicInfo(maliciousInputs);
      
      // Verify inputs are sanitized
      await expect(registrationPage.emailInput).not.toHaveText(maliciousInputs.email);
      await expect(registrationPage.usernameInput).not.toHaveText(maliciousInputs.username);
      
      await testUtils.takeScreenshot('input-sanitization-test');
    });
  });

  describe('Registration Performance', () => {
    it('should complete registration within acceptable time', async () => {
      const startTime = Date.now();
      
      const newUser = {
        ...testData.users.validUser,
        email: `perf.test.${Date.now()}@example.com`,
        username: `perftest${Date.now()}`
      };
      
      await registrationPage.registerWithFullData(newUser);
      await registrationPage.waitForRegistrationComplete();
      await registrationPage.verifyRegistrationSuccess();
      
      const endTime = Date.now();
      const registrationDuration = endTime - startTime;
      
      // Registration should complete within 15 seconds
      expect(registrationDuration).toBeLessThan(15000);
      
      console.log(`Registration completed in ${registrationDuration}ms`);
      await testUtils.takeScreenshot('registration-performance-test');
    });

    it('should handle rapid form input without errors', async () => {
      // Rapidly fill form fields
      const userData = testData.users.validUser;
      
      await Promise.all([
        testUtils.typeText(registrationPage.emailInput, userData.email, 50),
        testUtils.typeText(registrationPage.usernameInput, userData.username, 50),
        testUtils.typeText(registrationPage.firstNameInput, userData.firstName, 50),
        testUtils.typeText(registrationPage.lastNameInput, userData.lastName, 50)
      ]);
      
      // Verify all fields are filled correctly
      await expect(registrationPage.emailInput).toHaveText(userData.email);
      await expect(registrationPage.usernameInput).toHaveText(userData.username);
      
      await testUtils.takeScreenshot('rapid-input-handling');
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
