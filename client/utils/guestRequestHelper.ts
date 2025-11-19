/**
 * Guest Request Helper - DRY Utility
 * Centralizes guest request body preparation logic
 * Following OpenAI/Anthropic best practices
 */

import { GuestSession } from '@/config/guestConfig';

/**
 * Guest session data for API requests
 */
export interface GuestRequestData {
  guest_session_id: string;
  guest_prompt_count: number;
}

/**
 * Prepare guest session data for API request
 * Single source of truth for guest request body preparation
 * 
 * @param guestSession - Current guest session from GuestContext
 * @returns Guest request data or null if not applicable
 */
export const prepareGuestRequestData = (
  guestSession: GuestSession | null
): GuestRequestData | null => {
  if (!guestSession) {
    console.warn('⚠️ No guest session available');
    return null;
  }

  return {
    guest_session_id: guestSession.id,
    guest_prompt_count: guestSession.promptCount,
  };
};

/**
 * Add guest data to request body if in guest mode
 * DRY helper to avoid repetitive conditional logic
 * 
 * @param requestBody - Base request body
 * @param isGuestMode - Whether user is in guest mode
 * @param guestSession - Current guest session
 * @returns Request body with guest data if applicable
 */
export const addGuestDataToRequest = <T extends Record<string, any>>(
  requestBody: T,
  isGuestMode: boolean,
  guestSession: GuestSession | null
): T => {
  if (!isGuestMode || !guestSession) {
    return requestBody;
  }

  const guestData = prepareGuestRequestData(guestSession);
  if (!guestData) {
    return requestBody;
  }

  console.log('🎫 Adding guest session data to request:', {
    session_id: guestData.guest_session_id,
    prompt_count: guestData.guest_prompt_count,
  });

  return {
    ...requestBody,
    ...guestData,
  };
};

/**
 * Validate guest session before sending request
 * Prevents sending invalid/expired sessions
 * 
 * @param guestSession - Guest session to validate
 * @returns True if session is valid for API request
 */
export const isValidGuestSession = (guestSession: GuestSession | null): boolean => {
  if (!guestSession) {
    return false;
  }

  // Check if session ID exists and is properly formatted
  if (!guestSession.id || !guestSession.id.startsWith('guest_')) {
    console.warn('⚠️ Invalid guest session ID format');
    return false;
  }

  // Check if prompt count is valid
  if (typeof guestSession.promptCount !== 'number' || guestSession.promptCount < 0) {
    console.warn('⚠️ Invalid guest prompt count');
    return false;
  }

  return true;
};

/**
 * Log guest request for debugging
 * Centralized logging format
 * 
 * @param guestSession - Guest session data
 * @param endpoint - API endpoint being called
 */
export const logGuestRequest = (
  guestSession: GuestSession | null,
  endpoint: string
): void => {
  if (!guestSession) {
    console.log('✅ Authenticated user request to:', endpoint);
    return;
  }

  console.log('🎫 Guest request:', {
    endpoint,
    session_id: guestSession.id.substring(0, 20) + '...',
    prompt_count: guestSession.promptCount,
    created_at: new Date(guestSession.createdAt).toISOString(),
  });
};
