/**
 * Custom hook for creating forum posts
 * Handles optimistic updates, moderation, and error handling
 * @module useCreatePost
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useForumCache } from '@/contexts/ForumCacheContext';
import { useModerationStatus } from '@/contexts/ModerationContext';
import { NetworkConfig } from '@/utils/networkConfig';
import { useToast } from '@/components/ui/toast';
import { parseModerationError } from '@/services/moderationService';
import { showModerationToast, showStrikeAddedToast, showSuspendedToast, showBannedToast } from '@/utils/moderationToastUtils';

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
  const confirmOptimisticPost = useCallback((optimisticId?: string) => {
    if (optimisticId) {
      const globalActions = (global as any)[globalActionsKey];
      globalActions?.confirmOptimisticPost(optimisticId);
    }
  }, [globalActionsKey]);

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
    // Validation
    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please log in to create a post.', [{ text: 'OK' }]);
      return;
    }

    setIsPosting(true);

    const payload: CreatePostPayload = {
      body: content.trim(),
      category: categoryId || undefined,
      is_anonymous: isAnonymous,
    };

    // Add optimistic post and navigate back immediately
    const optimisticId = addOptimisticPost(payload);
    router.back();

    try {
      const headers = getAuthHeaders();
      const apiUrl = await NetworkConfig.getBestApiUrl();

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      console.log(`[CreatePost:${userType}] Creating post at ${apiUrl}/api/forum/posts`);

      const response = await fetch(`${apiUrl}/api/forum/posts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
      console.log(`[CreatePost:${userType}] Post created successfully`);

      if (!resp.success) {
        console.error('Failed to create post', resp.error);
        removeOptimisticPost(optimisticId);
        Alert.alert('Error', 'Failed to create post. Please try again.', [{ text: 'OK' }]);
        return;
      }

      // Clear cache and confirm optimistic post after delay
      clearCache();
      timeoutRef.current = setTimeout(() => {
        confirmOptimisticPost(optimisticId);
      }, OPTIMISTIC_CONFIRM_DELAY);

    } catch (e: any) {
      console.error(`[CreatePost:${userType}] Error:`, e);
      removeOptimisticPost(optimisticId);
      clearCache();

      if (e.name === 'AbortError') {
        Alert.alert('Timeout', 'Request timed out. Please check your connection and try again.', [{ text: 'OK' }]);
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.', [{ text: 'OK' }]);
      }
    } finally {
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
  ]);

  return {
    isPosting,
    createPost,
  };
};
