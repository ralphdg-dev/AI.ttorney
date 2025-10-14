import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Post from '../home/Post';
import Colors from '../../constants/Colors';
import { Database } from '../../types/database.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import ForumLoadingAnimation from '../ui/ForumLoadingAnimation';
import { useAuth } from '@/contexts/AuthContext';

type ForumPost = Database['public']['Tables']['forum_posts']['Row'];
type User = Database['public']['Tables']['users']['Row'];

type ForumPostWithUser = ForumPost & {
  user: User;
  reply_count: number;
  isOptimistic?: boolean;
  animatedOpacity?: Animated.Value;
};

const LawyerTimeline: React.FC = React.memo(() => {
  const router = useRouter();
  const { session, isAuthenticated, user: currentUser } = useAuth();

  const [posts, setPosts] = useState<ForumPostWithUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [optimisticPosts, setOptimisticPosts] = useState<ForumPostWithUser[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);
  
  // Refs for optimization
  const lastFetchTime = useRef<number>(0);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComponentMounted = useRef(true);

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
    } catch (error) {
      return { 'Content-Type': 'application/json' };
    }
  }, [session?.access_token]);

  // Optimized loadPosts with smart caching and minimal logging
  const loadPosts = useCallback(async (force = false) => {
    // Prevent excessive API calls with smart caching
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    const CACHE_DURATION = 30000; // 30 seconds cache
    
    if (!force && timeSinceLastFetch < CACHE_DURATION && posts.length > 0) {
      return;
    }
    
    // Close any open dropdown menus when refreshing
    setOpenMenuPostId(null);
    setError(null);
    
    if (!isAuthenticated) {
      setPosts([]);
      setRefreshing(false);
      
      // Prompt user to login instead of making API call
      const { checkAuthentication } = require('../../utils/authUtils');
      checkAuthentication();
      return;
    }
    
    // Prevent concurrent requests
    if (refreshing && !force) {
      return;
    }
    
    setRefreshing(true);
    lastFetchTime.current = now;
    
    try {
      const headers = await getAuthHeaders();
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(`${API_BASE_URL}/api/forum/posts/recent`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // Handle session timeout
      const { handleSessionTimeout } = require('../../utils/authUtils');
      const isSessionTimeout = await handleSessionTimeout(response);
      if (isSessionTimeout) {
        setRefreshing(false);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      
      // Helper function to map post data
      const mapPostData = (r: any): ForumPostWithUser => {
        const isAnon = !!r.is_anonymous;
        const userData = r?.users || {};
        
        
        return {
          id: String(r.id),
          body: r.body,
          category: r.category as any,
          created_at: r.created_at,
          updated_at: r.updated_at,
          user_id: r.user_id,
          is_anonymous: r.is_anonymous,
          is_flagged: r.is_flagged,
          user: {
            id: r.user_id,
            email: '',
            username: isAnon ? 'anonymous' : (userData?.username || 'user'),
            full_name: isAnon ? 'Anonymous User' : (userData?.full_name || userData?.username || 'User'),
            role: (userData?.role as any) || 'registered_user',
            is_verified: false,
            archived: null,
            is_blocked_from_applying: null,
            last_rejected_at: null,
            pending_lawyer: null,
            reject_count: null,
            strike_count: null,
            birthdate: null,
            created_at: null,
            updated_at: null,
          },
          reply_count: Number(r.reply_count || r.replies?.length || r.forum_replies?.length || 0),
        } as ForumPostWithUser;
      };
      
      let mapped: ForumPostWithUser[] = [];
      
      if (Array.isArray(data?.data)) {
        mapped = data.data.map(mapPostData);
      } else if (Array.isArray(data)) {
        mapped = data.map(mapPostData);
      }
      
      // Only update if component is still mounted
      if (isComponentMounted.current) {
        setPosts(mapped);
        
        // Clear any error state on successful load
        setError(null);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      
      const errorMessage = error.message || 'Failed to load posts';
      
      if (isComponentMounted.current) {
        setError(errorMessage);
        // Don't clear posts on error to maintain user experience
      }
    } finally {
      if (isComponentMounted.current) {
        setRefreshing(false);
      }
    }
  }, [isAuthenticated, getAuthHeaders, posts.length, refreshing]);

  // Initial load with proper cleanup
  useEffect(() => {
    isComponentMounted.current = true;
    
    const initialLoad = async () => {
      await loadPosts(true); // Force initial load
      
      // Hide initial loading after first load
      if (isComponentMounted.current) {
        setTimeout(() => {
          if (isComponentMounted.current) {
            setInitialLoading(false);
          }
        }, 300);
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
  }, [isAuthenticated, loadPosts]);

  // Smart focus-based refresh (only if data is stale and on forum page)
  useFocusEffect(
    useCallback(() => {
      // Only load posts when the forum page is focused
      const timeSinceLastFetch = Date.now() - lastFetchTime.current;
      if (timeSinceLastFetch > 30000) { // Only refresh if data is older than 30s
        loadPosts();
      }
    }, [loadPosts])
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

  const handlePostPress = useCallback((postId: string) => {
    router.push(`/lawyer/ViewPost?postId=${postId}` as any);
  }, [router]);

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
      body: postData.body,
      category: (postData.category as any) || 'others',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: userId,
      is_anonymous: false,
      is_flagged: false,
      user: {
        id: userId,
        email: currentUser?.email || '',
        username: userUsername,
        full_name: userName,
        role: userRole as any,
        is_verified: currentUser?.is_verified || false,
        archived: null,
        is_blocked_from_applying: null,
        last_rejected_at: null,
        pending_lawyer: null,
        reject_count: null,
        strike_count: null,
        birthdate: null,
        created_at: null,
        updated_at: null,
      },
      reply_count: 0,
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
  const confirmOptimisticPost = useCallback((optimisticId: string, realPost?: ForumPostWithUser) => {
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
    (global as any).forumActions = {
      addOptimisticPost,
      confirmOptimisticPost,
      removeOptimisticPost,
    };
  }, [addOptimisticPost, confirmOptimisticPost, removeOptimisticPost]);

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Forum Loading Animation */}
      <ForumLoadingAnimation visible={initialLoading} />
      
      {/* Timeline */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onScroll={() => setOpenMenuPostId(null)}
        scrollEventThrottle={16}
      >
        {(() => {
          // Filter out real posts that match optimistic posts to prevent duplicates
          const filteredRealPosts = posts.filter(realPost => {
            // Check if there's an optimistic post with similar content and timestamp
            const hasOptimisticMatch = optimisticPosts.some(optPost => {
              // Match by content and approximate timestamp (within 30 seconds)
              const contentMatch = optPost.body.trim() === realPost.body.trim();
              const timeMatch = optPost.created_at && realPost.created_at && Math.abs(
                new Date(optPost.created_at).getTime() - new Date(realPost.created_at).getTime()
              ) < 30000; // 30 seconds tolerance
              return contentMatch && timeMatch;
            });
            return !hasOptimisticMatch;
          });
          
          return [...optimisticPosts, ...filteredRealPosts];
        })().map((post) => {
          // Convert database timestamp to relative time with real-time updates
          const getRelativeTime = (timestamp: string) => {
            if (!timestamp) return '';
            // Treat timestamps without timezone as UTC to avoid local offset issues
            const hasTz = /Z|[+-]\d{2}:?\d{2}$/.test(timestamp);
            const normalized = hasTz ? timestamp : `${timestamp}Z`;
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

          // Convert category to display name
          const getCategoryDisplayName = (category: string | null) => {
            if (!category) return 'General';
            switch (category) {
              case 'criminal': return 'Criminal Law';
              case 'civil': return 'Civil Law';
              case 'family': return 'Family Law';
              case 'labor': return 'Labor Law';
              case 'consumer': return 'Consumer Law';
              default: return 'General';
            }
          };

          const postComponent = (
            <Post
              key={post.id}
              id={post.id}
              user={{
                name: post.user.full_name || post.user.username,
                username: post.user.username,
                avatar: post.is_anonymous 
                  ? 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' // Detective/incognito icon for anonymous users
                  : 'https://cdn-icons-png.flaticon.com/512/847/847969.png', // Gray default person icon for regular users
              }}
              timestamp={getRelativeTime(post.created_at || '')}
              category={getCategoryDisplayName(post.category)}
              content={post.body}
              comments={post.reply_count}
              onCommentPress={() => handleCommentPress(post.id)}
              onBookmarkPress={() => handleBookmarkPress(post.id)}
              onReportPress={() => handleReportPress(post.id)}
              onPostPress={() => handlePostPress(post.id)}
              isMenuOpen={openMenuPostId === post.id}
              onMenuToggle={handleMenuToggle}
            />
          );

          // Wrap optimistic posts with animated opacity
          if (post.isOptimistic && post.animatedOpacity) {
            return (
              <Animated.View
                key={post.id}
                style={{ opacity: post.animatedOpacity }}
              >
                {postComponent}
              </Animated.View>
            );
          }

          return postComponent;
        })}
        <View style={{ height: 80 }} />
      </ScrollView>

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
            shadowColor: Colors.primary.blue,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
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

LawyerTimeline.displayName = 'LawyerTimeline';

export default LawyerTimeline;
