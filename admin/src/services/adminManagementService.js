const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class AdminManagementService {
  getAuthHeader() {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Get all admins (view-only for now)
  async getAdmins(params = {}) {
    try {
      const { page = 1, limit = 50, search = '', role = 'all' } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        role
      });

      const response = await fetch(`${API_BASE_URL}/admin?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch admins');
      }

      return data;
    } catch (error) {
      console.error('Get admins error:', error);
      throw error;
    }
  }

  // Get single admin details
  async getAdmin(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch admin details');
      }

      return data;
    } catch (error) {
      console.error('Get admin details error:', error);
      throw error;
    }
  }

  // Get admin statistics
  async getAdminStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats/overview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch admin statistics');
      }

      return data;
    } catch (error) {
      console.error('Get admin stats error:', error);
      throw error;
    }
  }

  // Create new admin (requires superadmin)
  async createAdmin(adminData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(adminData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create admin');
      }

      return data;
    } catch (error) {
      console.error('Create admin error:', error);
      throw error;
    }
  }

  // Get admin audit logs (actions performed ON this admin)
  async getAdminAuditLogs(adminId, params = {}) {
    try {
      const { page = 1, limit = 50 } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${API_BASE_URL}/admin/${adminId}/audit-logs?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch admin audit logs');
      }

      return data;
    } catch (error) {
      console.error('Get admin audit logs error:', error);
      throw error;
    }
  }

  // Get admin recent activity (actions performed BY this admin)
  async getAdminRecentActivity(adminId, params = {}) {
    try {
      const { page = 1, limit = 50 } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${API_BASE_URL}/admin/${adminId}/recent-activity?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch admin recent activity');
      }

      return data;
    } catch (error) {
      console.error('Get admin recent activity error:', error);
      throw error;
    }
  }

  // Create admin audit log entry
  async createAdminAuditLog(adminId, auditData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${adminId}/audit-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(auditData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create admin audit log');
      }

      return data;
    } catch (error) {
      console.error('Create admin audit log error:', error);
      throw error;
    }
  }

  // Update admin status (requires superadmin)
  async updateAdmin(id, updateData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update admin');
      }

      return data;
    } catch (error) {
      console.error('Update admin error:', error);
      throw error;
    }
  }

  // Future methods for admin management (commented out for now)
  /*

  // Delete admin (requires superadmin)
  async deleteAdmin(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete admin');
      }

      return data;
    } catch (error) {
      console.error('Delete admin error:', error);
      throw error;
    }
  }

  // Update admin role (requires superadmin)
  async updateAdminRole(id, role) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ role })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update admin role');
      }

      return data;
    } catch (error) {
      console.error('Update admin role error:', error);
      throw error;
    }
  }
  */
}

export default new AdminManagementService();
