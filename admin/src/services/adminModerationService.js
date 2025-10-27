const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class AdminModerationService {
  getAuthHeader() {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Apply moderation action to a user
  async applyModerationAction(userId, actionData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/moderation/apply-action/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(actionData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply moderation action');
      }

      return data;
    } catch (error) {
      console.error('Apply moderation action error:', error);
      throw error;
    }
  }

  // Get user violations history
  async getUserViolations(userId, params = {}) {
    try {
      const { page = 1, limit = 20 } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${API_BASE_URL}/admin/moderation/violations/${userId}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user violations');
      }

      return data;
    } catch (error) {
      console.error('Get user violations error:', error);
      throw error;
    }
  }

  // Get user suspensions history
  async getUserSuspensions(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/moderation/suspensions/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user suspensions');
      }

      return data;
    } catch (error) {
      console.error('Get user suspensions error:', error);
      throw error;
    }
  }

  // Lift suspension (admin override)
  async liftSuspension(userId, reason) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/moderation/lift-suspension/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to lift suspension');
      }

      return data;
    } catch (error) {
      console.error('Lift suspension error:', error);
      throw error;
    }
  }

  // Helper method to format violation action for API
  formatModerationAction(action, postContent, adminReason, reportId = null, contentId = null, duration = 'permanent') {
    return {
      violation_type: 'forum_post', // Default to forum_post, can be extended
      content_id: contentId,
      content_text: postContent,
      admin_reason: adminReason,
      action: action, // 'strike', 'suspend_7days', 'ban', 'restrict'
      report_id: reportId,
      duration: duration
    };
  }
}

const adminModerationService = new AdminModerationService();
export default adminModerationService;
