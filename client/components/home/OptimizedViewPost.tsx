import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, SafeAreaView, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { User, Shield, MessageCircle, Bookmark, MoreHorizontal, Flag, ArrowLeft } from 'lucide-react-native';
import ReportModal from '../common/ReportModal';
import { ReportService } from '../../services/reportService';
import Colors from '../../constants/Colors';
import apiClient from '@/lib/api-client';
import { BookmarkService } from '../../services/bookmarkService';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../ui/Card';
import FadeInView from '../ui/FadeInView';
import LoadingSpinner from '../ui/LoadingSpinner';
import { SkeletonCard, SkeletonText } from '../ui/SkeletonLoader';

interface Reply {
  id: string;
  body: string;
  created_at: string | null;
  updated_at?: string | null;
  user_id?: string | null;
  is_anonymous?: boolean | null;
  is_flagged?: boolean | null;
  user?: {
    name: string;
    username: string;
    avatar: string;
    isLawyer?: boolean;
    lawyerBadge?: string;
  };
  timestamp?: string;
  content?: string;
}

interface PostData {
  id: string;
  title?: string;
  body: string;
  domain: 'family' | 'criminal' | 'civil' | 'labor' | 'consumer' | 'others' | null;
  created_at: string | null;
  updated_at?: string | null;
  user_id?: string | null;
  is_anonymous?: boolean | null;
  is_flagged?: boolean | null;
  user?: {
    name: string;
    username: string;
    avatar: string;
    isLawyer?: boolean;
    lawyerBadge?: string;
  };
  comments?: number;
  replies?: Reply[];
  timestamp?: string;
}

const OptimizedViewPost: React.FC = React.memo(() => {
  const params = useLocalSearchParams<{ id?: string; postId?: string }>();
  const id = params.id || params.postId; // Handle both 'id' and 'postId' parameters
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  // Debug logs
  console.log('ViewPost - Post ID:', id);
  console.log('ViewPost - Search params:', params);
  
  const [post, setPost] = useState<PostData | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);

  // Memoized category styling
  const categoryStyle = useMemo(() => {
    if (!post?.domain) return Colors.category.others;
    return Colors.category[post.domain as keyof typeof Colors.category] || Colors.category.others;
  }, [post?.domain]);

  // Memoized clean category text
  const cleanCategoryText = useMemo(() => {
    if (!post?.domain) return 'OTHERS';
    return post.domain.toUpperCase();
  }, [post?.domain]);

  const fetchPost = useCallback(async () => {
    if (!id) {
      console.log('ViewPost - No ID provided, hiding loading');
      setLoading(false);
      return;
    }
    
    console.log('ViewPost - Fetching post with ID:', id);
    
    try {
      const response = await apiClient.getForumPostById(id);
      console.log('ViewPost API response:', response); // Debug log
      
      if (response.success && response.data) {
        const postData = response.data;
        
        // Map the API response to our PostData interface
        const mappedPost: PostData = {
          id: String(postData.id),
          body: postData.body || '',
          domain: postData.category || postData.domain || 'others',
          created_at: postData.created_at,
          updated_at: postData.updated_at,
          user_id: postData.user_id,
          is_anonymous: postData.is_anonymous,
          is_flagged: postData.is_flagged,
          user: postData.is_anonymous ? {
            name: 'Anonymous User',
            username: 'anonymous',
            avatar: '',
            isLawyer: false,
          } : {
            name: postData.users?.full_name || postData.user?.name || 'User',
            username: postData.users?.username || postData.user?.username || 'user',
            avatar: postData.users?.avatar || postData.user?.avatar || '',
            isLawyer: postData.users?.role === 'lawyer' || postData.user?.isLawyer || false,
          },
          comments: postData.reply_count || 0,
          replies: postData.replies || [],
          timestamp: formatTimeAgo(postData.created_at),
        };
        
        setPost(mappedPost);
        setReplies(mappedPost.replies || []);
      } else {
        console.log('ViewPost - API call failed or no data:', response);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const formatTimeAgo = (isoDate?: string): string => {
    if (!isoDate) return '';
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

  const checkBookmarkStatus = useCallback(async () => {
    if (!currentUser?.id || !id) return;
    
    try {
      const result = await BookmarkService.isBookmarked(id, currentUser.id);
      if (result.success) {
        setIsBookmarked(result.isBookmarked);
      }
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    }
  }, [currentUser?.id, id]);

  useEffect(() => {
    fetchPost();
    checkBookmarkStatus();
    
    // Fallback: Hide loading after 5 seconds maximum
    const fallbackTimer = setTimeout(() => {
      console.log('ViewPost - Fallback timer triggered, hiding loading');
      setLoading(false);
    }, 5000);
    
    return () => clearTimeout(fallbackTimer);
  }, [fetchPost, checkBookmarkStatus]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPost();
  }, [fetchPost]);

  const handleBookmarkPress = useCallback(async () => {
    if (!currentUser?.id || !id) return;

    setIsBookmarkLoading(true);
    try {
      const result = await BookmarkService.toggleBookmark(id, currentUser.id);
      if (result.success) {
        setIsBookmarked(result.isBookmarked);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsBookmarkLoading(false);
    }
  }, [currentUser?.id, id]);

  const handleReportPress = useCallback(() => {
    setReportModalVisible(true);
  }, []);

  const handleReportSubmit = useCallback(async (reason: string, description: string) => {
    if (!currentUser?.id || !id) return;

    setIsReportLoading(true);
    try {
      const result = await ReportService.submitReport(
        id,
        'post',
        reason,
        description,
        currentUser.id
      );

      if (result.success) {
        setReportModalVisible(false);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setIsReportLoading(false);
    }
  }, [currentUser?.id, id]);

  const handleBackPress = useCallback(() => {
    router.back();
  }, [router]);

  // Loading skeleton
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.headerActions} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Post Skeleton */}
          <Card variant="elevated" padding="large" style={styles.postCard}>
            {/* User Info Skeleton */}
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: Colors.background.tertiary }]} />
              <View style={styles.userDetails}>
                <View style={styles.userNameRow}>
                  <View style={[styles.skeletonLine, { width: 120, height: 16, marginBottom: 4 }]} />
                </View>
                <View style={[styles.skeletonLine, { width: 80, height: 12 }]} />
              </View>
            </View>

            {/* Category and Timestamp Skeleton */}
            <View style={styles.metaInfo}>
              <View style={[styles.skeletonLine, { width: 60, height: 20, borderRadius: 10 }]} />
              <View style={[styles.skeletonLine, { width: 40, height: 12 }]} />
            </View>

            {/* Content Skeleton */}
            <View style={{ marginBottom: 20 }}>
              <View style={[styles.skeletonLine, { width: '100%', height: 16, marginBottom: 8 }]} />
              <View style={[styles.skeletonLine, { width: '90%', height: 16, marginBottom: 8 }]} />
              <View style={[styles.skeletonLine, { width: '75%', height: 16, marginBottom: 8 }]} />
            </View>

            {/* Actions Skeleton */}
            <View style={styles.postActions}>
              <View style={[styles.skeletonLine, { width: 80, height: 16 }]} />
            </View>
          </Card>

          {/* Replies Section Skeleton */}
          <View style={styles.repliesSection}>
            <View style={[styles.skeletonLine, { width: 100, height: 18, marginBottom: 16 }]} />
            {[1, 2].map((index) => (
              <Card key={index} variant="default" padding="medium" style={styles.replyCard}>
                <View style={styles.replyHeader}>
                  <View style={[styles.replyAvatar, { backgroundColor: Colors.background.tertiary }]} />
                  <View style={styles.replyUserDetails}>
                    <View style={[styles.skeletonLine, { width: 100, height: 14, marginBottom: 4 }]} />
                    <View style={[styles.skeletonLine, { width: 60, height: 10 }]} />
                  </View>
                </View>
                <View style={[styles.skeletonLine, { width: '100%', height: 14, marginBottom: 4 }]} />
                <View style={[styles.skeletonLine, { width: '80%', height: 14 }]} />
              </Card>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Not Found</Text>
          <View style={styles.headerActions} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Post not found or has been removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={handleBookmarkPress} 
            style={styles.headerAction}
            disabled={isBookmarkLoading}
          >
            {isBookmarkLoading ? (
              <LoadingSpinner size="small" />
            ) : (
              <Bookmark 
                size={20} 
                color={isBookmarked ? Colors.primary.blue : Colors.text.secondary}
                fill={isBookmarked ? Colors.primary.blue : 'transparent'}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReportPress} style={styles.headerAction}>
            <Flag size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary.blue]}
            tintColor={Colors.primary.blue}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Main Post */}
        <FadeInView delay={0}>
          <Card variant="elevated" padding="large" style={styles.postCard}>
            {/* User Info */}
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                {post.user?.avatar ? (
                  <Image source={{ uri: post.user.avatar }} style={styles.avatarImage} />
                ) : (
                  <User size={24} color={Colors.text.secondary} />
                )}
              </View>
              <View style={styles.userDetails}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>{post.user?.name || 'Anonymous'}</Text>
                  {post.user?.isLawyer && (
                    <Shield size={16} color={Colors.primary.blue} style={styles.lawyerBadge} />
                  )}
                </View>
                <Text style={styles.userHandle}>
                  {post.user?.username ? `@${post.user.username}` : 'Anonymous User'}
                </Text>
              </View>
            </View>

            {/* Category and Timestamp */}
            <View style={styles.metaInfo}>
              <View style={[styles.categoryBadge, {
                backgroundColor: categoryStyle.bg,
                borderColor: categoryStyle.border,
              }]}>
                <Text style={[styles.categoryText, { color: categoryStyle.text }]}>
                  {cleanCategoryText}
                </Text>
              </View>
              <Text style={styles.timestamp}>
                {post.timestamp || new Date(post.created_at || '').toLocaleDateString()}
              </Text>
            </View>

            {/* Post Content */}
            <Text style={styles.postContent}>{post.body}</Text>

            {/* Post Actions */}
            <View style={styles.postActions}>
              <View style={styles.actionItem}>
                <MessageCircle size={20} color={Colors.text.secondary} />
                <Text style={styles.actionText}>{replies.length} replies</Text>
              </View>
            </View>
          </Card>
        </FadeInView>

        {/* Replies Section */}
        {replies.length > 0 && (
          <FadeInView delay={200}>
            <View style={styles.repliesSection}>
              <Text style={styles.repliesTitle}>Replies ({replies.length})</Text>
              {replies.map((reply, index) => (
                <FadeInView key={reply.id} delay={300 + (index * 50)}>
                  <Card variant="default" padding="medium" style={styles.replyCard}>
                    <View style={styles.replyHeader}>
                      <View style={styles.replyAvatar}>
                        {reply.user?.avatar ? (
                          <Image source={{ uri: reply.user.avatar }} style={styles.replyAvatarImage} />
                        ) : (
                          <User size={20} color={Colors.text.secondary} />
                        )}
                      </View>
                      <View style={styles.replyUserDetails}>
                        <View style={styles.replyUserNameRow}>
                          <Text style={styles.replyUserName}>
                            {reply.user?.name || 'Anonymous'}
                          </Text>
                          {reply.user?.isLawyer && (
                            <Shield size={14} color={Colors.primary.blue} />
                          )}
                        </View>
                        <Text style={styles.replyTimestamp}>
                          {reply.timestamp || new Date(reply.created_at || '').toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.replyContent}>{reply.body}</Text>
                  </Card>
                </FadeInView>
              ))}
            </View>
          </FadeInView>
        )}
      </ScrollView>

      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        isLoading={isReportLoading}
        targetType="post"
      />
    </SafeAreaView>
  );
});

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    ...Colors.shadow.light,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  headerAction: {
    padding: 8,
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  postCard: {
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginRight: 8,
  },
  lawyerBadge: {
    marginLeft: 4,
  },
  userHandle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  metaInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  timestamp: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text.primary,
    marginBottom: 20,
  },
  postActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  actionItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginRight: 20,
  },
  actionText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
    fontWeight: '500' as const,
  },
  repliesSection: {
    marginTop: 8,
  },
  repliesTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  replyCard: {
    marginBottom: 12,
  },
  replyHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  replyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  replyAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  replyUserDetails: {
    flex: 1,
  },
  replyUserNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  replyUserName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginRight: 8,
  },
  replyTimestamp: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  replyContent: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.primary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  // Skeleton styles
  postSkeleton: {
    height: 200,
    marginBottom: 24,
  },
  repliesSkeleton: {
    marginBottom: 16,
  },
  replySkeleton: {
    height: 100,
    marginBottom: 12,
  },
  skeletonLine: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 4,
  },
};

OptimizedViewPost.displayName = 'OptimizedViewPost';

export default OptimizedViewPost;
