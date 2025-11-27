/**
 * Custom hook for creating forum posts
 * Handles optimistic updates, moderation, and error handling
 * @module useCreatePost
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useForumCache } from '@/contexts/ForumCacheContext';
import { useModerationStatus } from '@/contexts/ModerationContext';
import { NetworkConfig } from '@/utils/networkConfig';
import { useToast } from '@/components/ui/toast';
import { parseModerationError } from '@/services/moderationService';
import { showModerationToast, showStrikeAddedToast, showSuspendedToast, showBannedToast, showContentValidationToast } from '@/utils/moderationToastUtils';
import { validatePostContent } from '@/utils/contentValidation';

// Constants
const OPTIMISTIC_CONFIRM_DELAY = 500;
const REQUEST_TIMEOUT = 30000; // 30 seconds

interface CreatePostPayload {
  body: string;
  category?: string;
  is_anonymous: boolean;
}

interface UseCreatePostOptions {
  userType: 'user' | 'lawyer';
  globalActionsKey: 'userForumActions' | 'forumActions';
}

interface UseCreatePostReturn {
  isPosting: boolean;
  createPost: (content: string, categoryId: string, isAnonymous: boolean) => Promise<void>;
}

/**
 * Custom hook for creating forum posts with optimistic updates and moderation
 */
export const useCreatePost = ({ userType, globalActionsKey }: UseCreatePostOptions): UseCreatePostReturn => {
  const router = useRouter();
  const { session, isAuthenticated } = useAuth();
  const { clearCache } = useForumCache();
  const { refreshStatus } = useModerationStatus();
  const toast = useToast();
  
  const [isPosting, setIsPosting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Get authentication headers from session
   */
  const getAuthHeaders = useCallback((): HeadersInit => {
    if (session?.access_token) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };
    }
    return { 'Content-Type': 'application/json' };
  }, [session?.access_token]);

  /**
   * Handle optimistic post addition
   */
  const addOptimisticPost = useCallback((payload: CreatePostPayload): string | undefined => {
    const globalActions = (global as any)[globalActionsKey];
    return globalActions?.addOptimisticPost(payload);
  }, [globalActionsKey]);

  /**
   * Handle optimistic post removal
   */
  const removeOptimisticPost = useCallback((optimisticId?: string) => {
    if (optimisticId) {
      const globalActions = (global as any)[globalActionsKey];
      globalActions?.removeOptimisticPost(optimisticId);
    }
  }, [globalActionsKey]);

  /**
   * Handle optimistic post confirmation
   */
  const confirmOptimisticPost = useCallback(
    (optimisticId?: string, realPost?: { id: string; created_at?: string }) => {
      if (optimisticId) {
        const globalActions = (global as any)[globalActionsKey];
        if (realPost) {
          globalActions?.confirmOptimisticPost(optimisticId, realPost);
        } else {
          globalActions?.confirmOptimisticPost(optimisticId);
        }
      }
    },
    [globalActionsKey]
  );

  /**
   * Update moderation status after violation
   */
  const updateModerationStatus = useCallback(async () => {
    await refreshStatus();
  }, [refreshStatus]);

  /**
   * Handle 403 Forbidden errors (suspended/banned accounts)
   */
  const handle403Error = useCallback(async (errorText: string, optimisticId?: string) => {
    removeOptimisticPost(optimisticId);
    await updateModerationStatus();

    try {
      const parsed = JSON.parse(errorText);
      const message = parsed.detail || 'Your account is suspended or banned.';
      showModerationToast(toast, 'error', 'Access Denied', message, 7000);
    } catch {
      showModerationToast(toast, 'error', 'Access Denied', 'Your account is suspended or banned.', 7000);
    }
  }, [toast, removeOptimisticPost, updateModerationStatus]);

  /**
   * Handle moderation errors (400 Bad Request with moderation details)
   */
  const handleModerationError = useCallback(async (errorText: string, optimisticId?: string) => {
    const moderationError = parseModerationError(errorText);
    if (!moderationError) return false;

    removeOptimisticPost(optimisticId);
    
    // Check if this is a promotional/link validation error (no moderation status update needed)
    if (moderationError.action_taken === 'content_blocked') {
      showContentValidationToast(
        toast, 
        'error', 
        moderationError.reason || 'Content Blocked', 
        moderationError.detail, 
        7000
      );
      return true;
    }

    // For actual moderation violations, update status
    await updateModerationStatus();

    // Show appropriate toast based on action taken with detailed strike/suspension info
    if (moderationError.action_taken === 'strike_added') {
      showStrikeAddedToast(
        toast,
        moderationError.detail,
        moderationError.strike_count,
        moderationError.suspension_count
      );
    } else if (moderationError.action_taken === 'suspended') {
      showSuspendedToast(
        toast,
        moderationError.detail,
        moderationError.suspension_count,
        moderationError.suspension_end
      );
    } else if (moderationError.action_taken === 'banned') {
      showBannedToast(toast, moderationError.detail);
    } else {
      // Fallback for unknown action types
      showModerationToast(toast, 'error', 'Content Violation', moderationError.detail, 5000);
    }

    return true;
  }, [toast, removeOptimisticPost, updateModerationStatus]);

  /**
   * Create a forum post with optimistic updates
   */
  const createPost = useCallback(async (
    content: string,
    categoryId: string,
    isAnonymous: boolean
  ): Promise<void> => {
    console.log('🎯 createPost function called with:', { content, categoryId, isAnonymous });
    
    // Validation
    if (!isAuthenticated) {
      console.error('❌ Not authenticated');
      Alert.alert('Authentication Required', 'Please log in to create a post.', [{ text: 'OK' }]);
      return;
    }

    // Validate content for prohibited material (links, promotional content)
    const validation = validatePostContent(content);
    if (!validation.isValid) {
      console.error('❌ Content validation failed:', validation);
      showContentValidationToast(
        toast,
        'error',
        validation.reason || 'Content Blocked',
        validation.details || 'This post cannot be published.',
        6000
      );
      return;
    }

    console.log('✅ Initial validation passed');
    setIsPosting(true);

    const payload: CreatePostPayload = {
      body: content.trim(),
      category: categoryId || undefined,
      is_anonymous: isAnonymous,
    };

    // Add optimistic post and navigate back immediately for better UX
    const optimisticId = addOptimisticPost(payload);
    
    // Navigate back immediately to show optimistic post in timeline
    router.back();
    
    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      
      // Debug logging to identify environment differences
      console.log('🌐 Create post API URL:', apiUrl);
      console.log('🌐 Platform:', Platform.OS);
      console.log('🌐 Is dev:', __DEV__);
      console.log('📤 Request payload:', payload);
      
      // Validation checks before API call
      if (!payload.body || !payload.body.trim()) {
        console.error('❌ Validation failed: Empty content');
        Alert.alert('Error', 'Please enter some content for your post.');
        return;
      }
      
      if (!payload.category) {
        console.error('❌ Validation failed: No category selected');
        Alert.alert('Error', 'Please select a category for your post.');
        return;
      }
      
      const authHeaders = getAuthHeaders() as Record<string, string>;
      console.log('🔑 Auth headers:', Object.keys(authHeaders));
      
      if (!authHeaders.Authorization) {
        console.error('❌ Validation failed: No auth token');
        Alert.alert('Error', 'You must be logged in to create a post.');
        return;
      }
      
      console.log('🚀 About to make fetch request...');
      const startTime = Date.now();
      
      const response = await fetch(`${apiUrl}/api/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      const fetchTime = Date.now() - startTime;
      console.log(`✅ Fetch completed in ${fetchTime}ms, status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CreatePost:${userType}] Failed: ${response.status}`, errorText);

        // Handle 403 Forbidden
        if (response.status === 403) {
          await handle403Error(errorText, optimisticId);
          return;
        }

        // Handle moderation errors
        const handled = await handleModerationError(errorText, optimisticId);
        if (handled) return;

        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const resp = await response.json();
      
      // Debug logging to identify the issue
      console.log('🔍 Create post response:', resp);
      console.log('🔍 Response success field:', resp.success);
      console.log('🔍 Response status:', response.status);
      
      console.log(`[CreatePost:${userType}] Post created successfully`);

      if (!resp.success) {
        console.error('❌ Failed to create post - resp.success is false:', resp);
        console.error('❌ Response details:', resp);
        removeOptimisticPost(optimisticId);
        Alert.alert('Error', 'Failed to create post. Please try again.', [{ text: 'OK' }]);
        return;
      }

      // Clear cache and confirm optimistic post after delay, promoting with real post id
      clearCache();
      timeoutRef.current = setTimeout(() => {
        if (resp?.post_id) {
          confirmOptimisticPost(optimisticId, { id: String(resp.post_id) });
        } else {
          console.error('❌ No post_id in response:', resp);
        }
      }, OPTIMISTIC_CONFIRM_DELAY);
      
    } catch (error) {
      // Comprehensive error handling for preview builds
      console.error('❌ Create post failed:', error);
      console.error('❌ Error type:', error instanceof Error ? error.constructor.name : 'Unknown');
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Show detailed error to user in preview builds
      Alert.alert(
        'Create Post Error', 
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nType: ${error instanceof Error ? error.constructor.name : 'Unknown'}`,
        [{ text: 'OK' }]
      );
      
      // Restore form data and remove optimistic post
      if (optimisticId) {
        removeOptimisticPost(optimisticId);
      }
      
    } finally {
      // Always reset posting state
      setIsPosting(false);
    }
  }, [
    isAuthenticated,
    userType,
    router,
    getAuthHeaders,
    addOptimisticPost,
    removeOptimisticPost,
    confirmOptimisticPost,
    clearCache,
    handle403Error,
    handleModerationError,
    toast,
  ]);

  return {
    isPosting,
    createPost,
  };
};
