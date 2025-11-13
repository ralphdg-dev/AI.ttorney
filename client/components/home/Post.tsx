import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Bookmark, MoreHorizontal, User, MessageCircle, Flag, ChevronRight } from 'lucide-react-native';
import ReportModal from '../common/ReportModal';
import { ReportService } from '../../services/reportService';
import Colors from '@/constants/Colors';
import { BookmarkService } from '../../services/bookmarkService';
import { useAuth } from '../../contexts/AuthContext';
import { usePostBookmarks } from '../../contexts/PostBookmarksContext';
import FadeInView from '../ui/FadeInView';
 

interface PostProps {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
  };
  timestamp: string;
  created_at?: string; // Raw timestamp for dynamic formatting
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
  // Dropdown state management
  isMenuOpen?: boolean;
  onMenuToggle?: (postId: string) => void;
  // Bookmark status passed from parent to prevent individual API calls
  isBookmarked?: boolean;
  onBookmarkStatusChange?: (postId: string, isBookmarked: boolean) => void;
  // Removed search highlighting props
}

const Post: React.FC<PostProps> = React.memo(({
  id,
  user,
  timestamp,
  created_at,
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
  isMenuOpen = false,
  onMenuToggle,
  isBookmarked: propIsBookmarked,
  onBookmarkStatusChange,
}) => {
  const { user: currentUser, session } = useAuth();
  const { loadBookmarks: refreshBookmarkContext } = usePostBookmarks();
  const [isBookmarked, setIsBookmarked] = useState(propIsBookmarked || false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [displayTime, setDisplayTime] = useState(timestamp);
  const [showAlreadyReported, setShowAlreadyReported] = useState(false);

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') {
      return 'U'; // Default to 'U' for User
    }
    
    const initials = name
      .trim()
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return initials || 'U'; // Fallback to 'U' if no initials
  };

  // Format timestamp dynamically
  const formatTimeAgo = useCallback((isoDate: string): string => {
    if (!isoDate) return '';
    try {
      const createdMs = new Date(isoDate).getTime();
      if (Number.isNaN(createdMs)) return timestamp; // Fallback to static timestamp
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
    } catch {
      return timestamp; // Fallback to static timestamp
    }
  }, [timestamp]);

  // Update display time periodically if we have raw timestamp
  useEffect(() => {
    if (!created_at) return;
    
    // Update immediately
    setDisplayTime(formatTimeAgo(created_at));
    
    // Update every 30 seconds for real-time feel
    const timer = setInterval(() => {
      setDisplayTime(formatTimeAgo(created_at));
    }, 30000);
    
    return () => clearInterval(timer);
  }, [created_at, formatTimeAgo]);
  
  // Update local state when prop changes
  useEffect(() => {
    setIsBookmarked(propIsBookmarked || false);
  }, [propIsBookmarked]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);


  // Remove individual bookmark status checks - now handled by parent Timeline component

  const handleBookmarkPress = useCallback(async () => {
    if (!currentUser?.id) {
      onBookmarkPress?.();
      return;
    }

    // Optimistic update - update UI immediately
    const previousBookmarkState = isBookmarked;
    const newBookmarkState = !isBookmarked;
    
    setIsBookmarked(newBookmarkState);
    onBookmarkStatusChange?.(id, newBookmarkState);
    onBookmarkPress?.();
    
    // Show brief loading state (shorter duration)
    setIsBookmarkLoading(true);
    
    // Hide loading state quickly for better UX
    setTimeout(() => setIsBookmarkLoading(false), 300);
    
    try {
      // Make API call in background
      const result = await BookmarkService.toggleBookmark(id, currentUser.id, session);
      
      if (result.success) {
        // Confirm the optimistic update was correct
        if (result.isBookmarked !== newBookmarkState) {
          // If server state differs, correct it
          setIsBookmarked(result.isBookmarked);
          onBookmarkStatusChange?.(id, result.isBookmarked);
        }
        // Refresh context to update sidebar badge count
        setTimeout(() => refreshBookmarkContext(), 100);
      } else {
        // Revert optimistic update on failure
        setIsBookmarked(previousBookmarkState);
        onBookmarkStatusChange?.(id, previousBookmarkState);
      }
    } catch {
      // Revert optimistic update on error
      setIsBookmarked(previousBookmarkState);
      onBookmarkStatusChange?.(id, previousBookmarkState);
    }
  }, [currentUser?.id, id, onBookmarkPress, onBookmarkStatusChange, session, isBookmarked, refreshBookmarkContext]);

  const handleMorePress = useCallback(() => {
    onMenuToggle?.(id);
  }, [onMenuToggle, id]);

  const handlePostPress = useCallback(() => {
    onPostPress?.();
  }, [onPostPress]);

  const handleCommentPress = useCallback(() => {
    onCommentPress?.();
  }, [onCommentPress]);

  const handleReportPress = useCallback(() => {
    // Open the modal immediately for instant feedback
    setReportModalVisible(true);
    setShowAlreadyReported(false);

    // Run the check in the background and update state if needed
    (async () => {
      if (currentUser?.id) {
        try {
          const checkResult = await ReportService.hasUserReported(
            id,
            'post',
            currentUser.id,
            session
          );
          if (checkResult.success && checkResult.hasReported) {
            setShowAlreadyReported(true);
          }
        } catch {
          // Silently ignore check errors; user can still submit
        }
      }
    })();
  }, [currentUser?.id, id, session]);

  const handleReportSubmit = useCallback(async (reason: string, category: string, reasonContext?: string) => {
    if (!currentUser?.id) return;

    setIsReportLoading(true);
    try {
      // Submit the report (already checked in handleReportPress)
      const result = await ReportService.submitReport(
        id,
        'post',
        reason,
        currentUser.id,
        reasonContext || category,
        session
      );

      if (result.success) {
        // Don't close modal immediately - let ReportModal handle success state and auto-close
        onReportPress?.();
      } else {
        throw new Error(result.error || 'Failed to submit report');
      }
    } catch (error) {
      throw error; // Re-throw to let ReportModal handle the error display
    } finally {
      setIsReportLoading(false);
    }
  }, [currentUser?.id, id, onReportPress, session]);

  // Clean category text by removing "Related Post" and simplifying names
  const cleanCategory = category.replace(' Related Post', '').replace(' Law', '').toUpperCase();

  // Get category colors based on category type
  const getCategoryColors = (category: string) => {
    const lowerCategory = (category || '').toLowerCase();
    
    if (lowerCategory.includes('family')) {
      return { backgroundColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#BE123C' };
    } else if (lowerCategory.includes('labor') || lowerCategory.includes('work')) {
      return { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', textColor: '#D97706' };
    } else if (lowerCategory.includes('civil')) {
      return { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', textColor: '#2563EB' };
    } else if (lowerCategory.includes('criminal')) {
      return { backgroundColor: '#F3E8FF', borderColor: '#C4B5FD', textColor: '#7C3AED' };
    } else if (lowerCategory.includes('consumer')) {
      return { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0', textColor: '#059669' };
    } else {
      return { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB', textColor: '#6B7280' };
    }
  };

  const categoryColors = getCategoryColors(cleanCategory);
  
  // Determine display text - show "OTHERS" for non-matching categories
  const getDisplayText = (category: string) => {
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('family')) return 'FAMILY';
    if (lowerCategory.includes('labor') || lowerCategory.includes('work')) return 'LABOR';
    if (lowerCategory.includes('civil')) return 'CIVIL';
    if (lowerCategory.includes('criminal')) return 'CRIMINAL';
    if (lowerCategory.includes('consumer')) return 'CONSUMER';
    
    return 'OTHERS';
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
          ) : user.avatar && !user.avatar.includes('flaticon') ? (
            <Image 
              source={{ uri: user.avatar }} 
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: Colors.primary.blue, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                {getInitials(user.name)}
              </Text>
            </View>
          )}
          
          <View style={styles.userInfo}>
            {/* User Name and Category Row */}
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{user.name || 'User'}</Text>
              
              {/* Category Badge */}
              <View style={[styles.categoryBadge, { 
                backgroundColor: categoryColors.backgroundColor,
                borderColor: categoryColors.borderColor 
              }]}>
                <Text style={[styles.categoryText, { color: categoryColors.textColor }]}>
                  {displayText}
                </Text>
              </View>
            </View>
            
            {/* User Handle and Timestamp Row */}
            <View style={styles.userMetaRow}>
              {!isAnonymous && (
                <>
                  <Text style={styles.userHandle}>@{user.username || 'user'}</Text>
                  <Text style={styles.metaSeparator}> • </Text>
                </>
              )}
              <Text style={styles.timestamp}>{displayTime}</Text>
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
        {isMenuOpen && (
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
          onClose={() => {
            setReportModalVisible(false);
            setShowAlreadyReported(false);
          }}
          onSubmit={handleReportSubmit}
          targetType="post"
          isLoading={isReportLoading}
          showAlreadyReported={showAlreadyReported}
        />
      </TouchableOpacity>
    </FadeInView>
  );
});
const styles = StyleSheet.create({
  fadeContainer: {
    marginBottom: 8,
  },
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 0,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    borderColor: '#E5E7EB',
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
