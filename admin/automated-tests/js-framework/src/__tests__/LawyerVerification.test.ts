import { LawyerVerificationService, LawyerApplication, LawyerRecord } from '../services/LawyerVerificationService';
import fs from 'fs';
import path from 'path';

// Mock data for testing
const mockLawyersData: LawyerRecord[] = [
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
];

describe('LawyerVerificationService', () => {
  let verificationService: LawyerVerificationService;
  let mockDatabasePath: string;

  beforeAll(() => {
    // Create mock database file
    mockDatabasePath = path.join(__dirname, 'mock_lawyers.json');
    fs.writeFileSync(mockDatabasePath, JSON.stringify(mockLawyersData, null, 2));
  });

  beforeEach(() => {
    verificationService = new LawyerVerificationService(mockDatabasePath);
  });

  afterAll(() => {
    // Clean up mock database file
    if (fs.existsSync(mockDatabasePath)) {
      fs.unlinkSync(mockDatabasePath);
    }
  });

  describe('LV-001: Valid Lawyer Verification - Existing Lawyer in Database', () => {
    it('should verify an existing lawyer with exact match', async () => {
      const application: LawyerApplication = {
        applicant_name: "LUIS AMURAO",
        first_name: "LUIS",
        last_name: "AMURAO",
        middle_name: "E",
        address: "Bauan, Batangas",
        roll_number: "5",
        application_id: "APP-001"
      };

      const result = await verificationService.verifyLawyer(application);

      expect(result.isVerified).toBe(true);
      expect(result.matchType).toBe('EXACT');
      expect(result.confidence).toBeGreaterThan(90);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].Lastname).toBe('AMURAO');
      expect(result.matches[0]['Roll No.']).toBe('5');
      expect(result.processingTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('LV-002: Invalid Lawyer Verification - Non-existent Lawyer', () => {
    it('should reject non-existent lawyer', async () => {
      const application: LawyerApplication = {
        applicant_name: "JOHN NONEXISTENT",
        first_name: "JOHN",
        last_name: "NONEXISTENT",
        middle_name: "X",
        address: "Fake Address, Manila",
        roll_number: "999999",
        application_id: "APP-002"
      };

      const result = await verificationService.verifyLawyer(application);

      expect(result.isVerified).toBe(false);
      expect(result.matchType).toBe('NONE');
      expect(result.confidence).toBe(0);
      expect(result.matches).toHaveLength(0);
      expect(result.processingTime).toBeLessThan(1000);
    });
  });

  describe('LV-003: Partial Match Verification - Similar Name', () => {
    it('should handle partial matches with similarity scoring', async () => {
      const application: LawyerApplication = {
        applicant_name: "LUIS AMURAO JR",
        first_name: "LUIS",
        last_name: "AMURAO",
        middle_name: "E",
        address: "Bauan, Batangas",
        application_id: "APP-003"
      };

      const result = await verificationService.verifyLawyer(application);

      expect(result.matchType).toBe('PARTIAL');
      expect(result.confidence).toBeGreaterThan(70);
      expect(result.confidence).toBeLessThan(90);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].Lastname).toBe('AMURAO');
    });
  });

  describe('LV-004: Multiple Match Verification', () => {
    it('should handle multiple potential matches', async () => {
      const application: LawyerApplication = {
        applicant_name: "PEDRO REYES",
        first_name: "PEDRO",
        last_name: "REYES",
        middle_name: "C",
        address: "Manila",
        application_id: "APP-004"
      };

      const result = await verificationService.verifyLawyer(application);

      expect(result.matchType).toBe('MULTIPLE');
      expect(result.matches.length).toBeGreaterThan(1);
      expect(result.matches.every(match => match.Lastname === 'REYES')).toBe(true);
      // Should be sorted by similarity score (best match first)
      expect(result.matches[0].Firstname).toBe('PEDRO');
    });
  });

  describe('LV-005: Bulk Verification Process', () => {
    it('should process multiple applications efficiently', async () => {
      const applications: LawyerApplication[] = [
        {
          applicant_name: "LUIS AMURAO",
          first_name: "LUIS",
          last_name: "AMURAO",
          middle_name: "E",
          application_id: "APP-005"
        },
        {
          applicant_name: "FAKE LAWYER",
          first_name: "FAKE",
          last_name: "LAWYER",
          application_id: "APP-006"
        },
        {
          applicant_name: "FRANCISCO FABRO",
          first_name: "FRANCISCO",
          last_name: "FABRO",
          middle_name: "S",
          application_id: "APP-007"
        }
      ];

      const startTime = Date.now();
      const results = await verificationService.bulkVerifyLawyers(applications);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results[0].isVerified).toBe(true); // LUIS AMURAO
      expect(results[1].isVerified).toBe(false); // FAKE LAWYER
      expect(results[2].isVerified).toBe(true); // FRANCISCO FABRO
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('LV-006: Database Connection Error Handling', () => {
    it('should handle database unavailability gracefully', () => {
      expect(() => {
        new LawyerVerificationService('/nonexistent/path/lawyers.json');
      }).toThrow('Database unavailable');
    });

    it('should handle corrupted database gracefully', () => {
      const corruptedPath = path.join(__dirname, 'corrupted_lawyers.json');
      fs.writeFileSync(corruptedPath, 'invalid json content');

      expect(() => {
        new LawyerVerificationService(corruptedPath);
      }).toThrow('Database unavailable');

      // Clean up
      fs.unlinkSync(corruptedPath);
    });
  });

  describe('LV-007: Performance Test - Large Dataset Search', () => {
    it('should meet performance benchmarks for single search', async () => {
      const application: LawyerApplication = {
        applicant_name: "LUIS AMURAO",
        first_name: "LUIS",
        last_name: "AMURAO",
        middle_name: "E",
        application_id: "PERF-001"
      };

      const result = await verificationService.verifyLawyer(application);

      expect(result.processingTime).toBeLessThan(3000); // < 3 seconds target
    });

    it('should meet performance benchmarks for bulk operations', async () => {
      const applications: LawyerApplication[] = Array.from({ length: 10 }, (_, i) => ({
        applicant_name: `TEST LAWYER ${i}`,
        first_name: "TEST",
        last_name: "LAWYER",
        middle_name: `${i}`,
        application_id: `PERF-${i}`
      }));

      const startTime = Date.now();
      const results = await verificationService.bulkVerifyLawyers(applications);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(totalTime).toBeLessThan(30000); // < 30 seconds target for 10 applications
    });

    it('should provide database statistics', () => {
      const stats = verificationService.getDatabaseStats();
      
      expect(stats.totalRecords).toBe(mockLawyersData.length);
      expect(stats.databaseSize).toMatch(/\d+\.\d+ MB/);
    });
  });

  describe('LV-008: Data Validation and Sanitization', () => {
    it('should handle special characters in names', async () => {
      const application: LawyerApplication = {
        applicant_name: "JOSÉ MARÍA RIZAL-SANTOS",
        first_name: "JOSÉ MARÍA",
        last_name: "RIZAL-SANTOS",
        application_id: "APP-SPECIAL"
      };

      const result = await verificationService.verifyLawyer(application);
      
      expect(result).toBeDefined();
      expect(result.processingTime).toBeLessThan(1000);
    });

    it('should handle extra spaces and normalize input', async () => {
      const application: LawyerApplication = {
        applicant_name: "  LUIS   AMURAO  ",
        first_name: "  LUIS  ",
        last_name: "  AMURAO  ",
        middle_name: "  E  ",
        application_id: "APP-SPACES"
      };

      const result = await verificationService.verifyLawyer(application);
      
      expect(result.isVerified).toBe(true);
      expect(result.matches[0].Lastname).toBe('AMURAO');
    });

    it('should handle mixed case input', async () => {
      const application: LawyerApplication = {
        applicant_name: "Luis Amurao",
        first_name: "Luis",
        last_name: "Amurao",
        middle_name: "e",
        application_id: "APP-MIXED"
      };

      const result = await verificationService.verifyLawyer(application);
      
      expect(result.isVerified).toBe(true);
      expect(result.matches[0].Lastname).toBe('AMURAO');
    });

    it('should handle Roman numerals and suffixes', async () => {
      const application: LawyerApplication = {
        applicant_name: "PEDRO REYES III",
        first_name: "PEDRO",
        last_name: "REYES",
        middle_name: "III",
        application_id: "APP-ROMAN"
      };

      const result = await verificationService.verifyLawyer(application);
      
      expect(result).toBeDefined();
      expect(result.matchType).not.toBe('NONE');
    });

    it('should handle very long names gracefully', async () => {
      const application: LawyerApplication = {
        applicant_name: "VERY LONG FIRSTNAME VERY LONG LASTNAME",
        first_name: "VERY LONG FIRSTNAME",
        last_name: "VERY LONG LASTNAME",
        application_id: "APP-LONG"
      };

      const result = await verificationService.verifyLawyer(application);
      
      expect(result).toBeDefined();
      expect(result.processingTime).toBeLessThan(1000);
    });
  });
});
