import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
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
};

const LawyerTimeline: React.FC = () => {
  const router = useRouter();

  const [posts, setPosts] = useState<ForumPostWithUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <View className="flex-1 bg-white">
      {/* Timeline */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {posts.map((post) => {
          // Convert database timestamp to relative time
          const getRelativeTime = (timestamp: string) => {
            const now = new Date();
            const postTime = new Date(timestamp);
            const diffMs = now.getTime() - postTime.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            
            if (diffHours < 1) return 'now';
            if (diffHours < 24) return `${diffHours}h`;
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays}d`;
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

          return (
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
