import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkConfig } from '../utils/networkConfig';

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
      
      return { 'Content-Type': 'application/json' };
    } catch (error) {
      return { 'Content-Type': 'application/json' };
    }
  }
  /**
   * Add a bookmark for a forum post
   */
  static async addBookmark(postId: string, userId: string, session?: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const headers = await this.getAuthHeaders(session);
      const response = await fetch(`${apiUrl}/api/forum/bookmarks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ post_id: postId }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || result.detail || 'Failed to add bookmark' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to add bookmark' };
    }
  }

  /**
   * Remove a bookmark for a forum post
   */
  static async removeBookmark(postId: string, userId: string, session?: any): Promise<{ success: boolean; error?: string }> {
    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const headers = await this.getAuthHeaders(session);
      const response = await fetch(`${apiUrl}/api/forum/bookmarks/${postId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        const result = await response.json();
        return { success: false, error: result.detail || 'Failed to remove bookmark' };
      }
    } catch (error) {
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
      
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const headers = await this.getAuthHeaders(session);
      const response = await fetch(`${apiUrl}/api/forum/bookmarks/check/${postId}`, {
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
        return { success: false, isBookmarked: false, error: result.detail || 'Failed to check bookmark' };
      }
    } catch (error) {
      return { success: false, isBookmarked: false, error: 'Failed to check bookmark status' };
    }
  }

  /**
   * Get all bookmarks for a user
   */
  static async getUserBookmarks(userId: string, session?: any): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const headers = await this.getAuthHeaders(session);
      const response = await fetch(`${apiUrl}/api/forum/bookmarks/user`, {
        method: 'GET',
        headers,
      });
      
      if (response.ok) {
        const result = await response.json();
        return { success: true, data: result.data || [] };
      } else {
        const result = await response.json();
        return { success: false, error: result.detail || 'Failed to get bookmarks' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to get bookmarks' };
    }
  }

  /**
   * Toggle bookmark status (add if not bookmarked, remove if bookmarked)
   */
  static async toggleBookmark(postId: string, userId: string, session?: any): Promise<{ success: boolean; isBookmarked: boolean; error?: string }> {
    try {
      const headers = await this.getAuthHeaders(session);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/forum/bookmarks/toggle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ post_id: postId }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        const isBookmarked = !!result.data?.bookmarked;
        
        // Update cache
        const cacheKey = `${userId}-${postId}`;
        this.bookmarkCache.set(cacheKey, { isBookmarked, timestamp: Date.now() });
        
        return { success: true, isBookmarked };
      } else {
        const result = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return { success: false, isBookmarked: false, error: result.detail || 'Failed to toggle bookmark' };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, isBookmarked: false, error: 'Request timed out' };
      }
      return { success: false, isBookmarked: false, error: 'Network error' };
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
