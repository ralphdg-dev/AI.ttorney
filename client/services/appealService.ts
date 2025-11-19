/**
 * Suspension Appeals Service
 * 
 * Handles all API calls related to suspension appeals
 */

import { NetworkConfig } from '../utils/networkConfig';

export interface Appeal {
  id: string;
  user_id: string;
  suspension_id: string;
  appeal_reason: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface AppealWithDetails extends Appeal {
  user_email?: string;
  user_username?: string;
  suspension_type?: string;
  suspension_number?: number;
}

export interface SubmitAppealRequest {
  appeal_reason: string;
}

export interface AppealsListResponse {
  success: boolean;
  data: AppealWithDetails[];
  total: number;
}

class AppealService {
  /**
   * Submit an appeal for the current user's active suspension
   */
  async submitAppeal(
    appealReason: string,
    accessToken: string
  ): Promise<Appeal> {
    const apiUrl = await NetworkConfig.getBestApiUrl();
    
    const response = await fetch(`${apiUrl}/api/appeals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        appeal_reason: appealReason
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to submit appeal');
    }

    return response.json();
  }

  /**
   * Get all appeals submitted by the current user
   */
  async getMyAppeals(accessToken: string): Promise<AppealsListResponse> {
    const apiUrl = await NetworkConfig.getBestApiUrl();
    
    const response = await fetch(`${apiUrl}/api/appeals/my`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch appeals');
    }

    return response.json();
  }

  /**
   * Get details of a specific appeal
   */
  async getAppeal(appealId: string, accessToken: string): Promise<Appeal> {
    const apiUrl = await NetworkConfig.getBestApiUrl();
    
    const response = await fetch(`${apiUrl}/api/appeals/${appealId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch appeal');
    }

    return response.json();
  }

  /**
   * Check if user has an existing appeal for their current suspension
   */
  async hasExistingAppeal(accessToken: string): Promise<boolean> {
    try {
      const appeals = await this.getMyAppeals(accessToken);
      
      // Check if there's a pending or under_review appeal
      const activeAppeal = appeals.data.find(
        appeal => appeal.status === 'pending' || appeal.status === 'under_review'
      );
      
      return !!activeAppeal;
    } catch (error) {
      console.error('Error checking for existing appeal:', error);
      return false;
    }
  }

  /**
   * Get the most recent appeal for the current user
   */
  async getLatestAppeal(accessToken: string): Promise<Appeal | null> {
    try {
      const appeals = await this.getMyAppeals(accessToken);
      
      if (appeals.data.length === 0) {
        return null;
      }

      // Sort by created_at descending and return the first one
      const sortedAppeals = appeals.data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      return sortedAppeals[0];
    } catch (error) {
      console.error('Error getting latest appeal:', error);
      return null;
    }
  }
}

export const appealService = new AppealService();
