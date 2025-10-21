const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Test server connectivity
const testServerConnection = async () => {
  try {
    const response = await fetch('http://localhost:5001/health');
    const data = await response.json();
    console.log('Server health check:', data);
    return true;
  } catch (error) {
    console.error('Server connection test failed:', error);
    return false;
  }
};

class ForumManagementService {
  getAuthHeader() {
    // Try different possible token storage keys
    const token = localStorage.getItem('admin_token') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('access_token') ||
                  localStorage.getItem('authToken');
    
    console.log('Auth token found:', !!token);
    if (token) {
      console.log('Token length:', token.length);
    }
    
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Get all forum posts with filtering and pagination
  async getForumPosts(params = {}) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search = '', 
        category = 'all', 
        status = 'all',
        reported = 'all',
        sort_by = 'created_at',
        sort_order = 'desc'
      } = params;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        category,
        status,
        reported,
        sort_by,
        sort_order
      });

      const response = await fetch(`${API_BASE_URL}/forum/posts?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch forum posts');
      }

      return data;
    } catch (error) {
      console.error('Get forum posts error:', error);
      throw error;
    }
  }

  // Get single forum post details
  async getForumPost(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/forum/posts/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch forum post');
      }

      return data;
    } catch (error) {
      console.error('Get forum post error:', error);
      throw error;
    }
  }

  // Moderate a forum post (delete, flag, or restore)
  async moderatePost(id, action, reason = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/forum/posts/${id}/moderate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ action, reason })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} post`);
      }

      return data;
    } catch (error) {
      console.error(`Moderate post (${action}) error:`, error);
      throw error;
    }
  }

  // Delete a forum post
  async deletePost(id, reason = '') {
    return this.moderatePost(id, 'delete', reason);
  }

  // Flag a forum post
  async flagPost(id, reason = '') {
    return this.moderatePost(id, 'flag', reason);
  }

  // Restore a forum post
  async restorePost(id, reason = '') {
    return this.moderatePost(id, 'restore', reason);
  }

  // Get all reported posts
  async getReportedPosts(params = {}) {
    try {
      // First test server connectivity
      console.log('Testing server connectivity...');
      const serverOnline = await testServerConnection();
      if (!serverOnline) {
        throw new Error('Server is not running or not accessible at http://localhost:5001');
      }

      const { 
        page = 1, 
        limit = 50, 
        status = 'pending',
        category = 'all',
        sort_by = 'created_at',
        sort_order = 'desc'
      } = params;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status,
        category,
        sort_by,
        sort_order
      });

      const url = `${API_BASE_URL}/forum/reported-posts?${queryParams}`;
      const headers = {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      };

      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Fetching reported posts from:', url);
      console.log('Request headers:', headers);

      let response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers
        });
        console.log('Fetch completed successfully');
      } catch (fetchError) {
        console.error('Fetch failed:', fetchError);
        throw new Error(`Network error: ${fetchError.message}. Check if server is running on ${API_BASE_URL}`);
      }

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      let data;
      try {
        data = await response.json();
        console.log('Response data:', data);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        throw new Error(`Invalid JSON response: ${jsonError.message}`);
      }
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to fetch reported posts`);
      }

      return data;
    } catch (error) {
      console.error('Get reported posts error:', error);
      throw error;
    }
  }

  // Resolve a report
  async resolveReport(id, action, resolution_notes = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/forum/reports/${id}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ action, resolution_notes })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve report');
      }

      return data;
    } catch (error) {
      console.error('Resolve report error:', error);
      throw error;
    }
  }

  // Dismiss a report
  async dismissReport(id, notes = '') {
    return this.resolveReport(id, 'dismiss', notes);
  }

  // Mark report as action taken
  async markReportActionTaken(id, notes = '') {
    return this.resolveReport(id, 'action_taken', notes);
  }

  // Get forum statistics
  async getForumStatistics() {
    try {
      const response = await fetch(`${API_BASE_URL}/forum/statistics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch forum statistics');
      }

      return data;
    } catch (error) {
      console.error('Get forum statistics error:', error);
      throw error;
    }
  }

  // Utility methods for formatting
  formatPostContent(content, maxLength = 100) {
    if (!content) return 'No content';
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...' 
      : content;
  }

  formatUserDisplay(user, isAnonymous = false) {
    if (isAnonymous || !user) {
      return 'Anonymous User';
    }
    return user.full_name || user.username || user.email || 'Unknown User';
  }

  getCategoryDisplayName(categoryId) {
    const categories = {
      'family': 'Family Law',
      'criminal': 'Criminal Law',
      'civil': 'Civil Law',
      'labor': 'Labor Law',
      'corporate': 'Corporate Law',
      'property': 'Property Law',
      'tax': 'Tax Law',
      'constitutional': 'Constitutional Law',
      'administrative': 'Administrative Law',
      'other': 'Other'
    };
    return categories[categoryId] || categoryId;
  }

  getReportCategoryDisplayName(category) {
    const categories = {
      'spam': 'Spam',
      'harassment': 'Harassment',
      'hate_speech': 'Hate Speech',
      'misinformation': 'Misinformation',
      'inappropriate': 'Inappropriate Content',
      'other': 'Other'
    };
    return categories[category] || category;
  }

  getStatusBadgeColor(status) {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'deleted': 'bg-red-100 text-red-800',
      'flagged': 'bg-yellow-100 text-yellow-800',
      'pending': 'bg-blue-100 text-blue-800',
      'resolved': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }
}

export default new ForumManagementService();
