import React, { useState, useEffect, useCallback, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';

import { View, FlatList, RefreshControl, TouchableOpacity, Animated, StyleSheet, ListRenderItem, Text as RNText } from 'react-native';
import { NetworkConfig } from '../../utils/networkConfig';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import Post from './Post';
import { useAuth } from '../../contexts/AuthContext';
import { useForumCache } from '../../contexts/ForumCacheContext';
import Colors from '../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ForumLoadingAnimation from '../ui/ForumLoadingAnimation';
import { useList } from '@/hooks/useOptimizedList';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Text } from '@/components/ui/text';

interface PostData {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
    isLawyer?: boolean;
    lawyerBadge?: string;
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
  searchResults?: any[];
  isSearchMode?: boolean;
  searchQuery?: string;
}

export interface TimelineHandle {
  scrollToTop: () => void;
}

const Timeline = forwardRef<TimelineHandle, TimelineProps>(({ context = 'user', searchResults, isSearchMode = false, searchQuery }, ref) => {

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
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const POSTS_PER_PAGE = 20;

  // Refs for optimization
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComponentMounted = useRef(true);
  const loadingMoreRef = useRef(false);
  const refreshingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const listRef = useRef<FlatList>(null);

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

  const formatTimeAgo = useCallback((isoDate?: string): string => {
    if (!isoDate) return '';
    // Treat timestamps without timezone as UTC to avoid local offset issues
    const hasTz = /Z|[+-]\d{2}:?\d{2}$/.test(isoDate);
    const normalized = hasTz ? isoDate : `${isoDate}Z`;
    const createdMs = new Date(normalized).getTime();
    if (Number.isNaN(createdMs)) return '';
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - createdMs) / 1000));
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d`;
    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 4) return `${diffWeek}w`;
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth}mo`;
    const diffYear = Math.floor(diffDay / 365);
    return `${diffYear}y`;
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
            avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png', // Gray default person icon
            isLawyer: userData?.role === 'verified_lawyer',
            lawyerBadge: userData?.role === 'verified_lawyer' ? 'Verified' : undefined,
          },
      timestamp: formatTimeAgo(created),
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
  }, [formatTimeAgo, setCachedPost]);

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
      if (__DEV__) console.error('Timeline auth error:', error);
      return { 'Content-Type': 'application/json' };
    }
  }, [session?.access_token]);

  // Optimized loadPosts with persistent caching and pagination support
  const loadPosts = useCallback(async (force = false, append = false) => {
    // Check cache first (only for initial load)
    if (!force && !append && isCacheValid()) {
      const cachedPosts = getCachedPosts();
      if (cachedPosts && cachedPosts.length > 0) {
        if (__DEV__) console.log('Timeline: Using cached posts, skipping fetch');
        setPosts(cachedPosts);
        setInitialLoading(false);
        return;
      }
    }

    // Close any open dropdown menus when refreshing
    if (!append) {
      setOpenMenuPostId(null);
    }
    setError(null);

    if (!isAuthenticated) {
      if (__DEV__) console.warn('Timeline: User not authenticated, clearing posts');
      setPosts([]);
      setRefreshing(false);
      setInitialLoading(false);
      setLoadingMore(false);
      return;
    }

    // Set loading state before making request
    if (append) {
      setLoadingMore(true);
      loadingMoreRef.current = true;
    } else {
      setRefreshing(true);
      refreshingRef.current = true;
      setCurrentPage(0);
      setHasMore(true);
      hasMoreRef.current = true;
    }

    const now = Date.now();
    if (!append) {
      setLastFetchTime(now);
    }

    try {
      const headers = await getAuthHeaders();
      const API_BASE_URL = await NetworkConfig.getBestApiUrl();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      // Use ref to get current page value to avoid stale closure
      const pageToFetch = append ? currentPage + 1 : 0;
      const offset = pageToFetch * POSTS_PER_PAGE;

      if (__DEV__) {
        console.log('Timeline: Fetching posts', { append, pageToFetch, offset, limit: POSTS_PER_PAGE });
      }

      const response = await fetch(`${API_BASE_URL}/api/forum/posts/recent?limit=${POSTS_PER_PAGE}&offset=${offset}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 403) {
          if (__DEV__) console.error('Timeline: Authentication failed - 403 Forbidden. Check if user is properly authenticated.');
          // Clear posts and show authentication error
          setPosts([]);
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
          dataType: Array.isArray(data?.data) ? 'array' : typeof data?.data,
          dataLength: Array.isArray(data?.data) ? data.data.length : 'not array',
          directArray: Array.isArray(data),
          directLength: Array.isArray(data) ? data.length : 'not array',
          offset,
          append
        });
      }

      if (Array.isArray(data?.data)) {
        mapped = data.data.map(mapApiToPost);
      } else if (Array.isArray(data)) {
        mapped = data.map(mapApiToPost);
      }

      if (__DEV__) {
        console.log(`Timeline: Mapped ${mapped.length} posts from API response (append: ${append})`);
      }

      // Check if we have more posts to load
      const hasMorePosts = mapped.length === POSTS_PER_PAGE;

      // Only update if component is still mounted
      if (isComponentMounted.current) {
        if (append) {
          // Append new posts and filter out duplicates
          setPosts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newPosts = mapped.filter(p => !existingIds.has(p.id));

            // Mark new posts for staggered animation
            const newPostsWithAnimation = newPosts.map((post, idx) => ({
              ...post,
              isNewlyLoaded: true,
              loadedIndex: idx,
            }));

            const combined = [...prev, ...newPostsWithAnimation];
            if (__DEV__) {
              console.log('Timeline: Appended posts', { 
                previous: prev.length, 
                new: newPosts.length, 
                total: combined.length,
                hasMore: hasMorePosts
              });
            }

            // Clear the isNewlyLoaded flag after animation completes
            setTimeout(() => {
              setPosts(current => current.map(p => ({
                ...p,
                isNewlyLoaded: false,
                loadedIndex: undefined,
              })));
            }, newPosts.length * 80 + 500); // Animation duration + buffer

            return combined;
          });
          setCurrentPage(pageToFetch);
          setHasMore(hasMorePosts);
          hasMoreRef.current = hasMorePosts;
        } else {
          // Replace posts for refresh
          setPosts(mapped);
          setCachedPosts(mapped); // Cache the posts
          setCurrentPage(0);
          setHasMore(hasMorePosts);
          hasMoreRef.current = hasMorePosts;
        }

        if (__DEV__ && mapped.length === 0) {
          console.log('Timeline: No posts found after mapping');
        }

        // Clear any error state on successful load
        setError(null);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Silent abort - don't log as it's expected behavior
        return;
      }

      const errorMessage = error.message || 'Failed to load posts';
      if (__DEV__) console.error('Timeline load error:', errorMessage);

      if (isComponentMounted.current) {
        setError(errorMessage);
        // Don't clear posts on error to maintain user experience
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
  }, [isAuthenticated, getAuthHeaders, mapApiToPost, isCacheValid, getCachedPosts, setCachedPosts, setLastFetchTime]);

  // Initial load with cache check
  useEffect(() => {
    if (isComponentMounted.current) {
      loadPosts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh posts when screen comes into focus (e.g., returning from CreatePost)
  const hasFocusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // Only refresh on focus if cache is invalid AND we've already loaded once
      // This prevents overwriting paginated posts with cached first page
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        if (__DEV__) console.log('📱 Timeline: First focus, skipping refresh');
        return;
      }

      if (!isCacheValid()) {
        if (__DEV__) console.log('📱 Timeline: Screen focused, cache invalid - refreshing');
        loadPosts(true); // Force refresh
      } else {
        if (__DEV__) console.log('📱 Timeline: Screen focused, cache valid - skipping refresh to preserve pagination');
        // Don't reload from cache as it would overwrite paginated posts
      }
    }, [loadPosts, isCacheValid])
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
    // Prefetch the post before navigation for instant loading
    prefetchPost(postId);

    const route = context === 'lawyer' ? `/lawyer/ViewPost?postId=${postId}` : `/home/ViewPost?postId=${postId}`;
    router.push(route as any);
  }, [context, router, prefetchPost]);

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    if (__DEV__) console.log('Timeline: Manual refresh triggered');
    loadPosts(true, false); // Force refresh, don't append
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

      if (isSearchMode) {
        if (__DEV__) console.log('Timeline: In search mode, skipping load more');
        return;
      }

      if (__DEV__) console.log('Timeline: Loading more posts...', { currentPage, hasMore: hasMoreRef.current });
      loadPosts(false, true); // Don't force, append to existing
    }, 300); // 300ms debounce
  }, [loadPosts, isSearchMode]);

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
            avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
            isLawyer: isLawyer,
            lawyerBadge: isLawyer ? 'Verified' : undefined
          },
      timestamp: 'now',
      category: postData.category || 'Others',
      content: postData.body,
      comments: 0,
      isOptimistic: true,
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
  const confirmOptimisticPost = useCallback((optimisticId: string, realPost?: PostData) => {
    setOptimisticPosts(prev => {
      const post = prev.find(p => p.id === optimisticId);
      if (post?.animatedOpacity) {
        // Animate to full opacity to show success
        Animated.timing(post.animatedOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();

        // Keep optimistic post visible and let duplicate detection handle seamless transition
        // The post will automatically be filtered out when the real post appears
        // Only remove it after a reasonable time to ensure the real post has loaded
        setTimeout(() => {
          setOptimisticPosts(current => current.filter(p => p.id !== optimisticId));
        }, 3000); // Extended delay - duplicate detection prevents visual duplicates
      }
      return prev;
    });
  }, []);

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

  // Expose functions globally for CreatePost to use
  React.useEffect(() => {
    if (context === 'user') {
      (global as any).userForumActions = {
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
        onBookmarkPress={() => handleBookmarkPress(item.id)}
        onReportPress={() => handleReportPress(item.id)}
        onPostPress={() => handlePostPress(item.id)}
        index={item.isNewlyLoaded ? animationIndex : 0}
        isLoading={item.isLoading}
        isOptimistic={item.isOptimistic}
        isMenuOpen={openMenuPostId === item.id}
        onMenuToggle={handleMenuToggle}
        isBookmarked={item.isBookmarked || false}
        onBookmarkStatusChange={handleBookmarkStatusChange}
        searchTerm={searchQuery}
        isSearchResult={isSearchMode}
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
  }, [handleCommentPress, handleBookmarkPress, handleReportPress, handlePostPress, handleMenuToggle, openMenuPostId, handleBookmarkStatusChange, searchQuery, isSearchMode]);

  // Combined posts data with duplicate detection for seamless transition
  const allPosts = useMemo(() => {
    // If in search mode, use search results
    if (isSearchMode && searchResults) {
      // Using search results
      return searchResults.map(mapApiToPost);
    }

    // Filter out real posts that match optimistic posts to prevent duplicates
    const filteredRealPosts = posts.filter(realPost => {
      // Check if there's an optimistic post with similar content and timestamp
      const hasOptimisticMatch = optimisticPosts.some(optPost => {
        // Match by content and approximate timestamp (within 30 seconds)
        const contentMatch = optPost.content.trim() === realPost.content.trim();
        const timeMatch = Math.abs(
          new Date(optPost.timestamp).getTime() - new Date(realPost.timestamp).getTime()
        ) < 30000; // 30 seconds tolerance
        return contentMatch && timeMatch;
      });

      return !hasOptimisticMatch;
    });

    return [...optimisticPosts, ...filteredRealPosts];
  }, [optimisticPosts, posts, isSearchMode, searchResults, mapApiToPost]);

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
          <Text style={styles.endOfPostsText}>You've reached the end</Text>
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
      {/* Forum Loading Animation */}
      <ForumLoadingAnimation visible={initialLoading} />

      {/* Show skeleton loading for initial load */}
      {initialLoading && allPosts.length === 0 ? (
        <View style={styles.skeletonContainer}>
          <SkeletonList itemCount={8} itemHeight={200} spacing={12} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          {...listProps}
          style={styles.timeline}
          contentContainerStyle={allPosts.length === 0 ? styles.emptyContent : styles.timelineContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          ListHeaderComponent={isSearchMode && searchQuery && allPosts.length === 0 ? (
            <View style={styles.searchHeader}>
              <Text style={styles.searchHeaderText}>
                No results found for "{searchQuery}"
              </Text>
              <Text style={styles.searchHelpText}>
                Try searching for:
                {'\n'}• Content keywords (e.g., "contract", "employment")
                {'\n'}• Usernames (e.g., "lyanna" or "@lyanna")
                {'\n'}• Categories (e.g., "family" or "#family")
              </Text>
            </View>
          ) : null}
          ListFooterComponent={renderFooter}
          onScroll={() => setOpenMenuPostId(null)}
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
        style={styles.createPostButton} 
        onPress={handleCreatePost} 
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel="Create new post"
        accessibilityRole="button"
        accessibilityHint="Tap to create a new forum post"
        testID="create-post-button"
      >
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  timeline: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  timelineContent: {
    paddingTop: 10,
    paddingBottom: 100, // Account for bottom navigation
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 16,
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
    bottom: 90, // Positioned above bottom navigation
    right: 20,
    width: 60, // Slightly larger for better touch target
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary.blue,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12, // Higher elevation for better visibility
    shadowColor: Colors.primary.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    zIndex: 1000, // Explicit z-index for iOS
    // Add subtle border for definition
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchHeader: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },
  searchHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.head,
    marginBottom: 8,
  },
  searchHelpText: {
    fontSize: 14,
    color: Colors.text.sub,
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Timeline;