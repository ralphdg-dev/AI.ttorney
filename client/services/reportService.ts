import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export class ReportService {
  private static async getAuthHeaders(session?: any): Promise<HeadersInit> {
    try {
      // First try to get token from AuthContext session if provided
      if (session?.access_token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };
      }
      
      // Fallback to AsyncStorage
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
      }
      
      if (__DEV__) console.warn('ReportService: No authentication token found');
      return { 'Content-Type': 'application/json' };
    } catch (error) {
      if (__DEV__) console.error('ReportService auth error:', error);
      return { 'Content-Type': 'application/json' };
    }
  }

  /**
   * Submit a report for a forum post or comment
   */
  static async submitReport(
    targetId: string,
    targetType: 'post' | 'reply',
    reason: string,
    reporterId: string,
    reasonContext?: string,
    session?: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const headers = await this.getAuthHeaders(session);
      const response = await fetch(`${API_BASE_URL}/api/forum/reports`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target_id: targetId,
          target_type: targetType,
          reason,
          reason_context: reasonContext
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (__DEV__) console.log('Report submitted:', targetId);
        return { success: true, data: result.data };
      } else {
        const result = await response.json();
        if (__DEV__) console.error('Submit report error:', result.detail);
        return { success: false, error: result.detail || 'Failed to submit report' };
      }
    } catch (error) {
      if (__DEV__) console.error('Submit report exception:', error);
      return { success: false, error: 'Failed to submit report' };
    }
  }

  /**
   * Check if a user has already reported a specific target
   */
  static async hasUserReported(
    targetId: string,
    targetType: 'post' | 'reply',
    reporterId: string,
    session?: any
  ): Promise<{ success: boolean; hasReported: boolean; error?: string }> {
    try {
      const headers = await this.getAuthHeaders(session);
      const response = await fetch(`${API_BASE_URL}/api/forum/reports/check/${targetId}/${targetType}`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        const hasReported = !!result.data?.hasReported;
        return { success: true, hasReported };
      } else {
        const result = await response.json();
        if (__DEV__) console.error('Check report error:', result.detail);
        return { success: false, hasReported: false, error: result.detail || 'Failed to check report status' };
      }
    } catch (error) {
      if (__DEV__) console.error('Check report exception:', error);
      return { success: false, hasReported: false, error: 'Failed to check report status' };
    }
  }

  /**
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
        if (__DEV__) console.error('Get reports error:', result.detail);
        return { success: false, error: result.detail || 'Failed to get reports' };
      }
    } catch (error) {
      if (__DEV__) console.error('Get reports exception:', error);
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
        if (__DEV__) console.error('Get user reports error:', result.detail);
        return { success: false, error: result.detail || 'Failed to get user reports' };
      }
    } catch (error) {
      if (__DEV__) console.error('Get user reports exception:', error);
      return { success: false, error: 'Failed to get user reports' };
    }
  }
}
