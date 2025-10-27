"""
Test Data Generator for Lawyer Verification Tests (Python Version)
Generates realistic test data from the actual lawyers_list.json
"""

import json
import os
import random
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TestApplication:
    application_id: str
    applicant_name: str
    first_name: str
    last_name: str
    middle_name: str = ""
    address: str = ""
    roll_number: str = ""
    expected_result: str = ""
    expected_confidence: Optional[int] = None
    expected_confidence_range: Optional[List[int]] = None
    test_description: str = ""
    edge_case_type: str = ""
    original_lawyer: Optional[Dict] = None

class TestDataGenerator:
    def __init__(self, lawyers_data_path: Optional[str] = None):
        self.lawyers_data_path = lawyers_data_path or os.path.join(
            os.path.dirname(__file__), '../../../admin/src/data/lawyers_list.json'
        )
        self.lawyers_data: List[Dict] = []
        self.load_lawyers_data()

    def load_lawyers_data(self) -> None:
        """Load lawyers data from JSON file."""
        try:
            with open(self.lawyers_data_path, 'r', encoding='utf-8') as file:
                self.lawyers_data = json.load(file)
            logger.info(f"Loaded {len(self.lawyers_data)} lawyer records for test data generation")
        except FileNotFoundError:
            logger.error(f"Lawyers data file not found: {self.lawyers_data_path}")
            self.lawyers_data = []
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in lawyers data file: {self.lawyers_data_path}")
            self.lawyers_data = []

    def generate_all_test_cases(self) -> Dict[str, List[TestApplication]]:
        """Generate test applications for all test cases."""
        return {
            # LV-001: Valid lawyer verification
            'valid_lawyers': self.generate_valid_lawyer_applications(5),
            
            # LV-002: Invalid lawyer verification
            'invalid_lawyers': self.generate_invalid_lawyer_applications(5),
            
            # LV-003: Partial match verification
            'partial_matches': self.generate_partial_match_applications(5),
            
            # LV-004: Multiple match verification
            'multiple_matches': self.generate_multiple_match_applications(3),
            
            # LV-005: Bulk verification
            'bulk_applications': self.generate_bulk_test_applications(20),
            
            # LV-008: Data validation edge cases
            'edge_cases': self.generate_edge_case_applications()
        }

    def generate_valid_lawyer_applications(self, count: int = 5) -> List[TestApplication]:
        """Generate valid lawyer applications using real data."""
        valid_applications = []
        selected_lawyers = self.get_random_lawyers(count)
        
        for index, lawyer in enumerate(selected_lawyers):
            valid_applications.append(TestApplication(
                application_id=f"VALID-{index + 1}",
                applicant_name=f"{lawyer.get('Firstname', '')} {lawyer.get('Lastname', '')}".strip(),
                first_name=lawyer.get('Firstname', ''),
                last_name=lawyer.get('Lastname', ''),
                middle_name=lawyer.get('Middle Name', ''),
                address=lawyer.get('Address', ''),
                roll_number=lawyer.get('Roll No.', ''),
                expected_result='VERIFIED',
                expected_confidence=100,
                test_description='Exact match from database'
            ))
        
        return valid_applications

    def generate_invalid_lawyer_applications(self, count: int = 5) -> List[TestApplication]:
        """Generate invalid lawyer applications."""
        invalid_applications = []
        fake_names = [
            {'first': 'JOHN', 'last': 'NONEXISTENT'},
            {'first': 'FAKE', 'last': 'LAWYER'},
            {'first': 'INVALID', 'last': 'PERSON'},
            {'first': 'TEST', 'last': 'DUMMY'},
            {'first': 'BOGUS', 'last': 'ATTORNEY'}
        ]
        
        for i in range(count):
            fake_name = fake_names[i] if i < len(fake_names) else {'first': f'FAKE{i}', 'last': f'LAWYER{i}'}
            
            invalid_applications.append(TestApplication(
                application_id=f"INVALID-{i + 1}",
                applicant_name=f"{fake_name['first']} {fake_name['last']}",
                first_name=fake_name['first'],
                last_name=fake_name['last'],
                middle_name='X',
                address=f"Fake Address {i + 1}, Manila",
                roll_number=f"99999{i}",
                expected_result='NOT_VERIFIED',
                expected_confidence=0,
                test_description='Non-existent lawyer'
            ))
        
        return invalid_applications

    def generate_partial_match_applications(self, count: int = 5) -> List[TestApplication]:
        """Generate partial match applications (similar but not exact)."""
        partial_matches = []
        selected_lawyers = self.get_random_lawyers(count)
        
        for index, lawyer in enumerate(selected_lawyers):
            # Create variations that should partially match
            variations = [
                {
                    'first_name': lawyer.get('Firstname', ''),
                    'last_name': lawyer.get('Lastname', ''),
                    'middle_name': lawyer.get('Middle Name', ''),
                    'suffix': 'JR',
                    'variation_type': 'suffix_added'
                },
                {
                    'first_name': lawyer.get('Firstname', ''),
                    'last_name': lawyer.get('Lastname', '') + 'A',
                    'middle_name': lawyer.get('Middle Name', ''),
                    'variation_type': 'name_variation'
                },
                {
                    'first_name': lawyer.get('Firstname', ''),
                    'last_name': lawyer.get('Lastname', ''),
                    'middle_name': 'X',
                    'variation_type': 'middle_name_different'
                },
                {
                    'first_name': lawyer.get('Firstname', ''),
                    'last_name': lawyer.get('Lastname', ''),
                    'middle_name': lawyer.get('Middle Name', ''),
                    'address': 'Different City, Philippines',
                    'variation_type': 'address_different'
                }
            ]
            
            variation = variations[index % len(variations)]
            suffix = variation.get('suffix', '')
            
            partial_matches.append(TestApplication(
                application_id=f"PARTIAL-{index + 1}",
                applicant_name=f"{variation['first_name']} {variation['last_name']}{' ' + suffix if suffix else ''}".strip(),
                first_name=variation['first_name'],
                last_name=variation['last_name'],
                middle_name=variation.get('middle_name', ''),
                address=variation.get('address', lawyer.get('Address', '')),
                expected_result='PARTIAL_MATCH',
                expected_confidence_range=[70, 89],
                test_description=f"Partial match - {variation['variation_type']}",
                original_lawyer=lawyer
            ))
        
        return partial_matches

    def generate_multiple_match_applications(self, count: int = 3) -> List[TestApplication]:
        """Generate applications that should match multiple lawyers."""
        multiple_matches = []
        
        # Find common last names in the database
        last_name_counts = {}
        for lawyer in self.lawyers_data:
            last_name = lawyer.get('Lastname', '')
            last_name_counts[last_name] = last_name_counts.get(last_name, 0) + 1
        
        # Get last names that appear multiple times
        common_last_names = sorted(
            [(name, count) for name, count in last_name_counts.items() if count > 1],
            key=lambda x: x[1],
            reverse=True
        )[:count]
        
        for index, (last_name, _) in enumerate(common_last_names):
            matching_lawyers = [lawyer for lawyer in self.lawyers_data if lawyer.get('Lastname') == last_name]
            
            multiple_matches.append(TestApplication(
                application_id=f"MULTIPLE-{index + 1}",
                applicant_name=f"COMMON {last_name}",
                first_name='COMMON',
                last_name=last_name,
                middle_name='M',
                address='Manila, Philippines',
                expected_result='MULTIPLE_MATCHES',
                test_description=f"Multiple matches for common last name: {last_name}"
            ))
        
        return multiple_matches

    def generate_bulk_test_applications(self, count: int = 20) -> List[TestApplication]:
        """Generate bulk test applications."""
        bulk_applications = []
        valid_count = int(count * 0.4)  # 40% valid
        invalid_count = int(count * 0.3)  # 30% invalid
        partial_count = count - valid_count - invalid_count  # 30% partial
        
        # Add valid applications
        valid_apps = self.generate_valid_lawyer_applications(valid_count)
        for index, app in enumerate(valid_apps):
            app.application_id = f"BULK-VALID-{index + 1}"
            bulk_applications.append(app)
        
        # Add invalid applications
        invalid_apps = self.generate_invalid_lawyer_applications(invalid_count)
        for index, app in enumerate(invalid_apps):
            app.application_id = f"BULK-INVALID-{index + 1}"
            bulk_applications.append(app)
        
        # Add partial match applications
        partial_apps = self.generate_partial_match_applications(partial_count)
        for index, app in enumerate(partial_apps):
            app.application_id = f"BULK-PARTIAL-{index + 1}"
            bulk_applications.append(app)
        
        # Shuffle the list to randomize order
        random.shuffle(bulk_applications)
        return bulk_applications

    def generate_edge_case_applications(self) -> List[TestApplication]:
        """Generate edge case applications for data validation testing."""
        return [
            TestApplication(
                application_id='EDGE-001',
                applicant_name='JOSÉ MARÍA RIZAL-SANTOS',
                first_name='JOSÉ MARÍA',
                last_name='RIZAL-SANTOS',
                middle_name='',
                test_description='Special characters and hyphens',
                edge_case_type='special_characters'
            ),
            TestApplication(
                application_id='EDGE-002',
                applicant_name='  LUIS   AMURAO  ',
                first_name='  LUIS  ',
                last_name='  AMURAO  ',
                middle_name='  E  ',
                test_description='Extra spaces that need trimming',
                edge_case_type='extra_spaces'
            ),
            TestApplication(
                application_id='EDGE-003',
                applicant_name='Luis Amurao',
                first_name='Luis',
                last_name='Amurao',
                middle_name='e',
                test_description='Mixed case input',
                edge_case_type='mixed_case'
            ),
            TestApplication(
                application_id='EDGE-004',
                applicant_name='PEDRO REYES III',
                first_name='PEDRO',
                last_name='REYES',
                middle_name='III',
                test_description='Roman numerals and suffixes',
                edge_case_type='roman_numerals'
            ),
            TestApplication(
                application_id='EDGE-005',
                applicant_name='VERY LONG FIRSTNAME VERY LONG LASTNAME',
                first_name='VERY LONG FIRSTNAME',
                last_name='VERY LONG LASTNAME',
                middle_name='VERY LONG MIDDLE',
                test_description='Very long names',
                edge_case_type='long_names'
            ),
            TestApplication(
                application_id='EDGE-006',
                applicant_name='A B',
                first_name='A',
                last_name='B',
                middle_name='C',
                test_description='Single character names',
                edge_case_type='single_characters'
            )
        ]

    def get_random_lawyers(self, count: int) -> List[Dict]:
        """Get random lawyers from the database."""
        if not self.lawyers_data:
            return []
        return random.sample(self.lawyers_data, min(count, len(self.lawyers_data)))

    def export_test_data(self, output_dir: str = './test-data') -> Dict[str, List[TestApplication]]:
        """Export test data to JSON files."""
        os.makedirs(output_dir, exist_ok=True)
        
        all_test_cases = self.generate_all_test_cases()
        
        # Export each test case type to separate files
        for test_type, data in all_test_cases.items():
            filename = os.path.join(output_dir, f"{test_type}.json")
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump([asdict(app) for app in data], f, indent=2, ensure_ascii=False)
            logger.info(f"Exported {len(data)} {test_type} test cases to {filename}")
        
        # Export combined test data
        combined_filename = os.path.join(output_dir, 'all-test-cases.json')
        combined_data = {k: [asdict(app) for app in v] for k, v in all_test_cases.items()}
        with open(combined_filename, 'w', encoding='utf-8') as f:
            json.dump(combined_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Exported combined test data to {combined_filename}")
        
        return all_test_cases

    def generate_performance_test_data(self, sizes: List[int] = None) -> Dict[str, List[TestApplication]]:
        """Generate performance test data."""
        if sizes is None:
            sizes = [10, 50, 100, 500, 1000]
        
        performance_data = {}
        for size in sizes:
            performance_data[f'bulk_{size}'] = self.generate_bulk_test_applications(size)
        
        return performance_data

    def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics."""
        if not self.lawyers_data:
            return {'error': 'No data loaded'}
        
        last_names = [lawyer.get('Lastname', '') for lawyer in self.lawyers_data]
        first_names = [lawyer.get('Firstname', '') for lawyer in self.lawyers_data]
        middle_names = [lawyer.get('Middle Name', '') for lawyer in self.lawyers_data if lawyer.get('Middle Name')]
        
        # Parse dates for date range
        dates = []
        for lawyer in self.lawyers_data:
            try:
                date_str = lawyer.get('Roll Signed Date', '')
                if date_str:
                    date = datetime.strptime(date_str, '%B %d, %Y')
                    dates.append(date)
            except ValueError:
                continue
        
        stats = {
            'total_lawyers': len(self.lawyers_data),
            'unique_last_names': len(set(last_names)),
            'unique_first_names': len(set(first_names)),
            'lawyers_with_middle_names': len(middle_names),
            'earliest_roll_date': min(dates).strftime('%Y-%m-%d') if dates else 'Unknown',
            'latest_roll_date': max(dates).strftime('%Y-%m-%d') if dates else 'Unknown',
            'data_file_path': self.lawyers_data_path
        }
        
        return stats

    def create_mock_database(self, output_path: str, size: int = 100) -> None:
        """Create a smaller mock database for testing."""
        if not self.lawyers_data:
            logger.error("No lawyers data loaded")
            return
        
        mock_data = random.sample(self.lawyers_data, min(size, len(self.lawyers_data)))
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(mock_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Created mock database with {len(mock_data)} records at {output_path}")

def main():
    """CLI usage."""
    generator = TestDataGenerator()
    
    # Generate and export test data
    test_data = generator.export_test_data()
    
    # Print database statistics
    print("\nDatabase Statistics:")
    stats = generator.get_database_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    # Generate performance test data
    performance_data = generator.generate_performance_test_data()
    print(f"\nGenerated performance test data for sizes: {list(performance_data.keys())}")
    
    # Create mock database for testing
    generator.create_mock_database('./test-data/mock_lawyers.json', 50)
    
    print("\nTest data generation completed!")

if __name__ == '__main__':
    main()
