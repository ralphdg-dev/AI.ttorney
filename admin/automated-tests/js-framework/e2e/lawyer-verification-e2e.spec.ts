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
    // Navigate to admin login
    await page.goto('/admin/login');
    
    // Login as admin
    await page.fill('[data-testid="email-input"]', 'admin@aiattorney.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    
    // Navigate to lawyer applications
    await page.click('[data-testid="manage-lawyers-nav"]');
    await expect(page.locator('[data-testid="lawyer-applications-page"]')).toBeVisible();
  });

  test('LV-001-E2E: Valid Lawyer Verification through UI', async () => {
    // Create a test application first
    await page.click('[data-testid="add-test-application"]');
    await page.fill('[data-testid="applicant-name"]', testApplications.validLawyer.name);
    await page.fill('[data-testid="first-name"]', testApplications.validLawyer.firstName);
    await page.fill('[data-testid="last-name"]', testApplications.validLawyer.lastName);
    await page.fill('[data-testid="middle-name"]', testApplications.validLawyer.middleName);
    await page.fill('[data-testid="address"]', testApplications.validLawyer.address);
    await page.fill('[data-testid="roll-number"]', testApplications.validLawyer.rollNumber);
    await page.click('[data-testid="create-application"]');

    // Find the created application
    const applicationRow = page.locator(`[data-testid="application-row"]:has-text("${testApplications.validLawyer.name}")`);
    await expect(applicationRow).toBeVisible();

    // Click verify button
    await applicationRow.locator('[data-testid="verify-button"]').click();

    // Wait for verification to complete
    await expect(page.locator('[data-testid="verification-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="verification-status"]')).toContainText('VERIFIED');
    
    // Check verification details
    await expect(page.locator('[data-testid="confidence-score"]')).toContainText('100%');
    await expect(page.locator('[data-testid="match-details"]')).toContainText('Roll No.: 5');
    await expect(page.locator('[data-testid="match-details"]')).toContainText('Bauan, Batangas');

    // Approve the application
    await expect(page.locator('[data-testid="approve-button"]')).toBeEnabled();
    await page.click('[data-testid="approve-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Lawyer application approved');
    
    // Verify application status changed
    await expect(applicationRow.locator('[data-testid="status"]')).toContainText('Approved');
  });

  test('LV-002-E2E: Invalid Lawyer Verification through UI', async () => {
    // Create a test application with invalid lawyer
    await page.click('[data-testid="add-test-application"]');
    await page.fill('[data-testid="applicant-name"]', testApplications.invalidLawyer.name);
    await page.fill('[data-testid="first-name"]', testApplications.invalidLawyer.firstName);
    await page.fill('[data-testid="last-name"]', testApplications.invalidLawyer.lastName);
    await page.fill('[data-testid="middle-name"]', testApplications.invalidLawyer.middleName);
    await page.fill('[data-testid="address"]', testApplications.invalidLawyer.address);
    await page.click('[data-testid="create-application"]');

    // Find the created application
    const applicationRow = page.locator(`[data-testid="application-row"]:has-text("${testApplications.invalidLawyer.name}")`);
    await expect(applicationRow).toBeVisible();

    // Click verify button
    await applicationRow.locator('[data-testid="verify-button"]').click();

    // Wait for verification to complete
    await expect(page.locator('[data-testid="verification-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="verification-status"]')).toContainText('NOT VERIFIED');
    
    // Check verification details
    await expect(page.locator('[data-testid="confidence-score"]')).toContainText('0%');
    await expect(page.locator('[data-testid="no-match-message"]')).toContainText('No matching lawyer found');

    // Verify reject button is enabled, approve is disabled
    await expect(page.locator('[data-testid="reject-button"]')).toBeEnabled();
    await expect(page.locator('[data-testid="approve-button"]')).toBeDisabled();

    // Reject the application
    await page.click('[data-testid="reject-button"]');
    await page.fill('[data-testid="rejection-reason"]', 'Lawyer not found in official database');
    await page.click('[data-testid="confirm-reject"]');

    // Verify rejection message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Lawyer application rejected');
    
    // Verify application status changed
    await expect(applicationRow.locator('[data-testid="status"]')).toContainText('Rejected');
  });

  test('LV-003-E2E: Partial Match Verification through UI', async () => {
    // Create a test application with partial match
    await page.click('[data-testid="add-test-application"]');
    await page.fill('[data-testid="applicant-name"]', testApplications.partialMatch.name);
    await page.fill('[data-testid="first-name"]', testApplications.partialMatch.firstName);
    await page.fill('[data-testid="last-name"]', testApplications.partialMatch.lastName);
    await page.fill('[data-testid="middle-name"]', testApplications.partialMatch.middleName);
    await page.fill('[data-testid="address"]', testApplications.partialMatch.address);
    await page.click('[data-testid="create-application"]');

    // Find the created application
    const applicationRow = page.locator(`[data-testid="application-row"]:has-text("${testApplications.partialMatch.name}")`);
    await expect(applicationRow).toBeVisible();

    // Click verify button
    await applicationRow.locator('[data-testid="verify-button"]').click();

    // Wait for verification to complete
    await expect(page.locator('[data-testid="verification-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="verification-status"]')).toContainText('PARTIAL MATCH');
    
    // Check verification details
    const confidenceScore = await page.locator('[data-testid="confidence-score"]').textContent();
    expect(parseInt(confidenceScore?.replace('%', '') || '0')).toBeGreaterThan(70);
    expect(parseInt(confidenceScore?.replace('%', '') || '0')).toBeLessThan(90);

    // Verify both buttons are enabled for manual decision
    await expect(page.locator('[data-testid="approve-button"]')).toBeEnabled();
    await expect(page.locator('[data-testid="reject-button"]')).toBeEnabled();

    // Check match differences are highlighted
    await expect(page.locator('[data-testid="match-differences"]')).toContainText('JR');
  });

  test('LV-005-E2E: Bulk Verification Process through UI', async () => {
    // Create multiple test applications
    const bulkApplications = [
      { name: 'LUIS AMURAO', expected: 'VERIFIED' },
      { name: 'FAKE LAWYER', expected: 'NOT VERIFIED' },
      { name: 'FRANCISCO FABRO', expected: 'VERIFIED' }
    ];

    for (const app of bulkApplications) {
      await page.click('[data-testid="add-test-application"]');
      await page.fill('[data-testid="applicant-name"]', app.name);
      await page.fill('[data-testid="first-name"]', app.name.split(' ')[0]);
      await page.fill('[data-testid="last-name"]', app.name.split(' ')[1]);
      await page.click('[data-testid="create-application"]');
    }

    // Select all applications for bulk verification
    await page.click('[data-testid="select-all-checkbox"]');
    
    // Verify all checkboxes are selected
    const checkboxes = page.locator('[data-testid="application-checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Click bulk verify button
    await page.click('[data-testid="bulk-verify-button"]');

    // Wait for bulk verification modal
    await expect(page.locator('[data-testid="bulk-verification-modal"]')).toBeVisible();
    
    // Wait for processing to complete (should be < 30 seconds)
    await expect(page.locator('[data-testid="bulk-progress"]')).toContainText('100%', { timeout: 30000 });

    // Check results summary
    await expect(page.locator('[data-testid="bulk-results-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-processed"]')).toContainText('3');
    
    // Verify individual results are accessible
    await page.click('[data-testid="view-individual-results"]');
    await expect(page.locator('[data-testid="individual-results-table"]')).toBeVisible();
  });

  test('LV-007-E2E: Performance Test through UI', async () => {
    // Test single verification performance
    const startTime = Date.now();
    
    await page.click('[data-testid="add-test-application"]');
    await page.fill('[data-testid="applicant-name"]', 'LUIS AMURAO');
    await page.fill('[data-testid="first-name"]', 'LUIS');
    await page.fill('[data-testid="last-name"]', 'AMURAO');
    await page.click('[data-testid="create-application"]');

    const applicationRow = page.locator('[data-testid="application-row"]:has-text("LUIS AMURAO")');
    await applicationRow.locator('[data-testid="verify-button"]').click();
    
    await expect(page.locator('[data-testid="verification-status"]')).toContainText('VERIFIED');
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Should complete within 3 seconds (including UI interactions)
    expect(processingTime).toBeLessThan(3000);

    // Check if processing time is displayed in UI
    const displayedTime = await page.locator('[data-testid="processing-time"]').textContent();
    expect(displayedTime).toMatch(/\d+ms/);
  });

  test('LV-006-E2E: Error Handling through UI', async () => {
    // Simulate database error by intercepting API calls
    await page.route('**/api/verify-lawyer', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database temporarily unavailable' })
      });
    });

    await page.click('[data-testid="add-test-application"]');
    await page.fill('[data-testid="applicant-name"]', 'LUIS AMURAO');
    await page.fill('[data-testid="first-name"]', 'LUIS');
    await page.fill('[data-testid="last-name"]', 'AMURAO');
    await page.click('[data-testid="create-application"]');

    const applicationRow = page.locator('[data-testid="application-row"]:has-text("LUIS AMURAO")');
    await applicationRow.locator('[data-testid="verify-button"]').click();

    // Check error handling
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Database temporarily unavailable');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Verify application remains in pending status
    await expect(applicationRow.locator('[data-testid="status"]')).toContainText('Pending');
  });

  test('LV-008-E2E: Data Validation through UI', async () => {
    const edgeCases = [
      { name: 'JOSÉ MARÍA RIZAL-SANTOS', description: 'Special characters' },
      { name: '  LUIS   AMURAO  ', description: 'Extra spaces' },
      { name: 'Luis Amurao', description: 'Mixed case' },
      { name: 'PEDRO REYES III', description: 'Roman numerals' }
    ];

    for (const testCase of edgeCases) {
      await page.click('[data-testid="add-test-application"]');
      await page.fill('[data-testid="applicant-name"]', testCase.name);
      await page.fill('[data-testid="first-name"]', testCase.name.split(' ')[0]);
      await page.fill('[data-testid="last-name"]', testCase.name.split(' ')[1] || '');
      await page.click('[data-testid="create-application"]');

      const applicationRow = page.locator(`[data-testid="application-row"]:has-text("${testCase.name.trim()}")`);
      await applicationRow.locator('[data-testid="verify-button"]').click();

      // Should handle gracefully without errors
      await expect(page.locator('[data-testid="verification-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="verification-status"]')).toBeVisible();
      
      // Close modal for next test
      await page.click('[data-testid="close-modal"]');
    }
  });
});
