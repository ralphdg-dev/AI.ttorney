const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class UsersService {
  getAuthHeader() {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Get all legal seekers
  async getLegalSeekers(params = {}) {
    try {
      const { page = 1, limit = 50, search = '', status = 'all', archived = 'active' } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        status,
        archived
      });

      const response = await fetch(`${API_BASE_URL}/users/legal-seekers?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch legal seekers');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get single legal seeker details
  async getLegalSeeker(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/legal-seekers/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch legal seeker');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Update legal seeker status (verify/unverify)
  async updateLegalSeekerStatus(id, isVerified) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/legal-seekers/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ is_verified: isVerified })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update legal seeker status');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Delete/deactivate legal seeker
  async deleteLegalSeeker(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/legal-seekers/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete legal seeker');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get legal seekers statistics
  async getLegalSeekersStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/users/legal-seekers/stats/overview`, {
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
      throw error;
    }
  }

  // Get all lawyers
  async getLawyers(params = {}) {
    try {
      const { page = 1, limit = 10, search = '' } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search
      });

      const response = await fetch(`${API_BASE_URL}/users/lawyers?${queryParams}`, {
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
      throw error;
    }
  }

  // Get single lawyer details
  async getLawyer(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/lawyers/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lawyer');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Update lawyer status (suspend/unsuspend)
  async updateLawyerStatus(id, isVerified) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/lawyers/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ is_verified: isVerified })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update lawyer status');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Archive/Unarchive legal seeker
  async archiveLegalSeeker(id, archived) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/legal-seekers/${id}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ archived })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive user');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Update user strikes (using new admin moderation system)
  async updateUserStrikes(id, action, reason = '') {
    try {
      // Import here to avoid circular dependency
      const adminModerationService = (await import('./adminModerationService')).default;
      
      if (action === 'add') {
        const actionData = adminModerationService.formatModerationAction(
          'strike',
          `Manual strike added by admin: ${reason}`,
          reason
        );
        return await adminModerationService.applyModerationAction(id, actionData);
      } else {
        // For remove action, we'll still use the old endpoint for now
        // since the new system doesn't support removing strikes
        const response = await fetch(`${API_BASE_URL}/users/legal-seekers/${id}/strikes`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeader()
          },
          body: JSON.stringify({ action, reason })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update user strikes');
        }

        return data;
      }
    } catch (error) {
      throw error;
    }
  }

  // Ban/Restrict/Unban user (using new admin moderation system)
  async moderateUser(id, action, reason = '', duration = 'permanent') {
    try {
      // Import here to avoid circular dependency
      const adminModerationService = (await import('./adminModerationService')).default;
      
      if (action === 'ban') {
        const actionData = adminModerationService.formatModerationAction(
          'ban',
          `Manual ban by admin: ${reason}`,
          reason,
          null, // reportId
          null, // contentId
          duration
        );
        return await adminModerationService.applyModerationAction(id, actionData);
      } else if (action === 'suspend_7days') {
        const actionData = adminModerationService.formatModerationAction(
          'suspend_7days',
          `Manual 7-day suspension by admin: ${reason}`,
          reason,
          null, // reportId
          null, // contentId
          duration
        );
        return await adminModerationService.applyModerationAction(id, actionData);
      } else if (action === 'unban') {
        // For unban, we use the lift suspension endpoint
        return await adminModerationService.liftSuspension(id, reason);
      } else if (action === 'unrestrict') {
        // For unrestrict, we create a special admin action to restore user to active status
        const actionData = adminModerationService.formatModerationAction(
          'unrestrict',
          `Manual removal of forum restrictions by admin: ${reason}`,
          reason,
          null, // reportId
          null, // contentId
          'permanent' // duration not relevant for unrestrict
        );
        return await adminModerationService.applyModerationAction(id, actionData);
      } else {
        throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      throw error;
    }
  }
}

const usersService = new UsersService();
export default usersService;
