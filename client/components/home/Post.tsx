import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Bookmark, MoreHorizontal, User, MessageCircle, Flag, ChevronRight } from 'lucide-react-native';
import ReportModal from '../common/ReportModal';
import { ReportService } from '../../services/reportService';
import Colors from '../../constants/Colors';
import { BookmarkService } from '../../services/bookmarkService';
import { useAuth } from '../../contexts/AuthContext';

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
}

const Post: React.FC<PostProps> = ({
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
}) => {
  const { user: currentUser } = useAuth();
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);

  const handleMorePress = () => {
    // Toggle more menu
    setMenuOpen((prev) => !prev);
  };

  const handlePostPress = () => {
    onPostPress?.();
  };

  // Check initial bookmark status
  useEffect(() => {
    const checkBookmarkStatus = async () => {
      if (currentUser?.id && id) {
        const result = await BookmarkService.isBookmarked(id, currentUser.id);
        if (result.success) {
          setBookmarked(result.isBookmarked);
        }
      }
    };
    checkBookmarkStatus();
  }, [id, currentUser?.id]);

  const handleBookmarkPress = async () => {
    if (!currentUser?.id) {
      // User not authenticated, could show login prompt
      onBookmarkPress?.();
      return;
    }

    setIsBookmarkLoading(true);
    try {
      const result = await BookmarkService.toggleBookmark(id, currentUser.id);
      if (result.success) {
        setBookmarked(result.isBookmarked);
        onBookmarkPress?.();
      } else {
        console.error('Failed to toggle bookmark:', result.error);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsBookmarkLoading(false);
    }
  };

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
        return { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', textColor: '#374151' };
    }
  };

  const categoryColors = getCategoryColors(cleanCategory);
  
  // Determine display text - show "OTHERS" for non-matching categories
  const getDisplayText = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory === 'labor') return 'WORK';
    if (['family', 'work', 'civil', 'criminal', 'consumer'].includes(lowerCategory)) {
      return category.toUpperCase();
    }
    return 'OTHERS';
  };

  const handleSubmitReport = async (reason: string, category: string, reasonContext?: string) => {
    if (!currentUser?.id || !id) {
      throw new Error('Missing user ID or post ID');
    }

    setIsReportLoading(true);
    try {
      // Check if user has already reported this post
      const existingReport = await ReportService.hasUserReported(
        id, 
        'post', 
        currentUser.id
      );

      if (existingReport.success && existingReport.hasReported) {
        throw new Error('You have already reported this post');
      }

      const result = await ReportService.submitReport(
        id,
        'post',
        reason,
        currentUser.id,
        reasonContext
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit report');
      }

      console.log('Report submitted successfully');
    } finally {
      setIsReportLoading(false);
    }
  };

  const displayText = getDisplayText(cleanCategory);

  // Determine if the user is anonymous
  const isAnonymous = (user.username || '').toLowerCase() === 'anonymous' || (user.name || '').toLowerCase().includes('anonymous');

  // Local state for the three-dots dropdown menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <TouchableOpacity style={styles.container} onPress={handlePostPress} activeOpacity={0.95}>
      {/* User Info Row */}
      <View style={styles.userRow}>
        {isAnonymous ? (
          <View style={[styles.avatar, styles.anonymousAvatar]}>
            <User size={20} color="#6B7280" />
          </View>
        ) : (
          <Image 
            source={{ uri: user.avatar || 'https://via.placeholder.com/40' }} 
            style={styles.avatar} 
          />
        )}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{user.name}</Text>
            <View style={styles.categoryContainer}>
              <Text style={[styles.categoryText, {
                backgroundColor: categoryColors.backgroundColor,
                borderColor: categoryColors.borderColor,
                color: categoryColors.textColor,
              }]}>{displayText}</Text>
            </View>
          </View>
          <View style={styles.secondRow}>
            {isAnonymous ? (
              <Text style={styles.timestamp}>{timestamp}</Text>
            ) : (
              <>
                <Text style={styles.username}>@{user.username}</Text>
                <Text style={styles.timestamp}>• {timestamp}</Text>
              </>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton} onPress={handleMorePress}>
          <MoreHorizontal size={16} color="#536471" />
        </TouchableOpacity>
      </View>
      {menuOpen && (
        <>
          {/* Overlay to close menu when tapping outside */}
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.8}
            onPress={handleBookmarkPress}
            disabled={isBookmarkLoading}
          >
            <Bookmark 
              size={16} 
              color={bookmarked ? '#F59E0B' : '#374151'} 
              fill={bookmarked ? '#F59E0B' : 'none'} 
            />
            <Text style={[styles.menuText, isBookmarkLoading && { opacity: 0.5 }]}>
              {isBookmarkLoading 
                ? (bookmarked ? 'Unbookmarking...' : 'Bookmarking...') 
                : (bookmarked ? 'Unbookmark post' : 'Bookmark post')
              }
            </Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.8}
            onPress={() => {
              setMenuOpen(false);
              setReportModalVisible(true);
            }}
          >
            <Flag size={16} color="#B91C1C" />
            <Text style={[styles.menuText, { color: '#B91C1C' }]}>Report post</Text>
          </TouchableOpacity>
          </View>
        </>
      )}

      {/* Post Content */}
      <Text style={styles.content}>{content}</Text>

      {/* Engagement Actions */}
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity style={styles.actionButton} onPress={onCommentPress}>
            <MessageCircle size={18} color="#536471" />
            <Text style={styles.actionCount}>{comments}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handlePostPress} activeOpacity={0.7} hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}>
          <ChevronRight size={18} color="#536471" />
        </TouchableOpacity>
      </View>

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleSubmitReport}
        targetType="post"
        isLoading={isReportLoading}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E8ED',
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
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1419',
    marginRight: 12,
  },
  username: {
    fontSize: 15,
    color: '#536471',
    marginRight: 4,
  },
  timestamp: {
    fontSize: 15,
    color: '#536471',
  },
  categoryContainer: {
    marginBottom: 0,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  moreButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    fontSize: 15,
    lineHeight: 20,
    color: '#0F1419',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  actionCount: {
    fontSize: 13,
    color: '#536471',
  },
  secondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  anonymousAvatar: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    position: 'absolute',
    top: 36,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 6,
    width: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuText: {
    fontSize: 14,
    color: '#374151',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 2,
  },
  arrowButton: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    padding: 6,
    borderRadius: 16,
  },
});

export default Post;