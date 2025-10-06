import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Bookmark, MoreHorizontal, User, MessageCircle, Flag, ChevronRight } from 'lucide-react-native';
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

const Post: React.FC<PostProps> = React.memo(({
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

  // Clean category text by removing "Related Post" and simplifying names
  const cleanCategory = category.replace(' Related Post', '').replace(' Law', '').toUpperCase();

  // Get category colors based on category type
  const getCategoryColors = (category: string) => {
    switch ((category || '').toLowerCase()) {
      case 'family':
        return { backgroundColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#BE123C' };
      case 'work':
        return { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', textColor: '#1D4ED8' };
      case 'civil':
        return { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE', textColor: '#7C3AED' };
      case 'criminal':
        return { backgroundColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#DC2626' };
      case 'labor':
        // Treat 'labor' as 'work' for styling
        return { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', textColor: '#1D4ED8' };
      case 'consumer':
        return { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', textColor: '#047857' };
      default:
        return { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB', textColor: '#374151' };
    }
  };

  const categoryColors = getCategoryColors(cleanCategory);
  
  // Determine display text - show "OTHERS" for non-matching categories
  const getDisplayText = (category: string) => {
    const lowerCategory = category.toLowerCase();
    const validCategories = ['family', 'work', 'civil', 'criminal', 'labor', 'consumer'];
    return validCategories.includes(lowerCategory) ? category : 'OTHERS';
  };

  const displayText = getDisplayText(cleanCategory);

  // Determine if the user is anonymous
  const isAnonymous = (user.username || '').toLowerCase() === 'anonymous' || (user.name || '').toLowerCase().includes('anonymous');

  return (
    <FadeInView delay={index * 50} style={styles.fadeContainer}>
      <TouchableOpacity 
        style={[styles.container, isLoading && styles.loadingPost]} 
        onPress={handlePostPress} 
        activeOpacity={0.95}
      >
        {/* User Info Row */}
        <View style={styles.userRow}>
          {isAnonymous ? (
            <View style={[styles.avatar, styles.anonymousAvatar]}>
              <User size={20} color="#6B7280" />
            </View>
          ) : (
            <Image 
              source={{ uri: user.avatar }} 
              style={styles.avatar}
            />
          )}
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{user.name}</Text>
              <View style={[styles.categoryBadge, {
                backgroundColor: categoryColors.backgroundColor,
                borderColor: categoryColors.borderColor,
              }]}>
                <Text style={[styles.categoryText, { color: categoryColors.textColor }]}>
                  {displayText}
                </Text>
              </View>
            </View>
            <View style={styles.userMetaRow}>
              <Text style={styles.userHandle}>@{user.username}</Text>
              <Text style={styles.metaSeparator}> • </Text>
              <Text style={styles.timestamp}>{timestamp}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={handleMorePress}
          >
            <MoreHorizontal size={20} color="#536471" />
          </TouchableOpacity>
        </View>

        {/* Post Content */}
        <Text style={styles.content}>{content}</Text>

        {/* More Menu */}
        {menuOpen && (
          <View style={styles.moreMenu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleBookmarkPress}
              disabled={isBookmarkLoading}
            >
              <Bookmark 
                size={16} 
                color={isBookmarked ? '#F59E0B' : '#374151'} 
                fill={isBookmarked ? '#F59E0B' : 'none'} 
              />
              <Text style={[styles.menuText, isBookmarkLoading && { opacity: 0.5 }]}>
                {isBookmarkLoading 
                  ? (isBookmarked ? 'Unbookmarking...' : 'Bookmarking...') 
                  : (isBookmarked ? 'Unbookmark post' : 'Bookmark post')
                }
              </Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleReportPress}
            >
              <Flag size={16} color="#EF4444" />
              <Text style={[styles.menuText, { color: '#EF4444' }]}>Report post</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Engagement Actions */}
        <View style={styles.actions}>
          <View style={styles.actionsLeft}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCommentPress}>
              <MessageCircle size={18} color="#536471" />
              <Text style={styles.actionCount}>{comments}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.viewMoreButton}>
            <ChevronRight size={18} color="#536471" />
          </TouchableOpacity>
        </View>

        {/* Report Modal */}
        <ReportModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          onSubmit={handleReportSubmit}
          targetType="post"
          isLoading={isReportLoading}
        />
      </TouchableOpacity>
    </FadeInView>
  );
});

const styles = StyleSheet.create({
  fadeContainer: {
    marginBottom: 12,
  },
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loadingPost: {
    opacity: 0.7,
    borderColor: Colors.primary.blue,
    borderWidth: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  anonymousAvatar: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F1419',
    marginRight: 8,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userHandle: {
    fontSize: 12,
    color: '#536471',
  },
  metaSeparator: {
    fontSize: 12,
    color: '#536471',
  },
  timestamp: {
    fontSize: 12,
    color: '#536471',
  },
  moreButton: {
    padding: 4,
    marginLeft: 8,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0F1419',
    marginBottom: 16,
  },
  moreMenu: {
    position: 'absolute',
    top: 40,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
    minWidth: 160,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuText: {
    fontSize: 14,
    color: '#0F1419',
    marginLeft: 8,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E1E8ED',
    marginHorizontal: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionCount: {
    fontSize: 12,
    color: '#536471',
    marginLeft: 4,
    fontWeight: '500',
  },
  viewMoreButton: {
    padding: 4,
  },
});

Post.displayName = 'Post';

export default Post;
