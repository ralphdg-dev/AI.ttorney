/**
 * Public Routes Security Configuration
 * Industry-grade security for public routes following OWASP best practices
 * DRY principle: Single source of truth for all public route security
 */

import { NetworkConfig } from '../utils/networkConfig';

// ============================================================================
// SECURITY CONSTANTS (Single Source of Truth)
// ============================================================================

/**
 * Rate limiting configuration for public routes
 * Prevents abuse and DDoS attacks
 */
export const PUBLIC_ROUTE_RATE_LIMITS = {
  // Guest chatbot: 15 prompts per session (24 hours)
  GUEST_CHATBOT_LIMIT: 15,
  GUEST_SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  
  // API rate limits (per IP address)
  API_REQUESTS_PER_MINUTE: 60,
  API_REQUESTS_PER_HOUR: 1000,
  
  // Page view limits (prevent scraping)
  PAGE_VIEWS_PER_MINUTE: 30,
  PAGE_VIEWS_PER_HOUR: 500,
} as const;

/**
 * Get Content Security Policy for public routes
 * Dynamically includes the API URL from NetworkConfig (auto IP detection)
 * Prevents XSS, clickjacking, and other injection attacks
 */
export const getPublicRouteCSP = () => {
  const apiUrl = NetworkConfig.getApiUrl();
  
  return {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // React Native requires unsafe-eval
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", apiUrl], // Auto-detected API URL from NetworkConfig
    'frame-ancestors': ["'none'"], // Prevent clickjacking
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };
};

/**
 * Public routes that are safe for guest access
 * Centralized list following DRY principle
 */
export const PUBLIC_ROUTES = [
  // Authentication
  '/',
  '/index',
  '/login',
  '/onboarding/registration',
  '/onboarding/verify-otp',
  '/unauthorized',
  
  // Educational content (read-only, no sensitive data)
  '/guides',
  '/glossary',
  '/article',
  '/chatbot', // Rate-limited to 15 prompts
  
  // Legal/informational pages
  '/help',
  '/about',
  '/settings/privacy-policy',
  '/settings/terms',
  '/settings/about-us',
] as const;

/**
 * Routes that require additional security measures
 */
export const SENSITIVE_PUBLIC_ROUTES = [
  '/chatbot', // Rate-limited, prompt tracking
] as const;

// ============================================================================
// SECURITY VALIDATION FUNCTIONS (DRY Principle)
// ============================================================================

/**
 * Validate if a route is public
 * @param path - Route path to check
 * @returns True if route is public
 */
export const isPublicRoute = (path: string): boolean => {
  // Exact match
  if (PUBLIC_ROUTES.includes(path as any)) {
    return true;
  }
  
  // Pattern matching for dynamic routes (e.g., /article/[id])
  for (const publicRoute of PUBLIC_ROUTES) {
    if (path.startsWith(publicRoute) && publicRoute !== '/') {
      return true;
    }
  }
  
  return false;
};

/**
 * Check if route requires additional security
 * @param path - Route path to check
 * @returns True if route is sensitive
 */
export const isSensitivePublicRoute = (path: string): boolean => {
  return SENSITIVE_PUBLIC_ROUTES.some(route => path.startsWith(route));
};

/**
 * Sanitize user input to prevent XSS attacks
 * Industry standard: OWASP sanitization
 * @param input - User input string
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .slice(0, 10000); // Max length to prevent memory attacks
};

/**
 * Validate URL parameters to prevent injection
 * @param params - URL parameters object
 * @returns Validated parameters
 */
export const validateUrlParams = (params: Record<string, any>): Record<string, any> => {
  const validated: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(params)) {
    // Only allow alphanumeric keys
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      console.warn(`⚠️ Invalid URL parameter key: ${key}`);
      continue;
    }
    
    // Sanitize string values
    if (typeof value === 'string') {
      validated[key] = sanitizeInput(value);
    } else if (typeof value === 'number') {
      // Validate numbers are within safe range
      if (Number.isSafeInteger(value)) {
        validated[key] = value;
      }
    } else if (typeof value === 'boolean') {
      validated[key] = value;
    }
    // Ignore other types for security
  }
  
  return validated;
};

/**
 * Generate Content Security Policy header
 * Uses dynamic CSP with auto-detected API URL
 * @returns CSP header string
 */
export const generateCSPHeader = (): string => {
  const csp = getPublicRouteCSP();
  return Object.entries(csp)
    .map(([directive, sources]) => `${directive} ${(sources as string[]).join(' ')}`)
    .join('; ');
};

// ============================================================================
// RATE LIMITING (DRY Principle)
// ============================================================================

/**
 * In-memory rate limiter for client-side
 * Production: Use Redis or similar for distributed rate limiting
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  /**
   * Check if request is within rate limit
   * @param key - Unique identifier (IP, session ID, etc.)
   * @param limit - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns True if within limit
   */
  checkLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
    
    // Check if limit exceeded
    if (validRequests.length >= limit) {
      console.warn(`⚠️ Rate limit exceeded for: ${key}`);
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
  
  /**
   * Clear rate limit for a key
   * @param key - Unique identifier
   */
  clear(key: string): void {
    this.requests.delete(key);
  }
  
  /**
   * Clear all rate limits (for testing)
   */
  clearAll(): void {
    this.requests.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// ============================================================================
// SECURITY HEADERS (Industry Standard)
// ============================================================================

/**
 * Security headers for public routes
 * Following OWASP recommendations
 */
export const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  
  // Content Security Policy
  'Content-Security-Policy': generateCSPHeader(),
} as const;

// ============================================================================
// AUDIT LOGGING (Security Monitoring)
// ============================================================================

/**
 * Log security events for monitoring
 * @param event - Security event details
 */
export const logSecurityEvent = (event: {
  type: 'rate_limit' | 'invalid_input' | 'suspicious_activity' | 'access_denied';
  path: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}): void => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...event,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };
  
  // Console log for development
  if (process.env.NODE_ENV === 'development') {
    console.warn('🔒 Security Event:', logEntry);
  }
  
  // Send to server for production monitoring
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/security/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry),
    }).catch(error => console.error('Failed to log security event:', error));
  }
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  PUBLIC_ROUTE_RATE_LIMITS,
  getPublicRouteCSP,
  PUBLIC_ROUTES,
  SENSITIVE_PUBLIC_ROUTES,
  SECURITY_HEADERS,
  isPublicRoute,
  isSensitivePublicRoute,
  sanitizeInput,
  validateUrlParams,
  generateCSPHeader,
  rateLimiter,
  logSecurityEvent,
};
