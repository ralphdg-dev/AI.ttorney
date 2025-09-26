import { supabase } from '../config/supabase';
import { Database } from '../types/database.types';

type BookmarkInsert = Database['public']['Tables']['user_forum_bookmarks']['Insert'];
type BookmarkRow = Database['public']['Tables']['user_forum_bookmarks']['Row'];

export class BookmarkService {
  /**
   * Add a bookmark for a forum post
   */
  static async addBookmark(postId: string, userId: string): Promise<{ success: boolean; data?: BookmarkRow; error?: string }> {
    try {
      console.log('Adding bookmark with data:', { post_id: postId, user_id: userId });
      
      // First check if the post exists
      const { data: postExists, error: postError } = await supabase
        .from('forum_posts')
        .select('id')
        .eq('id', postId)
        .single();
      
      if (postError || !postExists) {
        console.error('Post does not exist:', postError);
        return { success: false, error: 'Post not found' };
      }

      // Check if bookmark already exists
      const { data: existingBookmark } = await supabase
        .from('user_forum_bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingBookmark) {
        console.log('Bookmark already exists');
        return { success: true, data: existingBookmark as BookmarkRow };
      }
      
      const { data, error } = await supabase
        .from('user_forum_bookmarks')
        .insert({
          post_id: postId,
          user_id: userId,
          bookmarked_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error adding bookmark:', error);
        return { success: false, error: error.message };
      }

      console.log('Bookmark added successfully:', data);
      return { success: true, data };
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
      
      const { error } = await supabase
        .from('user_forum_bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing bookmark:', error);
        return { success: false, error: error.message };
      }

      console.log('Bookmark removed successfully');
      return { success: true };
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
      
      const { data, error } = await supabase
        .from('user_forum_bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

      if (error) {
        console.error('Error checking bookmark:', error);
        return { success: false, isBookmarked: false, error: error.message };
      }

      const isBookmarked = !!data;
      console.log('Bookmark check result:', { isBookmarked, data });
      return { success: true, isBookmarked };
    } catch (error) {
      console.error('Error checking bookmark:', error);
      return { success: false, isBookmarked: false, error: 'Failed to check bookmark status' };
    }
  }

  /**
   * Get all bookmarks for a user
   */
  static async getUserBookmarks(userId: string): Promise<{ success: boolean; data?: BookmarkRow[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_forum_bookmarks')
        .select(`
          *,
          forum_posts (
            id,
            title,
            body,
            domain,
            created_at,
            user_id,
            is_anonymous
          )
        `)
        .eq('user_id', userId)
        .order('bookmarked_at', { ascending: false });

      if (error) {
        console.error('Error getting user bookmarks:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
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
      
      const checkResult = await this.isBookmarked(postId, userId);
      console.log('Current bookmark status:', checkResult);
      
      if (!checkResult.success) {
        return { success: false, isBookmarked: false, error: checkResult.error };
      }

      if (checkResult.isBookmarked) {
        console.log('Bookmark exists, removing...');
        const removeResult = await this.removeBookmark(postId, userId);
        console.log('Remove result:', removeResult);
        return { 
          success: removeResult.success, 
          isBookmarked: false, 
          error: removeResult.error 
        };
      } else {
        console.log('Bookmark does not exist, adding...');
        const addResult = await this.addBookmark(postId, userId);
        console.log('Add result:', addResult);
        return { 
          success: addResult.success, 
          isBookmarked: true, 
          error: addResult.error 
        };
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      return { success: false, isBookmarked: false, error: 'Failed to toggle bookmark' };
    }
  }
}
