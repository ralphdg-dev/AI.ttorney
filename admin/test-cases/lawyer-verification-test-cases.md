# Lawyer Verification Test Cases

## Test Case 1: Valid Lawyer Verification - Existing Lawyer in Database

**Test Title:** Verify Valid Lawyer Application with Existing Database Record

**Test Description:** Test the verification process for a lawyer application where the applicant exists in the official Philippine lawyers database (lawyers_list.json)

**Module Name:** Manage Lawyer Applications - Lawyer Verification

**Test ID:** LV-001

**Precondition:** 
- Admin is logged into the system
- Lawyer application exists in pending status
- lawyers_list.json database is loaded and accessible
- Admin has appropriate permissions to verify lawyer applications

**Executed By:** Admin User

**Test Date:** [To be filled during execution]

**Test Steps:**
1. Navigate to Admin Dashboard > Manage Lawyer Applications
2. Select a pending lawyer application
3. Click "Verify" button
4. System searches lawyers_list.json for matching records
5. Review the verification results displayed
6. Click "Approve" if verification is successful

**Test Data:**
```json
Sample Application Data:
{
  "applicant_name": "LUIS AMURAO",
  "first_name": "LUIS",
  "last_name": "AMURAO", 
  "middle_name": "E",
  "address": "Bauan, Batangas",
  "roll_number": "5",
  "application_id": "APP-001"
}

Expected Match in lawyers_list.json:
{
  "Lastname": "AMURAO",
  "Firstname": "LUIS", 
  "Middle Name": "E",
  "Address": "Bauan, Batangas",
  "Roll Signed Date": "May 8, 1946",
  "Roll No.": "5"
}
```

**Expected Result:**
- System finds exact match in lawyers_list.json
- Verification status shows "VERIFIED" with green indicator
- Match details are displayed (Roll No., Address, Roll Signed Date)
- "Approve" button becomes enabled
- Verification confidence score shows 100%

**Actual Result:** [To be filled during execution]

**Pass/Fail:** [To be determined]

**Notes:** This test uses actual data from the lawyers_list.json database to ensure realistic verification scenarios.

---

## Test Case 2: Invalid Lawyer Verification - Non-existent Lawyer

**Test Title:** Verify Invalid Lawyer Application with No Database Match

**Test Description:** Test the verification process for a lawyer application where the applicant does not exist in the official Philippine lawyers database

**Module Name:** Manage Lawyer Applications - Lawyer Verification

**Test ID:** LV-002

**Precondition:**
- Admin is logged into the system
- Lawyer application exists in pending status
- lawyers_list.json database is loaded and accessible
- Admin has appropriate permissions to verify lawyer applications

**Executed By:** Admin User

**Test Date:** [To be filled during execution]

**Test Steps:**
1. Navigate to Admin Dashboard > Manage Lawyer Applications
2. Select a pending lawyer application with non-existent lawyer data
3. Click "Verify" button
4. System searches lawyers_list.json for matching records
5. Review the verification results displayed
6. System should show "No Match Found"

**Test Data:**
```json
Sample Application Data:
{
  "applicant_name": "JOHN NONEXISTENT",
  "first_name": "JOHN",
  "last_name": "NONEXISTENT",
  "middle_name": "X",
  "address": "Fake Address, Manila",
  "roll_number": "999999",
  "application_id": "APP-002"
}
```

**Expected Result:**
- System finds no match in lawyers_list.json
- Verification status shows "NOT VERIFIED" with red indicator
- Message displays "No matching lawyer found in official database"
- "Reject" button becomes enabled
- "Approve" button remains disabled
- Verification confidence score shows 0%

**Actual Result:** [To be filled during execution]

**Pass/Fail:** [To be determined]

**Notes:** This test ensures the system properly handles cases where applicants are not legitimate lawyers.

---

## Test Case 3: Partial Match Verification - Similar Name

**Test Title:** Verify Lawyer Application with Partial Name Match

**Test Description:** Test the verification process when there's a partial match (similar but not exact name) in the database

**Module Name:** Manage Lawyer Applications - Lawyer Verification

**Test ID:** LV-003

**Precondition:**
- Admin is logged into the system
- Lawyer application exists in pending status
- lawyers_list.json database is loaded and accessible
- Admin has appropriate permissions to verify lawyer applications

**Executed By:** Admin User

**Test Date:** [To be filled during execution]

**Test Steps:**
1. Navigate to Admin Dashboard > Manage Lawyer Applications
2. Select a pending lawyer application with similar name to existing lawyer
3. Click "Verify" button
4. System searches lawyers_list.json for matching records
5. Review partial match results displayed
6. Admin makes decision based on similarity score

**Test Data:**
```json
Sample Application Data:
{
  "applicant_name": "LUIS AMURAO JR",
  "first_name": "LUIS",
  "last_name": "AMURAO",
  "middle_name": "E",
  "suffix": "JR",
  "address": "Bauan, Batangas",
  "application_id": "APP-003"
}

Potential Match in lawyers_list.json:
{
  "Lastname": "AMURAO",
  "Firstname": "LUIS",
  "Middle Name": "E", 
  "Address": "Bauan, Batangas",
  "Roll Signed Date": "May 8, 1946",
  "Roll No.": "5"
}
```

**Expected Result:**
- System finds partial match in lawyers_list.json
- Verification status shows "PARTIAL MATCH" with yellow indicator
- Similarity score displayed (e.g., 85%)
- Both "Approve" and "Reject" buttons are enabled
- Admin can review match details and make informed decision
- System highlights differences (e.g., missing suffix in database)

**Actual Result:** [To be filled during execution]

**Pass/Fail:** [To be determined]

**Notes:** This test covers edge cases where names might have slight variations due to suffixes, nicknames, or data entry differences.

---

## Test Case 4: Multiple Match Verification

**Test Title:** Verify Lawyer Application with Multiple Potential Matches

**Test Description:** Test the verification process when multiple similar records exist in the database

**Module Name:** Manage Lawyer Applications - Lawyer Verification

**Test ID:** LV-004

**Precondition:**
- Admin is logged into the system
- Lawyer application exists in pending status
- lawyers_list.json database contains multiple lawyers with similar names
- Admin has appropriate permissions to verify lawyer applications

**Executed By:** Admin User

**Test Date:** [To be filled during execution]

**Test Steps:**
1. Navigate to Admin Dashboard > Manage Lawyer Applications
2. Select a pending lawyer application with common name
3. Click "Verify" button
4. System searches lawyers_list.json and finds multiple matches
5. Review all potential matches displayed
6. Select the most appropriate match or reject if none match

**Test Data:**
```json
Sample Application Data:
{
  "applicant_name": "PEDRO REYES",
  "first_name": "PEDRO",
  "last_name": "REYES",
  "middle_name": "C",
  "address": "Manila",
  "application_id": "APP-004"
}

Multiple Potential Matches:
[
  {
    "Lastname": "REYES",
    "Firstname": "GUILLERMO",
    "Middle Name": "J",
    "Address": "Zamboanga, Zamboanga",
    "Roll No.": "33"
  },
  {
    "Lastname": "REYES", 
    "Firstname": "PEDRO",
    "Middle Name": "A",
    "Address": "Quezon City",
    "Roll No.": "156"
  }
]
```

**Expected Result:**
- System displays multiple potential matches
- Each match shows similarity score
- Matches are ranked by relevance/similarity
- Admin can select specific match or mark as "No suitable match"
- Clear indication of which fields match/don't match for each option
- Admin can approve with selected match or reject application

**Actual Result:** [To be filled during execution]

**Pass/Fail:** [To be determined]

**Notes:** This test ensures the system handles common names appropriately and provides clear options for admin decision-making.

---

## Test Case 5: Bulk Verification Process

**Test Title:** Bulk Verify Multiple Lawyer Applications

**Test Description:** Test the bulk verification feature for processing multiple lawyer applications simultaneously

**Module Name:** Manage Lawyer Applications - Bulk Verification

**Test ID:** LV-005

**Precondition:**
- Admin is logged into the system
- Multiple lawyer applications exist in pending status (minimum 5)
- lawyers_list.json database is loaded and accessible
- Admin has appropriate permissions for bulk operations

**Executed By:** Admin User

**Test Date:** [To be filled during execution]

**Test Steps:**
1. Navigate to Admin Dashboard > Manage Lawyer Applications
2. Select multiple pending applications using checkboxes
3. Click "Bulk Verify" button
4. System processes all selected applications against lawyers_list.json
5. Review bulk verification results
6. Process individual results (approve/reject/review)

**Test Data:**
```json
Sample Bulk Applications:
[
  {
    "application_id": "APP-005",
    "name": "LUIS AMURAO",
    "expected_result": "VERIFIED"
  },
  {
    "application_id": "APP-006", 
    "name": "FAKE LAWYER",
    "expected_result": "NOT VERIFIED"
  },
  {
    "application_id": "APP-007",
    "name": "PEDRO REYES",
    "expected_result": "MULTIPLE MATCHES"
  },
  {
    "application_id": "APP-008",
    "name": "FRANCISCO FABRO",
    "expected_result": "VERIFIED"
  },
  {
    "application_id": "APP-009",
    "name": "JOHN SMITH",
    "expected_result": "NOT VERIFIED"
  }
]
```

**Expected Result:**
- System processes all selected applications
- Progress indicator shows verification status
- Results summary displays:
  - Total processed: 5
  - Verified: 2
  - Not verified: 2  
  - Partial/Multiple matches: 1
- Individual results are accessible for review
- Bulk actions available for verified applications
- Performance is acceptable (< 30 seconds for 5 applications)

**Actual Result:** [To be filled during execution]

**Pass/Fail:** [To be determined]

**Notes:** This test ensures the system can handle bulk operations efficiently while maintaining accuracy.

---

## Test Case 6: Database Connection Error Handling

**Test Title:** Handle Database Connection Errors During Verification

**Test Description:** Test system behavior when lawyers_list.json database is unavailable or corrupted

**Module Name:** Manage Lawyer Applications - Error Handling

**Test ID:** LV-006

**Precondition:**
- Admin is logged into the system
- Lawyer application exists in pending status
- lawyers_list.json database is temporarily unavailable or corrupted

**Executed By:** Admin User

**Test Date:** [To be filled during execution]

**Test Steps:**
1. Simulate database unavailability (rename/move lawyers_list.json)
2. Navigate to Admin Dashboard > Manage Lawyer Applications
3. Select a pending lawyer application
4. Click "Verify" button
5. Observe system error handling
6. Restore database and retry verification

**Test Data:**
```json
Sample Application Data:
{
  "applicant_name": "LUIS AMURAO",
  "first_name": "LUIS", 
  "last_name": "AMURAO",
  "middle_name": "E",
  "application_id": "APP-010"
}
```

**Expected Result:**
- System displays appropriate error message
- Error message: "Verification database temporarily unavailable. Please try again later."
- Verification status shows "ERROR" with appropriate icon
- "Retry" button is available
- Application remains in pending status
- System logs error for administrator review
- No system crash or data corruption

**Actual Result:** [To be filled during execution]

**Pass/Fail:** [To be determined]

**Notes:** This test ensures robust error handling and system stability during database issues.

---

## Test Case 7: Performance Test - Large Dataset Search

**Test Title:** Performance Test for Lawyer Verification with Large Dataset

**Test Description:** Test system performance when searching through the complete lawyers_list.json database (18MB+ file)

**Module Name:** Manage Lawyer Applications - Performance

**Test ID:** LV-007

**Precondition:**
- Admin is logged into the system
- Complete lawyers_list.json database is loaded (full 18MB file)
- System performance monitoring tools are available
- Multiple lawyer applications exist for testing

**Executed By:** Admin User

**Test Date:** [To be filled during execution]

**Test Steps:**
1. Navigate to Admin Dashboard > Manage Lawyer Applications
2. Record baseline system performance metrics
3. Perform single lawyer verification
4. Record search completion time
5. Perform bulk verification (10 applications)
6. Record bulk processing time
7. Monitor system resource usage

**Test Data:**
```json
Performance Metrics to Track:
{
  "database_size": "18MB+",
  "total_lawyer_records": "~100,000+",
  "single_search_target": "< 3 seconds",
  "bulk_search_target": "< 30 seconds for 10 applications",
  "memory_usage_limit": "< 500MB",
  "cpu_usage_limit": "< 80%"
}
```

**Expected Result:**
- Single lawyer verification completes within 3 seconds
- Bulk verification (10 applications) completes within 30 seconds
- Memory usage remains below 500MB during operations
- CPU usage stays below 80% during peak processing
- System remains responsive during verification
- No memory leaks detected after multiple operations
- Search results are accurate despite performance optimizations

**Actual Result:** [To be filled during execution]

**Pass/Fail:** [To be determined]

**Notes:** This test ensures the system can handle the large Philippine lawyers database efficiently in production.

---

## Test Case 8: Data Validation and Sanitization

**Test Title:** Validate Input Data Sanitization During Verification

**Test Description:** Test system handling of malformed, special characters, and edge case data in lawyer applications

**Module Name:** Manage Lawyer Applications - Data Validation

**Test ID:** LV-008

**Precondition:**
- Admin is logged into the system
- Test applications with various data formats exist
- lawyers_list.json database is loaded and accessible

**Executed By:** Admin User

**Test Date:** [To be filled during execution]

**Test Steps:**
1. Create test applications with edge case data
2. Navigate to Admin Dashboard > Manage Lawyer Applications
3. Attempt verification with each test case
4. Observe data sanitization and matching behavior
5. Verify system stability with malformed data

**Test Data:**
```json
Edge Case Test Data:
[
  {
    "case": "Special Characters",
    "name": "JOSÉ MARÍA RIZAL-SANTOS",
    "expected": "Should handle accents and hyphens"
  },
  {
    "case": "Extra Spaces",
    "name": "  LUIS   AMURAO  ",
    "expected": "Should trim and normalize spaces"
  },
  {
    "case": "Mixed Case",
    "name": "Luis Amurao",
    "expected": "Should handle case-insensitive matching"
  },
  {
    "case": "Numbers in Name",
    "name": "PEDRO REYES III",
    "expected": "Should handle Roman numerals"
  },
  {
    "case": "Very Long Name",
    "name": "VERY LONG FIRSTNAME VERY LONG LASTNAME",
    "expected": "Should handle long names gracefully"
  }
]
```

**Expected Result:**
- System properly sanitizes input data
- Special characters are handled correctly
- Case-insensitive matching works
- Extra spaces are trimmed
- Roman numerals and suffixes are processed
- Long names don't cause system errors
- Matching algorithm remains accurate with sanitized data
- No SQL injection or security vulnerabilities

**Actual Result:** [To be filled during execution]

**Pass/Fail:** [To be determined]

**Notes:** This test ensures data integrity and security during the verification process.

---

## Test Environment Setup

### Required Test Data Files:
- `lawyers_list.json` - Complete Philippine lawyers database (18MB+)
- Sample lawyer applications in various states
- Test user accounts with admin privileges

### System Requirements:
- Admin panel access
- Database connectivity
- Performance monitoring tools
- Error logging capabilities

### Test Execution Guidelines:
1. Execute tests in order (LV-001 through LV-008)
2. Document actual results immediately after execution
3. Take screenshots of verification interfaces
4. Record performance metrics where applicable
5. Report any bugs or unexpected behavior immediately

### Success Criteria:
- All verification functions work correctly with real lawyer data
- System handles edge cases and errors gracefully
- Performance meets acceptable standards for production use
- Data integrity is maintained throughout the process
- Security vulnerabilities are not present

---

*Last Updated: [Date]*
*Test Suite Version: 1.0*
*Compatible with: AI.ttorney Admin Panel v1.0*
