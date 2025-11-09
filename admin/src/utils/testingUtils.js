/**
 * Comprehensive testing utilities for AI.ttorney admin system
 * Provides testing functions for all five management modules
 */

import { validateForm } from './dataValidation';
import ErrorHandler from './errorHandler';

/**
 * Test data generators for different modules
 */

// Generate test legal seeker data
export const generateTestLegalSeeker = (overrides = {}) => {
  const baseData = {
    email: `testuser${Date.now()}@example.com`,
    full_name: 'Test Legal Seeker',
    username: `testuser${Date.now()}`,
    password: 'TestPassword123!',
    birthdate: '1990-01-01',
    is_verified: false,
    phone_number: '+1234567890',
    address: '123 Test Street, Test City'
  };
  
  return { ...baseData, ...overrides };
};

// Generate test lawyer data
export const generateTestLawyer = (overrides = {}) => {
  const baseData = {
    email: `testlawyer${Date.now()}@example.com`,
    full_name: 'Test Lawyer',
    username: `testlawyer${Date.now()}`,
    roll_number: `TEST${Date.now()}`,
    roll_sign_date: '2020-01-01',
    status: 'active',
    accepting_consultations: true,
    consultation_rate: 1500.00,
    specializations: ['Criminal Law', 'Civil Law'],
    bio: 'Test lawyer with extensive experience in various legal fields.',
    years_of_experience: 5
  };
  
  return { ...baseData, ...overrides };
};

// Generate test admin data
export const generateTestAdmin = (overrides = {}) => {
  const baseData = {
    email: `testadmin${Date.now()}@example.com`,
    full_name: 'Test Admin',
    role: 'admin',
    status: 'active',
    password: 'AdminPassword123!'
  };
  
  return { ...baseData, ...overrides };
};

// Generate test glossary term data
export const generateTestGlossaryTerm = (overrides = {}) => {
  const baseData = {
    term_en: `Test Term ${Date.now()}`,
    term_fil: `Terminong Pagsubok ${Date.now()}`,
    definition_en: 'This is a test definition for the legal term.',
    definition_fil: 'Ito ay isang pagsubok na kahulugan para sa legal na termino.',
    example_en: 'Example usage of the test term in English.',
    example_fil: 'Halimbawa ng paggamit ng terminong pagsubok sa Filipino.',
    category: 'civil',
    is_verified: false
  };
  
  return { ...baseData, ...overrides };
};

// Generate test audit log data
export const generateTestAuditLog = (overrides = {}) => {
  const baseData = {
    action: 'Test Action',
    target_table: 'users',
    target_id: '123',
    actor_name: 'Test Admin',
    role: 'admin',
    metadata: {
      action_type: 'test',
      test_data: true
    }
  };
  
  return { ...baseData, ...overrides };
};

/**
 * Validation testing functions
 */

// Test form validation
export const testFormValidation = (formData, validationRules, expectedErrors = {}) => {
  const result = validateForm(formData, validationRules);
  
  const testResult = {
    passed: true,
    errors: [],
    details: {
      validationResult: result,
      expectedErrors,
      actualErrors: result.errors
    }
  };
  
  // Check if validation passed when it should have failed
  if (Object.keys(expectedErrors).length > 0 && result.isValid) {
    testResult.passed = false;
    testResult.errors.push('Validation should have failed but passed');
  }
  
  // Check if validation failed when it should have passed
  if (Object.keys(expectedErrors).length === 0 && !result.isValid) {
    testResult.passed = false;
    testResult.errors.push('Validation should have passed but failed');
  }
  
  // Check specific field errors
  for (const [field, expectedError] of Object.entries(expectedErrors)) {
    if (!result.errors[field]) {
      testResult.passed = false;
      testResult.errors.push(`Expected error for field '${field}' but none found`);
    } else if (!result.errors[field].includes(expectedError)) {
      testResult.passed = false;
      testResult.errors.push(`Expected error '${expectedError}' for field '${field}' but got '${result.errors[field]}'`);
    }
  }
  
  return testResult;
};

// Test email validation
export const testEmailValidation = () => {
  const tests = [
    { email: 'valid@example.com', shouldPass: true },
    { email: 'invalid-email', shouldPass: false },
    { email: '', shouldPass: false },
    { email: 'test@', shouldPass: false },
    { email: '@example.com', shouldPass: false },
    { email: 'test@example', shouldPass: false }
  ];
  
  const results = tests.map(test => {
    const validationRules = {
      email: { type: 'email' }
    };
    
    const result = testFormValidation(
      { email: test.email },
      validationRules,
      test.shouldPass ? {} : { email: 'Please enter a valid email address' }
    );
    
    return {
      input: test.email,
      expected: test.shouldPass ? 'pass' : 'fail',
      actual: result.passed ? 'pass' : 'fail',
      passed: result.passed,
      errors: result.errors
    };
  });
  
  return {
    totalTests: tests.length,
    passedTests: results.filter(r => r.passed).length,
    failedTests: results.filter(r => !r.passed).length,
    results
  };
};

// Test password validation
export const testPasswordValidation = () => {
  const tests = [
    { password: 'ValidPass123!', shouldPass: true },
    { password: 'weak', shouldPass: false },
    { password: 'NoNumbers!', shouldPass: false },
    { password: 'nonumbersorspecial', shouldPass: false },
    { password: 'NOLOWERCASE123!', shouldPass: false },
    { password: 'nouppercase123!', shouldPass: false }
  ];
  
  const results = tests.map(test => {
    const validationRules = {
      password: { type: 'password' }
    };
    
    const result = testFormValidation(
      { password: test.password },
      validationRules,
      test.shouldPass ? {} : { password: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' }
    );
    
    return {
      input: test.password,
      expected: test.shouldPass ? 'pass' : 'fail',
      actual: result.passed ? 'pass' : 'fail',
      passed: result.passed,
      errors: result.errors
    };
  });
  
  return {
    totalTests: tests.length,
    passedTests: results.filter(r => r.passed).length,
    failedTests: results.filter(r => !r.passed).length,
    results
  };
};

/**
 * API testing functions
 */

// Test API endpoint
export const testApiEndpoint = async (endpoint, method = 'GET', data = null, expectedStatus = 200) => {
  const testResult = {
    passed: false,
    response: null,
    error: null,
    timing: {
      start: Date.now(),
      end: null,
      duration: null
    }
  };
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(endpoint, options);
    testResult.timing.end = Date.now();
    testResult.timing.duration = testResult.timing.end - testResult.timing.start;
    
    testResult.response = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    };
    
    // Try to parse response body
    try {
      testResult.response.data = await response.json();
    } catch (e) {
      testResult.response.data = await response.text();
    }
    
    // Check if status matches expected
    testResult.passed = response.status === expectedStatus;
    
    if (!testResult.passed) {
      testResult.error = `Expected status ${expectedStatus} but got ${response.status}`;
    }
    
  } catch (error) {
    testResult.timing.end = Date.now();
    testResult.timing.duration = testResult.timing.end - testResult.timing.start;
    testResult.error = error.message;
    testResult.passed = false;
  }
  
  return testResult;
};

// Test CRUD operations for a module
export const testCrudOperations = async (baseUrl, testData, idField = 'id') => {
  const results = {
    create: null,
    read: null,
    update: null,
    delete: null,
    overall: false
  };
  
  let createdItemId = null;
  
  try {
    // Test CREATE
    console.log('Testing CREATE operation...');
    results.create = await testApiEndpoint(`${baseUrl}`, 'POST', testData, 201);
    
    if (results.create.passed && results.create.response.data) {
      createdItemId = results.create.response.data[idField];
      console.log(`✅ CREATE passed - Item created with ID: ${createdItemId}`);
    } else {
      console.log('❌ CREATE failed');
      return results;
    }
    
    // Test READ
    console.log('Testing READ operation...');
    results.read = await testApiEndpoint(`${baseUrl}/${createdItemId}`, 'GET', null, 200);
    
    if (results.read.passed) {
      console.log('✅ READ passed');
    } else {
      console.log('❌ READ failed');
    }
    
    // Test UPDATE
    console.log('Testing UPDATE operation...');
    const updateData = { ...testData, updated_field: 'test_update' };
    results.update = await testApiEndpoint(`${baseUrl}/${createdItemId}`, 'PATCH', updateData, 200);
    
    if (results.update.passed) {
      console.log('✅ UPDATE passed');
    } else {
      console.log('❌ UPDATE failed');
    }
    
    // Test DELETE
    console.log('Testing DELETE operation...');
    results.delete = await testApiEndpoint(`${baseUrl}/${createdItemId}`, 'DELETE', null, 200);
    
    if (results.delete.passed) {
      console.log('✅ DELETE passed');
    } else {
      console.log('❌ DELETE failed');
    }
    
    // Overall result
    results.overall = results.create.passed && results.read.passed && 
                     results.update.passed && results.delete.passed;
    
  } catch (error) {
    console.error('CRUD test error:', error);
    results.error = error.message;
  }
  
  return results;
};

/**
 * Module-specific testing functions
 */

// Test Legal Seekers module
export const testLegalSeekersModule = async () => {
  console.log('🧪 Testing Legal Seekers Module...');
  
  const testData = generateTestLegalSeeker();
  const results = await testCrudOperations('/api/users/legal-seekers', testData);
  
  // Additional validation tests
  const validationTests = {
    email: testEmailValidation(),
    password: testPasswordValidation()
  };
  
  return {
    crud: results,
    validation: validationTests,
    passed: results.overall && validationTests.email.failedTests === 0 && validationTests.password.failedTests === 0
  };
};

// Test Lawyers module
export const testLawyersModule = async () => {
  console.log('🧪 Testing Lawyers Module...');
  
  const testData = generateTestLawyer();
  const results = await testCrudOperations('/api/lawyers', testData);
  
  return {
    crud: results,
    passed: results.overall
  };
};

// Test Admin module
export const testAdminModule = async () => {
  console.log('🧪 Testing Admin Module...');
  
  const testData = generateTestAdmin();
  const results = await testCrudOperations('/api/admin', testData);
  
  return {
    crud: results,
    passed: results.overall
  };
};

// Test Glossary Terms module
export const testGlossaryTermsModule = async () => {
  console.log('🧪 Testing Glossary Terms Module...');
  
  const testData = generateTestGlossaryTerm();
  const results = await testCrudOperations('/api/glossary-terms', testData);
  
  return {
    crud: results,
    passed: results.overall
  };
};

// Test Audit Logs module
export const testAuditLogsModule = async () => {
  console.log('🧪 Testing Audit Logs Module...');
  
  // Audit logs are typically read-only, so we test READ operations
  const readTest = await testApiEndpoint('/api/audit-logs', 'GET', null, 200);
  
  return {
    read: readTest,
    passed: readTest.passed
  };
};

/**
 * Comprehensive test suite
 */
export const runComprehensiveTests = async () => {
  console.log('🚀 Starting Comprehensive Test Suite for AI.ttorney Admin System...');
  
  const startTime = Date.now();
  const results = {
    legalSeekers: null,
    lawyers: null,
    admin: null,
    glossaryTerms: null,
    auditLogs: null,
    overall: {
      passed: 0,
      failed: 0,
      total: 5,
      success: false
    }
  };
  
  try {
    // Test all modules
    results.legalSeekers = await testLegalSeekersModule();
    results.lawyers = await testLawyersModule();
    results.admin = await testAdminModule();
    results.glossaryTerms = await testGlossaryTermsModule();
    results.auditLogs = await testAuditLogsModule();
    
    // Calculate overall results
    const moduleResults = [
      results.legalSeekers.passed,
      results.lawyers.passed,
      results.admin.passed,
      results.glossaryTerms.passed,
      results.auditLogs.passed
    ];
    
    results.overall.passed = moduleResults.filter(Boolean).length;
    results.overall.failed = moduleResults.filter(r => !r).length;
    results.overall.success = results.overall.failed === 0;
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`\n📊 Test Suite Complete (${duration}ms)`);
    console.log(`✅ Passed: ${results.overall.passed}/${results.overall.total}`);
    console.log(`❌ Failed: ${results.overall.failed}/${results.overall.total}`);
    console.log(`🎯 Success Rate: ${((results.overall.passed / results.overall.total) * 100).toFixed(1)}%`);
    
    if (results.overall.success) {
      console.log('🎉 All tests passed! The admin system is stable and ready for production.');
    } else {
      console.log('⚠️ Some tests failed. Please review the results and fix issues before deployment.');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    results.error = error.message;
  }
  
  return results;
};

/**
 * Performance testing utilities
 */

// Test response time for critical operations
export const testPerformance = async (operations = []) => {
  const results = [];
  
  for (const operation of operations) {
    const startTime = performance.now();
    
    try {
      await operation.fn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      results.push({
        name: operation.name,
        duration,
        passed: duration <= (operation.maxDuration || 5000), // 5 second default
        status: 'success'
      });
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      results.push({
        name: operation.name,
        duration,
        passed: false,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return results;
};

// Export all testing utilities
export default {
  generateTestLegalSeeker,
  generateTestLawyer,
  generateTestAdmin,
  generateTestGlossaryTerm,
  generateTestAuditLog,
  testFormValidation,
  testEmailValidation,
  testPasswordValidation,
  testApiEndpoint,
  testCrudOperations,
  testLegalSeekersModule,
  testLawyersModule,
  testAdminModule,
  testGlossaryTermsModule,
  testAuditLogsModule,
  runComprehensiveTests,
  testPerformance
};
