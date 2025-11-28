import React, { useState, useEffect, useCallback, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';

import { View, FlatList, RefreshControl, TouchableOpacity, Animated, StyleSheet, ListRenderItem, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NetworkConfig } from '../../utils/networkConfig';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import Post from './Post';
import { useAuth } from '../../contexts/AuthContext';
import { useForumCache } from '../../contexts/ForumCacheContext';
import Colors from '../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useList } from '@/hooks/useOptimizedList';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { getResponsiveValue } from '@/constants/LayoutConstants';
import { Text } from '@/components/ui/text';

interface PostData {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
    isLawyer?: boolean;
    lawyerBadge?: string;
    account_status?: string;
  };
  timestamp: string;
  category: string;
  content: string;
  comments: number;
  // For optimistic posts
  isOptimistic?: boolean;
  animatedOpacity?: Animated.Value;
  isLoading?: boolean;
  isBookmarked?: boolean;
  // Additional data for ViewPost caching
  body?: string;
  domain?: string;
  created_at?: string;
  user_id?: string;
  is_anonymous?: boolean;
  is_flagged?: boolean;
  users?: any;
  // For pagination animation
  isNewlyLoaded?: boolean;
  loadedIndex?: number;
}

interface TimelineProps {
  context?: 'user' | 'lawyer';
}

export interface TimelineHandle {
  scrollToTop: () => void;
  context?: 'user' | 'lawyer';
}

const Timeline = forwardRef<TimelineHandle, TimelineProps>(({ context = 'user' }, ref) => {

  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  // Responsive sizing for plus button
  const buttonSize = getResponsiveValue(screenWidth, 50, 56, 60);
  const iconSize = getResponsiveValue(screenWidth, 22, 24, 26);
  // Slight positive offset so the button floats clearly above the navbar
  const bottomOffset = getResponsiveValue(screenWidth, 16, 18, 20);
  const rightOffset = getResponsiveValue(screenWidth, 16, 20, 24);

  const router = useRouter();
  const { session, isAuthenticated, user: currentUser } = useAuth();
  const { getCachedPosts, setCachedPosts, isCacheValid, updatePostBookmark, setLastFetchTime, prefetchPost, setCachedPost } = useForumCache();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [optimisticPosts, setOptimisticPosts] = useState<PostData[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Refs for optimization
  const currentPageRef = useRef(1);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComponentMounted = useRef(true);
  const loadingMoreRef = useRef(false);
  const refreshingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const listRef = useRef<FlatList>(null);
  // Add scroll position tracking
  const scrollPositionRef = useRef(0);

  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      try {
        listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
      } catch {}
    },
  }), []);

  // Force cache refresh to fix any lingering references
  React.useEffect(() => {
    // This ensures any old references are cleared
  }, []);


  const mapApiToPost = useCallback((row: any): PostData => {
    const isAnon = !!row?.is_anonymous;
    const created = row?.created_at || '';
    const userData = row?.users || {};

    // Map replies data if available
    const replies = row?.replies || row?.forum_replies || [];
    const mappedReplies = replies.map((reply: any) => {
      const isReplyAnon = !!reply?.is_anonymous;
      const replyUserData = reply?.users || {};

      return {
        id: String(reply?.id || ''),
        body: reply?.reply_body || reply?.body || '',
        created_at: reply?.created_at || null,
        user_id: reply?.user_id || null,
        is_anonymous: isReplyAnon,
        is_flagged: !!reply?.is_flagged,
        user: isReplyAnon ? undefined : {
          name: replyUserData?.full_name || replyUserData?.username || 'User',
          username: replyUserData?.username || 'user',
          avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
          isLawyer: replyUserData?.role === 'verified_lawyer',
          lawyerBadge: replyUserData?.role === 'verified_lawyer' ? 'Verified' : undefined,
          account_status: replyUserData?.account_status,
        },
      };
    });

    const postData: PostData = {
      id: String(row?.id ?? ''),
      user: isAnon
        ? { name: 'Anonymous User', username: 'anonymous', avatar: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' } // Detective icon for anonymous users
        : { 
            name: userData?.full_name || userData?.username || 'User', 
            username: userData?.username || 'user', 
            avatar: userData?.photo_url || userData?.profile_photo || undefined,
            isLawyer: userData?.role === 'verified_lawyer',
            lawyerBadge: userData?.role === 'verified_lawyer' ? 'Verified' : undefined,
            account_status: userData?.account_status,
          },
      timestamp: created || '',
      category: row?.category || 'Others',
      content: row?.body || '',
      comments: mappedReplies.length,
      isBookmarked: !!row?.is_bookmarked,
      // Additional data for ViewPost caching
      body: row?.body || '',
      domain: row?.category || 'others',
      created_at: row?.created_at || null,
      user_id: row?.user_id || null,
      is_anonymous: isAnon,
      is_flagged: !!row?.is_flagged,
      users: userData,
    };

    // Cache the complete post (with or without comments) for instant ViewPost loading
    const postWithComments = {
      ...postData,
      replies: mappedReplies,
      commentsLoaded: true,
      commentsTimestamp: Date.now()
    };

    // Use setCachedPost to cache the complete post
    setCachedPost(postData.id, postWithComments as any);

    if (__DEV__) {
      console.log(`Cached post ${postData.id} with ${mappedReplies.length} comments from Timeline`);
    }

    return postData;
  }, [setCachedPost]);

  // Remove complex batching - bookmark status now comes from API

  // Optimized auth headers helper with minimal logging
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    try {
      // First try to get token from AuthContext session
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

      if (__DEV__) console.warn('Timeline: No authentication token available');
      return { 'Content-Type': 'application/json' };
    } catch (error) {
      if (__DEV__) console.warn('Timeline auth error:', error);
      return { 'Content-Type': 'application/json' };
    }
  }, [session?.access_token]);

  // Keep current page in sync between state and ref for stable pagination
  const updateCurrentPage = useCallback((page: number) => {
    setCurrentPage(page);
    currentPageRef.current = page;
  }, []);

  // Optimized loadPosts with retry logic and proper pagination
  const loadPosts = useCallback(async (force = false, retryCount = 0, loadMore = false) => {
    const MAX_RETRIES = 2;
    
    // Check cache first (only for initial load, not for load more)
    if (!force && !loadMore && isCacheValid()) {
      const cachedPosts = getCachedPosts();
      if (cachedPosts && cachedPosts.length > 0) {
        if (__DEV__) console.log('Timeline: Using cached posts, skipping fetch');
        setPosts(cachedPosts);
        setInitialLoading(false);
        setError(null);
        return;
      }
    }

    // Close any open dropdown menus when refreshing
    if (!loadMore) {
      setOpenMenuPostId(null);
    }

    if (!isAuthenticated) {
      if (__DEV__) console.warn('Timeline: User not authenticated, clearing posts');
      setPosts([]);
      setRefreshing(false);
      setInitialLoading(false);
      setLoadingMore(false);
      setError(null);
      return;
    }

    // Set loading state before making request
    if (retryCount === 0) {
      if (loadMore) {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      } else {
        setRefreshing(true);
        refreshingRef.current = true;
        // Reset pagination for fresh load
        updateCurrentPage(1);
        setHasMore(true);
        hasMoreRef.current = true;
      }
    }

    const now = Date.now();
    setLastFetchTime(now);

    try {
      const headers = await getAuthHeaders();
      const API_BASE_URL = await NetworkConfig.getBestApiUrl();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      // Calculate page for API call
      const pageToFetch = loadMore ? currentPageRef.current + 1 : 1;

      if (__DEV__) {
        console.log(`Timeline: Fetching posts page ${pageToFetch} (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), loadMore: ${loadMore}`);
      }

      const response = await fetch(`${API_BASE_URL}/api/forum/posts/recent?page=${pageToFetch}&limit=15`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 403) {
          if (__DEV__) console.warn('Timeline: Authentication failed - 403 Forbidden');
          // Don't clear posts on auth error, just show error message
          setError('Authentication required. Please log in again.');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      let mapped: PostData[] = [];

      if (__DEV__) {
        console.log('Timeline: Raw API response:', {
          success: data?.success,
          dataLength: Array.isArray(data?.data) ? data.data.length : 'not array',
          hasMore: data?.hasMore,
          page: data?.page,
        });
      }

      if (Array.isArray(data?.data)) {
        mapped = data.data.map(mapApiToPost);
      } else if (Array.isArray(data)) {
        mapped = data.map(mapApiToPost);
      } else {
        if (__DEV__) console.warn('Timeline: Unexpected response format', data);
      }

      if (__DEV__) {
        console.log(`Timeline: Successfully mapped ${mapped.length} posts`);
      }

      // Only update if component is still mounted
      if (isComponentMounted.current) {
        if (loadMore) {
          // Append new posts to existing ones and update cache directly
          const newPosts = [...posts, ...mapped];
          setPosts(newPosts);
          setCachedPosts(newPosts);
          updateCurrentPage(pageToFetch);
        } else {
          // Replace posts for fresh load and update cache directly
          setPosts(mapped);
          setCachedPosts(mapped);
          updateCurrentPage(pageToFetch);
        }
        
        // Update hasMore based primarily on API response, but fall back to page size.
        // If the backend explicitly reports hasMore = true, trust it.
        // Otherwise, treat any full batch (mapped.length === 15) as "has more" to keep
        // infinite scrolling working even if the flag is missing or incorrect.
        const backendHasMore = data?.hasMore === true;
        const inferredHasMore = mapped.length === 15; // 15 is the hard-coded limit in this request
        const hasMorePosts = backendHasMore || inferredHasMore;
        setHasMore(hasMorePosts);
        hasMoreRef.current = hasMorePosts;
        setError(null);

        if (mapped.length === 0 && __DEV__) {
          console.log('Timeline: No posts available');
        }
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        if (__DEV__) console.warn('Timeline: Request aborted or timed out');
        // Retry on timeout
        if (retryCount < MAX_RETRIES && isComponentMounted.current) {
          if (__DEV__) console.log(`Timeline: Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => loadPosts(force, retryCount + 1), 1000 * (retryCount + 1));
        }
        return;
      }

      const errorMessage = (error && error.message) ? error.message : 'Failed to load posts';
      if (__DEV__) console.warn('Timeline load error:', errorMessage);

      if (isComponentMounted.current) {
        // Only show error if we have no posts to display
        if (posts.length === 0) {
          setError(errorMessage);
        }
        
        // Retry on network errors
        if (retryCount < MAX_RETRIES && posts.length === 0) {
          if (__DEV__) console.log(`Timeline: Retrying after error... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => loadPosts(force, retryCount + 1), 2000 * (retryCount + 1));
          return;
        }
      }
    } finally {
      if (isComponentMounted.current) {
        setRefreshing(false);
        refreshingRef.current = false;
        setInitialLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    }
  }, [isAuthenticated, getAuthHeaders, mapApiToPost, isCacheValid, getCachedPosts, setCachedPosts, setLastFetchTime, posts, updateCurrentPage]);

  // Track if we've loaded before to prevent unnecessary reloads
  const hasInitialLoadRef = useRef(false);

  // Initial load with cache check
  useEffect(() => {
    if (isComponentMounted.current && !hasInitialLoadRef.current) {
      loadPosts();
      hasInitialLoadRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh posts when screen comes into focus (e.g., returning from CreatePost)
  const hasFocusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // Restore scroll position after a short delay to ensure render is complete
      const savedPosition = scrollPositionRef.current;
      if (savedPosition > 0 && listRef.current) {
        if (__DEV__) console.log(`Timeline: Restoring scroll position: ${savedPosition}`);
        setTimeout(() => {
          if (listRef.current && isComponentMounted.current) {
            listRef.current.scrollToOffset({ offset: savedPosition, animated: false });
          }
        }, 100);
      }
      
      // Only refresh on focus if cache is invalid AND we've already loaded once
      // This prevents overwriting paginated posts with cached first page
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        if (__DEV__) console.log('📱 Timeline: First focus, skipping refresh');
        return;
      }

      // Check if we have valid cached data
      if (isCacheValid()) {
        if (__DEV__) console.log('📱 Timeline: Screen focused, cache valid - using cached data');
        const cachedPosts = getCachedPosts();
        if (cachedPosts && cachedPosts.length > 0) {
          setPosts(cachedPosts);
          setInitialLoading(false);

          // Reconstruct pagination state from cached posts so that
          // currentPageRef and hasMoreRef stay in sync with what is shown.
          const totalPosts = cachedPosts.length;
          const approxPage = Math.max(1, Math.ceil(totalPosts / 15));
          updateCurrentPage(approxPage);

          // If the cached list length is an exact multiple of page size,
          // there might be more posts available; otherwise we've likely
          // reached the end.
          const inferredHasMore = totalPosts % 15 === 0;
          setHasMore(inferredHasMore);
          hasMoreRef.current = inferredHasMore;
        }
      } else {
        if (__DEV__) console.log('📱 Timeline: Screen focused, cache invalid - refreshing');
        loadPosts(true); // Force refresh
      }
    }, [loadPosts, isCacheValid, getCachedPosts])
  );

  // Remove duplicate useFocusEffect - already handled above

  // Optimized polling with smart intervals (only when component is active)
  useEffect(() => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    const scheduleNextFetch = () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      fetchTimeoutRef.current = setTimeout(() => {
        if (isComponentMounted.current && isAuthenticated) {
          // Only poll if the component is still mounted and user is on the page
          loadPosts();
          scheduleNextFetch(); // Schedule next fetch
        }
      }, 120000); // 2 minutes - much less aggressive
    };

    if (isAuthenticated) {
      scheduleNextFetch();
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, loadPosts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMounted.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, []);

  // Optimized event handlers with minimal logging
  const handleCommentPress = useCallback((postId: string) => {
    const route = context === 'lawyer' ? `/lawyer/ViewPost?postId=${postId}` : `/home/ViewPost?postId=${postId}`;
    router.push(route as any);
  }, [context, router]);

  const handleBookmarkPress = useCallback((postId: string) => {
    // The Post component handles the actual bookmark logic
    if (__DEV__) console.log('Bookmark toggled:', postId);
  }, []);

  const handleBookmarkStatusChange = useCallback((postId: string, isBookmarked: boolean) => {
    // Update the post in the posts array directly
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, isBookmarked } : post
    ));
    // Also update the cache
    updatePostBookmark(postId, isBookmarked);
  }, [updatePostBookmark]);

  const handleReportPress = useCallback((postId: string) => {
    // The Post component handles the actual report logic
    if (__DEV__) console.log('Report submitted:', postId);
  }, []);

  const handleMenuToggle = useCallback((postId: string) => {
    setOpenMenuPostId(prev => prev === postId ? null : postId);
  }, []);

  const handlePostPress = useCallback((postId: string) => {
    // Save current scroll position before navigation
    if (listRef.current) {
      const scrollPosition = (listRef.current as any)._scrollMetrics?.offset || 0;
      scrollPositionRef.current = scrollPosition;
      if (__DEV__) console.log(`Timeline: Saving scroll position: ${scrollPosition}`);
    }
    
    // Prefetch the post before navigation for instant loading
    prefetchPost(postId);

    const route = context === 'lawyer' ? `/lawyer/ViewPost?postId=${postId}` : `/home/ViewPost?postId=${postId}`;
    router.push(route as any);
  }, [context, router, prefetchPost]);

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    if (__DEV__) console.log('Timeline: Manual refresh triggered');
    loadPosts(true); // Force refresh
  }, [loadPosts]);

  // Load more handler for infinite scrolling with debouncing
  const loadMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLoadMore = useCallback(() => {
    // Clear any pending load more calls
    if (loadMoreTimeoutRef.current) {
      clearTimeout(loadMoreTimeoutRef.current);
    }

    // Debounce the load more call to prevent rapid firing
    loadMoreTimeoutRef.current = setTimeout(() => {
      // Use refs to check current state and prevent stale closures
      if (loadingMoreRef.current) {
        if (__DEV__) console.log('Timeline: Already loading more, skipping');
        return;
      }

      if (refreshingRef.current) {
        if (__DEV__) console.log('Timeline: Currently refreshing, skipping load more');
        return;
      }

      if (!hasMoreRef.current) {
        if (__DEV__) console.log('Timeline: No more posts to load');
        return;
      }

      if (__DEV__) console.log('Timeline: Loading more posts...', { currentPage: currentPageRef.current, hasMore: hasMoreRef.current });
      loadPosts(false, 0, true); // loadMore = true
    }, 300); // 300ms debounce
  }, [loadPosts]);

  const handleCreatePost = useCallback(() => {
    const route = context === 'lawyer' ? '/lawyer/CreatePost' : '/home/CreatePost';
    router.push(route as any);
  }, [context, router]);

  // Function to add optimistic post
  const addOptimisticPost = useCallback((postData: { body: string; category?: string; is_anonymous?: boolean }) => {
    const animatedOpacity = new Animated.Value(0); // Start completely transparent

    // Get current user info for optimistic post
    const userName = currentUser?.full_name || currentUser?.username || currentUser?.email || 'You';
    const userUsername = currentUser?.username || currentUser?.email?.split('@')[0] || 'you';
    const isLawyer = currentUser?.role === 'verified_lawyer';

    const optimisticPost: PostData = {
      id: `optimistic-${Date.now()}`,
      user: postData.is_anonymous 
        ? { name: 'Anonymous User', username: 'anonymous', avatar: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' } // Detective icon for anonymous posts
        : { 
            name: userName,
            username: userUsername,
            avatar: (currentUser as any)?.photo_url || (currentUser as any)?.profile_photo || undefined,
            isLawyer: isLawyer,
            lawyerBadge: isLawyer ? 'Verified' : undefined
          },
      timestamp: 'now',
      created_at: new Date().toISOString(),
      category: postData.category || 'Others',
      content: postData.body,
      comments: 0,
      isOptimistic: true,
      isLoading: true, // Add loading state for Facebook-style indicator
      animatedOpacity,
    };

    setOptimisticPosts(prev => [optimisticPost, ...prev]);

    // Smooth fade in animation
    Animated.timing(animatedOpacity, {
      toValue: 0.7, // Semi-transparent while posting
      duration: 300,
      useNativeDriver: true,
    }).start();

    return optimisticPost.id;
  }, [currentUser]);

  // Function to confirm optimistic post (make it fully opaque and keep it seamless)
  const confirmOptimisticPost = useCallback(
    (optimisticId: string, realPost?: Partial<PostData> & { id: string }) => {
      setOptimisticPosts(prev => {
        const opt = prev.find(p => p.id === optimisticId);
        if (!opt) return prev;

        // If server returned a real ID, promote optimistic post to a real one immediately
        if (realPost?.id) {
          const promoted: PostData = {
            ...opt,
            id: realPost.id,
            isOptimistic: false,
            isLoading: false, // Remove loading state when confirmed
            animatedOpacity: undefined,
            created_at: realPost.created_at || opt.created_at || new Date().toISOString(),
          } as PostData;

          // Insert promoted post at the top of the real posts list and remove optimistic
          setPosts(current => [promoted, ...current.filter(p => p.id !== realPost.id)]);
          // Remove from optimistic list
          return prev.filter(p => p.id !== optimisticId);
        }

        // Fallback: remove loading state and animate in, then remove after delay
        const updatedOpt = { ...opt, isLoading: false };
        if (opt.animatedOpacity) {
          Animated.timing(opt.animatedOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();

          setTimeout(() => {
            setOptimisticPosts(current => current.filter(p => p.id !== optimisticId));
          }, 1000);
        }
        return prev.map(p => p.id === optimisticId ? updatedOpt : p);
      });
    },
    []
  );

  // Function to remove failed optimistic post
  const removeOptimisticPost = useCallback((optimisticId: string) => {
    setOptimisticPosts(prev => {
      const post = prev.find(p => p.id === optimisticId);
      if (post?.animatedOpacity) {
        // Animate out smoothly
        Animated.timing(post.animatedOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setOptimisticPosts(current => current.filter(p => p.id !== optimisticId));
        });
      } else {
        // Immediate removal if no animation
        return prev.filter(p => p.id !== optimisticId);
      }
      return prev;
    });
  }, []);

  // Expose functions globally for CreatePost to use (only once)
  React.useEffect(() => {
    if (context === 'user') {
      (global as any).userForumActions = {
        addOptimisticPost,
        confirmOptimisticPost,
        removeOptimisticPost,
      };
    } else if (context === 'lawyer') {
      (global as any).forumActions = {
        addOptimisticPost,
        confirmOptimisticPost,
        removeOptimisticPost,
      };
    }
  }, [addOptimisticPost, confirmOptimisticPost, removeOptimisticPost, context]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: PostData) => item.id, []);

  // Memoized render item
  const renderItem: ListRenderItem<PostData> = useCallback(({ item, index }: { item: PostData; index: number }) => {
    // Use loadedIndex for newly loaded posts to create staggered animation
    const animationIndex = item.isNewlyLoaded && item.loadedIndex !== undefined ? item.loadedIndex : 0;

    const postComponent = (
      <Post
        key={item.id}
        id={item.id}
        user={item.user}
        timestamp={item.timestamp}
        created_at={item.created_at}
        category={item.category}
        content={item.content}
        comments={item.comments}
        onCommentPress={() => handleCommentPress(item.id)}
        onReportPress={() => handleReportPress(item.id)}
        onBookmarkPress={() => handleBookmarkPress(item.id)}
        onPostPress={() => handlePostPress(item.id)}
        index={animationIndex}
        isLoading={item.isLoading}
        isOptimistic={item.isOptimistic}
        isMenuOpen={openMenuPostId === item.id}
        onMenuToggle={handleMenuToggle}
        isBookmarked={item.isBookmarked}
        onBookmarkStatusChange={handleBookmarkStatusChange}
      />
    );

    // Wrap optimistic posts with animated opacity
    if (item.isOptimistic && item.animatedOpacity) {
      return (
        <Animated.View style={{ opacity: item.animatedOpacity }}>
          {postComponent}
        </Animated.View>
      );
    }

    return postComponent;
  }, [
    handleCommentPress,
    handleReportPress,
    handleBookmarkPress,
    handlePostPress,
    openMenuPostId,
    handleMenuToggle,
    handleBookmarkStatusChange,
  ]);

  // Combined posts data with duplicate detection for seamless transition
  const allPosts = useMemo(() => {
    // Filter out real posts that match optimistic posts to prevent duplicates
    const filteredRealPosts = posts.filter(realPost => {
      // Check if there's an optimistic post with similar content and timestamp
      const hasOptimisticMatch = optimisticPosts.some(optPost => {
        // Match by content and approximate created_at timestamp (within 30 seconds)
        const contentMatch = (optPost.content || '').trim() === (realPost.content || '').trim();
        const t1 = optPost.created_at ? Date.parse(optPost.created_at) : NaN;
        const t2 = realPost.created_at ? Date.parse(realPost.created_at) : NaN;
        const timeMatch = Number.isFinite(t1) && Number.isFinite(t2) && Math.abs(t1 - t2) < 30000;
        return contentMatch && timeMatch;
      });

      return !hasOptimisticMatch;
    });

    // Combine optimistic and real posts, then dedupe by id to avoid
    // duplicate keys in FlatList even if the same post is appended twice.
    const combined = [...optimisticPosts, ...filteredRealPosts];
    const seen = new Set<string>();
    const unique: PostData[] = [];

    for (const post of combined) {
      const id = post.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      unique.push(post);
    }

    return unique;
  }, [optimisticPosts, posts]);

  // Use optimized list hook
  const listProps = useList({
    data: allPosts,
    keyExtractor,
    renderItem,
  });

  // Refresh control
  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={[Colors.primary.blue]}
      tintColor={Colors.primary.blue}
    />
  );

  // Expose functions globally for CreatePost to use
  React.useEffect(() => {
    if (context === 'user') {
      (global as any).userForumActions = {
        addOptimisticPost,
        confirmOptimisticPost,
        removeOptimisticPost,
      };
    } else if (context === 'lawyer') {
      (global as any).forumActions = {
        addOptimisticPost,
        confirmOptimisticPost,
        removeOptimisticPost,
      };
    }
  }, [addOptimisticPost, confirmOptimisticPost, removeOptimisticPost, context]);

  // Render footer component
  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="small" />
        </View>
      );
    }

    if (!hasMore && allPosts.length > 0 && !loadingMore) {
      return (
        <View style={styles.endOfPostsContainer}>
          <Text style={styles.endOfPostsText}>You&apos;ve reached the end</Text>
        </View>
      );
    }

    if (allPosts.length > 0) {
      return <View style={styles.bottomSpacer} />;
    }

    return null;
  }, [loadingMore, allPosts.length, hasMore]);

  return (
    <View style={styles.container}>
      {/* Show skeleton loading for initial load */}
      {initialLoading && allPosts.length === 0 ? (
        <View style={[styles.timeline, styles.skeletonContainer, { paddingBottom: 56 + (insets.bottom || 0) + 20 }]}>
          <SkeletonList itemCount={8} itemHeight={200} spacing={12} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          {...listProps}
          style={styles.timeline}
          onScroll={(event) => {
            // Track scroll position as user scrolls
            scrollPositionRef.current = event.nativeEvent.contentOffset.y;
            // Close any open menus when scrolling
            setOpenMenuPostId(null);
          }}
          contentContainerStyle={allPosts.length === 0 ? styles.emptyContent : [styles.timelineContent, { paddingBottom: 56 + (insets.bottom || 0) + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          ListHeaderComponent={null}
          ListFooterComponent={renderFooter}
          scrollEventThrottle={400}
          onEndReached={allPosts.length > 0 ? handleLoadMore : undefined}
          onEndReachedThreshold={0.3}
          scrollEnabled={allPosts.length > 0 || initialLoading}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={10}
          initialNumToRender={10}
        />
      )}

      {/* Floating Create Post Button */}
      <TouchableOpacity 
        style={[
          styles.createPostButton, 
          { 
            bottom: bottomOffset + (insets.bottom || 0),
            right: rightOffset,
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
          }
        ]} 
        onPress={handleCreatePost} 
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel="Create new post"
        accessibilityRole="button"
        accessibilityHint="Tap to create a new forum post"
        testID="create-post-button"
      >
        <Plus size={iconSize} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background for post content area
  },
  timeline: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  timelineContent: {
    paddingTop: 10,
    // Dynamic bottom padding handled inline
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  skeletonContainer: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  bottomSpacer: {
    height: 80, // Add a spacer at the bottom to prevent content from being hidden
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endOfPostsContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endOfPostsText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  createPostButton: {
    position: 'absolute',
    bottom: 62, // Very close to navbar - will be adjusted dynamically with safe area insets
    right: 16, // Reduced from 20 for better balance
    width: 56, // Slightly smaller for better proportions
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary.blue,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8, // Reduced elevation for less prominent shadow
    shadowColor: Colors.primary.blue,
    shadowOffset: { width: 0, height: 3 }, // Reduced shadow height
    shadowOpacity: 0.25, // Reduced shadow opacity
    shadowRadius: 6, // Reduced shadow radius for softer shadow
    zIndex: 1000, // Explicit z-index for iOS
    // Add subtle border for definition
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

Timeline.displayName = 'Timeline';

export default Timeline;