/**
 * Appeal Admin Service
 * 
 * Handles all admin API calls related to suspension appeals
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class AppealAdminService {
  /**
   * Get all appeals with optional filters
   */
  async getAppeals(statusFilter = null, limit = 50, offset = 0) {
    const token = localStorage.getItem('adminToken');
    
    const params = { limit, offset };
    if (statusFilter) {
      params.status_filter = statusFilter;
    }

    const response = await axios.get(`${API_URL}/api/admin/appeals`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params
    });

    return response.data;
  }

  /**
   * Review an appeal (approve or reject)
   */
  async reviewAppeal(appealId, reviewData) {
    const token = localStorage.getItem('adminToken');
    
    const response = await axios.patch(
      `${API_URL}/api/admin/appeals/${appealId}/review`,
      reviewData,
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    return response.data;
  }

  /**
   * Get appeal statistics
   */
  async getStats() {
    const token = localStorage.getItem('adminToken');
    
    const response = await axios.get(`${API_URL}/api/admin/appeals/stats`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }
}

export const appealAdminService = new AppealAdminService();
