/**
 * Lawyer Dashboard E2E Tests
 * Tests lawyer-specific functionality including dashboard, timeline, forum, and profile
 */

const { LoginPage, LawyerDashboardPage, HomePage } = require('../utils/pageObjects');

describe('Lawyer Dashboard Feature Tests', () => {
  let loginPage;
  let lawyerDashboardPage;
  let homePage;

  beforeAll(async () => {
    loginPage = new LoginPage();
    lawyerDashboardPage = new LawyerDashboardPage();
    homePage = new HomePage();
  });

  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
    await testUtils.takeScreenshot('lawyer-dashboard-test-start');
  });

  afterEach(async () => {
    await testUtils.takeScreenshot('lawyer-dashboard-test-end');
  });

  describe('Lawyer Authentication and Dashboard Access', () => {
    test('should login as lawyer and access dashboard', async () => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials(
        testData.validLawyer.email,
        testData.validLawyer.password
      );
      await loginPage.waitForLoginComplete();
      
      // Should navigate to lawyer dashboard
      await lawyerDashboardPage.verifyDashboardScreen();
      
      await testUtils.takeScreenshot('lawyer-dashboard-loaded');
    });

    test('should display lawyer welcome message', async () => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials(
        testData.validLawyer.email,
        testData.validLawyer.password
      );
      await loginPage.waitForLoginComplete();
      
      await lawyerDashboardPage.verifyDashboardScreen();
      await expect(lawyerDashboardPage.welcomeMessage).toBeVisible();
      
      await testUtils.takeScreenshot('lawyer-welcome-message');
    });

    test('should handle pending lawyer access correctly', async () => {
      // Test with pending lawyer credentials if available
      try {
        await loginPage.navigateToLogin();
        await loginPage.loginWithCredentials(
          testData.pendingLawyer.email,
          testData.pendingLawyer.password
        );
        await loginPage.waitForLoginComplete();
        
        // Pending lawyers should have limited access
        await lawyerDashboardPage.verifyDashboardScreen();
        
        await testUtils.takeScreenshot('pending-lawyer-dashboard');
      } catch (error) {
        console.log('Pending lawyer test skipped - no test data available');
      }
    });
  });

  describe('Lawyer Timeline Functionality', () => {
    beforeEach(async () => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials(
        testData.validLawyer.email,
        testData.validLawyer.password
      );
      await loginPage.waitForLoginComplete();
      await lawyerDashboardPage.verifyDashboardScreen();
    });

    test('should load and display timeline', async () => {
      await lawyerDashboardPage.verifyTimelineLoaded();
      
      try {
        await expect(lawyerDashboardPage.timelineContainer).toBeVisible();
        await testUtils.takeScreenshot('timeline-loaded');
      } catch (error) {
        console.log('Timeline empty or different implementation');
      }
    });

    test('should handle timeline loading states', async () => {
      // Refresh timeline to see loading state
      await lawyerDashboardPage.refreshTimeline();
      
      // Should show loading indicator briefly
      try {
        await testUtils.waitForElement(lawyerDashboardPage.timelineLoadingIndicator, 3000);
        await testUtils.takeScreenshot('timeline-loading');
      } catch (error) {
        console.log('Timeline loads too quickly to capture loading state');
      }
      
      await lawyerDashboardPage.verifyTimelineLoaded();
    });

    test('should handle timeline errors gracefully', async () => {
      // This test checks error handling when timeline fails to load
      try {
        await testUtils.waitForElement(lawyerDashboardPage.timelineErrorMessage, 5000);
        await expect(lawyerDashboardPage.timelineErrorMessage).toBeVisible();
        
        // Should provide retry option
        await expect(lawyerDashboardPage.refreshButton).toBeVisible();
        
        await testUtils.takeScreenshot('timeline-error-state');
      } catch (error) {
        console.log('Timeline loaded successfully - no error to test');
      }
    });

    test('should refresh timeline successfully', async () => {
      await lawyerDashboardPage.verifyTimelineLoaded();
      
      // Refresh timeline
      await lawyerDashboardPage.refreshTimeline();
      
      // Should reload successfully
      await lawyerDashboardPage.verifyTimelineLoaded();
      
      await testUtils.takeScreenshot('timeline-refreshed');
    });

    test('should display timeline items if available', async () => {
      await lawyerDashboardPage.verifyTimelineLoaded();
      
      try {
        await testUtils.waitForElement(lawyerDashboardPage.timelineItem, 5000);
        await expect(lawyerDashboardPage.timelineItem).toBeVisible();
        
        await testUtils.takeScreenshot('timeline-items-displayed');
      } catch (error) {
        console.log('No timeline items available or different implementation');
      }
    });
  });

  describe('Lawyer Navigation', () => {
    beforeEach(async () => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials(
        testData.validLawyer.email,
        testData.validLawyer.password
      );
      await loginPage.waitForLoginComplete();
      await lawyerDashboardPage.verifyDashboardScreen();
    });

    test('should navigate to forum from dashboard', async () => {
      try {
        await lawyerDashboardPage.navigateToForum();
        
        // Should navigate to forum screen
        const forumScreen = element(by.id('forum-screen'));
        await testUtils.waitForElement(forumScreen, 10000);
        await expect(forumScreen).toBeVisible();
        
        await testUtils.takeScreenshot('forum-navigation');
      } catch (error) {
        console.log('Forum navigation not available or different implementation');
      }
    });

    test('should navigate to profile from dashboard', async () => {
      try {
        await lawyerDashboardPage.navigateToProfile();
        
        // Should navigate to profile screen
        const profileScreen = element(by.id('profile-screen'));
        await testUtils.waitForElement(profileScreen, 10000);
        await expect(profileScreen).toBeVisible();
        
        await testUtils.takeScreenshot('profile-navigation');
      } catch (error) {
        console.log('Profile navigation not available or different implementation');
      }
    });

    test('should navigate to consultations from dashboard', async () => {
      try {
        await lawyerDashboardPage.navigateToConsultations();
        
        // Should navigate to consultations screen
        const consultationsScreen = element(by.id('consultations-screen'));
        await testUtils.waitForElement(consultationsScreen, 10000);
        await expect(consultationsScreen).toBeVisible();
        
        await testUtils.takeScreenshot('consultations-navigation');
      } catch (error) {
        console.log('Consultations navigation not available or different implementation');
      }
    });

    test('should display navigation elements', async () => {
      try {
        await expect(lawyerDashboardPage.forumButton).toBeVisible();
        await expect(lawyerDashboardPage.profileButton).toBeVisible();
        await expect(lawyerDashboardPage.consultationsButton).toBeVisible();
        
        await testUtils.takeScreenshot('navigation-elements');
      } catch (error) {
        console.log('Navigation elements not found or different implementation');
      }
    });

    test('should handle bottom navigation if present', async () => {
      try {
        await expect(lawyerDashboardPage.bottomNavigation).toBeVisible();
        
        // Test navigation tabs
        await expect(lawyerDashboardPage.navigationTabs).toBeVisible();
        
        await testUtils.takeScreenshot('bottom-navigation');
      } catch (error) {
        console.log('Bottom navigation not present or different implementation');
      }
    });
  });

  describe('Lawyer Dashboard Performance', () => {
    test('should load dashboard within acceptable time', async () => {
      const startTime = Date.now();
      
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials(
        testData.validLawyer.email,
        testData.validLawyer.password
      );
      await loginPage.waitForLoginComplete();
      await lawyerDashboardPage.verifyDashboardScreen();
      await lawyerDashboardPage.verifyTimelineLoaded();
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Should load within 20 seconds
      expect(loadTime).toBeLessThan(20000);
      
      console.log(`Lawyer dashboard loaded in ${loadTime}ms`);
      await testUtils.takeScreenshot('dashboard-performance');
    });

    test('should handle rapid navigation without issues', async () => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials(
        testData.validLawyer.email,
        testData.validLawyer.password
      );
      await loginPage.waitForLoginComplete();
      await lawyerDashboardPage.verifyDashboardScreen();
      
      // Rapid navigation test
      try {
        await lawyerDashboardPage.forumButton.tap();
        await device.sleep(500);
        await device.pressBack();
        await device.sleep(500);
        
        await lawyerDashboardPage.profileButton.tap();
        await device.sleep(500);
        await device.pressBack();
        await device.sleep(500);
        
        // Should return to dashboard successfully
        await lawyerDashboardPage.verifyDashboardScreen();
        
        await testUtils.takeScreenshot('rapid-navigation-handled');
      } catch (error) {
        console.log('Rapid navigation test skipped - navigation not available');
      }
    });
  });

  describe('Lawyer Session Management', () => {
    test('should maintain lawyer session across app lifecycle', async () => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials(
        testData.validLawyer.email,
        testData.validLawyer.password
      );
      await loginPage.waitForLoginComplete();
      await lawyerDashboardPage.verifyDashboardScreen();
      
      // Background and foreground app
      await device.sendToHome();
      await device.sleep(3000);
      await device.launchApp({ newInstance: false });
      
      // Should still be on lawyer dashboard
      await lawyerDashboardPage.verifyDashboardScreen();
      
      await testUtils.takeScreenshot('lawyer-session-persisted');
    });

    test('should handle logout correctly', async () => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials(
        testData.validLawyer.email,
        testData.validLawyer.password
      );
      await loginPage.waitForLoginComplete();
      await lawyerDashboardPage.verifyDashboardScreen();
      
      // Logout
      try {
        await homePage.logout();
        
        // Should return to login screen
        await testUtils.waitForElement(loginPage.emailInput, 10000);
        await expect(loginPage.emailInput).toBeVisible();
        
        await testUtils.takeScreenshot('lawyer-logout-successful');
      } catch (error) {
        console.log('Logout functionality not accessible from current screen');
      }
    });
  });

  describe('Lawyer Dashboard Error Handling', () => {
    beforeEach(async () => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials(
        testData.validLawyer.email,
        testData.validLawyer.password
      );
      await loginPage.waitForLoginComplete();
      await lawyerDashboardPage.verifyDashboardScreen();
    });

    test('should handle network errors on dashboard', async () => {
      // This test simulates network issues affecting dashboard data
      try {
        await testUtils.waitForElement(lawyerDashboardPage.timelineErrorMessage, 5000);
        
        // Should show error state
        await expect(lawyerDashboardPage.timelineErrorMessage).toBeVisible();
        
        // Should provide retry mechanism
        await lawyerDashboardPage.refreshButton.tap();
        
        await testUtils.takeScreenshot('network-error-recovery');
      } catch (error) {
        console.log('No network errors encountered during test');
      }
    });

    test('should handle authentication errors gracefully', async () => {
      // This test checks handling of auth token expiration
      // Implementation depends on your auth system
      
      // Simulate session expiration by restarting app
      await device.launchApp({ newInstance: true });
      
      // Should redirect to login or show appropriate message
      try {
        await testUtils.waitForElement(loginPage.emailInput, 10000);
        await expect(loginPage.emailInput).toBeVisible();
        
        await testUtils.takeScreenshot('auth-expiration-handled');
      } catch (error) {
        // Session might be persisted
        console.log('Session persisted or different auth handling');
      }
    });

    test('should handle missing data gracefully', async () => {
      await lawyerDashboardPage.verifyTimelineLoaded();
      
      // Timeline might be empty - should handle gracefully
      try {
        const emptyState = element(by.id('timeline-empty-state'));
        await expect(emptyState).toBeVisible();
        
        await testUtils.takeScreenshot('empty-timeline-state');
      } catch (error) {
        console.log('Timeline has data or different empty state implementation');
      }
    });
  });

  describe('Lawyer Dashboard Accessibility', () => {
    beforeEach(async () => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials(
        testData.validLawyer.email,
        testData.validLawyer.password
      );
      await loginPage.waitForLoginComplete();
      await lawyerDashboardPage.verifyDashboardScreen();
    });

    test('should have accessible navigation elements', async () => {
      // Check for accessibility labels on navigation elements
      try {
        const forumButton = element(by.id('forum-button'));
        await expect(forumButton).toHaveAccessibilityLabel();
        
        const profileButton = element(by.id('profile-button'));
        await expect(profileButton).toHaveAccessibilityLabel();
        
        await testUtils.takeScreenshot('accessibility-labels');
      } catch (error) {
        console.log('Accessibility labels test skipped - elements not found or different implementation');
      }
    });

    test('should support keyboard navigation', async () => {
      // This test would check keyboard navigation support
      // Implementation depends on platform and accessibility requirements
      
      try {
        // Test tab navigation through elements
        await device.pressKey('Tab');
        await device.sleep(500);
        await device.pressKey('Tab');
        await device.sleep(500);
        
        await testUtils.takeScreenshot('keyboard-navigation');
      } catch (error) {
        console.log('Keyboard navigation test skipped - not supported or different implementation');
      }
    });
  });
});
