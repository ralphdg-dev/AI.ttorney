/**
 * Guest Session Configuration
 * Centralized configuration for guest mode following DRY principles
 * Industry-grade security and session management
 */

// ============================================================================
// GUEST SESSION CONSTANTS (Single Source of Truth)
// ============================================================================

/**
 * Maximum number of prompts a guest user can send
 * Industry standard: 10-20 prompts for trial/guest access
 */
export const GUEST_PROMPT_LIMIT = 15;

/**
 * Guest session expiration time in milliseconds
 * 24 hours = 86,400,000 ms
 * Industry standard: 24-48 hours for guest sessions
 */
export const GUEST_SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * AsyncStorage key for guest session
 * Prefixed with @ for React Native convention
 */
export const GUEST_SESSION_STORAGE_KEY = '@guest_session';

/**
 * Guest session ID prefix for identification
 */
export const GUEST_SESSION_ID_PREFIX = 'guest_';

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================

/**
 * Session validation rules
 */
export const GUEST_SESSION_VALIDATION = {
  /**
   * Minimum session ID length (timestamp + random)
   * Prevents session ID guessing attacks
   */
  MIN_SESSION_ID_LENGTH: 20,
  
  /**
   * Maximum prompt count (safety check)
   * Prevents tampering with local storage
   */
  MAX_PROMPT_COUNT: GUEST_PROMPT_LIMIT,
  
  /**
   * Session expiry buffer (5 minutes)
   * Prevents edge cases with clock skew
   */
  EXPIRY_BUFFER_MS: 5 * 60 * 1000,
} as const;

// ============================================================================
// HELPER FUNCTIONS (DRY Principle)
// ============================================================================

/**
 * Generate a secure guest session ID
 * Format: guest_<timestamp>_<random>
 * 
 * @returns Unique session ID
 */
export const generateGuestSessionId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${GUEST_SESSION_ID_PREFIX}${timestamp}_${random}`;
};

/**
 * Check if a session is expired
 * Includes buffer time for clock skew
 * 
 * @param expiresAt - Session expiration timestamp
 * @returns True if session is expired
 */
export const isSessionExpired = (expiresAt: number): boolean => {
  return Date.now() >= (expiresAt - GUEST_SESSION_VALIDATION.EXPIRY_BUFFER_MS);
};

/**
 * Validate session data integrity
 * Prevents tampering with local storage
 * 
 * @param session - Session data to validate
 * @returns True if session is valid
 */
export const validateGuestSession = (session: any): boolean => {
  // Check required fields
  if (!session || typeof session !== 'object') {
    return false;
  }

  if (!session.id || typeof session.id !== 'string') {
    return false;
  }

  if (!session.id.startsWith(GUEST_SESSION_ID_PREFIX)) {
    return false;
  }

  if (session.id.length < GUEST_SESSION_VALIDATION.MIN_SESSION_ID_LENGTH) {
    return false;
  }

  // Validate prompt count
  if (typeof session.promptCount !== 'number' || session.promptCount < 0) {
    return false;
  }

  if (session.promptCount > GUEST_SESSION_VALIDATION.MAX_PROMPT_COUNT) {
    console.warn('⚠️ Guest session prompt count exceeds limit, possible tampering');
    return false;
  }

  // Validate timestamps
  if (typeof session.createdAt !== 'number' || session.createdAt <= 0) {
    return false;
  }

  if (typeof session.expiresAt !== 'number' || session.expiresAt <= 0) {
    return false;
  }

  // Check if expiry is reasonable (not more than 48 hours from creation)
  const maxExpiry = session.createdAt + (48 * 60 * 60 * 1000);
  if (session.expiresAt > maxExpiry) {
    console.warn('⚠️ Guest session expiry is unreasonable, possible tampering');
    return false;
  }

  return true;
};

/**
 * Calculate remaining prompts
 * 
 * @param promptCount - Current prompt count
 * @returns Number of prompts remaining
 */
export const calculateRemainingPrompts = (promptCount: number): number => {
  return Math.max(0, GUEST_PROMPT_LIMIT - promptCount);
};

/**
 * Check if prompt limit is reached
 * 
 * @param promptCount - Current prompt count
 * @returns True if limit is reached
 */
export const isPromptLimitReached = (promptCount: number): boolean => {
  return promptCount >= GUEST_PROMPT_LIMIT;
};

// ============================================================================
// DISCLAIMER TEXT (Centralized)
// ============================================================================

/**
 * Guest mode disclaimer text
 * Used across the app for consistency
 */
export const GUEST_DISCLAIMER = {
  /**
   * Short disclaimer for banners/tooltips
   */
  SHORT: `Guest mode: ${GUEST_PROMPT_LIMIT} prompts available`,
  
  /**
   * Full disclaimer for modals/pages
   */
  FULL: `You are using AI.ttorney in guest mode. Guest accounts are limited to ${GUEST_PROMPT_LIMIT} prompts and expire after 24 hours. Sign up for unlimited access and to save your chat history.`,
  
  /**
   * Call-to-action text
   */
  CTA: 'Sign up for unlimited access',
  
  /**
   * Limit reached message
   */
  LIMIT_REACHED: `You've reached the ${GUEST_PROMPT_LIMIT}-prompt limit for guest mode. Please sign up to continue using AI.ttorney.`,
  
  /**
   * Session expired message
   */
  SESSION_EXPIRED: 'Your guest session has expired. Please sign in or continue as a new guest.',
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Guest session interface
 * Enforces type safety across the app
 */
export interface GuestSession {
  id: string;
  promptCount: number;
  createdAt: number;
  expiresAt: number;
}

/**
 * Guest session validation result
 */
export interface SessionValidationResult {
  isValid: boolean;
  reason?: string;
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  GUEST_PROMPT_LIMIT,
  GUEST_SESSION_EXPIRY_MS,
  GUEST_SESSION_STORAGE_KEY,
  GUEST_SESSION_ID_PREFIX,
  GUEST_SESSION_VALIDATION,
  GUEST_DISCLAIMER,
  generateGuestSessionId,
  isSessionExpired,
  validateGuestSession,
  calculateRemainingPrompts,
  isPromptLimitReached,
};
