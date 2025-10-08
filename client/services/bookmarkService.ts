import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export class BookmarkService {
  private static async getAuthHeaders(session?: any): Promise<HeadersInit> {
    try {
      // First try to get token from AuthContext session if provided
      if (session?.access_token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };
      }
      
      // Fallback to AsyncStorage
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
      }
      
      if (__DEV__) console.warn('BookmarkService: No authentication token found');
      return { 'Content-Type': 'application/json' };
    } catch (error) {
      if (__DEV__) console.error('BookmarkService auth error:', error);
      return { 'Content-Type': 'application/json' };
    }
  }
  /**
   * Add a bookmark for a forum post
   */
  static async addBookmark(postId: string, userId: string, session?: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const headers = await this.getAuthHeaders(session);
      const response = await fetch(`${API_BASE_URL}/api/forum/bookmarks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ post_id: postId }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        if (__DEV__) console.log('Bookmark added:', postId);
        return { success: true, data: result.data };
      } else {
        if (__DEV__) console.error('Add bookmark error:', result.error || result.detail);
        return { success: false, error: result.error || result.detail || 'Failed to add bookmark' };
      }
    } catch (error) {
      if (__DEV__) console.error('Add bookmark exception:', error);
      return { success: false, error: 'Failed to add bookmark' };
    }
  }

  /**
   * Remove a bookmark for a forum post
   */
  static async removeBookmark(postId: string, userId: string, session?: any): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.getAuthHeaders(session);
      const response = await fetch(`${API_BASE_URL}/api/forum/bookmarks/${postId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (response.ok) {
        if (__DEV__) console.log('Bookmark removed:', postId);
        return { success: true };
      } else {
        const result = await response.json();
        if (__DEV__) console.error('Remove bookmark error:', result.detail);
        return { success: false, error: result.detail || 'Failed to remove bookmark' };
      }
    } catch (error) {
      if (__DEV__) console.error('Remove bookmark exception:', error);
      return { success: false, error: 'Failed to remove bookmark' };
    }
  }

  /**
   * Check if a post is bookmarked by a user
   */
  // Cache for bookmark status to prevent excessive API calls
  private static bookmarkCache = new Map<string, { isBookmarked: boolean; timestamp: number }>();
  private static readonly CACHE_DURATION = 30000; // 30 seconds
  
  static async isBookmarked(postId: string, userId: string, session?: any): Promise<{ success: boolean; isBookmarked: boolean; error?: string }> {
    try {
      // Check cache first
      const cacheKey = `${userId}-${postId}`;
      const cached = this.bookmarkCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
        return { success: true, isBookmarked: cached.isBookmarked };
      }
      
      const headers = await this.getAuthHeaders(session);
      const response = await fetch(`${API_BASE_URL}/api/forum/bookmarks/check/${postId}`, {
        method: 'GET',
        headers,
      });
      
      if (response.ok) {
        const result = await response.json();
        const isBookmarked = !!result.data?.bookmarked;
        
        // Cache the result
        this.bookmarkCache.set(cacheKey, { isBookmarked, timestamp: now });
        
        return { success: true, isBookmarked };
      } else {
        const result = await response.json();
        if (__DEV__) console.error('Bookmark check error:', result.detail);
        return { success: false, isBookmarked: false, error: result.detail || 'Failed to check bookmark' };
      }
    } catch (error) {
      if (__DEV__) console.error('Bookmark check exception:', error);
      return { success: false, isBookmarked: false, error: 'Failed to check bookmark status' };
    }
  }

  /**
   * Get all bookmarks for a user
   */
  static async getUserBookmarks(userId: string, session?: any): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const headers = await this.getAuthHeaders(session);
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
  static async toggleBookmark(postId: string, userId: string, session?: any): Promise<{ success: boolean; isBookmarked: boolean; error?: string }> {
    try {
      const headers = await this.getAuthHeaders(session);
      const response = await fetch(`${API_BASE_URL}/api/forum/bookmarks/toggle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ post_id: postId }),
      });
      
      if (response.ok) {
        const result = await response.json();
        const isBookmarked = !!result.data?.bookmarked;
        
        // Update cache
        const cacheKey = `${userId}-${postId}`;
        this.bookmarkCache.set(cacheKey, { isBookmarked, timestamp: Date.now() });
        
        if (__DEV__) console.log('Bookmark toggled:', { postId, isBookmarked });
        return { success: true, isBookmarked };
      } else {
        const result = await response.json();
        if (__DEV__) console.error('Toggle bookmark error:', result.detail);
        return { success: false, isBookmarked: false, error: result.detail || 'Failed to toggle bookmark' };
      }
    } catch (error) {
      if (__DEV__) console.error('Toggle bookmark exception:', error);
      return { success: false, isBookmarked: false, error: 'Failed to toggle bookmark' };
    }
  }
  
  // Method to clear cache when needed
  static clearCache(): void {
    this.bookmarkCache.clear();
  }
  
  // Method to invalidate specific cache entry
  static invalidateCache(postId: string, userId: string): void {
    const cacheKey = `${userId}-${postId}`;
    this.bookmarkCache.delete(cacheKey);
  }
}
