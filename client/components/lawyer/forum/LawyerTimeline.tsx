import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Post from '../../home/Post';
import Colors from '../../../constants/Colors';
import { Database } from '../../../types/database.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ForumLoadingAnimation from '../../ui/ForumLoadingAnimation';
import { useAuth } from '@/contexts/AuthContext';
import { useForumCache } from '@/contexts/ForumCacheContext';
import { createShadowStyle } from '../../../utils/shadowUtils';
import { shouldUseNativeDriver } from '../../../utils/animations';
import { NetworkConfig } from '../../../utils/networkConfig';
import { useList } from '@/hooks/useOptimizedList';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Text } from '@/components/ui/text';

type ForumPost = Database['public']['Tables']['forum_posts']['Row'];
type User = Database['public']['Tables']['users']['Row'];

type ForumPostWithUser = {
  id: string;
  user: {
    name: string;
    username: string;
    avatar?: string;
    isLawyer?: boolean;
    lawyerBadge?: string;
    account_status?: string;
  };
  timestamp: string;
  category: string;
  content: string;
  comments: number;
  isOptimistic?: boolean;
  animatedOpacity?: Animated.Value;
  isNewlyLoaded?: boolean;
  loadedIndex?: number;
  isBookmarked?: boolean;
  body?: string;
  domain?: string;
  created_at?: string;
  user_id?: string;
  is_anonymous?: boolean;
  is_flagged?: boolean;
};

const LawyerTimeline: React.FC = React.memo(() => {
  const router = useRouter();
  const { session, isAuthenticated, user: currentUser } = useAuth();
  const { getCachedPosts, setCachedPosts, isCacheValid, updatePostBookmark, setLastFetchTime, prefetchPost, setCachedPost } = useForumCache();

  const [posts, setPosts] = useState<ForumPostWithUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [optimisticPosts, setOptimisticPosts] = useState<ForumPostWithUser[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);
  
  // Refs for optimization
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComponentMounted = useRef(true);
  const loadingMoreRef = useRef(false);
  const refreshingRef = useRef(false);
  const listRef = useRef<FlatList>(null);

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
      
      return { 'Content-Type': 'application/json' };
    } catch {
      return { 'Content-Type': 'application/json' };
    }
  }, [session?.access_token]);

  const mapApiToPost = useCallback((row: any): ForumPostWithUser => {
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

    const postData: ForumPostWithUser = {
      id: String(row?.id ?? ''),
      user: isAnon
        ? { name: 'Anonymous User', username: 'anonymous', avatar: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' }
        : { 
            name: userData?.full_name || userData?.username || 'User', 
            username: userData?.username || 'user', 
            avatar: userData?.photo_url || userData?.profile_photo || 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
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
      console.log(`Cached lawyer post ${postData.id} with ${mappedReplies.length} comments from LawyerTimeline`);
    }

    return postData;
  }, [setCachedPost]);

  // Optimized loadPosts - now fetches all posts at once with retry logic
  const loadPosts = useCallback(async (force = false, retryCount = 0) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1000 * Math.pow(2, retryCount); // Exponential backoff: 1s, 2s, 4s

    // Check cache first (only for initial load)
    if (!force && isCacheValid()) {
      const cachedPosts = getCachedPosts();
      if (cachedPosts && cachedPosts.length > 0) {
        if (__DEV__) console.log('LawyerTimeline: Using cached posts, skipping fetch');
        setPosts(cachedPosts);
        setInitialLoading(false);
        return;
      }
    }

    // Close any open dropdown menus when refreshing
    setOpenMenuPostId(null);
    setError(null);

    if (!isAuthenticated) {
      if (__DEV__) console.warn('LawyerTimeline: User not authenticated, clearing posts');
      setPosts([]);
      setRefreshing(false);
      setInitialLoading(false);
      return;
    }

    // Set loading state before making request
    setRefreshing(true);
    refreshingRef.current = true;

    const now = Date.now();
    setLastFetchTime(now);

    try {
      const headers = await getAuthHeaders();
      const API_BASE_URL = await NetworkConfig.getBestApiUrl();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      if (__DEV__) {
        console.log('LawyerTimeline: Fetching all posts from database');
      }

      const response = await fetch(`${API_BASE_URL}/api/forum/posts/recent`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 403) {
          if (__DEV__) console.error('LawyerTimeline: Authentication failed - 403 Forbidden. Check if user is properly authenticated.');
          setPosts([]);
          setError('Authentication required. Please log in again.');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      let mapped: ForumPostWithUser[] = [];

      if (__DEV__) {
        console.log('LawyerTimeline: Raw API response:', {
          success: data?.success,
          dataType: Array.isArray(data?.data) ? 'array' : typeof data?.data,
          dataLength: Array.isArray(data?.data) ? data.data.length : 'not array',
          directArray: Array.isArray(data),
          directLength: Array.isArray(data) ? data.length : 'not array'
        });
      }

      if (Array.isArray(data?.data)) {
        mapped = data.data.map(mapApiToPost);
      } else if (Array.isArray(data)) {
        mapped = data.map(mapApiToPost);
      }

      if (__DEV__) {
        console.log(`LawyerTimeline: Mapped ${mapped.length} posts from API response - all posts loaded`);
      }

      // Only update if component is still mounted
      if (isComponentMounted.current) {
        setPosts(mapped);
        setCachedPosts(mapped); // Cache the posts

        if (__DEV__ && mapped.length === 0) {
          console.log('LawyerTimeline: No posts found after mapping');
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
      
      // Retry logic for network errors
      if (retryCount < MAX_RETRIES && (error.message?.includes('network') || error.message?.includes('timeout') || error.message?.includes('fetch'))) {
        if (__DEV__) console.warn(`LawyerTimeline: Retry ${retryCount + 1}/${MAX_RETRIES} after error:`, errorMessage);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        
        // Retry the request
        if (isComponentMounted.current) {
          return loadPosts(force, retryCount + 1);
        }
      } else {
        if (__DEV__) console.error('LawyerTimeline load error:', errorMessage);

        if (isComponentMounted.current) {
          setError(errorMessage);
          // Don't clear posts on error to maintain user experience
        }
      }
    } finally {
      if (isComponentMounted.current) {
        setRefreshing(false);
        refreshingRef.current = false;
        setInitialLoading(false);
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
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        if (__DEV__) console.log('📱 LawyerTimeline: First focus, skipping refresh');
        return;
      }

      if (!isCacheValid()) {
        if (__DEV__) console.log('📱 LawyerTimeline: Screen focused, cache invalid - refreshing');
        loadPosts(true); // Force refresh
      } else {
        if (__DEV__) console.log('📱 LawyerTimeline: Screen focused, cache valid - skipping refresh');
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
    router.push(`/lawyer/ViewPost?postId=${postId}` as any);
  }, [router]);

  const handleBookmarkPress = useCallback((postId: string) => {
    // The Post component handles the actual bookmark logic
  }, []);

  const handleReportPress = useCallback((postId: string) => {
    // The Post component handles the actual report logic
  }, []);

  const handleMenuToggle = useCallback((postId: string) => {
    setOpenMenuPostId(prev => prev === postId ? null : postId);
  }, []);

  const handleBookmarkStatusChange = useCallback((postId: string, isBookmarked: boolean) => {
    // Update the post in the posts array directly
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, isBookmarked } : post
    ));
    // Also update the cache
    updatePostBookmark(postId, isBookmarked);
  }, [updatePostBookmark]);

  const handlePostPress = useCallback((postId: string) => {
    // Prefetch the post before navigation for instant loading
    prefetchPost(postId);
    router.push(`/lawyer/ViewPost?postId=${postId}` as any);
  }, [router, prefetchPost]);

  const handleCreatePost = useCallback(() => {
    router.push('/lawyer/CreatePost' as any);
  }, [router]);
  
  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    loadPosts(true); // Force refresh
  }, [loadPosts]);

  // Function to add optimistic post
  const addOptimisticPost = useCallback((postData: { body: string; category?: string }) => {
    const animatedOpacity = new Animated.Value(0); // Start completely transparent
    
    // Get current user info for optimistic post
    const userName = currentUser?.full_name || currentUser?.username || currentUser?.email || 'You';
    const userUsername = currentUser?.username || currentUser?.email?.split('@')[0] || 'you';
    const userId = currentUser?.id || 'current-user';
    const userRole = currentUser?.role || 'registered_user';
    
    const optimisticPost: ForumPostWithUser = {
      id: `optimistic-${Date.now()}`,
      user: {
        name: userName,
        username: userUsername,
        avatar: (currentUser as any)?.photo_url || (currentUser as any)?.profile_photo || 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
        isLawyer: userRole === 'verified_lawyer',
        lawyerBadge: userRole === 'verified_lawyer' ? 'Verified' : undefined
      },
      timestamp: 'now',
      created_at: new Date().toISOString(),
      category: postData.category || 'Others',
      content: postData.body,
      comments: 0,
      isOptimistic: true,
      animatedOpacity,
      body: postData.body,
      domain: postData.category || 'others',
      user_id: userId,
      is_anonymous: false,
      is_flagged: false,
    };

    setOptimisticPosts(prev => [optimisticPost, ...prev]);
    
    // Smooth fade in animation
    Animated.timing(animatedOpacity, {
      toValue: 0.7, // Semi-transparent while posting
      duration: 300,
      useNativeDriver: shouldUseNativeDriver('opacity'),
    }).start();
    
    return optimisticPost.id;
  }, [currentUser]);

  // Function to confirm optimistic post (make it fully opaque and keep it seamless)
  const confirmOptimisticPost = useCallback((optimisticId: string, realPost?: ForumPostWithUser) => {
    setOptimisticPosts(prev => {
      const post = prev.find(p => p.id === optimisticId);
      if (post?.animatedOpacity) {
        // Animate to full opacity to show success
        Animated.timing(post.animatedOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: shouldUseNativeDriver('opacity'),
        }).start();
        
        // Keep optimistic post visible and let duplicate detection handle seamless transition
        // The post will automatically be filtered out when the real post appears
        // Only remove it after a reasonable time to ensure the real post has loaded
        setTimeout(() => {
          if (isComponentMounted.current) {
            setOptimisticPosts(current => current.filter(p => p.id !== optimisticId));
          }
        }, 3000); // Extended delay - duplicate detection prevents visual duplicates
      }
      return prev;
    });
    
    // Refresh posts to get the real post
    loadPosts();
  }, [loadPosts]);

  // Function to remove failed optimistic post
  const removeOptimisticPost = useCallback((optimisticId: string) => {
    setOptimisticPosts(prev => {
      const post = prev.find(p => p.id === optimisticId);
      if (post?.animatedOpacity) {
        // Animate out smoothly
        Animated.timing(post.animatedOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: shouldUseNativeDriver('opacity'),
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
    (global as any).forumActions = {
      addOptimisticPost,
      confirmOptimisticPost,
      removeOptimisticPost,
    };
  }, [addOptimisticPost, confirmOptimisticPost, removeOptimisticPost]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: ForumPostWithUser) => item.id, []);

  // Memoized render item
  const renderItem = useCallback(({ item, index }: { item: ForumPostWithUser; index: number }) => {
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

    return [...optimisticPosts, ...filteredRealPosts];
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

  // Render footer component
  const renderFooter = useCallback(() => {
    if (allPosts.length > 0) {
      return <View style={{ height: 80 }} />;
    }
    return null;
  }, [allPosts.length]);

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
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
          ListHeaderComponent={null}
          ListFooterComponent={renderFooter}
          onScroll={() => setOpenMenuPostId(null)}
          scrollEventThrottle={400}
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
          {
            position: 'absolute',
            bottom: 80,
            right: 20,
            backgroundColor: Colors.primary.blue,
            width: 56,
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center',
            ...createShadowStyle({
              shadowColor: Colors.primary.blue,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }),
          }
        ]} 
        onPress={handleCreatePost} 
        activeOpacity={0.8}
      >
        <Plus size={24} color="#FFFFFF" />
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
    backgroundColor: '#FFFFFF',
  },
  timelineContent: {
    paddingTop: 10,
    paddingBottom: 100,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
});

LawyerTimeline.displayName = 'LawyerTimeline';

export default LawyerTimeline;