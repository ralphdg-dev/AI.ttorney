const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class LawyerApplicationsService {
  getAuthHeader() {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Get all lawyer applications
  async getLawyerApplications(params = {}) {
    try {
      const { page = 1, limit = 10, search = '', status = 'all', archived = 'active' } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        status,
        archived
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
        throw new Error(data.error || 'Failed to fetch lawyer applications');
      }

      return data;
    } catch (error) {
      console.error('Get lawyer applications error:', error);
      throw error;
    }
  }

  // Get single lawyer application details
  async getLawyerApplication(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyer-applications/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lawyer application');
      }

      return data;
    } catch (error) {
      console.error('Get lawyer application error:', error);
      throw error;
    }
  }

  // Update lawyer application status (approve/reject)
  async updateApplicationStatus(id, status, adminFeedback = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyer-applications/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ 
          status,
          admin_feedback: adminFeedback
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update application status');
      }

      return data;
    } catch (error) {
      console.error('Update application status error:', error);
      throw error;
    }
  }

  // Update lawyer application (edit functionality)
  async updateLawyerApplication(id, updateData) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyer-applications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({
          ...updateData,
          action: 'edit_application' // This helps the backend create proper audit trail
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update lawyer application');
      }

      return data;
    } catch (error) {
      console.error('Update lawyer application error:', error);
      throw error;
    }
  }

  // Get lawyer applications statistics
  async getApplicationsStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyer-applications/stats/overview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch statistics');
      }

      return data;
    } catch (error) {
      console.error('Get applications stats error:', error);
      throw error;
    }
  }

  // Get signed URL for private storage access
  async getSignedUrl(bucket, filePath) {
    try {
      // Return null immediately if filePath is empty or invalid
      if (!filePath || filePath.trim() === '' || filePath === 'null' || filePath === 'undefined') {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/lawyer-applications/signed-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ bucket, filePath })
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Handle file not found gracefully
        if (response.status === 404) {
          return null;
        }
        throw new Error(data.error || 'Failed to get signed URL');
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Get signed URL error:', error);
      // Return null instead of throwing for missing files
      if (error.message.includes('Object not found') || error.message.includes('File not found')) {
        return null;
      }
      throw error;
    }
  }

  // Get application history for a specific application
  async getApplicationHistory(applicationId) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyer-applications/${applicationId}/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch application history');
      }

      return data;
    } catch (error) {
      console.error('Get application history error:', error);
      throw error;
    }
  }

  // Get audit logs for a specific application
  async getApplicationAuditLogs(applicationId) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyer-applications/${applicationId}/audit-logs`, {
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
      console.error('Get audit logs error:', error);
      throw error;
    }
  }

  // Create audit log entry
  async createAuditLog(auditData) {
    try {
      
      const response = await fetch(`${API_BASE_URL}/lawyer-applications/${auditData.application_id}/audit-logs`, {
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
      console.error('Create audit log error:', error);
      throw error;
    }
  }

  // Archive/Unarchive lawyer application
  async archiveApplication(applicationId, archived) {
    try {
      const response = await fetch(`${API_BASE_URL}/lawyer-applications/${applicationId}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ archived })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${archived ? 'archive' : 'unarchive'} application`);
      }

      return data;
    } catch (error) {
      console.error(`${archived ? 'Archive' : 'Unarchive'} application error:`, error);
      throw error;
    }
  }
}

export default new LawyerApplicationsService();
