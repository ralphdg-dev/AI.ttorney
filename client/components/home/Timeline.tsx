import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, Animated, TouchableOpacity, StyleSheet, ListRenderItem, ActivityIndicator } from 'react-native';
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
}

interface TimelineProps {
  context?: 'user' | 'lawyer';
}

const Timeline: React.FC<TimelineProps> = ({ context = 'user' }) => {
  const router = useRouter();
  const { session, isAuthenticated, user: currentUser } = useAuth();
  const { getCachedPosts, setCachedPosts, isCacheValid, updatePostBookmark, getLastFetchTime, setLastFetchTime, prefetchPost, setCachedPost } = useForumCache();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [optimisticPosts, setOptimisticPosts] = useState<PostData[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  
  // Refs for optimization
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComponentMounted = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const offsetRef = useRef(0);
  const flatListRef = useRef<FlatList>(null);
  
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

  // Optimized loadPosts with persistent caching and pagination
  const loadPosts = useCallback(async (force = false, loadMore = false) => {
    // Check cache first (only for initial load)
    if (!force && !loadMore && isCacheValid()) {
      const cachedPosts = getCachedPosts();
      if (cachedPosts && cachedPosts.length > 0) {
        if (__DEV__) console.log('Timeline: Using cached posts, skipping fetch');
        setPosts(cachedPosts);
        setInitialLoading(false);
        return;
      }
    }
    
    // Close any open dropdown menus when refreshing
    if (!loadMore) {
      setOpenMenuPostId(null);
    }
    setError(null);
    
    if (!isAuthenticated) {
      if (__DEV__) console.warn('Timeline: User not authenticated, clearing posts');
      setPosts([]);
      setRefreshing(false);
      setInitialLoading(false);
      return;
    }
    
    // Prevent concurrent requests
    if ((refreshing && !force) || (loadMore && isLoadingMoreRef.current)) {
      return;
    }
    
    if (loadMore) {
      setLoadingMore(true);
      isLoadingMoreRef.current = true;
    } else {
      setRefreshing(true);
      // Reset pagination on refresh
      setOffset(0);
      offsetRef.current = 0;
      setHasMore(true);
    }
    
    const now = Date.now();
    setLastFetchTime(now);
    
    try {
      const headers = await getAuthHeaders();
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      
      const currentOffset = loadMore ? offsetRef.current : 0;
      const limit = 20;
      
      if (__DEV__) {
        console.log(`📊 Loading posts: loadMore=${loadMore}, currentOffset=${currentOffset}, limit=${limit}`);
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch(`${API_BASE_URL}/api/forum/posts/recent?limit=${limit}&offset=${currentOffset}`, {
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
      
      // Check if we have more posts to load
      const hasMorePosts = mapped.length === limit;
      
      // Only update if component is still mounted
      if (isComponentMounted.current) {
        if (loadMore) {
          // Append new posts to existing ones, filtering out duplicates
          setPosts(prev => {
            // Create a Set of existing post IDs for O(1) lookup
            const existingIds = new Set(prev.map(p => p.id));
            
            // Filter out posts that already exist
            const newPosts = mapped.filter(post => !existingIds.has(post.id));
            
            if (__DEV__) {
              console.log(`📦 Appending ${newPosts.length} new posts (${mapped.length - newPosts.length} duplicates filtered) to existing ${prev.length} posts`);
              if (newPosts.length === 0) {
                console.warn('⚠️ No new posts to add - all were duplicates!');
              }
            }
            
            return [...prev, ...newPosts];
          });
          const newOffset = currentOffset + limit;
          setOffset(newOffset);
          offsetRef.current = newOffset;
          setHasMore(hasMorePosts && mapped.length > 0);
          if (__DEV__) {
            console.log(`✅ Load more complete: newOffset=${newOffset}, hasMore=${hasMorePosts}`);
          }
        } else {
          // Replace posts on refresh
          setPosts(mapped);
          setCachedPosts(mapped); // Cache the posts
          setOffset(limit);
          offsetRef.current = limit;
          setHasMore(hasMorePosts);
          if (__DEV__) {
            console.log(`✅ Refresh complete: ${mapped.length} posts loaded, hasMore=${hasMorePosts}`);
          }
          
          // Force FlatList to render from top immediately
          requestAnimationFrame(() => {
            if (flatListRef.current && mapped.length > 0) {
              flatListRef.current.scrollToOffset({ offset: 0, animated: false });
            }
          });
        }
        
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
        setLoadingMore(false);
        isLoadingMoreRef.current = false;
      }
    }
  }, [isAuthenticated, getAuthHeaders, mapApiToPost, isCacheValid, getCachedPosts, setCachedPosts, setLastFetchTime, refreshing]);

  // Initial load with cache check - REMOVED to prevent infinite loop
  // loadPosts is called by useFocusEffect instead
  
  // Refresh posts when screen comes into focus (e.g., returning from CreatePost)
  useFocusEffect(
    useCallback(() => {
      // Check if cache is invalid or if we should refresh
      if (!isCacheValid()) {
        if (__DEV__) console.log('📱 Timeline: Screen focused, cache invalid - refreshing');
        loadPosts(true, false); // Force refresh, not loading more
      } else {
        if (__DEV__) console.log('📱 Timeline: Screen focused, cache valid - using cache');
        loadPosts(false, false); // Use cache if valid
      }
    }, [isCacheValid, loadPosts])
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
          loadPosts(false, false); // Not force, not loading more
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
    // Prefetch the post before navigation for instant loading
    prefetchPost(postId);
    
    const route = context === 'lawyer' ? `/lawyer/ViewPost?postId=${postId}` : `/home/ViewPost?postId=${postId}`;
    router.push(route as any);
  }, [context, router, prefetchPost]);
  
  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    loadPosts(true, false); // Force refresh, not loading more
  }, [loadPosts]);

  // Load more handler for infinite scrolling
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !refreshing && !initialLoading) {
      if (__DEV__) console.log('🔄 Triggering load more...');
      loadPosts(false, true); // Not force, but loading more
    } else {
      if (__DEV__) {
        console.log(`⏸️ Load more blocked: loadingMore=${loadingMore}, hasMore=${hasMore}, refreshing=${refreshing}, initialLoading=${initialLoading}`);
      }
    }
  }, [loadPosts, loadingMore, hasMore, refreshing, initialLoading]);

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

  // Function to confirm optimistic post (make it fully opaque and remove immediately)
  const confirmOptimisticPost = useCallback((optimisticId: string, realPost?: PostData) => {
    setOptimisticPosts(prev => {
      const post = prev.find(p => p.id === optimisticId);
      if (post?.animatedOpacity) {
        // Animate to full opacity to show success
        Animated.timing(post.animatedOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          // Remove immediately after animation completes
          setOptimisticPosts(current => current.filter(p => p.id !== optimisticId));
        });
      } else {
        // If no animation, remove immediately
        return prev.filter(p => p.id !== optimisticId);
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

  // Memoized key extractor with safety check
  const keyExtractor = useCallback((item: PostData, index: number) => {
    if (!item || !item.id) {
      if (__DEV__) console.warn('⚠️ Invalid item in keyExtractor at index', index);
      return `invalid-${index}`;
    }
    return item.id;
  }, []);

  // Memoized render item
  const renderItem: ListRenderItem<PostData> = useCallback(({ item, index }: { item: PostData; index: number }) => {
    // Safety check - skip rendering if item is invalid
    if (!item || !item.id) {
      if (__DEV__) console.warn('⚠️ Skipping invalid post item at index', index);
      return null;
    }
    
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

  // Combined posts data with strict duplicate detection
  const allPosts = useMemo(() => {
    if (optimisticPosts.length === 0) {
      // No optimistic posts, return all real posts
      return posts;
    }
    
    // Create a Set of optimistic post content for O(1) lookup
    const optimisticContentSet = new Set(
      optimisticPosts.map(p => p.content.trim().toLowerCase())
    );
    
    // Filter out real posts that match optimistic posts by content
    const filteredRealPosts = posts.filter(realPost => {
      const normalizedContent = realPost.content.trim().toLowerCase();
      const isDuplicate = optimisticContentSet.has(normalizedContent);
      
      if (__DEV__ && isDuplicate) {
        console.log(`🔄 Filtering duplicate real post (ID: ${realPost.id}) - matches optimistic post`);
      }
      
      return !isDuplicate;
    });
    
    if (__DEV__ && filteredRealPosts.length !== posts.length) {
      console.log(`🔄 Filtered ${posts.length - filteredRealPosts.length} duplicate posts from optimistic matches`);
    }
    
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

  // Footer component for loading more indicator with consistent height
  const renderFooter = useCallback(() => {
    return (
      <View style={styles.footerContainer}>
        {loadingMore && (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color={Colors.primary.blue} />
            <Text style={styles.loadingMoreText}>Loading more posts...</Text>
          </View>
        )}
      </View>
    );
  }, [loadingMore]);

  return (
    <View style={styles.container}>
      {/* Forum Loading Animation */}
      <ForumLoadingAnimation visible={initialLoading && allPosts.length === 0} />
      
      {/* Show skeleton loading until posts are actually loaded and ready */}
      {allPosts.length === 0 ? (
        <View style={styles.skeletonContainer}>
          <SkeletonList itemCount={8} itemHeight={200} spacing={12} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          {...listProps}
          style={styles.timeline}
          contentContainerStyle={styles.timelineContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          ListFooterComponent={renderFooter}
          onScroll={() => setOpenMenuPostId(null)}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          updateCellsBatchingPeriod={50}
          windowSize={21}
          scrollEnabled={!initialLoading}
          bounces={!initialLoading}
          overScrollMode={initialLoading ? 'never' : 'auto'}
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
    paddingTop: 0, // Remove top padding to prevent blank space
    paddingBottom: 100, // Account for bottom navigation
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 16,
  },
  footerContainer: {
    minHeight: 100, // Fixed height to prevent layout shift
    paddingBottom: 80, // Account for bottom navigation
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.text.secondary,
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