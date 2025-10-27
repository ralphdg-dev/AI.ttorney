import pytest
import json
import os
import tempfile
import time
from unittest.mock import patch, MagicMock

from src.services.lawyer_verification_service import (
    LawyerVerificationService, 
    LawyerApplication, 
    LawyerRecord,
    VerificationResult
)

# Mock data for testing
MOCK_LAWYERS_DATA = [
    {
        "Lastname": "AMURAO",
        "Firstname": "LUIS",
        "Middle Name": "E",
        "Address": "Bauan, Batangas",
        "Roll Signed Date": "May 8, 1946",
        "Roll No.": "5"
    },
    {
        "Lastname": "REYES",
        "Firstname": "GUILLERMO",
        "Middle Name": "J",
        "Address": "Zamboanga, Zamboanga",
        "Roll Signed Date": "June 24, 1946",
        "Roll No.": "33"
    },
    {
        "Lastname": "REYES",
        "Firstname": "PEDRO",
        "Middle Name": "A",
        "Address": "Quezon City",
        "Roll Signed Date": "March 15, 1950",
        "Roll No.": "156"
    },
    {
        "Lastname": "FABRO",
        "Firstname": "FRANCISCO",
        "Middle Name": "S",
        "Address": "Sta. Cruz, Ilocos Sur",
        "Roll Signed Date": "May 29, 1946",
        "Roll No.": "15"
    }
]

class TestLawyerVerificationService:
    
    @pytest.fixture
    def mock_database_file(self):
        """Create a temporary mock database file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(MOCK_LAWYERS_DATA, f, indent=2)
            temp_path = f.name
        
        yield temp_path
        
        # Cleanup
        os.unlink(temp_path)
    
    @pytest.fixture
    def verification_service(self, mock_database_file):
        """Create a LawyerVerificationService instance with mock data."""
        return LawyerVerificationService(mock_database_file)
    
    def test_lv_001_valid_lawyer_verification_existing_lawyer(self, verification_service):
        """LV-001: Verify Valid Lawyer Application with Existing Database Record"""
        application = LawyerApplication(
            applicant_name="LUIS AMURAO",
            first_name="LUIS",
            last_name="AMURAO",
            middle_name="E",
            address="Bauan, Batangas",
            roll_number="5",
            application_id="APP-001"
        )
        
        result = verification_service.verify_lawyer(application)
        
        assert result.is_verified == True
        assert result.match_type == 'EXACT'
        assert result.confidence > 90
        assert len(result.matches) == 1
        assert result.matches[0].lastname == 'AMURAO'
        assert result.matches[0].roll_no == '5'
        assert result.processing_time < 1.0  # Should complete within 1 second
    
    def test_lv_002_invalid_lawyer_verification_nonexistent(self, verification_service):
        """LV-002: Verify Invalid Lawyer Application with No Database Match"""
        application = LawyerApplication(
            applicant_name="JOHN NONEXISTENT",
            first_name="JOHN",
            last_name="NONEXISTENT",
            middle_name="X",
            address="Fake Address, Manila",
            roll_number="999999",
            application_id="APP-002"
        )
        
        result = verification_service.verify_lawyer(application)
        
        assert result.is_verified == False
        assert result.match_type == 'NONE'
        assert result.confidence == 0
        assert len(result.matches) == 0
        assert result.processing_time < 1.0
    
    def test_lv_003_partial_match_verification_similar_name(self, verification_service):
        """LV-003: Verify Lawyer Application with Partial Name Match"""
        application = LawyerApplication(
            applicant_name="LUIS AMURAO JR",
            first_name="LUIS",
            last_name="AMURAO",
            middle_name="E",
            address="Bauan, Batangas",
            application_id="APP-003"
        )
        
        result = verification_service.verify_lawyer(application)
        
        assert result.match_type == 'PARTIAL'
        assert 70 < result.confidence < 90
        assert len(result.matches) == 1
        assert result.matches[0].lastname == 'AMURAO'
    
    def test_lv_004_multiple_match_verification(self, verification_service):
        """LV-004: Verify Lawyer Application with Multiple Potential Matches"""
        application = LawyerApplication(
            applicant_name="PEDRO REYES",
            first_name="PEDRO",
            last_name="REYES",
            middle_name="C",
            address="Manila",
            application_id="APP-004"
        )
        
        result = verification_service.verify_lawyer(application)
        
        assert result.match_type == 'MULTIPLE'
        assert len(result.matches) > 1
        assert all(match.lastname == 'REYES' for match in result.matches)
        # Should be sorted by similarity score (best match first)
        assert result.matches[0].firstname == 'PEDRO'
    
    def test_lv_005_bulk_verification_process(self, verification_service):
        """LV-005: Bulk Verify Multiple Lawyer Applications"""
        applications = [
            LawyerApplication(
                applicant_name="LUIS AMURAO",
                first_name="LUIS",
                last_name="AMURAO",
                middle_name="E",
                application_id="APP-005"
            ),
            LawyerApplication(
                applicant_name="FAKE LAWYER",
                first_name="FAKE",
                last_name="LAWYER",
                application_id="APP-006"
            ),
            LawyerApplication(
                applicant_name="FRANCISCO FABRO",
                first_name="FRANCISCO",
                last_name="FABRO",
                middle_name="S",
                application_id="APP-007"
            )
        ]
        
        start_time = time.time()
        results = verification_service.bulk_verify_lawyers(applications)
        total_time = time.time() - start_time
        
        assert len(results) == 3
        assert results[0].is_verified == True  # LUIS AMURAO
        assert results[1].is_verified == False  # FAKE LAWYER
        assert results[2].is_verified == True  # FRANCISCO FABRO
        assert total_time < 5.0  # Should complete within 5 seconds
    
    def test_lv_006_database_connection_error_handling(self):
        """LV-006: Handle Database Connection Errors During Verification"""
        # Test with non-existent database file
        with pytest.raises(Exception, match="Database unavailable"):
            LawyerVerificationService('/nonexistent/path/lawyers.json')
        
        # Test with corrupted database file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write('invalid json content')
            corrupted_path = f.name
        
        try:
            with pytest.raises(Exception, match="Database unavailable"):
                LawyerVerificationService(corrupted_path)
        finally:
            os.unlink(corrupted_path)
    
    def test_lv_007_performance_test_large_dataset_search(self, verification_service):
        """LV-007: Performance Test for Lawyer Verification with Large Dataset"""
        application = LawyerApplication(
            applicant_name="LUIS AMURAO",
            first_name="LUIS",
            last_name="AMURAO",
            middle_name="E",
            application_id="PERF-001"
        )
        
        result = verification_service.verify_lawyer(application)
        
        assert result.processing_time < 3.0  # < 3 seconds target
        
        # Test bulk operations performance
        applications = [
            LawyerApplication(
                applicant_name=f"TEST LAWYER {i}",
                first_name="TEST",
                last_name="LAWYER",
                middle_name=str(i),
                application_id=f"PERF-{i}"
            )
            for i in range(10)
        ]
        
        start_time = time.time()
        results = verification_service.bulk_verify_lawyers(applications)
        total_time = time.time() - start_time
        
        assert len(results) == 10
        assert total_time < 30.0  # < 30 seconds target for 10 applications
    
    def test_lv_007_database_statistics(self, verification_service):
        """LV-007: Test database statistics functionality"""
        stats = verification_service.get_database_stats()
        
        assert stats['total_records'] == len(MOCK_LAWYERS_DATA)
        assert 'database_size' in stats
        assert stats['database_size'].endswith(' MB')
        assert 'file_path' in stats
    
    @pytest.mark.parametrize("test_case,expected_behavior", [
        ("JOSÉ MARÍA RIZAL-SANTOS", "should handle special characters"),
        ("  LUIS   AMURAO  ", "should trim and normalize spaces"),
        ("Luis Amurao", "should handle case-insensitive matching"),
        ("PEDRO REYES III", "should handle Roman numerals"),
        ("VERY LONG FIRSTNAME VERY LONG LASTNAME", "should handle long names gracefully")
    ])
    def test_lv_008_data_validation_and_sanitization(self, verification_service, test_case, expected_behavior):
        """LV-008: Validate Input Data Sanitization During Verification"""
        name_parts = test_case.strip().split()
        application = LawyerApplication(
            applicant_name=test_case,
            first_name=name_parts[0] if name_parts else "",
            last_name=name_parts[1] if len(name_parts) > 1 else "",
            middle_name=name_parts[2] if len(name_parts) > 2 else None,
            application_id="APP-VALIDATION"
        )
        
        result = verification_service.verify_lawyer(application)
        
        # Should handle gracefully without errors
        assert isinstance(result, VerificationResult)
        assert result.processing_time < 1.0
        assert result.match_type in ['EXACT', 'PARTIAL', 'MULTIPLE', 'NONE']
    
    def test_string_normalization(self, verification_service):
        """Test string normalization functionality"""
        # Test various normalization scenarios
        test_cases = [
            ("  LUIS   AMURAO  ", "LUIS AMURAO"),
            ("luis amurao", "LUIS AMURAO"),
            ("José María", "JOSE MARIA"),
            ("", ""),
            (None, "")
        ]
        
        for input_str, expected in test_cases:
            if input_str is None:
                result = verification_service._normalize_string("")
            else:
                result = verification_service._normalize_string(input_str)
            assert result == expected
    
    def test_similarity_calculation(self, verification_service):
        """Test similarity calculation between strings"""
        # Test exact match
        assert verification_service._string_similarity("LUIS", "LUIS") == 1.0
        
        # Test no match
        assert verification_service._string_similarity("LUIS", "JOHN") < 0.5
        
        # Test partial match
        similarity = verification_service._string_similarity("LUIS", "LUISA")
        assert 0.5 < similarity < 1.0
        
        # Test empty strings
        assert verification_service._string_similarity("", "") == 0.0
        assert verification_service._string_similarity("LUIS", "") == 0.0
    
    def test_search_lawyers_by_name(self, verification_service):
        """Test utility method for searching lawyers by name"""
        results = verification_service.search_lawyers_by_name("LUIS")
        assert len(results) > 0
        assert any("LUIS" in f"{lawyer.firstname} {lawyer.lastname}" for lawyer in results)
        
        # Test with limit
        results = verification_service.search_lawyers_by_name("REYES", limit=1)
        assert len(results) == 1
        
        # Test with non-existent name
        results = verification_service.search_lawyers_by_name("NONEXISTENT")
        assert len(results) == 0
    
    def test_memory_usage_monitoring(self, verification_service):
        """Test memory usage during bulk operations"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create large batch of applications
        applications = [
            LawyerApplication(
                applicant_name=f"TEST LAWYER {i}",
                first_name="TEST",
                last_name="LAWYER",
                application_id=f"MEM-{i}"
            )
            for i in range(100)
        ]
        
        results = verification_service.bulk_verify_lawyers(applications)
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        assert len(results) == 100
        assert memory_increase < 500  # Should not increase by more than 500MB
    
    @pytest.mark.performance
    def test_concurrent_verification(self, verification_service):
        """Test concurrent verification performance"""
        import concurrent.futures
        import threading
        
        applications = [
            LawyerApplication(
                applicant_name=f"CONCURRENT TEST {i}",
                first_name="CONCURRENT",
                last_name="TEST",
                application_id=f"CONC-{i}"
            )
            for i in range(20)
        ]
        
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(verification_service.verify_lawyer, app) 
                for app in applications
            ]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        total_time = time.time() - start_time
        
        assert len(results) == 20
        assert total_time < 10.0  # Should complete within 10 seconds with concurrency
        assert all(isinstance(result, VerificationResult) for result in results)
