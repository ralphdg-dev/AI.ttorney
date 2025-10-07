import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Animated, ListRenderItem } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Post from './Post';
import Colors from '../../constants/Colors';
import apiClient from '@/lib/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import ForumLoadingAnimation from '../ui/ForumLoadingAnimation';
import { useList } from '@/hooks/useOptimizedList';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';

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
  isOptimistic?: boolean;
  animatedOpacity?: Animated.Value;
}

interface TimelineProps {
  context?: 'user' | 'lawyer';
}

const Timeline: React.FC<TimelineProps> = ({ context = 'user' }) => {
  const router = useRouter();
  const { user, session, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [optimisticPosts, setOptimisticPosts] = useState<PostData[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  const formatTimeAgo = (isoDate?: string): string => {
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
  };

  const mapApiToPost = (row: any): PostData => {
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
    };
  };

  // Helper function to get auth headers using AuthContext
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    try {
      // First try to get token from AuthContext session
      if (session?.access_token) {
        console.log(`[Timeline] Using session token from AuthContext`);
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };
      }
      
      // Fallback to AsyncStorage
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        console.log(`[Timeline] Using token from AsyncStorage`);
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
      }
      
      console.log(`[Timeline] No authentication token available`);
      return { 'Content-Type': 'application/json' };
    } catch (error) {
      console.error('Error getting auth token:', error);
      return { 'Content-Type': 'application/json' };
    }
  };

  const loadPosts = useCallback(async () => {
    console.log(`[Timeline] Loading posts at ${new Date().toISOString()}`);
    
    // Close any open dropdown menus when refreshing
    setOpenMenuPostId(null);
    
    // Debug authentication status
    console.log(`[Timeline] Authentication status:`, {
      isAuthenticated,
      hasUser: !!user,
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      userId: user?.id,
      userRole: user?.role
    });
    
    if (!isAuthenticated) {
      console.error(`[Timeline] User is not authenticated - cannot load posts`);
      setPosts([]);
      setRefreshing(false);
      return;
    }
    
    setRefreshing(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      
      // First, test if server is running at all
      console.log(`[Timeline] Testing server connectivity to ${API_BASE_URL}...`);
      try {
        const healthCheck = await fetch(`${API_BASE_URL}/`, { method: 'GET' });
        console.log(`[Timeline] Server root status: ${healthCheck.status}`);
      } catch (e) {
        console.error(`[Timeline] Server not reachable:`, e);
        throw new Error('Server is not running or not reachable');
      }
      
      // Debug: Check all available tokens in AsyncStorage
      console.log(`[Timeline] Checking available authentication tokens...`);
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        console.log(`[Timeline] All AsyncStorage keys:`, allKeys);
        
        const accessToken = await AsyncStorage.getItem('access_token');
        const supabaseToken = await AsyncStorage.getItem('supabase.auth.token');
        const authKeys = allKeys.filter(key => key.includes('auth') || key.includes('token') || key.includes('session'));
        
        console.log(`[Timeline] Auth-related keys:`, authKeys);
        console.log(`[Timeline] access_token:`, accessToken ? `exists (${accessToken.substring(0, 20)}...)` : 'null');
        console.log(`[Timeline] supabase.auth.token:`, supabaseToken ? 'exists' : 'null');
        
        // Try to get tokens from all auth-related keys
        for (const key of authKeys) {
          const value = await AsyncStorage.getItem(key);
          console.log(`[Timeline] ${key}:`, value ? `exists (${value.substring(0, 30)}...)` : 'null');
        }
      } catch (e) {
        console.error(`[Timeline] Error checking AsyncStorage:`, e);
      }
      
      // Try multiple different approaches to identify the issue
      console.log(`[Timeline] Testing different request approaches...`);
      
      // Approach 1: Simple GET request
      console.log(`[Timeline] Approach 1: Simple GET request`);
      let response = await fetch(`${API_BASE_URL}/api/forum/posts/recent`);
      console.log(`[Timeline] Simple GET status: ${response.status}`);
      
      if (!response.ok) {
        // Approach 2: With basic headers
        console.log(`[Timeline] Approach 2: With Content-Type header`);
        response = await fetch(`${API_BASE_URL}/api/forum/posts/recent`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        console.log(`[Timeline] With headers status: ${response.status}`);
      }
      
      if (!response.ok) {
        // Approach 3: Test authentication with a simpler endpoint first
        console.log(`[Timeline] Approach 3: Testing authentication`);
        const headers = await getAuthHeaders();
        console.log(`[Timeline] Auth headers:`, headers);
        
        // Test auth with user's own posts endpoint first (simpler)
        console.log(`[Timeline] Testing auth with /api/forum/posts (user's posts)`);
        const authTestResponse = await fetch(`${API_BASE_URL}/api/forum/posts`, {
          method: 'GET',
          headers,
        });
        console.log(`[Timeline] Auth test status: ${authTestResponse.status}`);
        
        if (authTestResponse.ok) {
          console.log(`[Timeline] Authentication working! Now trying recent posts...`);
          response = await fetch(`${API_BASE_URL}/api/forum/posts/recent`, {
            method: 'GET',
            headers,
          });
          console.log(`[Timeline] Recent posts with auth status: ${response.status}`);
        } else {
          console.error(`[Timeline] Authentication failed - status ${authTestResponse.status}`);
          const authErrorText = await authTestResponse.text();
          console.error(`[Timeline] Auth error response:`, authErrorText);
          response = authTestResponse; // Use the auth test response to show the error
        }
        
        if (!response.ok) {
          // Approach 4: Try different endpoint variations with auth
          console.log(`[Timeline] Approach 4: Trying endpoint variations with auth`);
          const endpoints = [
            '/api/forum/posts',
            '/api/forum/recent', 
            '/forum/posts/recent',
            '/posts/recent'
          ];
          
          for (const endpoint of endpoints) {
            console.log(`[Timeline] Trying with auth: ${API_BASE_URL}${endpoint}`);
            const testResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
              method: 'GET',
              headers,
            });
            console.log(`[Timeline] ${endpoint} with auth status: ${testResponse.status}`);
            if (testResponse.ok) {
              response = testResponse;
              break;
            }
          }
        }
      }
      
      // Log the full response details
      console.log(`[Timeline] Final response status: ${response.status}`);
      console.log(`[Timeline] Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Timeline] Error response body:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Process successful response
      const data = await response.json();
      if (Array.isArray(data?.data)) {
        const rows = data.data as any[];
        setPosts(rows.map(mapApiToPost));
        console.log(`[Timeline] Successfully loaded ${rows.length} posts`);
      } else if (Array.isArray(data)) {
        setPosts((data as any[]).map(mapApiToPost));
        console.log(`[Timeline] Successfully loaded ${data.length} posts`);
      } else {
        setPosts([]);
        console.log(`[Timeline] No posts found in response`);
      }
    } catch (error) {
      console.error(`[Timeline] Error loading posts:`, error);
      setPosts([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPosts().then(() => {
      // Hide initial loading after first load
      setTimeout(() => setInitialLoading(false), 300);
    });
    
    // Fallback: Hide loading after 3 seconds maximum
    const fallbackTimer = setTimeout(() => {
      setInitialLoading(false);
    }, 3000);
    
    return () => clearTimeout(fallbackTimer);
  }, []);

  // Refresh when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [])
  );

  // Reduced polling frequency to prevent 403 errors
  useEffect(() => {
    const id = setInterval(() => {
      loadPosts();
    }, 60000); // 60s - even less frequent to avoid rate limiting
    return () => clearInterval(id);
  }, []);

  const handleCommentPress = (postId: string) => {
    console.log(`Comment pressed for post ${postId}`);
    const route = context === 'lawyer' ? `/lawyer/ViewPost?postId=${postId}` : `/home/ViewPost?postId=${postId}`;
    router.push(route as any);
  };

  const handleBookmarkPress = (postId: string) => {
    console.log(`Bookmark toggled for post ${postId}`);
    // The Post component handles the actual bookmark logic
  };

  const handleReportPress = (postId: string) => {
    console.log(`Report submitted for post ${postId}`);
    // The Post component handles the actual report logic
  };

  const handleMenuToggle = useCallback((postId: string) => {
    setOpenMenuPostId(prev => prev === postId ? null : postId);
  }, []);

  const handlePostPress = (postId: string) => {
    console.log(`Post pressed for post ${postId}`);
    const route = context === 'lawyer' ? `/lawyer/ViewPost?postId=${postId}` : `/home/ViewPost?postId=${postId}`;
    router.push(route as any);
  };

  const handleCreatePost = () => {
    console.log('Create post pressed');
    const route = context === 'lawyer' ? '/lawyer/CreatePost' : '/home/CreatePost';
    router.push(route as any);
  };

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

  // Function to confirm optimistic post (make it fully opaque)
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
        
        // Keep the optimistic post visible for longer, then remove it gradually
        setTimeout(() => {
          // Remove optimistic post without triggering additional API calls
          setOptimisticPosts(current => current.filter(p => p.id !== optimisticId));
        }, 500); // Allow time for natural refresh cycle to pick up the real post
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
        isOptimistic={item.isOptimistic}
        isMenuOpen={openMenuPostId === item.id}
        onMenuToggle={handleMenuToggle}
      />
    );

    // Wrap optimistic posts with animated opacity
    if (item.isOptimistic && item.animatedOpacity) {
      return (
        <Animated.View
          style={{ opacity: item.animatedOpacity }}
        >
          {postComponent}
        </Animated.View>
      );
    }

    return postComponent;
  }, [handleCommentPress, handleBookmarkPress, handleReportPress, handlePostPress, handleMenuToggle, openMenuPostId]);

  // Combined posts data
  const allPosts = useMemo(() => [...optimisticPosts, ...posts], [optimisticPosts, posts]);

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
      onRefresh={loadPosts}
      colors={[Colors.primary.blue]}
      tintColor={Colors.primary.blue}
    />
  ), [refreshing, loadPosts]);

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