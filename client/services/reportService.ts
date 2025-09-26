import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export class ReportService {
  private static async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const token = await AsyncStorage.getItem('access_token');
      return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
    } catch (error) {
      console.error('Error getting auth token:', error);
      return { 'Content-Type': 'application/json' };
    }
  }
  /**
   * Submit a report for a forum post or comment
   */
  static async submitReport(
    targetId: string,
    targetType: 'post' | 'comment',
    reason: string,
    reporterId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('Submitting report:', { targetId, targetType, reason, reporterId });
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/forum/reports`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target_id: targetId,
          target_type: targetType,
          reason: reason
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Report submitted successfully:', result.data);
        return { success: true, data: result.data };
      } else {
        const result = await response.json();
        console.error('API error submitting report:', result.detail);
        return { success: false, error: result.detail || 'Failed to submit report' };
      }
    } catch (error) {
      console.error('Exception submitting report:', error);
      return { success: false, error: 'Failed to submit report' };
    }
  }

  /**
   * Check if a user has already reported a specific target
   */
  static async hasUserReported(
    targetId: string,
    targetType: 'post' | 'comment',
    reporterId: string
  ): Promise<{ success: boolean; hasReported: boolean; error?: string }> {
    try {
      console.log('Checking if user has reported:', { targetId, targetType, reporterId });
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/forum/reports/check/${targetId}/${targetType}`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        const hasReported = !!result.data?.hasReported;
        console.log('Report check result:', { hasReported, data: result.data });
        return { success: true, hasReported };
      } else {
        const result = await response.json();
        console.error('API error checking existing report:', result.detail);
        return { success: false, hasReported: false, error: result.detail || 'Failed to check report status' };
      }
    } catch (error) {
      console.error('Error checking existing report:', error);
      return { success: false, hasReported: false, error: 'Failed to check report status' };
    }
  }

  /**
   * Get all reports for a specific target
   */
  static async getReportsForTarget(
    targetId: string,
    targetType: 'post' | 'comment'
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/forum/reports/target/${targetId}/${targetType}`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, data: result.data || [] };
      } else {
        const result = await response.json();
        console.error('API error getting reports for target:', result.detail);
        return { success: false, error: result.detail || 'Failed to get reports' };
      }
    } catch (error) {
      console.error('Error getting reports for target:', error);
      return { success: false, error: 'Failed to get reports' };
    }
  }

  /**
   * Get all reports submitted by a specific user
   */
  static async getReportsByUser(
    reporterId: string
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/forum/reports/user`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, data: result.data || [] };
      } else {
        const result = await response.json();
        console.error('API error getting reports by user:', result.detail);
        return { success: false, error: result.detail || 'Failed to get user reports' };
      }
    } catch (error) {
      console.error('Error getting reports by user:', error);
      return { success: false, error: 'Failed to get user reports' };
    }
  }
}
