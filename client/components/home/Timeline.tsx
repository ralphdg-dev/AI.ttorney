import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Animated, ListRenderItem } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Post from './Post';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import ForumLoadingAnimation from '../ui/ForumLoadingAnimation';
import { useList } from '@/hooks/useOptimizedList';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import { useAuth } from '../../contexts/AuthContext';
import { useForumCache } from '../../contexts/ForumCacheContext';
import Colors from '../../constants/Colors';

interface PostData {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
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
}

interface TimelineProps {
  context?: 'user' | 'lawyer';
}

const Timeline: React.FC<TimelineProps> = ({ context = 'user' }) => {
  const router = useRouter();
  const { session, isAuthenticated } = useAuth();
  const { getCachedPosts, setCachedPosts, isCacheValid, updatePostBookmark, getLastFetchTime, setLastFetchTime } = useForumCache();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [optimisticPosts, setOptimisticPosts] = useState<PostData[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);
  
  // Refs for optimization
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComponentMounted = useRef(true);
  
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
    
    return {
      id: String(row?.id ?? ''),
      user: isAnon
        ? { name: 'Anonymous User', username: 'anonymous', avatar: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' } // Detective icon for anonymous users
        : { 
            name: userData?.full_name || userData?.username || 'User', 
            username: userData?.username || 'user', 
            avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png' // Gray default person icon
          },
      timestamp: formatTimeAgo(created),
      category: row?.category || 'Others',
      content: row?.body || '',
      comments: Number(row?.reply_count || 0),
      isBookmarked: !!row?.is_bookmarked,
    };
  }, [formatTimeAgo]);

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

  // Optimized loadPosts with persistent caching
  const loadPosts = useCallback(async (force = false) => {
    // Check cache first
    if (!force && isCacheValid()) {
      const cachedPosts = getCachedPosts();
      if (cachedPosts && cachedPosts.length > 0) {
        if (__DEV__) console.log('Timeline: Using cached posts, skipping fetch');
        setPosts(cachedPosts);
        setInitialLoading(false);
        return;
      }
    }
    
    // Close any open dropdown menus when refreshing
    setOpenMenuPostId(null);
    setError(null);
    
    if (!isAuthenticated) {
      if (__DEV__) console.warn('Timeline: User not authenticated, clearing posts');
      setPosts([]);
      setRefreshing(false);
      setInitialLoading(false);
      return;
    }
    
    // Prevent concurrent requests
    if (refreshing && !force) {
      return;
    }
    
    setRefreshing(true);
    const now = Date.now();
    setLastFetchTime(now);
    
    try {
      const headers = await getAuthHeaders();
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch(`${API_BASE_URL}/api/forum/posts/recent`, {
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
      
      if (Array.isArray(data?.data)) {
        mapped = data.data.map(mapApiToPost);
      } else if (Array.isArray(data)) {
        mapped = data.map(mapApiToPost);
      }
      
      // Only update if component is still mounted
      if (isComponentMounted.current) {
        setPosts(mapped);
        setCachedPosts(mapped); // Cache the posts
        if (__DEV__ && mapped.length === 0) {
          console.log('Timeline: No posts found');
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
        setInitialLoading(false);
      }
    }
  }, [isAuthenticated, getAuthHeaders, mapApiToPost, isCacheValid, getCachedPosts, setCachedPosts, setLastFetchTime, refreshing]);

  // Initial load with cache check
  useEffect(() => {
    isComponentMounted.current = true;
    
    const initialLoad = async () => {
      if (isAuthenticated) {
        // Check cache first for instant loading
        const cachedPosts = getCachedPosts();
        if (cachedPosts && cachedPosts.length > 0) {
          setPosts(cachedPosts);
          setInitialLoading(false);
          if (__DEV__) console.log('Timeline: Loaded from cache immediately');
          
          // Still fetch fresh data in background if cache is getting old
          if (!isCacheValid()) {
            await loadPosts(false);
          }
        } else {
          // No cache, do fresh load
          await loadPosts(true);
        }
      } else {
        setInitialLoading(false);
      }
    };
    
    initialLoad();
    
    // Fallback: Hide loading after 3 seconds maximum
    const fallbackTimer = setTimeout(() => {
      if (isComponentMounted.current) {
        setInitialLoading(false);
      }
    }, 3000);
    
    return () => {
      isComponentMounted.current = false;
      clearTimeout(fallbackTimer);
    };
  }, [isAuthenticated, loadPosts, getCachedPosts, isCacheValid]);

  // Smart focus-based refresh (only if data is stale and on forum page)
  useFocusEffect(
    useCallback(() => {
      // Only load posts when the home page is focused and cache is invalid
      if (!isCacheValid()) {
        loadPosts();
      }
    }, [loadPosts, isCacheValid])
  );

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
    const route = context === 'lawyer' ? `/lawyer/ViewPost?postId=${postId}` : `/home/ViewPost?postId=${postId}`;
    router.push(route as any);
  }, [context, router]);
  
  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    loadPosts(true); // Force refresh
  }, [loadPosts]);

  const handleCreatePost = useCallback(() => {
    const route = context === 'lawyer' ? '/lawyer/CreatePost' : '/home/CreatePost';
    router.push(route as any);
  }, [context, router]);

  // Function to add optimistic post
  const addOptimisticPost = useCallback((postData: { body: string; category?: string; is_anonymous?: boolean }) => {
    const animatedOpacity = new Animated.Value(0); // Start completely transparent
    const optimisticPost: PostData = {
      id: `optimistic-${Date.now()}`,
      user: postData.is_anonymous 
        ? { name: 'Anonymous User', username: 'anonymous', avatar: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' } // Detective icon for anonymous posts
        : { name: 'You', username: 'you', avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }, // Gray default person icon
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
  }, []);

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
  const renderItem: ListRenderItem<PostData> = useCallback(({ item, index }) => {
    const postComponent = (
      <Post
        key={item.id}
        id={item.id}
        user={item.user}
        timestamp={item.timestamp}
        category={item.category}
        content={item.content}
        comments={item.comments}
        onCommentPress={() => handleCommentPress(item.id)}
        onBookmarkPress={() => handleBookmarkPress(item.id)}
        onReportPress={() => handleReportPress(item.id)}
        onPostPress={() => handlePostPress(item.id)}
        index={index}
        isLoading={item.isLoading}
        isOptimistic={item.isOptimistic}
        isMenuOpen={openMenuPostId === item.id}
        onMenuToggle={handleMenuToggle}
        isBookmarked={item.isBookmarked || false}
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
  }, [handleCommentPress, handleBookmarkPress, handleReportPress, handlePostPress, handleMenuToggle, openMenuPostId, handleBookmarkStatusChange]);

  // Combined posts data with duplicate detection for seamless transition
  const allPosts = useMemo(() => {
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
  }, [optimisticPosts, posts]);

  // Use simple list hook
  const listProps = useList({
    data: allPosts,
    keyExtractor,
    renderItem,
  });

  // Memoized refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={[Colors.primary.blue]}
      tintColor={Colors.primary.blue}
    />
  ), [refreshing, handleRefresh]);

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
          {...listProps}
          style={styles.timeline}
          contentContainerStyle={styles.timelineContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          ListFooterComponent={<View style={styles.bottomSpacer} />}
          onScroll={() => setOpenMenuPostId(null)}
          scrollEventThrottle={16}
        />
      )}

      {/* Floating Create Post Button */}
      <TouchableOpacity style={styles.createPostButton} onPress={handleCreatePost} activeOpacity={0.8}>
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

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
    paddingVertical: 10,
    paddingBottom: 100, // Account for bottom navigation
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 16,
  },
  bottomSpacer: {
    height: 80, // Add a spacer at the bottom to prevent content from being hidden
  },
  createPostButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: Colors.primary.blue,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: `0 4px 8px ${Colors.primary.blue}30`,
    elevation: 8,
  },
});

export default Timeline; 