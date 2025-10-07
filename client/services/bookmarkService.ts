import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export class BookmarkService {
  private static async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const token = await AsyncStorage.getItem('access_token');
      return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
    } catch (error) {
      console.error('Error getting auth token:', error);
      return { 'Content-Type': 'application/json' };
    }
  }
  /**
   * Add a bookmark for a forum post
   */
  static async addBookmark(postId: string, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('Adding bookmark with data:', { post_id: postId, user_id: userId });
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/forum/bookmarks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ post_id: postId }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('Bookmark added successfully:', result.data);
        return { success: true, data: result.data };
      } else {
        console.error('API error adding bookmark:', result.error || result.detail);
        return { success: false, error: result.error || result.detail || 'Failed to add bookmark' };
      }
    } catch (error) {
      console.error('Exception adding bookmark:', error);
      return { success: false, error: 'Failed to add bookmark' };
    }
  }

  /**
   * Remove a bookmark for a forum post
   */
  static async removeBookmark(postId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Removing bookmark for:', { postId, userId });
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/forum/bookmarks/${postId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (response.ok) {
        console.log('Bookmark removed successfully');
        return { success: true };
      } else {
        const result = await response.json();
        console.error('API error removing bookmark:', result.detail);
        return { success: false, error: result.detail || 'Failed to remove bookmark' };
      }
    } catch (error) {
      console.error('Error removing bookmark:', error);
      return { success: false, error: 'Failed to remove bookmark' };
    }
  }

  /**
   * Check if a post is bookmarked by a user
   */
  static async isBookmarked(postId: string, userId: string): Promise<{ success: boolean; isBookmarked: boolean; error?: string }> {
    try {
      console.log('Checking bookmark status for:', { postId, userId });
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/forum/bookmarks/check/${postId}`, {
        method: 'GET',
        headers,
      });
      
      if (response.ok) {
        const result = await response.json();
        const isBookmarked = !!result.data?.bookmarked;
        console.log('Bookmark check result:', { isBookmarked, data: result.data });
        return { success: true, isBookmarked };
      } else {
        const result = await response.json();
        console.error('API error checking bookmark:', result.detail);
        return { success: false, isBookmarked: false, error: result.detail || 'Failed to check bookmark' };
      }
    } catch (error) {
      console.error('Error checking bookmark:', error);
      return { success: false, isBookmarked: false, error: 'Failed to check bookmark status' };
    }
  }

  /**
   * Get all bookmarks for a user
   */
  static async getUserBookmarks(userId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/forum/bookmarks/user`, {
        method: 'GET',
        headers,
      });
      
      if (response.ok) {
        const result = await response.json();
        return { success: true, data: result.data || [] };
      } else {
        const result = await response.json();
        console.error('API error getting user bookmarks:', result.detail);
        return { success: false, error: result.detail || 'Failed to get bookmarks' };
      }
    } catch (error) {
      console.error('Error getting user bookmarks:', error);
      return { success: false, error: 'Failed to get bookmarks' };
    }
  }

  /**
   * Toggle bookmark status (add if not bookmarked, remove if bookmarked)
   */
  static async toggleBookmark(postId: string, userId: string): Promise<{ success: boolean; isBookmarked: boolean; error?: string }> {
    try {
      console.log('Starting toggle bookmark for:', { postId, userId });
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/forum/bookmarks/toggle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ post_id: postId }),
      });
      
      if (response.ok) {
        const result = await response.json();
        const isBookmarked = !!result.data?.bookmarked;
        console.log('Toggle result:', { isBookmarked, data: result.data });
        return { success: true, isBookmarked };
      } else {
        const result = await response.json();
        console.error('API error toggling bookmark:', result.detail);
        return { success: false, isBookmarked: false, error: result.detail || 'Failed to toggle bookmark' };
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      return { success: false, isBookmarked: false, error: 'Failed to toggle bookmark' };
    }
  }
}
