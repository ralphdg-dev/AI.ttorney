import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions, Modal, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, MoreHorizontal, User, MessageCircle, Flag, ChevronRight, Pencil, Trash2 } from 'lucide-react-native';
import { getCategoryColors, getCategoryDisplayText } from '@/utils/categoryUtils';
import ReportModal from '../common/ReportModal';
import EditPostModal from './EditPostModal';
import { ReportService } from '../../services/reportService';
import Colors from '@/constants/Colors';
import { BookmarkService } from '../../services/bookmarkService';
import { useAuth } from '../../contexts/AuthContext';
import { usePostBookmarks } from '../../contexts/PostBookmarksContext';
import { getResponsiveValue } from '@/constants/LayoutConstants';
import FadeInView from '../ui/FadeInView';
import AnimatedCounter from '../ui/AnimatedCounter';
 
import { VerifiedLawyerBadge } from '../common/VerifiedLawyerBadge';


interface PostProps {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
    isLawyer?: boolean;
    account_status?: string;
  };
  userId?: string; // Post owner's user ID for edit permission check
  timestamp: string;
  created_at?: string; // Raw timestamp for dynamic formatting
  updated_at?: string; // Raw timestamp for when post was last edited
  isEdited?: boolean; // Whether the post has been edited
  category: string;
  content: string;
  comments: number;
  onCommentPress?: () => void;
  onReportPress?: () => void;
  onBookmarkPress?: () => void;
  onPostPress?: () => void;
  onEditSuccess?: (postId: string, newContent: string) => void; // Callback when edit is successful
  onEditError?: (postId: string, originalContent: string) => void; // Callback to revert if edit fails
  onSaveConfirmed?: () => void; // Called when backend confirms save (for toast)
  onDeleteSuccess?: (postId: string) => void; // Callback when delete is successful
  index?: number; // For staggered animations
  isLoading?: boolean; // For optimistic posts
  isOptimistic?: boolean; // To identify optimistic posts
  // Dropdown state management
  isMenuOpen?: boolean;
  onMenuToggle?: (postId: string) => void;
  // Bookmark status passed from parent to prevent individual API calls
  isBookmarked?: boolean;
  onBookmarkStatusChange?: (postId: string, isBookmarked: boolean) => void;
  // Search highlighting props
  isSearchResult?: boolean;
  searchTerm?: string;
}


const Post: React.FC<PostProps> = React.memo(({
  id,
  user,
  userId,
  timestamp,
  created_at,
  updated_at,
  isEdited,
  category,
  content,
  comments,
  onCommentPress,
  onReportPress,
  onBookmarkPress,
  onPostPress,
  onEditSuccess,
  onEditError,
  onSaveConfirmed,
  onDeleteSuccess,
  index = 0,
  isLoading = false,
  isOptimistic = false,
  isMenuOpen = false,
  onMenuToggle,
  isBookmarked: propIsBookmarked,
  onBookmarkStatusChange,
  isSearchResult = false,
  searchTerm = '',
}) => {
  const { user: currentUser, session } = useAuth();
  const { loadBookmarks: refreshBookmarkContext } = usePostBookmarks();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isBookmarked, setIsBookmarked] = useState(propIsBookmarked || false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  
  // Responsive values for Post component
  const responsive = React.useMemo(() => ({
    userNameFontSize: getResponsiveValue(width, 12, 13, 14), // Responsive user name
    usernameFontSize: getResponsiveValue(width, 11, 12, 13), // Handle (@username)
    timestampFontSize: getResponsiveValue(width, 10, 11, 12),
    categoryFontSize: getResponsiveValue(width, 9, 10, 11),
    verticalSpacing: getResponsiveValue(width, 4, 6, 8),
    nameMarginRight: getResponsiveValue(width, 4, 6, 8), // Responsive margin
    useCompactName: width < 380, // Use compact name format on very small screens
  }), [width]);

  // Determine if the user account is deactivated (moved up for getDisplayName)
  const isDeactivated = user.account_status === 'deactivated';

  // Helper function to format name for small screens
  const getDisplayName = useCallback((fullName: string) => {
    if (!responsive.useCompactName || isDeactivated) {
      return isDeactivated ? 'Deactivated Account' : (fullName || 'User');
    }
    
    if (!fullName || typeof fullName !== 'string') {
      return 'User';
    }
    
    const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
    
    if (nameParts.length === 1) {
      // Single name, just return as is
      return nameParts[0];
    } else if (nameParts.length >= 2) {
      // First name + first letter of surname + dot
      const firstName = nameParts[0];
      const surnameInitial = nameParts[nameParts.length - 1][0].toUpperCase(); // Last name's first letter
      return `${firstName} ${surnameInitial}.`;
    }
    
    return fullName;
  }, [responsive.useCompactName, isDeactivated]);
  // Helper function to format relative time
  const formatRelativeTime = (dateString: string | undefined) => {
    if (!dateString) return 'now';
    try {
      const dateMs = new Date(dateString).getTime();
      if (Number.isNaN(dateMs)) return 'now';
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - dateMs) / 1000));
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
      return 'now';
    }
  };

  const [displayTime, setDisplayTime] = useState(() => {
    // Initialize with formatted time
    const dateToFormat = created_at || timestamp;
    return formatRelativeTime(dateToFormat);
  });
  
  // Calculate edited time display
  const editedTimeDisplay = useMemo(() => {
    if (!isEdited || !updated_at) return null;
    return `Edited ${formatRelativeTime(updated_at)} ago`;
  }, [isEdited, updated_at]);
  
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



  // Update display time periodically if we have raw timestamp
  useEffect(() => {
    if (!created_at) return;
    
    const updateTime = () => {
      try {
        const createdMs = new Date(created_at).getTime();
        if (Number.isNaN(createdMs)) return 'now';
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
        return 'now';
      }
    };
    
    // Update immediately
    setDisplayTime(updateTime());
    
    // Update every 30 seconds for real-time feel
    const timer = setInterval(() => {
      setDisplayTime(updateTime());
    }, 30000);
    
    return () => clearInterval(timer);
  }, [created_at]);
  
  // Update local state when prop changes
  useEffect(() => {
    setIsBookmarked(propIsBookmarked || false);
  }, [propIsBookmarked]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dropdownMenuVisible, setDropdownMenuVisible] = useState(false);
  const [dropdownMenuPosition, setDropdownMenuPosition] = useState({ x: 0, y: 0, width: 0 });
  const moreButtonRef = useRef<View>(null);

  // Check if the current user owns this post
  const isOwnPost = currentUser?.id && userId && currentUser.id === userId;

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
    // Get screen dimensions for boundary checking
    const screenHeight = Dimensions.get('window').height;
    const screenWidth = Dimensions.get('window').width;
    
    // Calculate actual menu height dynamically based on menu items
    const baseItemHeight = 44; // Height of each menu item
    const dividerHeight = 1;   // Height of divider
    const menuWidth = 160;
    
    // Calculate menu height based on whether user owns the post
    let menuHeight = baseItemHeight * 2 + dividerHeight; // Bookmark + Report + 1 divider
    if (isOwnPost) {
      menuHeight = baseItemHeight * 4 + dividerHeight * 3; // Bookmark + Edit + Delete + Report + 3 dividers
    }
    
    // Use measureInWindow to get absolute screen coordinates
    moreButtonRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      console.log('Dropdown positioning debug:', {
        buttonX: x,
        buttonY: y,
        buttonWidth: width,
        buttonHeight: height,
        screenHeight,
        screenWidth,
        menuHeight,
        menuWidth,
        isOwnPost,
        safeAreaInsets: insets
      });
      
      // Calculate dropdown position with boundary checking
      let dropdownX = x - menuWidth + width; // Align right edge with button
      let dropdownY = y + height + 4; // Position below button with small gap
      
      // Ensure menu doesn't go off left screen
      if (dropdownX < 8) {
        dropdownX = 8;
      }
      
      // Ensure menu doesn't go off right screen
      if (dropdownX + menuWidth > screenWidth - 8) {
        dropdownX = screenWidth - menuWidth - 8;
      }
      
      // Check if menu would go below screen - flip to above if needed
      // Fixed: Use total screen height including safe areas
      if (dropdownY + menuHeight > screenHeight - insets.bottom - 20) {
        // Position above button instead
        dropdownY = y - menuHeight - 4;
        
        // Ensure menu doesn't go off top of screen (account for status bar)
        if (dropdownY < insets.top + 20) {
          dropdownY = insets.top + 20; // Minimum margin from top
        }
      }
      
      const finalPosition = { 
        x: dropdownX, 
        y: dropdownY, 
        width 
      };
      
      console.log('Final dropdown position:', finalPosition);
      
      setDropdownMenuPosition(finalPosition);
      setDropdownMenuVisible(true);
    });
  }, [isOwnPost, insets]);


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

  const handleEditPress = useCallback(() => {
    setEditModalVisible(true);
    onMenuToggle?.(id); // Close the menu
  }, [id, onMenuToggle]);

  const handleEditSuccess = useCallback((newContent: string) => {
    setEditModalVisible(false);
    onEditSuccess?.(id, newContent);
  }, [id, onEditSuccess]);

  const handleDeletePress = useCallback(() => {
    setDeleteModalVisible(true);
    onMenuToggle?.(id); // Close the menu
  }, [id, onMenuToggle]);

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      const { NetworkConfig } = await import('../../utils/networkConfig');
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/forum/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.detail || 'Failed to delete post');
      }
      
      setDeleteModalVisible(false);
      onDeleteSuccess?.(id);
    } catch (error: any) {
      console.error('Error deleting post:', error);
      const { Alert } = require('react-native');
      Alert.alert('Error', error.message || 'Failed to delete post. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [id, session?.access_token, onDeleteSuccess]);

  // Clean category text by removing "Related Post" and simplifying names
  const cleanCategory = category?.trim() || '';

  // Calculate menu position to avoid cutoff
  const getMenuPosition = useCallback(() => {
    // Default position (top-right of post)
    return {
      top: 40,
      right: 16,
      bottom: undefined,
    };
  }, []);


  // Get category colors and display text using shared utility
  const categoryColors = getCategoryColors(cleanCategory);
  const displayText = getCategoryDisplayText(cleanCategory);


  // Determine if the user is anonymous
  const isAnonymous = (user.username || '').toLowerCase() === 'anonymous' || (user.name || '').toLowerCase().includes('anonymous');


  // Cap the fade-in delay so later posts appear quickly even in long lists.
  // This prevents high indexes (e.g., 30th+ item) from waiting multiple
  // seconds before becoming visible.
  const effectiveDelay = Math.min(index || 0, 8) * 40; // max ~320ms

  return (
    <FadeInView delay={effectiveDelay} style={styles.fadeContainer}>
      <TouchableOpacity 
        style={[styles.container, isLoading && styles.loadingPost]} 
        onPress={handlePostPress} 
        activeOpacity={0.95}
      >
        {/* User Info Row */}
        <View style={styles.userRow}>
          {isAnonymous || isDeactivated ? (
            <View style={[styles.avatar, styles.anonymousAvatar]}>
              <User size={20} color="#6B7280" />
            </View>
          ) : user.avatar && !user.avatar.includes('flaticon') && !imageLoadError ? (
            <Image 
              source={{ uri: user.avatar }} 
              style={styles.avatar}
              onError={() => setImageLoadError(true)}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: Colors.primary.blue, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                {getInitials(user.name)}
              </Text>
            </View>
          )}
          
          <View style={styles.userInfo}>
            {/* User Name Row */}
            <View style={styles.userNameRow}>
              <Text 
                style={[
                  styles.userName, 
                  { 
                    fontSize: responsive.userNameFontSize,
                    marginRight: responsive.nameMarginRight,
                  }
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {getDisplayName(user.name)}
              </Text>

              {/* Verified Lawyer Badge (unified across app) */}
              {!isAnonymous && !isDeactivated && user?.isLawyer && (
                <View style={styles.verifiedBadgeContainer}>
                  <VerifiedLawyerBadge size="sm" />
                </View>
              )}
            </View>
            
            {/* Username and Timestamp Row */}
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: responsive.verticalSpacing}}>
              {!isAnonymous && !isDeactivated && (
                <>
                  <Text style={[styles.userHandle, { fontSize: responsive.usernameFontSize }]}>@{user.username || 'user'}</Text>
                  <Text style={[styles.metaSeparator, { fontSize: responsive.timestampFontSize }]}> • </Text>
                </>
              )}
              <Text style={[styles.timestamp, { fontSize: responsive.timestampFontSize }]}>{displayTime}</Text>
              {editedTimeDisplay && (
                <>
                  <Text style={[styles.metaSeparator, { fontSize: responsive.timestampFontSize }]}> • </Text>
                  <Text style={[styles.editedIndicator, { fontSize: responsive.timestampFontSize }]}>{editedTimeDisplay}</Text>
                </>
              )}
            </View>
            
            {/* Category Badge Row */}
            <View style={[styles.categoryRow, { marginBottom: responsive.verticalSpacing }]}>
              {/* Category Badge */}
              <View
                style={[styles.categoryBadge, {
                  backgroundColor: categoryColors.bg,
                  borderColor: categoryColors.border,
                }]}
              >
                <Text
                  style={[styles.categoryText, {
                    color: categoryColors.text,
                    fontSize: responsive.categoryFontSize,
                  }]}
                  allowFontScaling={false}
                  adjustsFontSizeToFit={false}
                >
                  {displayText}
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity
            ref={moreButtonRef}
            style={styles.moreButton}
            onPress={handleMorePress}
          >
            <MoreHorizontal size={20} color="#536471" />
          </TouchableOpacity>
        </View>


        {/* Post Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.content}>{content}</Text>
          {/* Removed publishing indicator - just use opacity */}
        </View>


        {/* Engagement Actions */}
        <View style={styles.actions}>
          <View style={styles.actionsLeft}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleCommentPress}
              disabled={isLoading}
            >
              <MessageCircle size={18} color={isLoading ? "#9CA3AF" : "#536471"} />
              {isLoading ? (
                <View style={[styles.actionCount, { 
                  backgroundColor: '#E5E7EB', 
                  borderRadius: 4, 
                  width: 20, 
                  height: 14 
                }]} />
              ) : (
                <AnimatedCounter count={comments} style={styles.actionCount} duration={250} />
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.viewMoreButton} onPress={handlePostPress}>
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

        {/* Edit Post Modal */}
        <EditPostModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSuccess={handleEditSuccess}
          onError={(originalContent) => onEditError?.(id, originalContent)}
          onSaveConfirmed={onSaveConfirmed}
          postId={id}
          initialContent={content}
        />

      </TouchableOpacity>

      {/* Delete Post Confirmation Modal - Outside TouchableOpacity for proper overlay */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Post</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              Are you sure you want to delete this post? This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={handleDeleteConfirm}
                disabled={isDeleting}
                style={[
                  styles.deleteButton,
                  isDeleting && styles.deleteButtonDisabled
                ]}
              >
                {isDeleting ? (
                  <View style={styles.deleteButtonContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.deleteButtonText}>Deleting...</Text>
                  </View>
                ) : (
                  <Text style={styles.deleteButtonText}>Delete Post</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dropdown Menu Modal - traditional dropdown style with fixed positioning */}
      <Modal
        visible={dropdownMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          activeOpacity={1} 
          onPress={() => setDropdownMenuVisible(false)}
        >
          <View style={[styles.dropdownMenu, { 
            left: dropdownMenuPosition.x, 
            top: dropdownMenuPosition.y 
          }]}>
            {/* Only show bookmark option for other users' posts */}
            {!isOwnPost && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setDropdownMenuVisible(false);
                  handleBookmarkPress();
                }}
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
            )}
            {isOwnPost && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setDropdownMenuVisible(false);
                    handleEditPress();
                  }}
                >
                  <Pencil size={16} color="#374151" />
                  <Text style={[styles.menuText, { color: '#374151' }]}>Edit post</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setDropdownMenuVisible(false);
                    handleDeletePress();
                  }}
                >
                  <Trash2 size={16} color="#EF4444" />
                  <Text style={[styles.menuText, { color: '#EF4444' }]}>Delete post</Text>
                </TouchableOpacity>
              </>
            )}
            {/* Always show report option with proper divider */}
            {isOwnPost && <View style={styles.menuDivider} />}
            {!isOwnPost && <View style={styles.menuDivider} />}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setDropdownMenuVisible(false);
                handleReportPress();
              }}
            >
              <Flag size={16} color="#EF4444" />
              <Text style={[styles.menuText, { color: '#EF4444' }]}>Report post</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    // Removed blue border - just use opacity
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
    marginBottom: 6,
    flexShrink: 1, // Allow shrinking but don't expand unnecessarily
  },
  verifiedBadgeContainer: {
    marginLeft: 4, // Reduced from 8 to 4 for closer spacing
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  userName: {
    fontSize: 14, // Will be overridden by responsive value
    fontWeight: '600',
    color: '#0F1419',
    marginRight: 8, // Will be overridden by responsive value
    flexShrink: 1, // Allow text to shrink when needed but don't expand unnecessarily
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userHandle: {
    fontSize: 12, // Will be overridden by responsive value
    color: '#536471',
  },
  metaSeparator: {
    fontSize: 12, // Will be overridden by responsive value
    color: '#536471',
  },
  timestamp: {
    fontSize: 12, // Will be overridden by responsive value
    color: '#536471',
  },
  editedIndicator: {
    fontSize: 12, // Will be overridden by responsive value
    color: '#6B7280', // Slightly lighter gray for edited indicator
    fontStyle: 'italic',
  },
  moreButton: {
    padding: 4,
    marginLeft: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    paddingRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    overflow: 'visible',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.5,
    includeFontPadding: false,
    textTransform: 'uppercase',
  },
  contentContainer: {
    marginBottom: 16,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0F1419',
  },
  // Removed loadingIndicator and loadingText styles - no longer needed
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 160,
    maxWidth: 200,
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
  // Delete Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    padding: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalButtons: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deleteButtonDisabled: {
    backgroundColor: '#FCA5A5',
  },
  deleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
});


Post.displayName = 'Post';


export default Post;
