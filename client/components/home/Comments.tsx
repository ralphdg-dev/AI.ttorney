import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, FlatList, ListRenderItem } from 'react-native';
import { Send, User } from 'lucide-react-native';
import Colors from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import FadeInView from '../ui/FadeInView';
import { SkeletonCard } from '../ui/SkeletonLoader';
import { VerifiedLawyerBadge } from '../common/VerifiedLawyerBadge';
import { useOptimizedList } from '../../hooks/useOptimizedList';

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user?: {
    name: string;
    username: string;
    avatar: string;
    isLawyer?: boolean;
  };
  is_anonymous?: boolean;
}

interface CommentsProps {
  postId: string;
  comments: Comment[];
  loading?: boolean;
  onAddComment?: (comment: string) => Promise<void>;
  onRefresh?: () => void;
}

const Comments: React.FC<CommentsProps> = React.memo(({
  postId,
  comments,
  loading = false,
  onAddComment,
  onRefresh,
}) => {
  const { user: currentUser } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCommentDisabled = useMemo(() => {
    return newComment.trim().length === 0 || newComment.length > 500;
  }, [newComment]);

  const handleSubmitComment = useCallback(async () => {
    if (isCommentDisabled || !onAddComment) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch {
      // Error handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, isCommentDisabled, onAddComment]);

  const renderComment: ListRenderItem<Comment> = useCallback(({ item, index }) => (
    <FadeInView delay={index * 30} key={item.id}>
      <Card variant="default" padding="medium" style={styles.commentCard}>
        <View style={styles.commentHeader}>
          <View style={styles.commentAvatar}>
            <User size={16} color={Colors.text.secondary} />
          </View>
          <View style={styles.commentUserInfo}>
            <View style={styles.commentUserNameRow}>
              <Text style={styles.commentUserName}>
                {item.is_anonymous ? 'Anonymous' : (item.user?.name || 'Anonymous')}
              </Text>
              {!item.is_anonymous && (
                <Text style={styles.commentUserHandle}>
                  @{item.user?.username || 'user'}
                </Text>
              )}
            </View>
            {item.user?.isLawyer && (
              <View style={{ marginTop: 2, marginBottom: 2 }}>
                <VerifiedLawyerBadge size="sm" />
              </View>
            )}
            <Text style={styles.commentTimestamp}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <Text style={styles.commentContent}>{item.body}</Text>
      </Card>
    </FadeInView>
  ), []);

  const keyExtractor = useCallback((item: Comment) => item.id, []);

  const optimizedListProps = useOptimizedList({
    data: comments,
    keyExtractor,
    renderItem: renderComment,
  });

  if (loading && comments.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Comments</Text>
        <SkeletonCard style={styles.skeletonComment} />
        <SkeletonCard style={styles.skeletonComment} />
        <SkeletonCard style={styles.skeletonComment} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comments ({comments.length})</Text>

      {/* Comment Input */}
      {currentUser && (
        <FadeInView delay={0}>
          <Card variant="outlined" padding="medium" style={styles.inputCard}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor={Colors.text.tertiary}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <View style={styles.inputActions}>
              <Text style={[
                styles.characterCount,
                newComment.length > 500 && styles.characterCountExceeded
              ]}>
                {newComment.length}/500
              </Text>
              <Button
                title="Post"
                variant="primary"
                size="small"
                disabled={isCommentDisabled}
                loading={isSubmitting}
                onPress={handleSubmitComment}
                icon={<Send size={14} color={Colors.text.white} />}
                iconPosition="right"
              />
            </View>
          </Card>
        </FadeInView>
      )}

      {/* Comments List */}
      {comments.length > 0 ? (
        <FlatList
          {...optimizedListProps}
          style={styles.commentsList}
          contentContainerStyle={styles.commentsListContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false} // Disable scroll since it's inside a ScrollView
          windowSize={8}
          initialNumToRender={5}
          maxToRenderPerBatch={3}
        />
      ) : (
        <FadeInView delay={200}>
          <Card variant="flat" padding="large" style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No comments yet. Be the first to share your thoughts!
            </Text>
          </Card>
        </FadeInView>
      )}
    </View>
  );
});

const styles = {
  container: {
    marginTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  inputCard: {
    marginBottom: 16,
  },
  commentInput: {
    minHeight: 80,
    fontSize: 14,
    color: Colors.text.primary,
    textAlignVertical: 'top' as const,
    marginBottom: 12,
  },
  inputActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  characterCountExceeded: {
    color: Colors.status.error,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingBottom: 16,
  },
  commentCard: {
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  commentUserInfo: {
    flex: 1,
  },
  commentUserNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginRight: 8,
  },
  commentUserHandle: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  
  commentTimestamp: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.primary,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  skeletonComment: {
    height: 80,
    marginBottom: 12,
  },
};

Comments.displayName = 'Comments';

export default Comments;
