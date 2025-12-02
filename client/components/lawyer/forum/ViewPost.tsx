import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TouchableWithoutFeedback, Image, TextInput, Animated, StatusBar, useWindowDimensions, Keyboard, Platform, KeyboardAvoidingView, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { User, Bookmark, MoreHorizontal, Flag, Send, Pencil, Trash2, X } from 'lucide-react-native';
import ReportModal from '../../common/ReportModal';
import EditPostModal from '../../home/EditPostModal';
import EditReplyModal from '../../home/EditReplyModal';
import { ReportService } from '../../../services/reportService';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../../constants/Colors';
import Header from '../../Header';
import { BookmarkService } from '../../../services/bookmarkService';
import { useAuth } from '../../../contexts/AuthContext';
import SkeletonLoader from '../../ui/SkeletonLoader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useForumCache } from '../../../contexts/ForumCacheContext';
import { createShadowStyle } from '../../../utils/shadowUtils';
import { shouldUseNativeDriver } from '../../../utils/animations';
import { NetworkConfig } from '../../../utils/networkConfig';
import { useModerationStatus } from '../../../contexts/ModerationContext';
import { useToast } from '../../ui/toast';
import { parseModerationError } from '../../../services/moderationService';
import { showStrikeAddedToast, showSuspendedToast, showBannedToast, showAccessDeniedToast, showContentValidationToast } from '../../../utils/moderationToastUtils';
import { validatePostContent } from '../../../utils/contentValidation';
import { VerifiedLawyerBadge } from '../../common/VerifiedLawyerBadge';
import { getCategoryColors, getCategoryDisplayText } from '@/utils/categoryUtils';
import { LAYOUT, getResponsiveValue, getSafeBottomPosition } from '../../../constants/LayoutConstants';


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
  is_edited?: boolean | null;
  user?: {
    name: string;
    username: string;
    avatar: string;
    isLawyer?: boolean;
    lawyerBadge?: string;
    account_status?: string;
  };
  comments?: number;
  timestamp?: string;
  category?: string;
  content?: string;
  isBookmarked?: boolean;
  users?: any;
  forum_replies?: any[];
}

interface Reply {
  id: string;
  body: string;
  created_at: string | null;
  updated_at?: string | null;
  user_id?: string | null;
  is_anonymous?: boolean;
  is_flagged?: boolean;
  is_edited?: boolean;
  user?: {
    name: string;
    username: string;
    avatar: string;
    isLawyer?: boolean;
    lawyerBadge?: string;
    account_status?: string;
  };
  // Optimistic UI props
  isOptimistic?: boolean;
  animatedOpacity?: Animated.Value;
}



const ViewPost: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId?: string; from?: string; query?: string }>();
  const { user: currentUser, session } = useAuth();
  const { getCachedPost, setCachedPost, getCachedPostFromForum, prefetchPost, isPostCacheValid, updatePostCommentCount } = useForumCache();
  const { refreshStatus } = useModerationStatus();
  const toast = useToast();
  
  // Responsive dimensions
  const { width } = useWindowDimensions();
  
  // Custom hook for responsive values
  const usePostResponsive = useCallback(() => {
    return {
      horizontalPadding: LAYOUT.SPACING.md,
      avatarSize: getResponsiveValue(width, 40, 48, 56),
      dropdownWidth: getResponsiveValue(width, 160, 192, 224),
      replyInputHeight: getResponsiveValue(width, 40, 44, 48),
      nameFontSize: getResponsiveValue(width, 14, 16, 18),
      usernameFontSize: getResponsiveValue(width, 12, 14, 15),
      verticalSpacing: getResponsiveValue(width, 6, 8, 12),
    };
  }, [width]);
  
  const responsive = usePostResponsive();
  
  // Enhanced keyboard handling with animation for reply input
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const keyboardAnimatedValue = useRef(new Animated.Value(0)).current;
  
  // We don't need interpolation anymore since we're using absolute positioning
  
  // Function to reset input position
  const resetInputPosition = useCallback(() => {
    // Reset all state and animation values
    setIsKeyboardVisible(false);
    keyboardAnimatedValue.setValue(0);
    
    // Force layout update to ensure input is at bottom
    requestAnimationFrame(() => {
      keyboardAnimatedValue.setValue(0);
    });
  }, [keyboardAnimatedValue]);

  // Reset input position when component unmounts
  useEffect(() => {
    return () => {
      // Ensure input position is reset when leaving the screen
      resetInputPosition();
    };
  }, [resetInputPosition]);

  useEffect(() => {
    // Only add keyboard listeners on native platforms (iOS/Android), not web
    if (Platform.OS === 'web') {
      return;
    }
    
    // Listen for keyboard WILL show (earliest possible event)
    const keyboardWillShowListener = Keyboard.addListener(
      'keyboardWillShow',
      (e) => {
        console.log('🕹 Keyboard will show:', e.endCoordinates.height);
        // Update state immediately
        setIsKeyboardVisible(true);
        
        // INSTANT ANIMATION - SUPER FAST
        keyboardAnimatedValue.setValue(1);
        
        // Force immediate layout update
        requestAnimationFrame(() => {
          // Double-check that animation value is set
          keyboardAnimatedValue.setValue(1);
        });
      }
    );
    
    // Also listen for did show as backup
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        console.log('🕹 Keyboard did show');
        setIsKeyboardVisible(true);
        keyboardAnimatedValue.setValue(1);
      }
    );
    
    // Listen for keyboard WILL hide
    const keyboardWillHideListener = Keyboard.addListener(
      'keyboardWillHide',
      () => {
        console.log('🕹 Keyboard will hide');
        // INSTANT HIDE - SUPER FAST
        resetInputPosition();
      }
    );
    
    // Also listen for did hide as backup
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        console.log('🕹 Keyboard did hide');
        resetInputPosition();
      }
    );
    
    // Listen for blur events on the TextInput
    const blurSubscription = Keyboard.addListener('keyboardDidHide', resetInputPosition);
    
    return () => {
      keyboardWillShowListener?.remove();
      keyboardDidShowListener.remove();
      keyboardWillHideListener?.remove();
      keyboardDidHideListener.remove();
      blurSubscription.remove();
    };
  }, [resetInputPosition, keyboardAnimatedValue]);
  
  const [showFullContent, setShowFullContent] = useState(false);
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postReady, setPostReady] = useState(false);
  // Timer removed - no longer needed for real-time updates
  const [bookmarked, setBookmarked] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportReplyModalVisible, setReportReplyModalVisible] = useState(false);
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null);
  const [replyMenuOpen, setReplyMenuOpen] = useState<string | null>(null);
  const [showAlreadyReportedReply, setShowAlreadyReportedReply] = useState(false);
  const [showAlreadyReportedPost, setShowAlreadyReportedPost] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [optimisticReplies, setOptimisticReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editReplyModalVisible, setEditReplyModalVisible] = useState(false);
  const [editingReply, setEditingReply] = useState<{ id: string; body: string } | null>(null);
  const [deleteReplyModalVisible, setDeleteReplyModalVisible] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Check if current user is a lawyer
  const isLawyer = currentUser?.role === 'verified_lawyer';
  
  // Check if current user owns this post (for edit permission)
  const isOwnPost = currentUser?.id && post?.user_id && currentUser.id === post.user_id;

  // Type adapter functions - MUST be declared before any useCallback that uses them
  const mapCachedToViewPost = useCallback((cached: any) => {
    return {
      ...cached,
      body: cached.body || '',
    };
  }, []);

  const mapCachedRepliesToViewPost = useCallback((cachedReplies: any[]) => {
    return cachedReplies.map(reply => ({
      ...reply,
      is_anonymous: reply.is_anonymous ?? undefined,
    }));
  }, []);

  const mapViewPostToCache = useCallback((post: PostData, replies: Reply[]) => {
    return {
      ...post,
      user: post.user || { name: 'Anonymous', username: 'anonymous', avatar: '' },
      timestamp: post.timestamp || '',
      category: post.category || '',
      content: post.content || '',
      comments: post.comments || 0,
      domain: post.domain || undefined,
      created_at: post.created_at || undefined,
      user_id: post.user_id || undefined,
      replies: replies.map(reply => ({
        ...reply,
        is_anonymous: reply.is_anonymous ?? null,
      })),
      commentsLoaded: true,
    };
  }, []);

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Optimized auth headers helper with minimal logging
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    try {
      // First try to get token from AuthContext session
      if (session?.access_token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };
      }
      
      // Fallback to AsyncStorage
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
      }
      
      return { 'Content-Type': 'application/json' };
    } catch {
      return { 'Content-Type': 'application/json' };
    }
  }, [session?.access_token]);

  // Reset states when postId changes
  useEffect(() => {
    setMenuOpen(false);
    setBookmarked(false);
    setIsBookmarkLoading(false);
    setReportModalVisible(false);
  }, [postId]);

  // Helper function to format timestamp with real-time updates using device time
  const formatTimestamp = useCallback((timestamp: string | null): string => {
    if (!timestamp) return 'Unknown time';
    
    try {
      // Parse the timestamp
      const postDate = new Date(timestamp);
      const now = new Date();
      
      // Check if the date is valid
      if (isNaN(postDate.getTime())) return 'Invalid time';
      
      // For recent posts (less than 7 days old), show relative time
      const diffInMs = now.getTime() - postDate.getTime();
      const diffInSeconds = Math.floor(diffInMs / 1000);
      
      // If the timestamp is in the future or very recent (within 1 second)
      if (diffInSeconds <= 0) return 'Just now';
      
      if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
      
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      // For posts older than a week but less than a month, show weeks
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
      
      // For posts older than 7 days, display the date in MM/DD/YYYY format
      return `${postDate.getMonth() + 1}/${postDate.getDate()}/${postDate.getFullYear()}`;
    } catch {
      // Fallback for any parsing errors
      return 'Unknown time';
    }
  }, []);

  // Real-time timer effect - update more frequently for better responsiveness
  useEffect(() => {
    const timer = setInterval(() => {
      // Removed setCurrentTime as it's not being used
    }, 10000); // Update every 10 seconds for real-time feel

    return () => clearInterval(timer);
  }, []);

  // Check initial bookmark status
  useEffect(() => {
    const checkBookmarkStatus = async () => {
      if (currentUser?.id && postId) {
        setIsBookmarkLoading(true);
        
        const result = await BookmarkService.isBookmarked(String(postId), currentUser.id, session);
        if (result.success) {
          setBookmarked(result.isBookmarked);
        }
        setIsBookmarkLoading(false);
      } else {
        // Reset state if no user or post
        setBookmarked(false);
        setIsBookmarkLoading(false);
      }
    };
    checkBookmarkStatus();
  }, [postId, currentUser?.id, session]);

  const handleBookmarkPress = useCallback(async () => {
    if (!currentUser?.id || !postId) {
      return;
    }

    // Optimistic update - toggle immediately
    const newBookmarkState = !bookmarked;
    setBookmarked(newBookmarkState);

    // Make API call in background
    try {
      const result = await BookmarkService.toggleBookmark(String(postId), currentUser.id, session);
      if (result.success) {
        // Confirm the state matches, if not correct it
        if (result.isBookmarked !== newBookmarkState) {
          setBookmarked(result.isBookmarked);
        }
      } else {
        // Revert on failure
        setBookmarked(!newBookmarkState);
      }
    } catch {
      // Revert on error
      setBookmarked(!newBookmarkState);
    }
  }, [currentUser?.id, postId, session, bookmarked]);

  const handleReportPress = () => {
    setMenuOpen(false);
    // Open the modal immediately for instant feedback
    setShowAlreadyReportedPost(false);
    setReportModalVisible(true);

    // Run the check in the background and update state if needed
    (async () => {
      if (post?.id && currentUser?.id) {
        try {
          const checkResult = await ReportService.hasUserReported(
            post.id,
            'post',
            currentUser.id,
            session
          );
          if (checkResult.success && checkResult.hasReported) {
            setShowAlreadyReportedPost(true);
          }
        } catch {
          // Silently ignore check errors
        }
      }
    })();
  };

  const handleSubmitReport = async (reason: string, category: string, reasonContext?: string) => {
    if (!post?.id || !currentUser?.id) return;
    
    setIsReportLoading(true);
    try {
      const result = await ReportService.submitReport(
        post.id,
        'post',
        category,
        currentUser.id,
        reasonContext,
        session
      );
      
      if (result.success) {
        // Don't close modal here - let ReportModal handle showing success and closing
        setMenuOpen(false);
      } else {
        throw new Error(result.error || 'Failed to submit report');
      }
    } catch (error) {
      throw error; // Re-throw to let ReportModal handle the error display
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleSubmitReplyReport = async (reason: string, category: string, reasonContext?: string) => {
    if (!selectedReplyId || !currentUser?.id) return;
    
    setIsReportLoading(true);
    try {
      // First check if user has already reported this reply
      const checkResult = await ReportService.hasUserReported(
        selectedReplyId,
        'reply',
        currentUser.id,
        session
      );

      if (checkResult.success && checkResult.hasReported) {
        // User has already reported this reply - throw error to trigger "already reported" modal
        throw new Error('You have already reported this reply');
      }

      // User hasn't reported this reply - proceed with submission
      const result = await ReportService.submitReport(
        selectedReplyId,
        'reply',
        category,
        currentUser.id,
        reasonContext,
        session
      );
      
      if (result.success) {
        // Don't close modal here - let ReportModal handle showing success and closing
        setReplyMenuOpen(null);
      } else {
        throw new Error(result.error || 'Failed to submit report');
      }
    } catch (error) {
      throw error; // Re-throw to let ReportModal handle the error display
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleReportReplyPress = (replyId: string) => {
    setSelectedReplyId(replyId);
    setReplyMenuOpen(null);
    // Open the modal immediately
    setShowAlreadyReportedReply(false);
    setReportReplyModalVisible(true);

    // Run the check in the background
    (async () => {
      if (currentUser?.id) {
        try {
          const checkResult = await ReportService.hasUserReported(
            replyId,
            'reply',
            currentUser.id,
            session
          );
          if (checkResult.success && checkResult.hasReported) {
            setShowAlreadyReportedReply(true);
          }
        } catch {
          // Ignore check errors
        }
      }
    })();
  };

  // Optimized post loading with cache-first approach
  useEffect(() => {
    const loadPost = async () => {
      if (!postId) {
        setError('No post ID provided');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Step 1: Check if we have cached post with comments
        const cachedPostWithComments = getCachedPost(String(postId));
        
        if (cachedPostWithComments) {
          // Map cached data to component state
          const mappedPost: PostData = {
            id: cachedPostWithComments.id,
            user: cachedPostWithComments.user,
            timestamp: cachedPostWithComments.timestamp || '',
            category: cachedPostWithComments.category || 'others',
            content: cachedPostWithComments.content || cachedPostWithComments.body || '',
            comments: cachedPostWithComments.replies?.length || 0,
            isBookmarked: cachedPostWithComments.isBookmarked,
            body: cachedPostWithComments.body || '',
            domain: (cachedPostWithComments.domain as any) || 'others',
            created_at: cachedPostWithComments.created_at || null,
            updated_at: (cachedPostWithComments as any).updated_at || null,
            user_id: cachedPostWithComments.user_id || null,
            is_anonymous: cachedPostWithComments.is_anonymous || false,
            is_flagged: cachedPostWithComments.is_flagged || false,
            is_edited: (cachedPostWithComments as any).is_edited || false,
            users: cachedPostWithComments.users
          };
          
          // Show everything at once since we have complete data
          setPost(mappedPost);
          setPostReady(true);
          setLoading(false);
          
          // Set replies from cache (but still try API for fresh data)
          if (cachedPostWithComments.replies && Array.isArray(cachedPostWithComments.replies)) {
            setRepliesLoading(true);
            setReplies(cachedPostWithComments.replies as Reply[]);
            setRepliesLoading(false);
          }
          
          // Don't return here - try API for fresh data to ensure we have latest replies
          // return; // REMOVED: Prevent API fallback
        }
        
        // Step 2: Check if we have basic post data from forum cache
        const forumPost = getCachedPostFromForum(String(postId));
        
        if (forumPost) {
          // Create full post data from forum cache
          const mappedPost: PostData = {
            id: forumPost.id,
            user: forumPost.user,
            timestamp: forumPost.timestamp || '',
            category: forumPost.category || 'others',
            content: forumPost.content || '',
            comments: forumPost.comments || 0,
            isBookmarked: forumPost.isBookmarked || false,
            body: forumPost.content || '',
            domain: (forumPost.category as any) || 'others',
            created_at: forumPost.created_at || null,
            updated_at: (forumPost as any).updated_at || null,
            user_id: forumPost.user_id || null,
            is_anonymous: forumPost.is_anonymous || false,
            is_flagged: forumPost.is_flagged || false,
            is_edited: (forumPost as any).is_edited || false,
            users: forumPost.users
          };
          
          // Show the post immediately and update UI state
          setPost(mappedPost);
          setPostReady(true);
          setLoading(false);
          
          // If forum_replies exist in the forum cache, use them (but still try API for fresh data)
          if ((forumPost as any).forum_replies && Array.isArray((forumPost as any).forum_replies)) {
            setRepliesLoading(true);
            const mappedReplies = ((forumPost as any).forum_replies as any[]).map((r: any) => {
              const isReplyAnon = !!r.is_anonymous;
              const replyUserData = r?.users || {};
              
              return {
                id: String(r.id),
                body: r.reply_body ?? r.body,
                created_at: r.created_at || null,
                updated_at: r.updated_at || null,
                user_id: r.user_id || null,
                is_anonymous: isReplyAnon,
                is_flagged: !!r.is_flagged,
                is_edited: !!r.is_edited,
                user: isReplyAnon ? undefined : {
                  name: replyUserData?.full_name || replyUserData?.username || 'User',
                  username: replyUserData?.username || 'user',
                  avatar: replyUserData?.photo_url || replyUserData?.profile_photo || undefined,
                  isLawyer: replyUserData?.role === 'verified_lawyer',
                  lawyerBadge: replyUserData?.role === 'verified_lawyer' ? 'Verified' : undefined,
                  account_status: replyUserData?.account_status,
                }
              };
            });
            
            setReplies(mappedReplies);
            setRepliesLoading(false);
          }
          
          // Don't return here - try API for fresh data to ensure we have latest replies
          // return; // REMOVED: Prevent API fallback
        }
        
        // Step 3: No cache available, fetch from API
        await loadFromAPI(String(postId));
        
      } catch (error) {
          console.error('Error loading post from cache:', error);
          setLoading(false);
        }
  };
  
  loadPost();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, getCachedPost, getCachedPostFromForum, prefetchPost, currentUser, session]);

  // Function to add optimistic reply
  const addOptimisticReply = useCallback((replyData: { body: string }) => {
    const animatedOpacity = new Animated.Value(0);
    const optimisticReply: Reply = {
      id: `optimistic-reply-${Date.now()}`,
      body: replyData.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: currentUser?.id || 'current-lawyer',
      is_anonymous: false,
      is_flagged: false,
      user: {
        name: currentUser?.full_name || 'You',
        username: currentUser?.username || 'you',
        avatar: (currentUser as any)?.photo_url || (currentUser as any)?.profile_photo || undefined,
        isLawyer: true,
        lawyerBadge: 'Verified'
      },
      isOptimistic: true,
      animatedOpacity,
    };

    setOptimisticReplies(prev => [optimisticReply, ...prev]);
    
    Animated.timing(animatedOpacity, {
      toValue: 0.8,
      duration: 250,
      useNativeDriver: shouldUseNativeDriver('opacity'),
    }).start();
    
    return optimisticReply.id;
  }, [currentUser]);

  
  // Load post and replies with caching
  const loadFromAPI = useCallback(async (postId: string) => {
    try {
      // Check cache first
      const cachedPost = getCachedPost(postId);
      if (cachedPost && isPostCacheValid(postId) && cachedPost.commentsLoaded) {
        setPost(mapCachedToViewPost(cachedPost));
        setReplies(mapCachedRepliesToViewPost(cachedPost.replies));
        setPostReady(true);
        setLoading(false);
        setRepliesLoading(false);
        if (__DEV__) {
          console.log(`📦 ViewPost: Loaded post ${postId} from cache with ${cachedPost.replies.length} replies`);
        }
        return;
      }

      const headers = await getAuthHeaders();
      const apiUrl = await NetworkConfig.getBestApiUrl();

      const postResponse = await fetch(`${apiUrl}/api/forum/posts/${postId}`, {
        method: 'GET',
        headers,
      });

      if (!postResponse.ok) {
        await postResponse.text().catch(() => 'Unknown error');
        if (postResponse.status === 403) {
          setError('Authentication failed. Please log in again.');
        } else if (postResponse.status === 404) {
          setError('Post not found');
        } else {
          setError(`Failed to load post (${postResponse.status})`);
        }
        setLoading(false);
        return;
      }
      
      const res = await postResponse.json();
      let row = null;
      if (res.success && res.data) {
        row = (res.data as any)?.data || res.data;
      } else if (res.data) {
        row = res.data;
      }
      
      if (row) {
        const isAnon = !!row.is_anonymous;
        const userData = row?.users || {};
        
        const mapped: PostData = {
          id: String(row.id),
          title: undefined,
          body: row.body,
          domain: (row.category as any) || 'others',
          created_at: row.created_at || null,
          updated_at: row.updated_at || null,
          user_id: row.user_id || null,
          is_anonymous: isAnon,
          is_flagged: !!row.is_flagged,
          is_edited: !!row.is_edited,
          user: isAnon ? undefined : {
            name: userData?.full_name || userData?.username || 'User',
            username: userData?.username || 'user',
            avatar: userData?.photo_url || userData?.profile_photo || undefined,
            isLawyer: userData?.role === 'verified_lawyer',
            lawyerBadge: userData?.role === 'verified_lawyer' ? 'Verified' : undefined,
            account_status: userData?.account_status,
          },
          comments: 0,
        };
        
        setPost(mapped);
        setPostReady(true);
        setLoading(false);
        
        // Fetch replies immediately after post
        try {
          setRepliesLoading(true);
          const repliesResponse = await fetch(`${apiUrl}/api/forum/posts/${postId}/replies`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...headers } as HeadersInit,
          });
          
          if (repliesResponse.ok) {
            const repliesData = await repliesResponse.json();
            if (repliesData.success && Array.isArray((repliesData as any)?.data)) {
              const rows = (repliesData as any).data as any[];
              const mappedReplies: Reply[] = rows.map((r: any) => {
                const isReplyAnon = !!r.is_anonymous;
                const replyUserData = r?.users || {};
                
                return {
                  id: String(r.id),
                  body: r.reply_body ?? r.body,
                  created_at: r.created_at || null,
                  updated_at: r.updated_at || null,
                  user_id: r.user_id || null,
                  is_anonymous: isReplyAnon,
                  is_flagged: !!r.is_flagged,
                  is_edited: !!r.is_edited,
                  user: isReplyAnon ? undefined : {
                    name: replyUserData?.full_name || replyUserData?.username || 'User',
                    username: replyUserData?.username || 'user',
                    avatar: replyUserData?.photo_url || replyUserData?.profile_photo || undefined,
                    isLawyer: replyUserData?.role === 'verified_lawyer',
                    lawyerBadge: replyUserData?.role === 'verified_lawyer' ? 'Verified' : undefined,
                    account_status: replyUserData?.account_status,
                  }
                };
              });
              
              const sortedReplies = mappedReplies.sort((a, b) => 
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
              );
              setReplies(sortedReplies);
              setRepliesLoading(false);
              
              // Save to cache
              if (post) {
                const postWithReplies = mapViewPostToCache(post, sortedReplies) as any;
                setCachedPost(postId, postWithReplies);
                if (__DEV__) {
                  console.log(`💾 ViewPost: Cached post ${postId} with ${sortedReplies.length} replies`);
                }
              }
            }
          }
        } catch {
          // Don't set error state here as we already have the post content
        }
      } else {
        setError('Post data not found');
        setPostReady(true);
        setLoading(false);
      }
    } catch (error: any) {
      setError('Failed to load post. Please try again.');
      setPostReady(true);
      setLoading(false);
      console.error('Error loading post:', error);
    }
  }, [getAuthHeaders, mapCachedToViewPost, mapCachedRepliesToViewPost, mapViewPostToCache, getCachedPost, isPostCacheValid, setCachedPost]); // eslint-disable-line react-hooks/exhaustive-deps

  // Function to confirm/promote optimistic reply (no flicker)
  const confirmOptimisticReply = useCallback(
    (
      optimisticId: string,
      opts?: { replyId?: string; created_at?: string; backgroundRefresh?: boolean }
    ) => {
      setOptimisticReplies(prev => {
        const idx = prev.findIndex(r => r.id === optimisticId);
        if (idx === -1) return prev;
        const target = prev[idx];

        // Animate to full opacity
        if (target.animatedOpacity) {
          Animated.timing(target.animatedOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: shouldUseNativeDriver('opacity'),
          }).start();
        }

        // Remove optimistic reply entirely to prevent duplicates
        // The real reply will arrive via normal data flow (cache/API)
        // This prevents React key conflicts and double counting
        if (opts?.replyId && !opts?.backgroundRefresh) {
          const next = prev.filter(r => r.id !== optimisticId);
                    return next;
        }

        // Remove optimistic reply - it will be replaced by server data from background refresh
        // This prevents duplicates when the server reply comes in
        const next = prev.filter(r => r.id !== optimisticId);

        // Optionally refresh in background to sync with server data
        if (opts?.backgroundRefresh && postId) {
          // Fire-and-forget - will fetch the real reply from server
          loadFromAPI(String(postId)).catch(() => {});
        }

        return next;
      });
    },
    [postId, loadFromAPI]
  );

  // Function to remove failed optimistic reply
  const removeOptimisticReply = useCallback((optimisticId: string) => {
    setOptimisticReplies(prev => prev.filter(r => r.id !== optimisticId));
  }, []);

  // Handle reply submission
  const handleSendReply = useCallback(async () => {
    const text = replyText.trim();
    if (!text || !postId) return;
    
    // Validate content for prohibited material (links, promotional content)
    const validation = validatePostContent(text);
    if (!validation.isValid) {
      showContentValidationToast(
        toast,
        'error',
        validation.reason || 'Content Blocked',
        validation.details || 'This reply cannot be published.',
        6000
      );
      return;
    }
    
    const optimisticId = addOptimisticReply({ body: text });
    setReplyText('');
    
    try {
      setIsReplying(true);
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${apiUrl}/api/forum/posts/${postId}/replies`, {
        method: 'POST',
        headers: headers as HeadersInit,
        body: JSON.stringify({ body: text, is_anonymous: false }),
      });
      
      if (response.ok) {
        let replyId: string | undefined;
        try {
          const respJson = await response.json();
          replyId = String(respJson?.reply_id || respJson?.data?.reply_id || '');
        } catch {
          // JSON parsing failed, continue with empty replyId
        }
        // Convert optimistic reply to real reply using server replyId
        // This prevents flicker while keeping the comment visible
        confirmOptimisticReply(optimisticId, { replyId, backgroundRefresh: false });
        
        // Invalidate post cache to ensure fresh load on return
        // This prevents the user's own comment from disappearing
        if (postId) {
          // Clear the cached post so it reloads fresh on next visit
          setCachedPost(postId, null as any);
          if (__DEV__) {
            console.log(`🗑️ ViewPost: Cleared cache for post ${postId} to ensure fresh load`);
          }
        }
      } else {
        const errorText = await response.text();
        removeOptimisticReply(optimisticId);
        setReplyText(text);
        
        // Handle 403 Forbidden (suspended/banned)
        if (response.status === 403) {
          await refreshStatus();
          try {
            const parsed = JSON.parse(errorText);
            const message = parsed.detail || 'Your account is suspended or banned.';
            showAccessDeniedToast(toast, message);
          } catch {
            showAccessDeniedToast(toast, 'Your account is suspended or banned.');
          }
          return;
        }
        
        // Handle moderation errors (400 Bad Request)
        if (response.status === 400) {
          const moderationError = parseModerationError(errorText);
          if (moderationError) {
            // Check if this is a promotional/link validation error (no moderation status update needed)
            if (moderationError.action_taken === 'content_blocked') {
              showContentValidationToast(
                toast, 
                'error', 
                moderationError.reason || 'Content Blocked', 
                moderationError.detail, 
                7000
              );
              return;
            }

            // For actual moderation violations, update status
            await refreshStatus();
            
            if (moderationError.action_taken === 'strike_added') {
              showStrikeAddedToast(
                toast,
                moderationError.detail,
                moderationError.strike_count,
                moderationError.suspension_count
              );
            } else if (moderationError.action_taken === 'suspended') {
              showSuspendedToast(
                toast,
                moderationError.detail,
                moderationError.suspension_count,
                moderationError.suspension_end
              );
            } else if (moderationError.action_taken === 'banned') {
              showBannedToast(toast, moderationError.detail);
            }
            return;
          }
        }
      }
    } catch {
      removeOptimisticReply(optimisticId);
      setReplyText(text);
    } finally {
      setIsReplying(false);
    }
  }, [replyText, postId, addOptimisticReply, confirmOptimisticReply, removeOptimisticReply, getAuthHeaders, refreshStatus, toast, setCachedPost]);

  // Replies are now loaded with the post in loadPost and loadFromAPI
  // No separate loadReplies function needed

  const isAnonymous = post?.is_anonymous || false;
  const isDeactivated = post?.user?.account_status === 'deactivated';
  const displayUser = isAnonymous 
    ? { name: 'Anonymous User', avatar: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png', isLawyer: false } // Detective icon for anonymous users
    : (post?.user || { name: 'User', avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png', isLawyer: false }); // Gray default for regular users
  const displayTimestamp = formatTimestamp(post?.created_at || null);
  const editedTimeDisplay = post?.is_edited && post?.updated_at ? `Edited ${formatTimestamp(post.updated_at)}` : null;
  const displayContent = post?.body || '';
  
  // Handle edit success - update local state
  const handleEditSuccess = useCallback((newContent: string) => {
    if (post) {
      setPost({
        ...post,
        body: newContent,
        is_edited: true,
        updated_at: new Date().toISOString()
      });
    }
  }, [post]);
  
  // Handle edit press
  const handleEditPress = useCallback(() => {
    setMenuOpen(false);
    setEditModalVisible(true);
  }, []);
  
  // Handle reply edit press
  const handleEditReplyPress = useCallback((reply: Reply) => {
    setReplyMenuOpen(null);
    setEditingReply({ id: reply.id, body: reply.body });
    setEditReplyModalVisible(true);
  }, []);
  
  // Handle reply edit success - update local state
  const handleEditReplySuccess = useCallback((newContent: string) => {
    if (editingReply) {
      const now = new Date().toISOString();
      setReplies(prev => prev.map(reply => 
        reply.id === editingReply.id 
          ? { ...reply, body: newContent, is_edited: true, updated_at: now }
          : reply
      ));
    }
  }, [editingReply]);
  
  // Handle delete reply press - open confirmation modal
  const handleDeleteReplyPress = useCallback((replyId: string) => {
    setReplyMenuOpen(null);
    setDeletingReplyId(replyId);
    setDeleteReplyModalVisible(true);
  }, []);
  
  // Handle delete reply confirm
  const handleDeleteReplyConfirm = useCallback(async () => {
    if (!deletingReplyId) return;
    
    setIsDeleting(true);
    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/forum/replies/${deletingReplyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.detail || 'Failed to delete reply');
      }
      
      // Remove the reply from local state
      setReplies(prev => prev.filter(reply => reply.id !== deletingReplyId));
      
      // Close modal
      setDeleteReplyModalVisible(false);
      setDeletingReplyId(null);
    } catch (error: any) {
      console.error('Error deleting reply:', error);
      // Show error alert
      const { Alert } = require('react-native');
      Alert.alert('Error', error.message || 'Failed to delete reply. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingReplyId, session?.access_token]);
  
  // Wait for post to be ready before showing content
  React.useEffect(() => {
    if (postReady) {
      setLoading(false);
    }
  }, [postReady]);
  
  // Auto-prefetch when component mounts (for future visits)
  React.useEffect(() => {
    if (postId && !loading) {
      // Prefetch this post for future visits
      prefetchPost(String(postId));
    }
  }, [postId, loading, prefetchPost]);

  // Use shared category utilities for consistent colors and display text
  const categoryColors = getCategoryColors(post?.domain || 'others');

  const contentPreview = displayContent.length > 280 ? displayContent.substring(0, 280) + '...' : displayContent;
  const shouldShowReadMore = displayContent.length > 280;

  return (
    <SafeAreaView style={[tw`flex-1`, { position: 'relative', zIndex: 1, backgroundColor: Colors.background.primary }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      {/* Loading Overlay - Covers any parent loading indicators */}
      {(loading || !postReady) && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
          zIndex: 9999,
        }}>
          {/* Header Space */}
          <View style={{ height: 60 }} />
          
          {/* Skeleton Content */}
          <View style={{ paddingHorizontal: responsive.horizontalPadding, paddingVertical: LAYOUT.SPACING.lg, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
            <View style={tw`flex-row items-center py-4`}>
              <SkeletonLoader width={responsive.avatarSize} height={responsive.avatarSize} borderRadius={responsive.avatarSize/2} style={tw`mr-4`} />
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center justify-between mb-1`}>
                  <SkeletonLoader width={120} height={16} borderRadius={4} style={tw`mb-2`} />
                </View>
                <SkeletonLoader width={80} height={12} borderRadius={4} style={tw`mb-3`} />
                <View style={tw`flex-row items-center justify-between`}>
                  <SkeletonLoader width={60} height={20} borderRadius={10} />
                  <SkeletonLoader width={80} height={12} borderRadius={4} />
                </View>
              </View>
            </View>

            {/* Content Skeleton */}
            <View style={tw`mb-6`}>
              <SkeletonLoader width="100%" height={16} borderRadius={4} style={tw`mb-2`} />
              <SkeletonLoader width="90%" height={16} borderRadius={4} style={tw`mb-2`} />
              <SkeletonLoader width="75%" height={16} borderRadius={4} style={tw`mb-2`} />
            </View>

            {/* Actions Skeleton */}
            <View style={tw`flex-row items-center justify-between pt-4 border-t border-gray-100`}>
              <SkeletonLoader width={80} height={16} borderRadius={4} />
            </View>

            {/* Replies Section Skeleton */}
            <View style={tw`pt-6 mt-6 border-t border-gray-100`}>
              <SkeletonLoader width={100} height={18} borderRadius={4} style={tw`mb-4`} />
              {[1, 2].map((index) => (
                <View key={index} style={tw`flex-row items-start pl-4 mb-4 border-l-2 border-gray-100`}>
                  <SkeletonLoader width={40} height={40} borderRadius={20} style={tw`mr-3`} />
                  <View style={tw`flex-1`}>
                    <SkeletonLoader width={100} height={14} borderRadius={4} style={tw`mb-2`} />
                    <SkeletonLoader width="100%" height={14} borderRadius={4} style={tw`mb-1`} />
                    <SkeletonLoader width="80%" height={14} borderRadius={4} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
      
      <Header 
        title="Post"
        showBackButton={true}
        onBackPress={() => {
          // Update cache with current reply count to ensure timeline shows correct count
          // Real-time subscription is filtered for user's own comments, so we need explicit cache update
          if (postId) {
            try {
              // Calculate total replies including optimistic ones
              const totalReplies = replies.length + optimisticReplies.length;
              // Get the cached post to compare counts
              const cachedPost = getCachedPost(postId);
              const cachedCount = cachedPost?.replies?.length || 0;
              
              // Only update cache if count actually changed to prevent unnecessary updates
              if (totalReplies !== cachedCount) {
                updatePostCommentCount(postId, totalReplies);
              }
            } catch {
              // Silently fail - cache update is not critical for navigation
            }
          }
          
          try {
            router.back();
          } catch {
            router.replace('/lawyer/forum' as any);
          }
        }}
        rightComponent={
          !loading ? (
            <TouchableOpacity
              onPress={() => setMenuOpen(!menuOpen)}
              style={tw`p-2`}
            >
              <MoreHorizontal size={24} color="#6B7280" />
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Dropdown Menu Overlay */}
      {menuOpen && (
        <>
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }} 
            activeOpacity={1} 
            onPress={() => setMenuOpen(false)} 
          />
          <View style={{
            position: 'absolute',
            top: 60,
            right: 16,
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            ...createShadowStyle({
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3,
            }),
            zIndex: 1000,
            width: responsive.dropdownWidth
          }}>
            <TouchableOpacity
              style={tw`flex-row items-center px-4 py-3`}
              onPress={handleBookmarkPress}
              disabled={isBookmarkLoading}
            >
              <Bookmark 
                size={16} 
                color={bookmarked ? '#F59E0B' : '#374151'} 
                fill={bookmarked ? '#F59E0B' : 'none'} 
              />
              <Text style={[tw`ml-3 text-gray-700`, isBookmarkLoading && tw`opacity-50`]}>
                {isBookmarkLoading 
                  ? (bookmarked ? 'Unbookmarking...' : 'Bookmarking...') 
                  : (bookmarked ? 'Unbookmark post' : 'Bookmark post')
                }
              </Text>
            </TouchableOpacity>
            {isOwnPost && (
              <>
                <View style={tw`h-px mx-2 bg-gray-200`} />
                <TouchableOpacity
                  style={tw`flex-row items-center px-4 py-3`}
                  onPress={handleEditPress}
                >
                  <Pencil size={16} color="#3B82F6" />
                  <Text style={[tw`ml-3`, { color: '#3B82F6' }]}>Edit post</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={tw`h-px mx-2 bg-gray-200`} />
            <TouchableOpacity
              style={tw`flex-row items-center px-4 py-3`}
              onPress={handleReportPress}
            >
              <Flag size={16} color="#B91C1C" />
              <Text style={tw`ml-3 text-red-700`}>Report post</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* KeyboardAvoidingView for proper keyboard handling */}
      <KeyboardAvoidingView 
        style={tw`flex-1 bg-white`}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={Platform.OS !== 'web'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView 
          style={tw`flex-1`}
          contentContainerStyle={{ 
            flexGrow: 1, 
            paddingBottom: 20 
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
        
        {!post && !loading && !postReady && error && (
          <View style={tw`items-center px-5 py-6`}>
            <Text style={tw`mb-4 text-center text-gray-500`}>{error}</Text>
            <TouchableOpacity
              onPress={() => {
                setError(null);
                setLoading(true);
                // Trigger reload by updating a dependency
                setPost(null);
              }}
              style={tw`px-4 py-2 bg-blue-500 rounded-lg`}
              accessibilityLabel="Try loading the post again"
            >
              <Text style={tw`font-medium text-white`}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
        {post && (
          <View style={{ paddingHorizontal: responsive.horizontalPadding, paddingVertical: LAYOUT.SPACING.lg }}>
            <View style={tw`flex-row items-start mb-4`}>
                {isAnonymous || isDeactivated ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center', width: responsive.avatarSize, height: responsive.avatarSize, marginRight: LAYOUT.SPACING.sm, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: responsive.avatarSize/2 }}>
                    <User size={responsive.avatarSize * 0.5} color="#6B7280" />
                  </View>
                ) : displayUser.avatar && !displayUser.avatar.includes('flaticon') && !imageLoadError ? (
                  <Image 
                    source={{ uri: displayUser.avatar }} 
                    style={{ width: responsive.avatarSize, height: responsive.avatarSize, marginRight: LAYOUT.SPACING.sm, borderRadius: responsive.avatarSize/2 }}
                    onError={() => setImageLoadError(true)}
                  />
                ) : (
                  <View style={{ alignItems: 'center', justifyContent: 'center', width: responsive.avatarSize, height: responsive.avatarSize, marginRight: LAYOUT.SPACING.sm, borderRadius: responsive.avatarSize/2, backgroundColor: Colors.primary.blue }}>
                    <Text style={tw`text-base font-semibold text-white`}>
                      {getInitials(displayUser.name)}
                    </Text>
                  </View>
                )}
              <View style={tw`flex-1`}>
                {/* User Name and Badge Row */}
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: responsive.verticalSpacing}}>
                  <Text style={{fontSize: responsive.nameFontSize, fontWeight: '600', color: '#0F1419', marginRight: 8}} numberOfLines={1}>
                    {isDeactivated ? 'Deactivated Account' : displayUser.name}
                  </Text>
                  {!isAnonymous && !isDeactivated && displayUser.isLawyer && (
                    <View style={{ marginLeft: 8 }}>
                      <VerifiedLawyerBadge size="sm" />
                    </View>
                  )}
                </View>
                
                {/* Username Row */}
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: responsive.verticalSpacing}}>
                  {!isAnonymous && !isDeactivated && (
                    <Text style={{fontSize: responsive.usernameFontSize, color: '#536471'}} numberOfLines={1}>
                      @{post.user?.username || 'user'}
                    </Text>
                  )}
                </View>
                
                {/* Category Badge Row */}
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: responsive.verticalSpacing}}>
                  {post.domain && (
                    <View style={[
                      {
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                        borderWidth: 1,
                        backgroundColor: categoryColors.bg,
                        borderColor: categoryColors.border
                      }
                    ]}>
                      <Text style={[
                        {
                          fontSize: 10,
                          fontWeight: '600',
                          color: categoryColors.text,
                          textTransform: 'uppercase'
                        }
                      ]}>
                        {getCategoryDisplayText(post?.domain)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <Text style={tw`mb-4 text-base leading-6 text-gray-800`}>
              {showFullContent ? displayContent : contentPreview}
            </Text>
            {shouldShowReadMore && (
              <TouchableOpacity onPress={() => setShowFullContent(!showFullContent)}>
                <Text style={[tw`mb-2 font-medium`, { color: Colors.primary.blue }]}>
                  {showFullContent ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
            
            {/* [timestamp] - at the bottom of post content */}
            <View style={tw`flex-row items-center mb-2`}>
              <Text style={tw`text-xs text-gray-500`}>
                {displayTimestamp}
              </Text>
              {editedTimeDisplay && (
                <>
                  <Text style={tw`mx-1 text-xs text-gray-500`}>•</Text>
                  <Text style={[tw`text-xs text-gray-400`, { fontStyle: 'italic' }]}>
                    {editedTimeDisplay}
                  </Text>
                </>
              )}
            </View>

            {/* Replies Section */}
            <View style={tw`pt-6 mt-6 bg-white border-t border-gray-100`}>
              <Text style={tw`mb-4 text-lg font-bold text-gray-900`}>
                {(() => {
                  // Apply the same filtering logic as the render to ensure accurate count
                  const filteredReplies = replies.filter(realReply => {
                    const hasOptimisticMatch = optimisticReplies.some(optReply => {
                      // Match by body and approximate timestamp (within 30 seconds)
                      const contentMatch = (optReply as any).body?.trim() === (realReply as any).body?.trim();
                      const timeMatch = optReply.created_at && realReply.created_at ? Math.abs(
                        new Date(optReply.created_at).getTime() - new Date(realReply.created_at).getTime()
                      ) < 30000 : false; // 30 seconds tolerance
                      return contentMatch && timeMatch;
                    });
                    return !hasOptimisticMatch;
                  });
                  
                  const allReplies = [...filteredReplies, ...optimisticReplies];
                  const replyCount = allReplies.length;
                  return `Replies (${replyCount})`;
                })()}
              </Text>
              
              {repliesLoading ? (
                // Skeleton loaders for replies
                [1, 2, 3].map((index) => (
                  <View key={index} style={tw`flex-row items-start pl-4 mb-4`}>
                    <View style={{ width: responsive.avatarSize * 0.8, height: responsive.avatarSize * 0.8, marginRight: LAYOUT.SPACING.sm, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: (responsive.avatarSize * 0.8) / 2 }} />
                    <View style={tw`flex-1`}>
                        <View style={tw`w-3/4 h-4 mb-2 border border-gray-200 rounded`} />
                        <View style={tw`w-1/2 h-4 border border-gray-200 rounded`} />
                      </View>
                  </View>
                ))
              ) : (
                // Filter out real replies that match optimistic replies to prevent duplicates
                (() => {
                                    
                  const filteredReplies = replies.filter(realReply => {
                    const hasOptimisticMatch = optimisticReplies.some(optReply => {
                      // Match by body and approximate timestamp (within 30 seconds)
                      const contentMatch = (optReply as any).body?.trim() === (realReply as any).body?.trim();
                      const timeMatch = optReply.created_at && realReply.created_at ? Math.abs(
                        new Date(optReply.created_at).getTime() - new Date(realReply.created_at).getTime()
                      ) < 30000 : false; // 30 seconds tolerance
                      
                      return contentMatch && timeMatch;
                    });
                    
                    return !hasOptimisticMatch;
                  });
                  
                  // Put optimistic replies first during loading for smoother UX
                  // New comments appear at top where user expects them
                  const allReplies = isReplying ? [...optimisticReplies, ...filteredReplies] : [...filteredReplies, ...optimisticReplies];
                  return allReplies.length > 0 ? allReplies.map((reply) => {
                  const isReplyAnonymous = reply.is_anonymous || false;
                  const isReplyDeactivated = reply.user?.account_status === 'deactivated';
                  const replyUser = isReplyAnonymous 
                    ? { name: 'Anonymous User', avatar: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png', isLawyer: false }
                    : (reply.user || { name: 'User', avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png', isLawyer: false });
                  const replyTimestamp = formatTimestamp(reply.created_at);
                  
                  const replyComponent = (
                    <View key={`${reply.isOptimistic ? 'opt-' : ''}${reply.id}`} style={tw`pl-4 mb-6 bg-white`}>
                      <View style={tw`flex-row items-start mb-2`}>
                        {isReplyAnonymous || isReplyDeactivated ? (
                          <View style={tw`items-center justify-center w-10 h-10 mr-3 bg-gray-100 border border-gray-200 rounded-full`}>
                            <User size={16} color="#6B7280" />
                          </View>
                        ) : replyUser.avatar && !replyUser.avatar.includes('flaticon') ? (
                          <Image 
                            source={{ uri: replyUser.avatar }} 
                            style={{ width: responsive.avatarSize * 0.8, height: responsive.avatarSize * 0.8, marginRight: LAYOUT.SPACING.sm, borderRadius: (responsive.avatarSize * 0.8) / 2 }}
                            onError={() => console.log('Failed to load reply avatar')}
                          />
                        ) : (
                          <View style={{ alignItems: 'center', justifyContent: 'center', width: responsive.avatarSize * 0.8, height: responsive.avatarSize * 0.8, marginRight: LAYOUT.SPACING.sm, borderRadius: (responsive.avatarSize * 0.8) / 2, backgroundColor: Colors.primary.blue }}>
                            <Text style={tw`text-sm font-semibold text-white`}>
                              {getInitials(replyUser.name)}
                            </Text>
                          </View>
                        )}
                        <View style={tw`flex-1`}>
                          {/* [Full Name] [lawyer badge] */}
                          <View style={tw`mb-2`}>
                            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                              <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                                <Text style={tw`mr-2 text-base font-semibold text-gray-900`} numberOfLines={1}>
                                  {isReplyDeactivated ? 'Deactivated Account' : replyUser.name}
                                </Text>
                                {!isReplyAnonymous && !isReplyDeactivated && replyUser.isLawyer && (
                                  <VerifiedLawyerBadge size="sm" />
                                )}
                              </View>
                              {!reply.isOptimistic && (
                                <TouchableOpacity
                                  onPress={() => setReplyMenuOpen(replyMenuOpen === reply.id ? null : reply.id)}
                                  style={tw`p-1`}
                                >
                                  <MoreHorizontal size={16} color="#6B7280" />
                                </TouchableOpacity>
                              )}
                            </View>
                            
                            {/* [username] - law category not available in comments */}
                            {!isReplyAnonymous && !isReplyDeactivated && (
                              <Text style={tw`mt-1 text-sm text-gray-500`} numberOfLines={1}>
                                @{replyUser.name?.toLowerCase().replace(/\s+/g, '') || 'user'}
                              </Text>
                            )}
                          </View>
                          
                          {/* [post content] */}
                          <Text style={tw`mb-2 text-gray-900`}>{reply.body}</Text>
                          
                          {/* [timestamp] */}
                          <View style={tw`flex-row items-center mb-1`}>
                            <Text style={tw`text-xs text-gray-500`}>
                              {replyTimestamp}
                            </Text>
                            {reply.is_edited && reply.updated_at && (
                              <>
                                <Text style={tw`mx-1 text-xs text-gray-500`}>•</Text>
                                <Text style={[tw`text-xs text-gray-400`, { fontStyle: 'italic' }]}>
                                  Edited {formatTimestamp(reply.updated_at)}
                                </Text>
                              </>
                            )}
                          </View>
                        </View>
                      </View>
                      
                      {/* Reply Menu Dropdown */}
                      {replyMenuOpen === reply.id && !reply.isOptimistic && (
                        <View style={tw`absolute right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg top-8`} >
                          {/* Edit option - only for own replies */}
                          {currentUser?.id === reply.user_id && (
                            <>
                              <TouchableOpacity
                                onPress={() => handleEditReplyPress(reply)}
                                style={tw`flex-row items-center px-3 py-2`}
                              >
                                <Pencil size={14} color="#3B82F6" style={tw`mr-2`} />
                                <Text style={{ color: '#3B82F6' }}>Edit</Text>
                              </TouchableOpacity>
                              <View style={tw`h-px mx-2 bg-gray-200`} />
                              <TouchableOpacity
                                onPress={() => handleDeleteReplyPress(reply.id)}
                                style={tw`flex-row items-center px-3 py-2`}
                              >
                                <Trash2 size={14} color="#EF4444" style={tw`mr-2`} />
                                <Text style={tw`text-sm text-red-600`}>Delete</Text>
                              </TouchableOpacity>
                              <View style={tw`h-px mx-2 bg-gray-200`} />
                            </>
                          )}
                          <TouchableOpacity
                            onPress={() => handleReportReplyPress(reply.id)}
                            style={tw`flex-row items-center px-3 py-2`}
                          >
                            <Flag size={14} color="#EF4444" style={tw`mr-2`} />
                            <Text style={tw`text-sm text-red-600`}>Report</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                  
                  // Wrap optimistic replies with animated opacity
                  if (reply.isOptimistic && reply.animatedOpacity) {
                    return (
                      <Animated.View
                        key={`${reply.id}-optimistic`}
                        style={{ opacity: reply.animatedOpacity }}
                      >
                        {replyComponent}
                      </Animated.View>
                    );
                  }
                  
                  return replyComponent;
                }) : (
                  // No replies message
                  <View style={tw`items-center py-4 bg-white`}>
                    <Text style={tw`italic text-center text-gray-500`}>No replies yet</Text>
                  </View>
                );
                })()
              )}
            </View>
          </View>
        )}
        </ScrollView>
        </TouchableWithoutFeedback>

        {/* Reply Input - Only visible for lawyers */}
        {isLawyer && post && (
          <View 
            style={[
              tw`bg-white border-t border-gray-200`, 
              { 
                paddingHorizontal: responsive.horizontalPadding, 
                paddingVertical: LAYOUT.SPACING.sm, 
                paddingBottom: isKeyboardVisible ? 8 : getSafeBottomPosition(insets.bottom, 16),
              }
            ]}
          >
          <View style={tw`flex-row items-center`}>
            <TextInput
              style={[
                tw`flex-1 mr-3 text-base border border-gray-300 rounded-full`, 
                { 
                  paddingHorizontal: LAYOUT.SPACING.md, 
                  height: responsive.replyInputHeight + 4, // Slightly taller input field
                  paddingVertical: 8, // Add vertical padding inside input
                }
              ]}
              placeholder="Write a reply..."
              value={replyText}
              onChangeText={setReplyText}
              multiline={false}
              // Enhanced keyboard handling props
              blurOnSubmit={false}
              keyboardType="default"
              autoCapitalize="none"
              spellCheck={false}
              autoCorrect={false}
              onFocus={() => {
                // INSTANT RESPONSE - Force keyboard visibility and animation
                setIsKeyboardVisible(true);
                keyboardAnimatedValue.setValue(1);
                
                // Force immediate layout update
                requestAnimationFrame(() => {
                  keyboardAnimatedValue.setValue(1);
                });
              }}
              onBlur={() => {
                // Ensure input resets when focus is lost
                resetInputPosition();
              }}
            />
            <TouchableOpacity
              onPress={handleSendReply}
              disabled={!replyText.trim() || isReplying}
              style={[
                tw`items-center justify-center rounded-full`,
                { 
                  width: responsive.replyInputHeight + 4, // Match input height
                  height: responsive.replyInputHeight + 4, // Match input height
                  backgroundColor: replyText.trim() && !isReplying ? Colors.primary.blue : '#D1D5DB'
                }
              ]}
            >
              <Send size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}
      </KeyboardAvoidingView>

      {/* Report Post Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => {
          setReportModalVisible(false);
          setShowAlreadyReportedPost(false);
        }}
        onSubmit={handleSubmitReport}
        targetType="post"
        isLoading={isReportLoading}
        showAlreadyReported={showAlreadyReportedPost}
      />

      {/* Report Reply Modal */}
      <ReportModal
        visible={reportReplyModalVisible}
        onClose={() => {
          setReportReplyModalVisible(false);
          setSelectedReplyId(null);
          setShowAlreadyReportedReply(false);
        }}
        onSubmit={handleSubmitReplyReport}
        targetType="reply"
        isLoading={isReportLoading}
        showAlreadyReported={showAlreadyReportedReply}
      />

      {/* Edit Post Modal */}
      {post && (
        <EditPostModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSuccess={handleEditSuccess}
          postId={post.id}
          initialContent={post.body}
        />
      )}

      {/* Edit Reply Modal */}
      {editingReply && (
        <EditReplyModal
          visible={editReplyModalVisible}
          onClose={() => {
            setEditReplyModalVisible(false);
            setEditingReply(null);
          }}
          onSuccess={handleEditReplySuccess}
          replyId={editingReply.id}
          initialContent={editingReply.body}
        />
      )}

      {/* Delete Reply Confirmation Modal */}
      <Modal
        visible={deleteReplyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setDeleteReplyModalVisible(false);
          setDeletingReplyId(null);
        }}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center px-4`}>
          <View style={tw`bg-white rounded-lg w-full max-w-md`}>
            {/* Header */}
            <View style={tw`p-6 pb-4`}>
              <View style={tw`flex-row items-center justify-between mb-4`}>
                <Text style={tw`text-xl font-semibold text-gray-900`}>
                  Delete Reply
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setDeleteReplyModalVisible(false);
                    setDeletingReplyId(null);
                  }} 
                  style={tw`p-1`}
                >
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <Text style={tw`text-sm text-gray-600 leading-5`}>
                Are you sure you want to delete this reply? This action cannot be undone.
              </Text>
            </View>

            {/* Buttons */}
            <View style={tw`px-6 pb-6`}>
              <TouchableOpacity
                onPress={handleDeleteReplyConfirm}
                disabled={isDeleting}
                style={[
                  tw`w-full py-3 rounded-lg flex-row justify-center items-center mb-3`,
                  { backgroundColor: isDeleting ? '#FCA5A5' : '#EF4444' }
                ]}
              >
                {isDeleting ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" style={tw`mr-2`} />
                    <Text style={tw`text-center font-medium text-white`}>
                      Deleting...
                    </Text>
                  </>
                ) : (
                  <Text style={tw`text-center font-medium text-white`}>
                    Delete Reply
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  setDeleteReplyModalVisible(false);
                  setDeletingReplyId(null);
                }}
                disabled={isDeleting}
                style={tw`w-full py-3 rounded-lg bg-gray-100`}
              >
                <Text style={tw`text-center font-medium text-gray-700`}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default ViewPost;


