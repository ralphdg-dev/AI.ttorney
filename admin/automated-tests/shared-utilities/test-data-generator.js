/**
 * Test Data Generator for Lawyer Verification Tests
 * Generates realistic test data from the actual lawyers_list.json
 */

const fs = require('fs');
const path = require('path');

class TestDataGenerator {
  constructor(lawyersDataPath) {
    this.lawyersDataPath = lawyersDataPath || path.join(__dirname, '../../../admin/src/data/lawyers_list.json');
    this.lawyersData = [];
    this.loadLawyersData();
  }

  loadLawyersData() {
    try {
      const rawData = fs.readFileSync(this.lawyersDataPath, 'utf8');
      this.lawyersData = JSON.parse(rawData);
      console.log(`Loaded ${this.lawyersData.length} lawyer records for test data generation`);
    } catch (error) {
      console.error('Failed to load lawyers data:', error.message);
      this.lawyersData = [];
    }
  }

  /**
   * Generate test applications for all test cases
   */
  generateAllTestCases() {
    return {
      // LV-001: Valid lawyer verification
      validLawyers: this.generateValidLawyerApplications(5),
      
      // LV-002: Invalid lawyer verification
      invalidLawyers: this.generateInvalidLawyerApplications(5),
      
      // LV-003: Partial match verification
      partialMatches: this.generatePartialMatchApplications(5),
      
      // LV-004: Multiple match verification
      multipleMatches: this.generateMultipleMatchApplications(3),
      
      // LV-005: Bulk verification
      bulkApplications: this.generateBulkTestApplications(20),
      
      // LV-008: Data validation edge cases
      edgeCases: this.generateEdgeCaseApplications()
    };
  }

  /**
   * Generate valid lawyer applications using real data
   */
  generateValidLawyerApplications(count = 5) {
    const validApplications = [];
    const selectedLawyers = this.getRandomLawyers(count);
    
    selectedLawyers.forEach((lawyer, index) => {
      validApplications.push({
        application_id: `VALID-${index + 1}`,
        applicant_name: `${lawyer.Firstname} ${lawyer.Lastname}`.trim(),
        first_name: lawyer.Firstname,
        last_name: lawyer.Lastname,
        middle_name: lawyer['Middle Name'] || '',
        address: lawyer.Address,
        roll_number: lawyer['Roll No.'],
        expected_result: 'VERIFIED',
        expected_confidence: 100,
        test_description: 'Exact match from database'
      });
    });
    
    return validApplications;
  }

  /**
   * Generate invalid lawyer applications
   */
  generateInvalidLawyerApplications(count = 5) {
    const invalidApplications = [];
    const fakeNames = [
      { first: 'JOHN', last: 'NONEXISTENT' },
      { first: 'FAKE', last: 'LAWYER' },
      { first: 'INVALID', last: 'PERSON' },
      { first: 'TEST', last: 'DUMMY' },
      { first: 'BOGUS', last: 'ATTORNEY' }
    ];
    
    for (let i = 0; i < count; i++) {
      const fakeName = fakeNames[i] || { first: `FAKE${i}`, last: `LAWYER${i}` };
      invalidApplications.push({
        application_id: `INVALID-${i + 1}`,
        applicant_name: `${fakeName.first} ${fakeName.last}`,
        first_name: fakeName.first,
        last_name: fakeName.last,
        middle_name: 'X',
        address: `Fake Address ${i + 1}, Manila`,
        roll_number: `99999${i}`,
        expected_result: 'NOT_VERIFIED',
        expected_confidence: 0,
        test_description: 'Non-existent lawyer'
      });
    }
    
    return invalidApplications;
  }

  /**
   * Generate partial match applications (similar but not exact)
   */
  generatePartialMatchApplications(count = 5) {
    const partialMatches = [];
    const selectedLawyers = this.getRandomLawyers(count);
    
    selectedLawyers.forEach((lawyer, index) => {
      // Create variations that should partially match
      const variations = [
        {
          // Add suffix
          first_name: lawyer.Firstname,
          last_name: lawyer.Lastname,
          middle_name: lawyer['Middle Name'],
          suffix: 'JR',
          variation_type: 'suffix_added'
        },
        {
          // Slight name variation
          first_name: lawyer.Firstname,
          last_name: lawyer.Lastname + 'A',
          middle_name: lawyer['Middle Name'],
          variation_type: 'name_variation'
        },
        {
          // Different middle name
          first_name: lawyer.Firstname,
          last_name: lawyer.Lastname,
          middle_name: 'X',
          variation_type: 'middle_name_different'
        },
        {
          // Different address
          first_name: lawyer.Firstname,
          last_name: lawyer.Lastname,
          middle_name: lawyer['Middle Name'],
          address: 'Different City, Philippines',
          variation_type: 'address_different'
        }
      ];
      
      const variation = variations[index % variations.length];
      
      partialMatches.push({
        application_id: `PARTIAL-${index + 1}`,
        applicant_name: `${variation.first_name} ${variation.last_name}${variation.suffix ? ' ' + variation.suffix : ''}`.trim(),
        first_name: variation.first_name,
        last_name: variation.last_name,
        middle_name: variation.middle_name || '',
        address: variation.address || lawyer.Address,
        expected_result: 'PARTIAL_MATCH',
        expected_confidence_range: [70, 89],
        test_description: `Partial match - ${variation.variation_type}`,
        original_lawyer: lawyer
      });
    });
    
    return partialMatches;
  }

  /**
   * Generate applications that should match multiple lawyers
   */
  generateMultipleMatchApplications(count = 3) {
    const multipleMatches = [];
    
    // Find common last names in the database
    const lastNameCounts = {};
    this.lawyersData.forEach(lawyer => {
      const lastName = lawyer.Lastname;
      lastNameCounts[lastName] = (lastNameCounts[lastName] || 0) + 1;
    });
    
    // Get last names that appear multiple times
    const commonLastNames = Object.entries(lastNameCounts)
      .filter(([name, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([name]) => name);
    
    commonLastNames.forEach((lastName, index) => {
      const matchingLawyers = this.lawyersData.filter(lawyer => lawyer.Lastname === lastName);
      
      multipleMatches.push({
        application_id: `MULTIPLE-${index + 1}`,
        applicant_name: `COMMON ${lastName}`,
        first_name: 'COMMON',
        last_name: lastName,
        middle_name: 'M',
        address: 'Manila, Philippines',
        expected_result: 'MULTIPLE_MATCHES',
        expected_match_count: matchingLawyers.length,
        test_description: `Multiple matches for common last name: ${lastName}`,
        matching_lawyers: matchingLawyers
      });
    });
    
    return multipleMatches;
  }

  /**
   * Generate bulk test applications
   */
  generateBulkTestApplications(count = 20) {
    const bulkApplications = [];
    const validCount = Math.floor(count * 0.4); // 40% valid
    const invalidCount = Math.floor(count * 0.3); // 30% invalid
    const partialCount = count - validCount - invalidCount; // 30% partial
    
    // Add valid applications
    const validApps = this.generateValidLawyerApplications(validCount);
    validApps.forEach((app, index) => {
      app.application_id = `BULK-VALID-${index + 1}`;
      bulkApplications.push(app);
    });
    
    // Add invalid applications
    const invalidApps = this.generateInvalidLawyerApplications(invalidCount);
    invalidApps.forEach((app, index) => {
      app.application_id = `BULK-INVALID-${index + 1}`;
      bulkApplications.push(app);
    });
    
    // Add partial match applications
    const partialApps = this.generatePartialMatchApplications(partialCount);
    partialApps.forEach((app, index) => {
      app.application_id = `BULK-PARTIAL-${index + 1}`;
      bulkApplications.push(app);
    });
    
    // Shuffle the array to randomize order
    return this.shuffleArray(bulkApplications);
  }

  /**
   * Generate edge case applications for data validation testing
   */
  generateEdgeCaseApplications() {
    return [
      {
        application_id: 'EDGE-001',
        applicant_name: 'JOSÉ MARÍA RIZAL-SANTOS',
        first_name: 'JOSÉ MARÍA',
        last_name: 'RIZAL-SANTOS',
        middle_name: '',
        test_description: 'Special characters and hyphens',
        edge_case_type: 'special_characters'
      },
      {
        application_id: 'EDGE-002',
        applicant_name: '  LUIS   AMURAO  ',
        first_name: '  LUIS  ',
        last_name: '  AMURAO  ',
        middle_name: '  E  ',
        test_description: 'Extra spaces that need trimming',
        edge_case_type: 'extra_spaces'
      },
      {
        application_id: 'EDGE-003',
        applicant_name: 'Luis Amurao',
        first_name: 'Luis',
        last_name: 'Amurao',
        middle_name: 'e',
        test_description: 'Mixed case input',
        edge_case_type: 'mixed_case'
      },
      {
        application_id: 'EDGE-004',
        applicant_name: 'PEDRO REYES III',
        first_name: 'PEDRO',
        last_name: 'REYES',
        middle_name: 'III',
        test_description: 'Roman numerals and suffixes',
        edge_case_type: 'roman_numerals'
      },
      {
        application_id: 'EDGE-005',
        applicant_name: 'VERY LONG FIRSTNAME VERY LONG LASTNAME',
        first_name: 'VERY LONG FIRSTNAME',
        last_name: 'VERY LONG LASTNAME',
        middle_name: 'VERY LONG MIDDLE',
        test_description: 'Very long names',
        edge_case_type: 'long_names'
      },
      {
        application_id: 'EDGE-006',
        applicant_name: 'A B',
        first_name: 'A',
        last_name: 'B',
        middle_name: 'C',
        test_description: 'Single character names',
        edge_case_type: 'single_characters'
      }
    ];
  }

  /**
   * Get random lawyers from the database
   */
  getRandomLawyers(count) {
    const shuffled = this.shuffleArray([...this.lawyersData]);
    return shuffled.slice(0, count);
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Export test data to JSON files
   */
  exportTestData(outputDir = './test-data') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const allTestCases = this.generateAllTestCases();
    
    // Export each test case type to separate files
    Object.entries(allTestCases).forEach(([testType, data]) => {
      const filename = path.join(outputDir, `${testType}.json`);
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`Exported ${data.length} ${testType} test cases to ${filename}`);
    });

    // Export combined test data
    const combinedFilename = path.join(outputDir, 'all-test-cases.json');
    fs.writeFileSync(combinedFilename, JSON.stringify(allTestCases, null, 2));
    console.log(`Exported combined test data to ${combinedFilename}`);

    return allTestCases;
  }

  /**
   * Generate performance test data
   */
  generatePerformanceTestData(sizes = [10, 50, 100, 500, 1000]) {
    const performanceData = {};
    
    sizes.forEach(size => {
      performanceData[`bulk_${size}`] = this.generateBulkTestApplications(size);
    });
    
    return performanceData;
  }

  /**
   * Get database statistics
   */
  getDatabaseStats() {
    const stats = {
      total_lawyers: this.lawyersData.length,
      unique_last_names: new Set(this.lawyersData.map(l => l.Lastname)).size,
      unique_first_names: new Set(this.lawyersData.map(l => l.Firstname)).size,
      lawyers_with_middle_names: this.lawyersData.filter(l => l['Middle Name']).length,
      earliest_roll_date: this.lawyersData.reduce((earliest, lawyer) => {
        const date = new Date(lawyer['Roll Signed Date']);
        return date < earliest ? date : earliest;
      }, new Date()),
      latest_roll_date: this.lawyersData.reduce((latest, lawyer) => {
        const date = new Date(lawyer['Roll Signed Date']);
        return date > latest ? date : latest;
      }, new Date(0))
    };
    
    return stats;
  }
}

// Export for use in both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestDataGenerator;
} else if (typeof window !== 'undefined') {
  window.TestDataGenerator = TestDataGenerator;
}

// CLI usage
if (require.main === module) {
  const generator = new TestDataGenerator();
  const testData = generator.exportTestData();
  console.log('\nDatabase Statistics:');
  console.log(generator.getDatabaseStats());
  console.log('\nTest data generation completed!');
}
