const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class AuditLogsService {
  getAuthHeader() {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Get all audit logs with filtering and pagination
  async getAuditLogs(params = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        table = '',
        action = '',
        date_range = '',
        sort = 'newest'
      } = params;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        table,
        action,
        date_range,
        sort
      });

      const response = await fetch(`${API_BASE_URL}/audit-logs?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch audit logs');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get audit logs for a specific target
  async getTargetAuditLogs(targetTable, targetId, params = {}) {
    try {
      const { page = 1, limit = 50 } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${API_BASE_URL}/audit-logs/${targetTable}/${targetId}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch target audit logs');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get audit logs by admin (actions performed BY this admin)
  async getAdminAuditLogs(adminId, params = {}) {
    try {
      const { page = 1, limit = 50 } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${API_BASE_URL}/audit-logs/admin/${adminId}?${queryParams}`, {
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
      throw error;
    }
  }

  // Create audit log entry
  async createAuditLog(auditData) {
    try {
      const response = await fetch(`${API_BASE_URL}/audit-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(auditData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create audit log');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Export audit logs
  async exportAuditLogs(params = {}) {
    try {
      const { 
        search = '', 
        table = '',
        action = '',
        date_range = '',
        format = 'csv'
      } = params;

      const queryParams = new URLSearchParams({
        search,
        table,
        action,
        date_range,
        format
      });

      const response = await fetch(`${API_BASE_URL}/audit-logs/export?${queryParams}`, {
        method: 'GET',
        headers: {
          ...this.getAuthHeader()
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to export audit logs');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'audit_logs.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Export completed successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Get audit log statistics
  async getAuditLogStats(params = {}) {
    try {
      const { 
        date_range = 'last_30_days',
        table = '',
        action = ''
      } = params;

      const queryParams = new URLSearchParams({
        date_range,
        table,
        action
      });

      const response = await fetch(`${API_BASE_URL}/audit-logs/stats?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch audit log statistics');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Delete old audit logs (cleanup)
  async cleanupAuditLogs(params = {}) {
    try {
      const { 
        older_than_days = 365,
        table = '',
        dry_run = true
      } = params;

      const response = await fetch(`${API_BASE_URL}/audit-logs/cleanup`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({
          older_than_days,
          table,
          dry_run
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cleanup audit logs');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}

const auditLogsService = new AuditLogsService();
export default auditLogsService;
