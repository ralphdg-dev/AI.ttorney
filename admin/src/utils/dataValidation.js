/**
 * Comprehensive data validation utilities for AI.ttorney admin system
 * Ensures data consistency across all management modules
 */

// Email validation
export const validateEmail = (email) => {
  const errors = [];
  
  if (!email || !email.trim()) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    errors.push('Please enter a valid email address');
  }
  
  if (email.length > 255) {
    errors.push('Email address is too long (maximum 255 characters)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: email.trim().toLowerCase()
  };
};

// Password validation
export const validatePassword = (password, confirmPassword = null) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password is too long (maximum 128 characters)');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'admin123', 'password123',
    'welcome123', 'letmein123', 'changeme123'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password');
  }
  
  // Confirm password validation
  if (confirmPassword !== null && password !== confirmPassword) {
    errors.push('Passwords do not match');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

// Calculate password strength
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  // Length bonus
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // Character variety bonus
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) score += 1;
  
  // Complexity bonus
  if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) score += 1;
  
  if (score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  if (score <= 7) return 'strong';
  return 'very-strong';
};

// Name validation
export const validateName = (name, fieldName = 'Name', minLength = 2, maxLength = 100) => {
  const errors = [];
  
  if (!name || !name.trim()) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters long`);
  }
  
  if (trimmedName.length > maxLength) {
    errors.push(`${fieldName} must be less than ${maxLength} characters long`);
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedName)) {
    errors.push(`${fieldName} can only contain letters, spaces, hyphens, apostrophes, and periods`);
  }
  
  // Check for reasonable format
  if (/^\s|\s$/.test(name)) {
    errors.push(`${fieldName} cannot start or end with spaces`);
  }
  
  if (/\s{2,}/.test(trimmedName)) {
    errors.push(`${fieldName} cannot contain multiple consecutive spaces`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedName.replace(/\s+/g, ' ')
  };
};

// Username validation
export const validateUsername = (username, minLength = 3, maxLength = 30) => {
  const errors = [];
  
  if (!username || !username.trim()) {
    errors.push('Username is required');
    return { isValid: false, errors };
  }
  
  const trimmedUsername = username.trim();
  
  if (trimmedUsername.length < minLength) {
    errors.push(`Username must be at least ${minLength} characters long`);
  }
  
  if (trimmedUsername.length > maxLength) {
    errors.push(`Username must be less than ${maxLength} characters long`);
  }
  
  // Check for valid characters (alphanumeric and underscores only)
  if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  // Cannot start with number or underscore
  if (/^[0-9_]/.test(trimmedUsername)) {
    errors.push('Username cannot start with a number or underscore');
  }
  
  // Cannot end with underscore
  if (/_$/.test(trimmedUsername)) {
    errors.push('Username cannot end with an underscore');
  }
  
  // Check for reserved usernames
  const reservedUsernames = [
    'admin', 'administrator', 'root', 'system', 'api', 'www', 'mail',
    'support', 'help', 'info', 'contact', 'service', 'user', 'guest',
    'anonymous', 'null', 'undefined', 'test', 'demo'
  ];
  
  if (reservedUsernames.includes(trimmedUsername.toLowerCase())) {
    errors.push('This username is reserved and cannot be used');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedUsername.toLowerCase()
  };
};

// Phone number validation
export const validatePhoneNumber = (phoneNumber, required = false) => {
  const errors = [];
  
  if (!phoneNumber || !phoneNumber.trim()) {
    if (required) {
      errors.push('Phone number is required');
    }
    return { isValid: !required, errors };
  }
  
  const trimmedPhone = phoneNumber.trim();
  
  // Remove common formatting characters for validation
  const cleanPhone = trimmedPhone.replace(/[\s\-\(\)\+\.]/g, '');
  
  // Check if it contains only digits after cleaning
  if (!/^\d+$/.test(cleanPhone)) {
    errors.push('Phone number can only contain digits, spaces, hyphens, parentheses, and plus sign');
  }
  
  // Check length (international format consideration)
  if (cleanPhone.length < 7 || cleanPhone.length > 15) {
    errors.push('Phone number must be between 7 and 15 digits long');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedPhone
  };
};

// Date validation
export const validateDate = (dateString, fieldName = 'Date', options = {}) => {
  const errors = [];
  const {
    required = false,
    minAge = null,
    maxAge = null,
    futureAllowed = false,
    pastRequired = false
  } = options;
  
  if (!dateString || !dateString.trim()) {
    if (required) {
      errors.push(`${fieldName} is required`);
    }
    return { isValid: !required, errors };
  }
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    errors.push(`Please enter a valid ${fieldName.toLowerCase()}`);
    return { isValid: false, errors };
  }
  
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  
  // Adjust age if birthday hasn't occurred this year
  const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate()) 
    ? age - 1 
    : age;
  
  // Future date validation
  if (!futureAllowed && date > today) {
    errors.push(`${fieldName} cannot be in the future`);
  }
  
  // Past date validation
  if (pastRequired && date >= today) {
    errors.push(`${fieldName} must be in the past`);
  }
  
  // Age validation
  if (minAge !== null && adjustedAge < minAge) {
    errors.push(`Age must be at least ${minAge} years`);
  }
  
  if (maxAge !== null && adjustedAge > maxAge) {
    errors.push(`Age cannot exceed ${maxAge} years`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: date.toISOString().split('T')[0],
    age: adjustedAge
  };
};

// Text content validation
export const validateTextContent = (content, fieldName = 'Content', options = {}) => {
  const errors = [];
  const {
    required = false,
    minLength = 0,
    maxLength = 1000,
    allowHtml = false,
    allowSpecialChars = true
  } = options;
  
  if (!content || !content.trim()) {
    if (required) {
      errors.push(`${fieldName} is required`);
    }
    return { isValid: !required, errors };
  }
  
  const trimmedContent = content.trim();
  
  if (trimmedContent.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters long`);
  }
  
  if (trimmedContent.length > maxLength) {
    errors.push(`${fieldName} must be less than ${maxLength} characters long`);
  }
  
  // HTML validation
  if (!allowHtml && /<[^>]*>/g.test(trimmedContent)) {
    errors.push(`${fieldName} cannot contain HTML tags`);
  }
  
  // Special characters validation
  if (!allowSpecialChars && /[<>{}[\]\\\/\^`|]/.test(trimmedContent)) {
    errors.push(`${fieldName} contains invalid special characters`);
  }
  
  // Check for potentially malicious content
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  if (maliciousPatterns.some(pattern => pattern.test(trimmedContent))) {
    errors.push(`${fieldName} contains potentially unsafe content`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedContent,
    wordCount: trimmedContent.split(/\s+/).length
  };
};

// Numeric validation
export const validateNumber = (value, fieldName = 'Number', options = {}) => {
  const errors = [];
  const {
    required = false,
    min = null,
    max = null,
    integer = false,
    positive = false
  } = options;
  
  if (value === null || value === undefined || value === '') {
    if (required) {
      errors.push(`${fieldName} is required`);
    }
    return { isValid: !required, errors };
  }
  
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    errors.push(`${fieldName} must be a valid number`);
    return { isValid: false, errors };
  }
  
  if (integer && !Number.isInteger(numValue)) {
    errors.push(`${fieldName} must be a whole number`);
  }
  
  if (positive && numValue <= 0) {
    errors.push(`${fieldName} must be a positive number`);
  }
  
  if (min !== null && numValue < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  }
  
  if (max !== null && numValue > max) {
    errors.push(`${fieldName} cannot exceed ${max}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: numValue
  };
};

// Role validation
export const validateRole = (role, allowedRoles = ['admin', 'superadmin']) => {
  const errors = [];
  
  if (!role || !role.trim()) {
    errors.push('Role is required');
    return { isValid: false, errors };
  }
  
  const trimmedRole = role.trim().toLowerCase();
  
  if (!allowedRoles.includes(trimmedRole)) {
    errors.push(`Role must be one of: ${allowedRoles.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedRole
  };
};

// Status validation
export const validateStatus = (status, allowedStatuses = ['active', 'inactive', 'suspended']) => {
  const errors = [];
  
  if (!status || !status.trim()) {
    errors.push('Status is required');
    return { isValid: false, errors };
  }
  
  const trimmedStatus = status.trim().toLowerCase();
  
  if (!allowedStatuses.includes(trimmedStatus)) {
    errors.push(`Status must be one of: ${allowedStatuses.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedStatus
  };
};

// Comprehensive form validation
export const validateForm = (formData, validationRules) => {
  const errors = {};
  const sanitizedData = {};
  let isValid = true;
  
  for (const [fieldName, rules] of Object.entries(validationRules)) {
    const fieldValue = formData[fieldName];
    let fieldResult = { isValid: true, errors: [], sanitized: fieldValue };
    
    // Apply validation rules based on field type
    switch (rules.type) {
      case 'email':
        fieldResult = validateEmail(fieldValue);
        break;
      case 'password':
        fieldResult = validatePassword(fieldValue, formData[rules.confirmField]);
        break;
      case 'name':
        fieldResult = validateName(fieldValue, rules.label, rules.minLength, rules.maxLength);
        break;
      case 'username':
        fieldResult = validateUsername(fieldValue, rules.minLength, rules.maxLength);
        break;
      case 'phone':
        fieldResult = validatePhoneNumber(fieldValue, rules.required);
        break;
      case 'date':
        fieldResult = validateDate(fieldValue, rules.label, rules.options);
        break;
      case 'text':
        fieldResult = validateTextContent(fieldValue, rules.label, rules.options);
        break;
      case 'number':
        fieldResult = validateNumber(fieldValue, rules.label, rules.options);
        break;
      case 'role':
        fieldResult = validateRole(fieldValue, rules.allowedValues);
        break;
      case 'status':
        fieldResult = validateStatus(fieldValue, rules.allowedValues);
        break;
      default:
        // Custom validation function
        if (typeof rules.validator === 'function') {
          fieldResult = rules.validator(fieldValue, formData);
        }
    }
    
    if (!fieldResult.isValid) {
      errors[fieldName] = fieldResult.errors;
      isValid = false;
    } else if (fieldResult.sanitized !== undefined) {
      sanitizedData[fieldName] = fieldResult.sanitized;
    }
  }
  
  return {
    isValid,
    errors,
    sanitizedData
  };
};

// Export all validation functions
export default {
  validateEmail,
  validatePassword,
  validateName,
  validateUsername,
  validatePhoneNumber,
  validateDate,
  validateTextContent,
  validateNumber,
  validateRole,
  validateStatus,
  validateForm
};
