import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Post from './home/Post';
import Colors from '../constants/Colors';
// eslint-disable-next-line import/no-named-as-default
import apiClient from '@/lib/api-client';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';

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
}

interface TimelineProps {
  context?: 'user' | 'lawyer';
}

const Timeline: React.FC<TimelineProps> = ({ context = 'user' }) => {
  const router = useRouter();
  const [posts, setPosts] = useState<PostData[]>([]); // All displayed posts
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const POSTS_PER_PAGE = 15; // Industry standard batch size

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

  const mapApiToPost = useCallback((row: any): PostData => {
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
      comments: Number(row?.reply_count || row?.replies?.length || row?.forum_replies?.length || 0),
    };
  }, []);

  // Load first page of posts from API (server-side pagination)
  const loadPosts = useCallback(async () => {
    setRefreshing(true);
    try {
      console.log('📡 Loading page 1 from API...');
      const res = await apiClient.getRecentForumPosts(1, POSTS_PER_PAGE);
      
      let mappedPosts: PostData[] = [];
      if (res.success && Array.isArray((res.data as any)?.data)) {
        const rows = (res.data as any).data as any[];
        mappedPosts = rows.map(mapApiToPost);
      } else if (res.success && Array.isArray(res.data)) {
        mappedPosts = (res.data as any[]).map(mapApiToPost);
      }
      
      console.log(`✅ Loaded ${mappedPosts.length} posts from API`);
      setPosts(mappedPosts);
      setCurrentPage(1);
      // If we got less than POSTS_PER_PAGE, there are no more posts
      setHasMore(mappedPosts.length === POSTS_PER_PAGE);
    } catch (error) {
      console.warn('Failed to load posts:', error);
      setPosts([]);
      setHasMore(false);
    } finally {
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Load more posts when scrolling (TRUE server-side pagination)
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    try {
      const nextPage = currentPage + 1;
      console.log(`📡 Loading page ${nextPage} from API...`);
      
      const res = await apiClient.getRecentForumPosts(nextPage, POSTS_PER_PAGE);
      
      let newPosts: PostData[] = [];
      if (res.success && Array.isArray((res.data as any)?.data)) {
        const rows = (res.data as any).data as any[];
        newPosts = rows.map(mapApiToPost);
      } else if (res.success && Array.isArray(res.data)) {
        newPosts = (res.data as any[]).map(mapApiToPost);
      }
      
      console.log(`✅ Loaded ${newPosts.length} more posts from API`);
      
      if (newPosts.length > 0) {
        setPosts(prev => [...prev, ...newPosts]);
        setCurrentPage(nextPage);
        // If we got less than POSTS_PER_PAGE, there are no more posts
        setHasMore(newPosts.length === POSTS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.warn('Failed to load more posts:', error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, hasMore, loadingMore, mapApiToPost]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Refresh when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  // Real-time subscription for comment count updates (optimized with debouncing)
  useEffect(() => {
    if (__DEV__) {
      console.log('📡 Timeline: Setting up real-time subscription for forum replies');
    }
    
    // Debounce timer to batch rapid updates for better performance
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const pendingUpdates = new Map<string, number>();
    
    const applyPendingUpdates = () => {
      if (pendingUpdates.size === 0) return;
      
      // Use requestAnimationFrame for smoother UI updates
      requestAnimationFrame(() => {
        setPosts(prevPosts => {
          return prevPosts.map(post => {
            const newCount = pendingUpdates.get(post.id);
            if (newCount !== undefined) {
              return { ...post, comments: newCount };
            }
            return post;
          });
        });
        
        pendingUpdates.clear();
      });
    };
    
    const channel = supabase
      .channel('forum_replies_user_timeline')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_replies'
        },
        (payload) => {
          const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
          
          if (postId) {
            const postIdStr = String(postId);
            
            // Find current count and calculate new count
            setPosts(prevPosts => {
              const post = prevPosts.find(p => p.id === postIdStr);
              if (post) {
                let newCount = post.comments;
                
                if (payload.eventType === 'INSERT') {
                  newCount = post.comments + 1;
                } else if (payload.eventType === 'DELETE') {
                  newCount = Math.max(0, post.comments - 1);
                }
                
                // Store update instead of applying immediately
                pendingUpdates.set(postIdStr, newCount);
                
                // Debounce: apply updates after 100ms of no new events
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(applyPendingUpdates, 100);
              }
              return prevPosts; // Don't update yet
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  // Lightweight polling for near real-time updates
  useEffect(() => {
    const id = setInterval(() => {
      loadPosts();
    }, 10000); // 10s
    return () => clearInterval(id);
  }, [loadPosts]);

  const handleCommentPress = (postId: string) => {
    console.log(`Comment pressed for post ${postId}`);
    // TODO: Navigate to comments screen (KNOWN ISSUE - Low priority for production)
  };

  const handleReportPress = (postId: string) => {
    console.log(`Report pressed for post ${postId}`);
    // TODO: Show report modal (KNOWN ISSUE - Low priority for production)
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

  // Render footer with loading indicator
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary.blue} />
        <Text style={styles.loadingText}>Loading more posts...</Text>
      </View>
    );
  };
  
  // Render empty state
  const renderEmpty = () => {
    if (refreshing) return null;
    
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No posts yet</Text>
      </View>
    );
  };
  
  // Render individual post item
  const renderPost = ({ item }: { item: PostData }) => (
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
    />
  );

  return (
    <View style={styles.container}>
      {/* Timeline with Infinite Scroll */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        style={styles.timeline}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadPosts} />
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5} // Trigger when 50% from bottom (industry standard)
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        removeClippedSubviews={true} // Optimize memory usage
        maxToRenderPerBatch={10} // Render optimization
        updateCellsBatchingPeriod={50} // Smooth scrolling
        windowSize={10} // Number of items to keep in memory
        initialNumToRender={15} // Initial render count
      />

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
  },
  timelineContent: {
    paddingVertical: 10, // Add some vertical padding
    paddingBottom: 100, // Add bottom padding for floating button
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  createPostButton: {
    position: 'absolute',
    bottom: 70, // Updated to account for navbar height + breathing room
    right: 20,
    backgroundColor: Colors.primary.blue,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: `0 4px 8px ${Colors.primary.blue}30`,
    elevation: 8,
    zIndex: 1000, // Ensure it appears above other elements
  },
});

export default Timeline; 