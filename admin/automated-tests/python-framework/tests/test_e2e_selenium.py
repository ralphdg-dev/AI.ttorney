import pytest
import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

class TestLawyerVerificationE2E:
    
    @pytest.fixture(scope="class")
    def driver(self):
        """Setup Chrome WebDriver with options."""
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run in headless mode
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")
        
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.implicitly_wait(10)
        
        yield driver
        
        driver.quit()
    
    @pytest.fixture
    def admin_login(self, driver):
        """Login as admin user."""
        driver.get("http://localhost:3000/admin/login")
        
        # Wait for login form to load
        wait = WebDriverWait(driver, 10)
        email_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="email-input"]')))
        
        # Login
        email_input.send_keys("admin@aiattorney.com")
        driver.find_element(By.CSS_SELECTOR, '[data-testid="password-input"]').send_keys("admin123")
        driver.find_element(By.CSS_SELECTOR, '[data-testid="login-button"]').click()
        
        # Wait for dashboard to load
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="admin-dashboard"]')))
        
        # Navigate to lawyer applications
        driver.find_element(By.CSS_SELECTOR, '[data-testid="manage-lawyers-nav"]').click()
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="lawyer-applications-page"]')))
    
    def create_test_application(self, driver, name, first_name, last_name, middle_name="", address="", roll_number=""):
        """Helper method to create a test application."""
        wait = WebDriverWait(driver, 10)
        
        # Click add application button
        driver.find_element(By.CSS_SELECTOR, '[data-testid="add-test-application"]').click()
        
        # Fill form
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="applicant-name"]')))
        driver.find_element(By.CSS_SELECTOR, '[data-testid="applicant-name"]').send_keys(name)
        driver.find_element(By.CSS_SELECTOR, '[data-testid="first-name"]').send_keys(first_name)
        driver.find_element(By.CSS_SELECTOR, '[data-testid="last-name"]').send_keys(last_name)
        
        if middle_name:
            driver.find_element(By.CSS_SELECTOR, '[data-testid="middle-name"]').send_keys(middle_name)
        if address:
            driver.find_element(By.CSS_SELECTOR, '[data-testid="address"]').send_keys(address)
        if roll_number:
            driver.find_element(By.CSS_SELECTOR, '[data-testid="roll-number"]').send_keys(roll_number)
        
        # Submit form
        driver.find_element(By.CSS_SELECTOR, '[data-testid="create-application"]').click()
        
        # Wait for application to appear in list
        wait.until(EC.presence_of_element_located((By.XPATH, f'//tr[contains(., "{name}")]')))
    
    def test_lv_001_e2e_valid_lawyer_verification(self, driver, admin_login):
        """LV-001-E2E: Valid Lawyer Verification through UI"""
        wait = WebDriverWait(driver, 15)
        
        # Create test application
        self.create_test_application(
            driver, 
            "LUIS AMURAO", 
            "LUIS", 
            "AMURAO", 
            "E", 
            "Bauan, Batangas", 
            "5"
        )
        
        # Find and verify the application
        application_row = driver.find_element(By.XPATH, '//tr[contains(., "LUIS AMURAO")]')
        verify_button = application_row.find_element(By.CSS_SELECTOR, '[data-testid="verify-button"]')
        verify_button.click()
        
        # Wait for verification modal
        verification_modal = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="verification-modal"]')))
        
        # Check verification results
        verification_status = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="verification-status"]')))
        assert "VERIFIED" in verification_status.text
        
        confidence_score = driver.find_element(By.CSS_SELECTOR, '[data-testid="confidence-score"]')
        assert "100%" in confidence_score.text
        
        match_details = driver.find_element(By.CSS_SELECTOR, '[data-testid="match-details"]')
        assert "Roll No.: 5" in match_details.text
        assert "Bauan, Batangas" in match_details.text
        
        # Approve the application
        approve_button = driver.find_element(By.CSS_SELECTOR, '[data-testid="approve-button"]')
        assert approve_button.is_enabled()
        approve_button.click()
        
        # Check success message
        success_message = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="success-message"]')))
        assert "approved" in success_message.text.lower()
        
        # Verify status change
        time.sleep(1)  # Wait for UI update
        status_element = application_row.find_element(By.CSS_SELECTOR, '[data-testid="status"]')
        assert "Approved" in status_element.text
    
    def test_lv_002_e2e_invalid_lawyer_verification(self, driver, admin_login):
        """LV-002-E2E: Invalid Lawyer Verification through UI"""
        wait = WebDriverWait(driver, 15)
        
        # Create test application with invalid lawyer
        self.create_test_application(
            driver, 
            "JOHN NONEXISTENT", 
            "JOHN", 
            "NONEXISTENT", 
            "X", 
            "Fake Address, Manila"
        )
        
        # Find and verify the application
        application_row = driver.find_element(By.XPATH, '//tr[contains(., "JOHN NONEXISTENT")]')
        verify_button = application_row.find_element(By.CSS_SELECTOR, '[data-testid="verify-button"]')
        verify_button.click()
        
        # Wait for verification modal
        verification_modal = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="verification-modal"]')))
        
        # Check verification results
        verification_status = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="verification-status"]')))
        assert "NOT VERIFIED" in verification_status.text
        
        confidence_score = driver.find_element(By.CSS_SELECTOR, '[data-testid="confidence-score"]')
        assert "0%" in confidence_score.text
        
        no_match_message = driver.find_element(By.CSS_SELECTOR, '[data-testid="no-match-message"]')
        assert "No matching lawyer found" in no_match_message.text
        
        # Check button states
        reject_button = driver.find_element(By.CSS_SELECTOR, '[data-testid="reject-button"]')
        approve_button = driver.find_element(By.CSS_SELECTOR, '[data-testid="approve-button"]')
        
        assert reject_button.is_enabled()
        assert not approve_button.is_enabled()
        
        # Reject the application
        reject_button.click()
        
        # Fill rejection reason
        rejection_reason = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="rejection-reason"]')))
        rejection_reason.send_keys("Lawyer not found in official database")
        
        confirm_reject = driver.find_element(By.CSS_SELECTOR, '[data-testid="confirm-reject"]')
        confirm_reject.click()
        
        # Check success message
        success_message = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="success-message"]')))
        assert "rejected" in success_message.text.lower()
        
        # Verify status change
        time.sleep(1)  # Wait for UI update
        status_element = application_row.find_element(By.CSS_SELECTOR, '[data-testid="status"]')
        assert "Rejected" in status_element.text
    
    def test_lv_003_e2e_partial_match_verification(self, driver, admin_login):
        """LV-003-E2E: Partial Match Verification through UI"""
        wait = WebDriverWait(driver, 15)
        
        # Create test application with partial match
        self.create_test_application(
            driver, 
            "LUIS AMURAO JR", 
            "LUIS", 
            "AMURAO", 
            "E", 
            "Bauan, Batangas"
        )
        
        # Find and verify the application
        application_row = driver.find_element(By.XPATH, '//tr[contains(., "LUIS AMURAO JR")]')
        verify_button = application_row.find_element(By.CSS_SELECTOR, '[data-testid="verify-button"]')
        verify_button.click()
        
        # Wait for verification modal
        verification_modal = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="verification-modal"]')))
        
        # Check verification results
        verification_status = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="verification-status"]')))
        assert "PARTIAL MATCH" in verification_status.text
        
        # Check confidence score is between 70-90%
        confidence_score = driver.find_element(By.CSS_SELECTOR, '[data-testid="confidence-score"]')
        confidence_text = confidence_score.text.replace('%', '')
        confidence_value = int(confidence_text)
        assert 70 < confidence_value < 90
        
        # Check that both buttons are enabled
        approve_button = driver.find_element(By.CSS_SELECTOR, '[data-testid="approve-button"]')
        reject_button = driver.find_element(By.CSS_SELECTOR, '[data-testid="reject-button"]')
        
        assert approve_button.is_enabled()
        assert reject_button.is_enabled()
        
        # Check match differences are highlighted
        match_differences = driver.find_element(By.CSS_SELECTOR, '[data-testid="match-differences"]')
        assert "JR" in match_differences.text
    
    def test_lv_005_e2e_bulk_verification_process(self, driver, admin_login):
        """LV-005-E2E: Bulk Verification Process through UI"""
        wait = WebDriverWait(driver, 30)  # Longer timeout for bulk operations
        
        # Create multiple test applications
        bulk_applications = [
            ("LUIS AMURAO", "LUIS", "AMURAO"),
            ("FAKE LAWYER", "FAKE", "LAWYER"),
            ("FRANCISCO FABRO", "FRANCISCO", "FABRO")
        ]
        
        for name, first, last in bulk_applications:
            self.create_test_application(driver, name, first, last)
        
        # Select all applications
        select_all_checkbox = driver.find_element(By.CSS_SELECTOR, '[data-testid="select-all-checkbox"]')
        select_all_checkbox.click()
        
        # Verify checkboxes are selected
        checkboxes = driver.find_elements(By.CSS_SELECTOR, '[data-testid="application-checkbox"]')
        assert len(checkboxes) >= 3
        
        # Click bulk verify button
        bulk_verify_button = driver.find_element(By.CSS_SELECTOR, '[data-testid="bulk-verify-button"]')
        bulk_verify_button.click()
        
        # Wait for bulk verification modal
        bulk_modal = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="bulk-verification-modal"]')))
        
        # Wait for processing to complete (30 second timeout)
        progress_element = wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, '[data-testid="bulk-progress"]'), "100%"))
        
        # Check results summary
        results_summary = driver.find_element(By.CSS_SELECTOR, '[data-testid="bulk-results-summary"]')
        assert results_summary.is_displayed()
        
        total_processed = driver.find_element(By.CSS_SELECTOR, '[data-testid="total-processed"]')
        assert "3" in total_processed.text
        
        # View individual results
        view_results_button = driver.find_element(By.CSS_SELECTOR, '[data-testid="view-individual-results"]')
        view_results_button.click()
        
        results_table = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="individual-results-table"]')))
        assert results_table.is_displayed()
    
    def test_lv_007_e2e_performance_test(self, driver, admin_login):
        """LV-007-E2E: Performance Test through UI"""
        wait = WebDriverWait(driver, 10)
        
        # Test single verification performance
        start_time = time.time()
        
        self.create_test_application(driver, "LUIS AMURAO", "LUIS", "AMURAO")
        
        application_row = driver.find_element(By.XPATH, '//tr[contains(., "LUIS AMURAO")]')
        verify_button = application_row.find_element(By.CSS_SELECTOR, '[data-testid="verify-button"]')
        verify_button.click()
        
        # Wait for verification to complete
        verification_status = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="verification-status"]')))
        assert "VERIFIED" in verification_status.text
        
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        # Should complete within 3 seconds (including UI interactions)
        assert processing_time < 3000
        
        # Check if processing time is displayed in UI
        try:
            displayed_time_element = driver.find_element(By.CSS_SELECTOR, '[data-testid="processing-time"]')
            displayed_time = displayed_time_element.text
            assert "ms" in displayed_time
        except NoSuchElementException:
            # Processing time display is optional
            pass
    
    def test_lv_006_e2e_error_handling(self, driver, admin_login):
        """LV-006-E2E: Error Handling through UI"""
        wait = WebDriverWait(driver, 15)
        
        # Mock API error by intercepting network requests
        driver.execute_script("""
            // Mock fetch to simulate database error
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
                if (url.includes('/api/verify-lawyer')) {
                    return Promise.resolve({
                        ok: false,
                        status: 500,
                        json: () => Promise.resolve({
                            error: 'Database temporarily unavailable'
                        })
                    });
                }
                return originalFetch.apply(this, arguments);
            };
        """)
        
        self.create_test_application(driver, "LUIS AMURAO", "LUIS", "AMURAO")
        
        application_row = driver.find_element(By.XPATH, '//tr[contains(., "LUIS AMURAO")]')
        verify_button = application_row.find_element(By.CSS_SELECTOR, '[data-testid="verify-button"]')
        verify_button.click()
        
        # Check error handling
        error_message = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="error-message"]')))
        assert "Database temporarily unavailable" in error_message.text
        
        retry_button = driver.find_element(By.CSS_SELECTOR, '[data-testid="retry-button"]')
        assert retry_button.is_displayed()
        
        # Verify application remains in pending status
        status_element = application_row.find_element(By.CSS_SELECTOR, '[data-testid="status"]')
        assert "Pending" in status_element.text
    
    def test_lv_008_e2e_data_validation(self, driver, admin_login):
        """LV-008-E2E: Data Validation through UI"""
        wait = WebDriverWait(driver, 10)
        
        edge_cases = [
            ("JOSÉ MARÍA RIZAL-SANTOS", "Special characters"),
            ("  LUIS   AMURAO  ", "Extra spaces"),
            ("Luis Amurao", "Mixed case"),
            ("PEDRO REYES III", "Roman numerals")
        ]
        
        for test_name, description in edge_cases:
            name_parts = test_name.strip().split()
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[1] if len(name_parts) > 1 else ""
            
            self.create_test_application(driver, test_name, first_name, last_name)
            
            application_row = driver.find_element(By.XPATH, f'//tr[contains(., "{test_name.strip()}")]')
            verify_button = application_row.find_element(By.CSS_SELECTOR, '[data-testid="verify-button"]')
            verify_button.click()
            
            # Should handle gracefully without errors
            verification_modal = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="verification-modal"]')))
            verification_status = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="verification-status"]')))
            
            assert verification_status.is_displayed()
            
            # Close modal for next test
            close_button = driver.find_element(By.CSS_SELECTOR, '[data-testid="close-modal"]')
            close_button.click()
            
            # Wait for modal to close
            wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, '[data-testid="verification-modal"]')))
    
    @pytest.mark.performance
    def test_memory_usage_monitoring_e2e(self, driver, admin_login):
        """Test memory usage during bulk E2E operations"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create and process multiple applications
        for i in range(10):
            self.create_test_application(driver, f"TEST LAWYER {i}", "TEST", "LAWYER")
        
        # Select all and bulk verify
        select_all_checkbox = driver.find_element(By.CSS_SELECTOR, '[data-testid="select-all-checkbox"]')
        select_all_checkbox.click()
        
        bulk_verify_button = driver.find_element(By.CSS_SELECTOR, '[data-testid="bulk-verify-button"]')
        bulk_verify_button.click()
        
        # Wait for completion
        wait = WebDriverWait(driver, 60)
        wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, '[data-testid="bulk-progress"]'), "100%"))
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable
        assert memory_increase < 200  # Should not increase by more than 200MB
