import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Post from '../home/Post';
import Colors from '../../constants/Colors';
import { Database } from '../../types/database.types';
import apiClient from '@/lib/api-client';
import { useFocusEffect } from '@react-navigation/native';

type ForumPost = Database['public']['Tables']['forum_posts']['Row'];
type User = Database['public']['Tables']['users']['Row'];

type ForumPostWithUser = ForumPost & {
  user: User;
  reply_count: number;
  isOptimistic?: boolean;
  animatedOpacity?: Animated.Value;
};

const LawyerTimeline: React.FC = () => {
  const router = useRouter();

  const [posts, setPosts] = useState<ForumPostWithUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [optimisticPosts, setOptimisticPosts] = useState<ForumPostWithUser[]>([]);

  const loadPosts = useCallback(async () => {
    setRefreshing(true);
    const res = await apiClient.getRecentForumPosts();
    if (res.success && Array.isArray((res.data as any)?.data)) {
      const rows = (res.data as any).data as any[];
      const mapped: ForumPostWithUser[] = rows.map((r: any) => ({
        id: String(r.id),
        title: undefined as any,
        body: r.body,
        domain: r.category,
        created_at: r.created_at,
        updated_at: r.updated_at,
        user_id: r.user_id,
        is_anonymous: r.is_anonymous,
        is_flagged: r.is_flagged,
        user: {
          id: r.user_id,
          email: '',
          username: r.is_anonymous ? 'anonymous' : 'user',
          full_name: r.is_anonymous ? 'Anonymous User' : 'User',
          role: 'registered_user' as any,
          is_verified: false,
          birthdate: null,
          created_at: null,
          updated_at: null,
        },
        reply_count: Number(r.reply_count || 0),
      }));
      setPosts(mapped);
    } else {
      setPosts([]);
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  // Lightweight polling for near real-time updates
  useEffect(() => {
    const id = setInterval(() => {
      loadPosts();
    }, 10000); // 10s
    return () => clearInterval(id);
  }, [loadPosts]);

  const handleCommentPress = (postId: string) => {
    console.log(`Comment pressed for post ${postId}`);
    // TODO: Navigate to comments screen
  };

  const handleReportPress = (postId: string) => {
    console.log(`Report pressed for post ${postId}`);
    // TODO: Show report modal
  };

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
    const animatedOpacity = new Animated.Value(0.5); // Start with 50% opacity
    const optimisticPost: ForumPostWithUser = {
      id: `optimistic-${Date.now()}`,
      title: undefined as any,
      body: postData.body,
      domain: (postData.category as any) || 'others',
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
        role: 'registered_user' as any,
        is_verified: false,
        birthdate: null,
        created_at: null,
        updated_at: null,
      },
      reply_count: 0,
      isOptimistic: true,
      animatedOpacity,
    };

    setOptimisticPosts(prev => [optimisticPost, ...prev]);
    return optimisticPost.id;
  }, []);

  // Function to confirm optimistic post (make it fully opaque)
  const confirmOptimisticPost = useCallback((optimisticId: string, realPost?: ForumPostWithUser) => {
    setOptimisticPosts(prev => {
      const post = prev.find(p => p.id === optimisticId);
      if (post?.animatedOpacity) {
        Animated.timing(post.animatedOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // Remove optimistic post after animation
          setOptimisticPosts(current => current.filter(p => p.id !== optimisticId));
          // Refresh posts to get the real post
          if (realPost) {
            setPosts(current => [realPost, ...current]);
          } else {
            loadPosts();
          }
        });
      }
      return prev;
    });
  }, [loadPosts]);

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
    <View className="flex-1 bg-white">
      {/* Timeline */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 10 }}
        showsVerticalScrollIndicator={false}
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

          // Convert domain to display category
          const getDomainDisplayName = (domain: string | null) => {
            if (!domain) return 'General';
            switch (domain) {
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
                avatar: `https://images.unsplash.com/photo-${Math.random() > 0.5 ? '1472099645785-5658abf4ff4e' : '1507003211169-0a1dd7228f2d'}?w=150&h=150&fit=crop&crop=face`,
              }}
              timestamp={getRelativeTime(post.created_at || '')}
              category={getDomainDisplayName(post.domain)}
              content={post.body}
              comments={post.reply_count}
              onCommentPress={() => handleCommentPress(post.id)}
              onReportPress={() => handleReportPress(post.id)}
              onPostPress={() => handlePostPress(post.id)}
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
        <View className="h-20" />
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
};

export default LawyerTimeline;
