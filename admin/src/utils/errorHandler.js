/**
 * Comprehensive error handling utilities for AI.ttorney admin system
 * Provides consistent error handling and user-friendly error messages
 */

// Error types
export const ERROR_TYPES = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NETWORK: 'network',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown'
};

// HTTP status code mappings
export const HTTP_STATUS_MESSAGES = {
  400: 'Bad Request - The request was invalid',
  401: 'Unauthorized - Please log in again',
  403: 'Forbidden - You do not have permission to perform this action',
  404: 'Not Found - The requested resource was not found',
  409: 'Conflict - This resource already exists or conflicts with existing data',
  422: 'Validation Error - Please check your input and try again',
  429: 'Too Many Requests - Please wait a moment before trying again',
  500: 'Internal Server Error - Something went wrong on our end',
  502: 'Bad Gateway - Service temporarily unavailable',
  503: 'Service Unavailable - The service is temporarily down',
  504: 'Gateway Timeout - The request took too long to process'
};

// User-friendly error messages for common scenarios
export const USER_FRIENDLY_MESSAGES = {
  // Authentication errors
  'invalid_credentials': 'Invalid email or password. Please try again.',
  'account_locked': 'Your account has been temporarily locked. Please contact support.',
  'session_expired': 'Your session has expired. Please log in again.',
  'token_invalid': 'Your session is invalid. Please log in again.',
  
  // Authorization errors
  'insufficient_permissions': 'You do not have permission to perform this action.',
  'admin_required': 'This action requires administrator privileges.',
  'superadmin_required': 'This action requires super administrator privileges.',
  
  // Validation errors
  'email_already_exists': 'An account with this email address already exists.',
  'username_taken': 'This username is already taken. Please choose another.',
  'invalid_email_format': 'Please enter a valid email address.',
  'password_too_weak': 'Password is too weak. Please use a stronger password.',
  'required_field_missing': 'Please fill in all required fields.',
  
  // Data errors
  'user_not_found': 'User not found. They may have been deleted or archived.',
  'resource_not_found': 'The requested item could not be found.',
  'duplicate_entry': 'This entry already exists in the system.',
  'invalid_data_format': 'The data format is invalid. Please check your input.',
  
  // Network errors
  'network_error': 'Network connection error. Please check your internet connection.',
  'request_timeout': 'The request timed out. Please try again.',
  'server_unreachable': 'Unable to reach the server. Please try again later.',
  
  // File errors
  'file_too_large': 'File is too large. Please choose a smaller file.',
  'invalid_file_type': 'Invalid file type. Please choose a supported file format.',
  'upload_failed': 'File upload failed. Please try again.',
  
  // Generic errors
  'operation_failed': 'Operation failed. Please try again.',
  'unexpected_error': 'An unexpected error occurred. Please try again or contact support.'
};

/**
 * Main error handler class
 */
export class ErrorHandler {
  /**
   * Parse and categorize an error
   */
  static parseError(error) {
    // Handle different error types
    if (error.response) {
      // HTTP response error
      return this.handleHttpError(error.response);
    } else if (error.request) {
      // Network error
      return this.handleNetworkError(error);
    } else if (error.name === 'ValidationError') {
      // Validation error
      return this.handleValidationError(error);
    } else {
      // Generic error
      return this.handleGenericError(error);
    }
  }

  /**
   * Handle HTTP response errors
   */
  static handleHttpError(response) {
    const status = response.status;
    const data = response.data || {};
    
    let errorType = ERROR_TYPES.SERVER;
    let message = HTTP_STATUS_MESSAGES[status] || 'An error occurred';
    let details = null;
    
    // Categorize by status code
    if (status >= 400 && status < 500) {
      errorType = status === 401 ? ERROR_TYPES.AUTHENTICATION :
                  status === 403 ? ERROR_TYPES.AUTHORIZATION :
                  status === 422 ? ERROR_TYPES.VALIDATION :
                  ERROR_TYPES.CLIENT;
    }
    
    // Use server-provided message if available
    if (data.error) {
      message = this.getUserFriendlyMessage(data.error) || data.error;
    } else if (data.message) {
      message = this.getUserFriendlyMessage(data.message) || data.message;
    }
    
    // Extract validation details if present
    if (data.details || data.errors) {
      details = data.details || data.errors;
    }
    
    return {
      type: errorType,
      message,
      details,
      status,
      code: data.code || null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error) {
    let message = 'Network connection error';
    
    if (error.code === 'ECONNABORTED') {
      message = 'Request timed out. Please try again.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      message = 'Unable to connect to the server. Please check your connection.';
    }
    
    return {
      type: ERROR_TYPES.NETWORK,
      message,
      details: null,
      status: null,
      code: error.code || null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(error) {
    return {
      type: ERROR_TYPES.VALIDATION,
      message: 'Please check your input and try again',
      details: error.details || error.errors || null,
      status: null,
      code: error.code || 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle generic errors
   */
  static handleGenericError(error) {
    let message = 'An unexpected error occurred';
    let errorType = ERROR_TYPES.UNKNOWN;
    
    if (error.message) {
      message = this.getUserFriendlyMessage(error.message) || error.message;
    }
    
    // Try to categorize by error message or type
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      errorType = ERROR_TYPES.CLIENT;
    }
    
    return {
      type: errorType,
      message,
      details: null,
      status: null,
      code: error.code || error.name || null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get user-friendly message for error code/message
   */
  static getUserFriendlyMessage(errorKey) {
    // Direct lookup
    if (USER_FRIENDLY_MESSAGES[errorKey]) {
      return USER_FRIENDLY_MESSAGES[errorKey];
    }
    
    // Pattern matching for common error patterns
    const lowerKey = errorKey.toLowerCase();
    
    if (lowerKey.includes('email') && lowerKey.includes('exist')) {
      return USER_FRIENDLY_MESSAGES.email_already_exists;
    }
    
    if (lowerKey.includes('username') && lowerKey.includes('taken')) {
      return USER_FRIENDLY_MESSAGES.username_taken;
    }
    
    if (lowerKey.includes('password') && lowerKey.includes('weak')) {
      return USER_FRIENDLY_MESSAGES.password_too_weak;
    }
    
    if (lowerKey.includes('not found')) {
      return USER_FRIENDLY_MESSAGES.resource_not_found;
    }
    
    if (lowerKey.includes('permission') || lowerKey.includes('forbidden')) {
      return USER_FRIENDLY_MESSAGES.insufficient_permissions;
    }
    
    if (lowerKey.includes('timeout')) {
      return USER_FRIENDLY_MESSAGES.request_timeout;
    }
    
    return null;
  }

  /**
   * Format error for display to user
   */
  static formatErrorForUser(error) {
    const parsedError = this.parseError(error);
    
    return {
      title: this.getErrorTitle(parsedError.type),
      message: parsedError.message,
      details: parsedError.details,
      type: parsedError.type,
      canRetry: this.canRetry(parsedError.type, parsedError.status),
      shouldReload: this.shouldReload(parsedError.type, parsedError.status)
    };
  }

  /**
   * Get appropriate error title based on type
   */
  static getErrorTitle(errorType) {
    switch (errorType) {
      case ERROR_TYPES.AUTHENTICATION:
        return 'Authentication Required';
      case ERROR_TYPES.AUTHORIZATION:
        return 'Access Denied';
      case ERROR_TYPES.VALIDATION:
        return 'Invalid Input';
      case ERROR_TYPES.NETWORK:
        return 'Connection Error';
      case ERROR_TYPES.SERVER:
        return 'Server Error';
      case ERROR_TYPES.CLIENT:
        return 'Application Error';
      default:
        return 'Error';
    }
  }

  /**
   * Determine if the operation can be retried
   */
  static canRetry(errorType, status) {
    // Don't retry authentication, authorization, or validation errors
    if ([ERROR_TYPES.AUTHENTICATION, ERROR_TYPES.AUTHORIZATION, ERROR_TYPES.VALIDATION].includes(errorType)) {
      return false;
    }
    
    // Don't retry client errors (4xx except 429)
    if (status >= 400 && status < 500 && status !== 429) {
      return false;
    }
    
    // Can retry network errors and server errors
    return [ERROR_TYPES.NETWORK, ERROR_TYPES.SERVER].includes(errorType) || status >= 500;
  }

  /**
   * Determine if the page should be reloaded
   */
  static shouldReload(errorType, status) {
    // Reload on authentication errors (session expired)
    if (errorType === ERROR_TYPES.AUTHENTICATION && status === 401) {
      return true;
    }
    
    // Reload on severe server errors
    if (status >= 500) {
      return false; // Don't auto-reload, let user decide
    }
    
    return false;
  }

  /**
   * Log error for debugging (in development) or monitoring (in production)
   */
  static logError(error, context = {}) {
    const parsedError = this.parseError(error);
    
    const logData = {
      ...parsedError,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: context.userId || null,
      sessionId: context.sessionId || null
    };
    
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Details');
      console.error('Error:', error);
      console.table(logData);
      console.groupEnd();
    }
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to monitoring service (e.g., Sentry, LogRocket, etc.)
      // this.sendToMonitoring(logData);
    }
    
    return logData;
  }

  /**
   * Create a standardized error response
   */
  static createErrorResponse(message, type = ERROR_TYPES.UNKNOWN, details = null) {
    return {
      success: false,
      error: {
        type,
        message,
        details,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Utility functions for common error scenarios
 */

// Handle API call errors with consistent formatting
export const handleApiError = (error, context = {}) => {
  const formattedError = ErrorHandler.formatErrorForUser(error);
  ErrorHandler.logError(error, context);
  return formattedError;
};

// Create validation error from form validation results
export const createValidationError = (validationResults) => {
  const details = {};
  
  for (const [field, errors] of Object.entries(validationResults.errors)) {
    details[field] = Array.isArray(errors) ? errors : [errors];
  }
  
  return ErrorHandler.createErrorResponse(
    'Please correct the following errors:',
    ERROR_TYPES.VALIDATION,
    details
  );
};

// Handle form submission errors
export const handleFormError = (error, formData = {}) => {
  const context = {
    formFields: Object.keys(formData),
    action: 'form_submission'
  };
  
  return handleApiError(error, context);
};

// Handle file upload errors
export const handleFileUploadError = (error, file = null) => {
  const context = {
    fileName: file?.name || null,
    fileSize: file?.size || null,
    fileType: file?.type || null,
    action: 'file_upload'
  };
  
  return handleApiError(error, context);
};

// Handle authentication errors
export const handleAuthError = (error) => {
  const context = {
    action: 'authentication',
    currentPath: window.location.pathname
  };
  
  const formattedError = handleApiError(error, context);
  
  // Redirect to login if session expired
  if (formattedError.shouldReload || formattedError.type === ERROR_TYPES.AUTHENTICATION) {
    // Clear local storage and redirect
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/login';
  }
  
  return formattedError;
};

// Export the main error handler
export default ErrorHandler;
