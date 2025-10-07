import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Post from '../home/Post';
import Colors from '../../constants/Colors';
import { Database } from '../../types/database.types';
import apiClient from '@/lib/api-client';
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
  const { session, isAuthenticated } = useAuth();

  const [posts, setPosts] = useState<ForumPostWithUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [optimisticPosts, setOptimisticPosts] = useState<ForumPostWithUser[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  // Helper function to get auth headers using AuthContext
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    try {
      // First try to get token from AuthContext session
      if (session?.access_token) {
        console.log(`[LawyerTimeline] Using session token from AuthContext`);
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };
      }
      
      // Fallback to AsyncStorage
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        console.log(`[LawyerTimeline] Using token from AsyncStorage`);
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
      }
      
      console.log(`[LawyerTimeline] No authentication token available`);
      return { 'Content-Type': 'application/json' };
    } catch (error) {
      console.error('Error getting auth token:', error);
      return { 'Content-Type': 'application/json' };
    }
  };

  const loadPosts = useCallback(async () => {
    console.log(`[LawyerTimeline] Loading posts at ${new Date().toISOString()}`);
    
    // Close any open dropdown menus when refreshing
    setOpenMenuPostId(null);
    
    // Debug authentication status
    console.log(`[LawyerTimeline] Authentication status:`, {
      isAuthenticated,
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
    });
    
    if (!isAuthenticated) {
      console.error(`[LawyerTimeline] User is not authenticated - cannot load posts`);
      setPosts([]);
      setRefreshing(false);
      return;
    }
    
    setRefreshing(true);
    try {
      // Try direct API call with authentication first
      const headers = await getAuthHeaders();
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      
      console.log(`[LawyerTimeline] Making authenticated request to ${API_BASE_URL}/api/forum/posts/recent`);
      const response = await fetch(`${API_BASE_URL}/api/forum/posts/recent`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LawyerTimeline] Failed to load posts: ${response.status}`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (Array.isArray(data?.data)) {
        const rows = data.data as any[];
        const mapped: ForumPostWithUser[] = rows.map((r: any) => {
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
            reply_count: Number(r.reply_count || 0),
          } as ForumPostWithUser;
        });
        setPosts(mapped);
        console.log(`[LawyerTimeline] Successfully loaded ${mapped.length} posts`);
      } else if (Array.isArray(data)) {
        const mapped: ForumPostWithUser[] = (data as any[]).map((r: any) => {
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
            reply_count: Number(r.reply_count || 0),
          } as ForumPostWithUser;
        });
        setPosts(mapped);
        console.log(`[LawyerTimeline] Successfully loaded ${mapped.length} posts`);
      } else {
        setPosts([]);
        console.log(`[LawyerTimeline] No posts found in response`);
      }
    } catch (error) {
      console.error(`[LawyerTimeline] Error loading posts:`, error);
      setPosts([]);
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated, session]);

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
  }, [isAuthenticated, loadPosts]);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  // Reduced polling frequency to prevent 403 errors
  useEffect(() => {
    const id = setInterval(() => {
      loadPosts();
    }, 60000); // 60s - even less frequent to avoid rate limiting
    return () => clearInterval(id);
  }, [loadPosts]);

  const handleCommentPress = (postId: string) => {
    console.log(`Comment pressed for post ${postId}`);
    router.push(`/lawyer/ViewPost?postId=${postId}` as any);
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
    router.push(`/lawyer/ViewPost?postId=${postId}` as any);
  };

  const handleCreatePost = () => {
    console.log('Create post pressed');
    router.push('/lawyer/CreatePost' as any);
  };

  // Function to add optimistic post
  const addOptimisticPost = useCallback((postData: { body: string; category?: string }) => {
    const animatedOpacity = new Animated.Value(0); // Start completely transparent
    const optimisticPost: ForumPostWithUser = {
      id: `optimistic-${Date.now()}`,
      body: postData.body,
      category: (postData.category as any) || 'others',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'current-user',
      is_anonymous: false,
      is_flagged: false,
      user: {
        id: 'current-user',
        email: '',
        username: 'You',
        full_name: 'You',
        role: 'registered_user',
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
  }, []);

  // Function to confirm optimistic post (make it fully opaque)
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
    setOptimisticPosts(prev => prev.filter(p => p.id !== optimisticId));
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
          <RefreshControl refreshing={refreshing} onRefresh={loadPosts} />
        }
        onScroll={() => setOpenMenuPostId(null)}
        scrollEventThrottle={16}
      >
        {[...optimisticPosts, ...posts].map((post) => {
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
