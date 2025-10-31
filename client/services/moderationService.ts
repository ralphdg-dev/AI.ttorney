/**
 * Moderation Service
 * 
 * Handles fetching user moderation status (strikes, suspensions, bans)
 */

import { NetworkConfig } from '../utils/networkConfig';

export interface ModerationStatus {
  strike_count: number;
  suspension_count: number;
  account_status: 'active' | 'suspended' | 'banned';
  suspension_end: string | null;
  last_violation_at: string | null;
}

export interface ModerationError {
  detail: string;
  strike_count?: number;
  suspension_count?: number;
  suspension_end?: string;
  action_taken?: 'strike_added' | 'suspended' | 'banned';
}

/**
 * Fetch user's current moderation status
 */
export const getUserModerationStatus = async (token: string): Promise<ModerationStatus | null> => {
  try {
    // Use auto-detected API URL
    const apiUrl = await NetworkConfig.getBestApiUrl();
    
    const response = await fetch(`${apiUrl}/api/user/moderation-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[ModerationService] Failed to fetch status:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[ModerationService] Error fetching moderation status:', error);
    return null;
  }
};

/**
 * Parse moderation error from API response
 */
export const parseModerationError = (errorText: string): ModerationError | null => {
  try {
    const parsed = JSON.parse(errorText);
    
    // Backend returns nested structure: { detail: { detail, action_taken, ... } }
    if (parsed.detail && typeof parsed.detail === 'object') {
      return {
        detail: parsed.detail.detail || parsed.detail,
        action_taken: parsed.detail.action_taken,
        strike_count: parsed.detail.strike_count,
        suspension_count: parsed.detail.suspension_count,
        suspension_end: parsed.detail.suspension_end,
      };
    }
    
    // Fallback for simple string detail
    if (parsed.detail && typeof parsed.detail === 'string') {
      return {
        detail: parsed.detail,
      };
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * Get user-friendly warning message based on strike count
 */
export const getWarningMessage = (strikeCount: number, suspensionCount: number): string => {
  const remainingStrikes = 3 - strikeCount;
  
  if (strikeCount === 0) {
    return '';
  }
  
  if (strikeCount === 1) {
    return `⚠️ You have 1 strike. ${remainingStrikes} more violations will result in a 7-day suspension.`;
  }
  
  if (strikeCount === 2) {
    return `⚠️ You have 2 strikes. 1 more violation will result in a 7-day suspension.`;
  }
  
  // This shouldn't happen (3 strikes = auto-suspension), but just in case
  if (strikeCount >= 3) {
    return `⚠️ You have ${strikeCount} strikes. Your account may be suspended.`;
  }
  
  return '';
};

/**
 * Get suspension warning message
 */
export const getSuspensionWarning = (suspensionCount: number): string => {
  if (suspensionCount === 0) {
    return '';
  }
  
  if (suspensionCount === 1) {
    return `⚠️ This is your 1st suspension. 2 more suspensions will result in a permanent ban.`;
  }
  
  if (suspensionCount === 2) {
    return `⚠️ This is your 2nd suspension. 1 more suspension will result in a permanent ban.`;
  }
  
  if (suspensionCount >= 3) {
    return `🚫 Your account has been permanently banned after 3 suspensions.`;
  }
  
  return '';
};

/**
 * Format suspension end date
 */
export const formatSuspensionEnd = (suspensionEnd: string): string => {
  try {
    const date = new Date(suspensionEnd);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return suspensionEnd;
  }
};
