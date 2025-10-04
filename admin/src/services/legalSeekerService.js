const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const legalSeekerService = {
  getAuthHeader() {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  // Get audit logs for a legal seeker (actions performed ON this legal seeker)
  getAuditLogs: async (userId, params = {}) => {
    try {
      const { page = 1, limit = 50 } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${API_BASE_URL}/users/legal-seekers/${userId}/audit-logs?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...legalSeekerService.getAuthHeader()
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch legal seeker audit logs:', error);
      throw error;
    }
  },

  // Create audit log entry for a legal seeker
  createAuditLog: async (userId, auditData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/legal-seekers/${userId}/audit-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...legalSeekerService.getAuthHeader()
        },
        body: JSON.stringify(auditData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create legal seeker audit log:', error);
      throw error;
    }
  },

  // Get recent activity for a legal seeker (placeholder - will be implemented later)
  getRecentActivity: async (userId, params = {}) => {
    try {
      // TODO: Implement when backend endpoint is ready
      // const response = await apiClient.get(`/users/legal-seekers/${userId}/recent-activity`, { params });
      // return response.data;
      
      // For now, return mock data
      return {
        success: true,
        data: [
          {
            id: 1,
            action: 'Logged into platform',
            created_at: new Date().toISOString(),
            metadata: { action_type: 'login' },
            details: 'User login activity'
          },
          {
            id: 2,
            action: 'Updated profile information',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            metadata: { action_type: 'profile_update' },
            details: 'Profile information updated'
          }
        ]
      };
    } catch (error) {
      console.error('Failed to fetch legal seeker recent activity:', error);
      throw error;
    }
  }
};

export default legalSeekerService;
