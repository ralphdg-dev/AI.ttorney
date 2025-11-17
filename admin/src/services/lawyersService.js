const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class LawyersService {
  getAuthHeader() {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Get all lawyers with filtering and pagination
  async getLawyers(params = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        status = '',
        specialization = '',
        accepting_consultations = '',
        sort = 'newest'
      } = params;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        status,
        specialization,
        accepting_consultations,
        sort
      });

      const response = await fetch(`${API_BASE_URL}/lawyers?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lawyers');
      }

      return data;
    } catch (error) {
      console.error('Get lawyers error:', error);
      throw error;
    }
  }

  // Get lawyer by ID
  async getLawyerById(lawyerId) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyers/${lawyerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lawyer details');
      }

      return data;
    } catch (error) {
      console.error('Get lawyer by ID error:', error);
      throw error;
    }
  }

  // Create new lawyer (admin registration)
  async createLawyer(lawyerData) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(lawyerData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create lawyer');
      }

      return data;
    } catch (error) {
      console.error('Create lawyer error:', error);
      throw error;
    }
  }

  // Update lawyer information
  async updateLawyer(lawyerId, updateData) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyers/${lawyerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update lawyer');
      }

      return data;
    } catch (error) {
      console.error('Update lawyer error:', error);
      throw error;
    }
  }

  // Update lawyer status (verify/suspend/activate)
  async updateLawyerStatus(lawyerId, status) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyers/${lawyerId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update lawyer status');
      }

      return data;
    } catch (error) {
      console.error('Update lawyer status error:', error);
      throw error;
    }
  }

  // Verify lawyer credentials
  async verifyLawyerCredentials(lawyerId, verificationData) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyers/${lawyerId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(verificationData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify lawyer credentials');
      }

      return data;
    } catch (error) {
      console.error('Verify lawyer credentials error:', error);
      throw error;
    }
  }

  // Get lawyer verification documents
  async getLawyerDocuments(lawyerId) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyers/${lawyerId}/documents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lawyer documents');
      }

      return data;
    } catch (error) {
      console.error('Get lawyer documents error:', error);
      throw error;
    }
  }

  // Get lawyer audit logs
  async getLawyerAuditLogs(lawyerId, params = {}) {
    try {
      const { page = 1, limit = 50 } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${API_BASE_URL}/lawyers/${lawyerId}/audit-logs?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lawyer audit logs');
      }

      return data;
    } catch (error) {
      console.error('Get lawyer audit logs error:', error);
      throw error;
    }
  }

  // Create audit log entry for lawyer
  async createLawyerAuditLog(lawyerId, auditData) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyers/${lawyerId}/audit-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(auditData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create lawyer audit log');
      }

      return data;
    } catch (error) {
      console.error('Create lawyer audit log error:', error);
      throw error;
    }
  }

  // Get lawyer statistics
  async getLawyerStats(params = {}) {
    try {
      const { 
        date_range = 'last_30_days',
        status = '',
        specialization = ''
      } = params;

      const queryParams = new URLSearchParams({
        date_range,
        status,
        specialization
      });

      const response = await fetch(`${API_BASE_URL}/lawyers/stats?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lawyer statistics');
      }

      return data;
    } catch (error) {
      console.error('Get lawyer stats error:', error);
      throw error;
    }
  }

  // Export lawyers data
  async exportLawyers(params = {}) {
    try {
      const { 
        search = '', 
        status = '',
        specialization = '',
        format = 'csv'
      } = params;

      const queryParams = new URLSearchParams({
        search,
        status,
        specialization,
        format
      });

      const response = await fetch(`${API_BASE_URL}/lawyers/export?${queryParams}`, {
        method: 'GET',
        headers: {
          ...this.getAuthHeader()
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to export lawyers');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'lawyers.csv';
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
      console.error('Export lawyers error:', error);
      throw error;
    }
  }

  // Delete lawyer (soft delete)
  async deleteLawyer(lawyerId) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyers/${lawyerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete lawyer');
      }

      return data;
    } catch (error) {
      console.error('Delete lawyer error:', error);
      throw error;
    }
  }

  // Get pending lawyer applications
  async getPendingApplications(params = {}) {
    try {
      const { page = 1, limit = 10, search = '' } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        status: 'pending'
      });

      const response = await fetch(`${API_BASE_URL}/lawyer-applications?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pending applications');
      }

      return data;
    } catch (error) {
      console.error('Get pending applications error:', error);
      throw error;
    }
  }

  // Approve lawyer application
  async approveApplication(applicationId, approvalData) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyer-applications/${applicationId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(approvalData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve application');
      }

      return data;
    } catch (error) {
      console.error('Approve application error:', error);
      throw error;
    }
  }

  // Reject lawyer application
  async rejectApplication(applicationId, rejectionData) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyer-applications/${applicationId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify(rejectionData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject application');
      }

      return data;
    } catch (error) {
      console.error('Reject application error:', error);
      throw error;
    }
  }
}

export default new LawyersService();
