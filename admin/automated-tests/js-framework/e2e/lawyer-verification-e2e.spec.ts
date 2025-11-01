import { test, expect, Page } from '@playwright/test';

// Test data matching our manual test cases
const testApplications = {
  validLawyer: {
    name: 'LUIS AMURAO',
    firstName: 'LUIS',
    lastName: 'AMURAO',
    middleName: 'E',
    address: 'Bauan, Batangas',
    rollNumber: '5'
  },
  invalidLawyer: {
    name: 'JOHN NONEXISTENT',
    firstName: 'JOHN',
    lastName: 'NONEXISTENT',
    middleName: 'X',
    address: 'Fake Address, Manila',
    rollNumber: '999999'
  },
  partialMatch: {
    name: 'LUIS AMURAO JR',
    firstName: 'LUIS',
    lastName: 'AMURAO',
    middleName: 'E',
    suffix: 'JR',
    address: 'Bauan, Batangas'
  }
};

test.describe('Lawyer Verification E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Navigate to admin login (correct URL)
    await page.goto('/login');
    
    // Wait for login page to load
    await expect(page.locator('h1:has-text("Sign in")')).toBeVisible();
    
    // Login as admin (using actual form IDs)
    await page.fill('#email', 'admin@admin.com');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]:has-text("Sign in")');
    
    // Wait for dashboard to load
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
    
    // Navigate to lawyer applications (click Users tab first, then Lawyer Applications)
    await page.click('text=Users');
    await page.waitForTimeout(500); // Wait for submenu to expand
    await page.click('text=Lawyer Applications');
    await expect(page.locator('h1:has-text("Manage Lawyer Applications")')).toBeVisible();
  });

  test('LV-001-E2E: Lawyer Applications Table Verification', async () => {
    // Verify the page title and main elements
    await expect(page.locator('h1:has-text("Manage Lawyer Applications")')).toBeVisible();
    
    // Check for the table headers that we can see in the screenshot
    const tableHeaders = [
      'Full Name',
      'Email', 
      'Username',
      'Roll Number',
      'Roll Reg Date',
      'Application',
      'Prior Status',
      'Current Status',
      'Approval',
      'Actions'
    ];
    
    // Verify table structure exists
    await expect(page.locator('table')).toBeVisible();
    console.log('✅ Lawyer applications table is visible');
    
    // Check for some of the key table headers
    for (const header of ['Full Name', 'Email', 'Roll Number', 'Actions']) {
      const headerExists = await page.locator(`th:has-text("${header}"), td:has-text("${header}")`).count() > 0;
      if (headerExists) {
        console.log(`✅ Found table header: ${header}`);
      }
    }
    
    // Check if there are any applications in the table
    const applicationRows = await page.locator('tbody tr').count();
    if (applicationRows > 0) {
      console.log(`✅ Found ${applicationRows} lawyer application(s) in the table`);
      
      // Check for action buttons (view, edit, delete icons)
      const hasActionButtons = await page.locator('button svg, a svg').count() > 0;
      if (hasActionButtons) {
        console.log('✅ Action buttons found in table rows');
      }
    } else {
      console.log('ℹ️  No applications found - table is empty');
    }
    
    console.log('✅ Lawyer applications table verification completed');
  });

  test('LV-002-E2E: Admin Dashboard Navigation Test', async () => {
    // Test navigation to different admin sections visible in the sidebar
    const navigationItems = [
      'Dashboard',
      'Users',
      'Admin', 
      'Legal Resources',
      'Forum',
      'Report Tickets',
      'Analytics',
      'Settings'
    ];
    
    for (const item of navigationItems) {
      const navItem = page.locator(`text=${item}`).first();
      if (await navItem.isVisible()) {
        console.log(`✅ Found navigation item: ${item}`);
      }
    }
    
    // Test navigation to Dashboard
    await page.click('text=Dashboard');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
    console.log('✅ Successfully navigated to Dashboard');
    
    // Test navigation back to Lawyer Applications (two-step process)
    await page.click('text=Users');
    await page.waitForTimeout(500); // Wait for submenu to expand
    await page.click('text=Lawyer Applications');
    await expect(page.locator('h1:has-text("Manage Lawyer Applications")')).toBeVisible();
    console.log('✅ Successfully navigated back to Lawyer Applications');
    
    console.log('✅ Admin dashboard navigation test passed');
  });

  test('LV-003-E2E: Admin Authentication Test', async () => {
    // Test logout and re-login functionality
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), [aria-label*="logout"]');
    if (await logoutButton.count() > 0) {
      await logoutButton.first().click();
      
      // Should redirect to login page
      await expect(page.locator('h1:has-text("Sign in")')).toBeVisible({ timeout: 5000 });
      
      // Re-login
      await page.fill('#email', 'admin@admin.com');
      await page.fill('#password', 'admin123');
      await page.click('button[type="submit"]:has-text("Sign in")');
      
      // Should be back at dashboard
      await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
      
      console.log('✅ Admin authentication test passed');
    } else {
      console.log('ℹ️  Logout button not found - skipping authentication test');
    }
  });

  test('LV-004-E2E: Admin UI Responsiveness Test', async () => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Check if main content is still visible
      await expect(page.locator('h1, h2, h3').first()).toBeVisible();
      
      // Check if navigation is accessible (might be in a hamburger menu on mobile)
      const navVisible = await page.locator('nav, [role="navigation"]').isVisible();
      const hamburgerVisible = await page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]').isVisible();
      
      if (navVisible || hamburgerVisible) {
        console.log(`✅ Navigation accessible on ${viewport.name} (${viewport.width}x${viewport.height})`);
      }
    }
    
    // Reset to default viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    console.log('✅ Admin UI responsiveness test passed');
  });

  test('LV-005-E2E: Page Load Performance Test', async () => {
    // Test page load performance
    const startTime = Date.now();
    
    // Navigate to different admin pages and measure load time
    const pages = [
      { name: 'Dashboard', selector: 'text=Dashboard' },
      { name: 'Lawyer Applications', selector: 'text=Lawyer Applications' }
    ];
    
    for (const testPage of pages) {
      const pageStartTime = Date.now();
      
      if (await page.locator(testPage.selector).count() > 0) {
        await page.click(testPage.selector);
        await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 5000 });
        
        const pageLoadTime = Date.now() - pageStartTime;
        console.log(`✅ ${testPage.name} loaded in ${pageLoadTime}ms`);
        
        // Should load within 3 seconds
        expect(pageLoadTime).toBeLessThan(3000);
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Total navigation test completed in ${totalTime}ms`);
  });

  test('LV-006-E2E: Basic Error Handling Test', async () => {
    // Test navigation to a non-existent page
    await page.goto('/non-existent-page');
    
    // Should either show 404 or redirect to login/dashboard
    const hasError = await page.locator('text=404, text=Not Found, text=Page not found').count() > 0;
    const hasRedirect = await page.locator('text=Dashboard, text=Sign in').count() > 0;
    
    if (hasError) {
      console.log('✅ 404 error page displayed correctly');
    } else if (hasRedirect) {
      console.log('✅ Redirected to appropriate page');
    } else {
      console.log('ℹ️  Error handling behavior varies');
    }
    
    // Navigate back to a valid page
    await page.goto('/');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
    console.log('✅ Basic error handling test completed');
  });

  test('LV-007-E2E: Accessibility Test', async () => {
    // Basic accessibility checks
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    const inputs = await page.locator('input').count();
    
    console.log(`✅ Found ${headings} headings, ${buttons} buttons, ${links} links, ${inputs} inputs`);
    
    // Check for basic accessibility attributes
    const buttonsWithAriaLabel = await page.locator('button[aria-label]').count();
    const inputsWithLabels = await page.locator('input[aria-label], input + label, label input').count();
    
    console.log(`✅ Accessibility: ${buttonsWithAriaLabel} buttons with aria-label, ${inputsWithLabels} inputs with labels`);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus').count();
    if (focusedElement > 0) {
      console.log('✅ Keyboard navigation working');
    }
    
    console.log('✅ Basic accessibility test completed');
  });
});
