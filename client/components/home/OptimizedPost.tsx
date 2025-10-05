import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Bookmark, MoreHorizontal, User, MessageCircle, Flag } from 'lucide-react-native';
import ReportModal from '../common/ReportModal';
import { ReportService } from '../../services/reportService';
import Colors from '../../constants/Colors';
import { BookmarkService } from '../../services/bookmarkService';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../ui/Card';
import FadeInView from '../ui/FadeInView';
import LoadingSpinner from '../ui/LoadingSpinner';

interface PostProps {
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
  onCommentPress?: () => void;
  onReportPress?: () => void;
  onBookmarkPress?: () => void;
  onPostPress?: () => void;
  index?: number; // For staggered animations
  isLoading?: boolean; // For optimistic posts
  isOptimistic?: boolean; // To identify optimistic posts
}

const OptimizedPost: React.FC<PostProps> = React.memo(({
  id,
  user,
  timestamp,
  category,
  content,
  comments,
  onCommentPress,
  onReportPress,
  onBookmarkPress,
  onPostPress,
  index = 0,
  isLoading = false,
  isOptimistic = false,
}) => {
  const { user: currentUser } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Memoized category styling
  const categoryStyle = useMemo(() => {
    const cleanCategory = category.replace(' Related Post', '').replace(' Law', '').toLowerCase();
    return Colors.category[cleanCategory as keyof typeof Colors.category] || Colors.category.others;
  }, [category]);

  // Memoized clean category text
  const cleanCategoryText = useMemo(() => {
    return category.replace(' Related Post', '').replace(' Law', '').toUpperCase();
  }, [category]);

  // Check initial bookmark status
  useEffect(() => {
    const checkBookmarkStatus = async () => {
      if (currentUser?.id && id) {
        const result = await BookmarkService.isBookmarked(id, currentUser.id);
        if (result.success) {
          setIsBookmarked(result.isBookmarked);
        }
      }
    };
    checkBookmarkStatus();
  }, [id, currentUser?.id]);

  const handleBookmarkPress = useCallback(async () => {
    if (!currentUser?.id) {
      onBookmarkPress?.();
      return;
    }

    setIsBookmarkLoading(true);
    try {
      const result = await BookmarkService.toggleBookmark(id, currentUser.id);
      if (result.success) {
        setIsBookmarked(result.isBookmarked);
        onBookmarkPress?.();
      } else {
        console.error('Failed to toggle bookmark:', result.error);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsBookmarkLoading(false);
    }
  }, [currentUser?.id, id, onBookmarkPress]);

  const handleMorePress = useCallback(() => {
    setMenuOpen(prev => !prev);
  }, []);

  const handlePostPress = useCallback(() => {
    onPostPress?.();
  }, [onPostPress]);

  const handleCommentPress = useCallback(() => {
    onCommentPress?.();
  }, [onCommentPress]);

  const handleReportPress = useCallback(() => {
    setReportModalVisible(true);
  }, []);

  const handleReportSubmit = useCallback(async (reason: string, description: string) => {
    if (!currentUser?.id) return;

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
        onReportPress?.();
      } else {
        console.error('Failed to submit report:', result.error);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setIsReportLoading(false);
    }
  }, [currentUser?.id, id, onReportPress]);

  return (
    <FadeInView delay={index * 50} style={styles.container}>
      <Card 
        variant="default" 
        padding="medium" 
        onPress={handlePostPress}
        style={isLoading ? styles.loadingPost : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <User size={20} color={Colors.text.secondary} />
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userHandle}>@{user.username}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleMorePress} style={styles.moreButton}>
            <MoreHorizontal size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Category Badge */}
        <View style={styles.categoryContainer}>
          <View style={[styles.categoryBadge, { 
            backgroundColor: categoryStyle.bg,
            borderColor: categoryStyle.border,
          }]}>
            <Text style={[styles.categoryText, { color: categoryStyle.text }]}>
              {cleanCategoryText}
            </Text>
          </View>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>

        {/* Content */}
        <Text style={styles.content}>{content}</Text>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleCommentPress} style={styles.actionButton}>
            <MessageCircle size={18} color={Colors.text.secondary} />
            <Text style={styles.actionText}>{comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleBookmarkPress} 
            style={styles.actionButton}
            disabled={isBookmarkLoading}
          >
            {isBookmarkLoading ? (
              <LoadingSpinner size="small" />
            ) : (
              <Bookmark 
                size={18} 
                color={isBookmarked ? Colors.primary.blue : Colors.text.secondary}
                fill={isBookmarked ? Colors.primary.blue : 'transparent'}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleReportPress} style={styles.actionButton}>
            <Flag size={18} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </Card>

      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        isLoading={isReportLoading}
        targetType="post"
      />
    </FadeInView>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  moreButton: {
    padding: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  loadingPost: {
    opacity: 0.7,
    borderColor: Colors.primary.lightBlue,
    borderWidth: 1,
  },
});

OptimizedPost.displayName = 'OptimizedPost';

export default OptimizedPost;
