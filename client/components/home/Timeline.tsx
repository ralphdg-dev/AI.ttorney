import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Animated, ListRenderItem } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Post from './Post';
import Colors from '../../constants/Colors';
import apiClient from '@/lib/api-client';
import { useFocusEffect } from '@react-navigation/native';
import ForumLoadingAnimation from '../ui/ForumLoadingAnimation';
import { useOptimizedList } from '@/hooks/useOptimizedList';
import { SkeletonList } from '@/components/ui/SkeletonLoader';

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
  const [posts, setPosts] = useState<PostData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [optimisticPosts, setOptimisticPosts] = useState<PostData[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

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
        ? { name: 'Anonymous User', username: 'anonymous', avatar: '' }
        : { 
            name: userData?.full_name || userData?.username || 'User', 
            username: userData?.username || 'user', 
            avatar: `https://images.unsplash.com/photo-${Math.random() > 0.5 ? '1472099645785-5658abf4ff4e' : '1507003211169-0a1dd7228f2d'}?w=150&h=150&fit=crop&crop=face`
          },
      timestamp: formatTimeAgo(created),
      category: row?.category || 'Others',
      content: row?.body || '',
      comments: Number(row?.reply_count || 0),
    };
  };

  const loadPosts = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiClient.getRecentForumPosts();
      if (res.success && Array.isArray((res.data as any)?.data)) {
        const rows = (res.data as any).data as any[];
        setPosts(rows.map(mapApiToPost));
      } else if (res.success && Array.isArray(res.data)) {
        setPosts((res.data as any[]).map(mapApiToPost));
      } else {
        setPosts([]);
      }
    } catch {
      setPosts([]);
    } finally {
      setRefreshing(false);
      // Hide initial loading after first load
      if (initialLoading) {
        setTimeout(() => setInitialLoading(false), 300);
      }
    }
  }, [initialLoading]);

  useEffect(() => {
    loadPosts();
    
    // Fallback: Hide loading after 3 seconds maximum
    const fallbackTimer = setTimeout(() => {
      if (initialLoading) {
        setInitialLoading(false);
      }
    }, 3000);
    
    return () => clearTimeout(fallbackTimer);
  }, [loadPosts, initialLoading]);

  // Refresh when screen gains focus
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
        ? { name: 'Anonymous User', username: 'anonymous', avatar: '' }
        : { name: 'You', username: 'you', avatar: '' },
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
          // Refresh posts first
          loadPosts().then(() => {
            // Remove optimistic post only after real posts are loaded and rendered
            setTimeout(() => {
              setOptimisticPosts(current => current.filter(p => p.id !== optimisticId));
            }, 200); // Shorter delay for more seamless transition
          });
        }, 300); // Reduced delay for faster response
      }
      return prev;
    });
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
        onReportPress={() => handleReportPress(item.id)}
        onPostPress={() => handlePostPress(item.id)}
        index={index}
        isOptimistic={item.isOptimistic}
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
  }, [handleCommentPress, handleReportPress, handlePostPress]);

  // Combined posts data
  const allPosts = useMemo(() => [...optimisticPosts, ...posts], [optimisticPosts, posts]);

  // Use optimized list hook
  const optimizedListProps = useOptimizedList({
    data: allPosts,
    keyExtractor,
    renderItem,
    windowSize: 10,
    initialNumToRender: 5,
    maxToRenderPerBatch: 3,
    updateCellsBatchingPeriod: 50,
    removeClippedSubviews: true,
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
          {...optimizedListProps}
          style={styles.timeline}
          contentContainerStyle={styles.timelineContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          ListFooterComponent={<View style={styles.bottomSpacer} />}
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
    shadowColor: Colors.primary.blue,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default Timeline; 