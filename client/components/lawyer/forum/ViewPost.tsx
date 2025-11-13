import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, TextInput, Animated, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { User, Bookmark, MoreHorizontal, Flag, Send, Shield } from 'lucide-react-native';
import ReportModal from '../../common/ReportModal';
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
  user?: {
    name: string;
    username: string;
    avatar: string;
    isLawyer?: boolean;
    lawyerBadge?: string;
  };
  // Optimistic UI props
  isOptimistic?: boolean;
  animatedOpacity?: Animated.Value;
}



const ViewPost: React.FC = () => {
  const router = useRouter();
  const { postId, from, query } = useLocalSearchParams<{ postId?: string; from?: string; query?: string }>();
  const { user: currentUser, session } = useAuth();
  const { getCachedPost, getCachedPostFromForum, prefetchPost } = useForumCache();
  const { refreshStatus } = useModerationStatus();
  const toast = useToast();
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
  
  // Check if current user is a lawyer
  const isLawyer = currentUser?.role === 'verified_lawyer';

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
            user_id: cachedPostWithComments.user_id || null,
            is_anonymous: cachedPostWithComments.is_anonymous || false,
            is_flagged: cachedPostWithComments.is_flagged || false,
            users: cachedPostWithComments.users
          };
          
          // Show everything at once since we have complete data
          setPost(mappedPost);
          setPostReady(true);
          setLoading(false);
          
          // Set replies from cache
          if (cachedPostWithComments.replies && Array.isArray(cachedPostWithComments.replies)) {
            setReplies(cachedPostWithComments.replies as Reply[]);
            setRepliesLoading(false);
          }
          return;
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
            user_id: forumPost.user_id || null,
            is_anonymous: forumPost.is_anonymous || false,
            is_flagged: forumPost.is_flagged || false,
            users: forumPost.users
          };
          
          // Show the post immediately and update UI state
          setPost(mappedPost);
          setPostReady(true);
          setLoading(false);
          
          // If forum_replies exist in the forum cache, use them
          if ((forumPost as any).forum_replies && Array.isArray((forumPost as any).forum_replies)) {
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
                user: isReplyAnon ? undefined : {
                  name: replyUserData?.full_name || replyUserData?.username || 'User',
                  username: replyUserData?.username || 'user',
                  avatar: replyUserData?.photo_url || replyUserData?.profile_photo || undefined,
                  isLawyer: replyUserData?.role === 'verified_lawyer',
                  lawyerBadge: replyUserData?.role === 'verified_lawyer' ? 'Verified' : undefined,
                }
              };
            });
            
            setReplies(mappedReplies);
            setRepliesLoading(false);
            
            // Post with replies already set in state
            // No need to cache again here
          }
          return;
        }
        
        // Step 3: No cache available, fetch from API
        await loadFromAPI(String(postId));
        
      } catch {
      console.error('Error loading post from cache:');
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

    setOptimisticReplies(prev => [...prev, optimisticReply]);
    
    Animated.timing(animatedOpacity, {
      toValue: 0.8,
      duration: 250,
      useNativeDriver: shouldUseNativeDriver('opacity'),
    }).start();
    
    return optimisticReply.id;
  }, [currentUser]);

  // Fallback to API when no cache available
  const loadFromAPI = useCallback(async (postId: string) => {
    const fallbackTimer = setTimeout(() => {
      setError('Request timed out. Please try again.');
      setLoading(false);
    }, 30000);
    
    try {
      const headers = await getAuthHeaders();
      const apiUrl = await NetworkConfig.getBestApiUrl();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      
      const postResponse = await fetch(`${apiUrl}/api/forum/posts/${postId}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      clearTimeout(fallbackTimer);
      
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
          user: isAnon ? undefined : {
            name: userData?.full_name || userData?.username || 'User',
            username: userData?.username || 'user',
            avatar: userData?.photo_url || userData?.profile_photo || undefined,
            isLawyer: userData?.role === 'verified_lawyer',
            lawyerBadge: userData?.role === 'verified_lawyer' ? 'Verified' : undefined,
          },
          comments: 0,
        };
        
        setPost(mapped);
        setPostReady(true);
        setLoading(false);
        
        // Fetch replies immediately after post
        try {
          const repliesResponse = await fetch(`${apiUrl}/api/forum/posts/${postId}/replies`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...headers } as HeadersInit,
            signal: controller.signal,
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
                  user: isReplyAnon ? undefined : {
                    name: replyUserData?.full_name || replyUserData?.username || 'User',
                    username: replyUserData?.username || 'user',
                    avatar: replyUserData?.photo_url || replyUserData?.profile_photo || undefined,
                    isLawyer: replyUserData?.role === 'verified_lawyer',
                    lawyerBadge: replyUserData?.role === 'verified_lawyer' ? 'Verified' : undefined,
                  }
                };
              });
              
              setReplies(mappedReplies.sort((a, b) => 
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
              ));
              setRepliesLoading(false);
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
      clearTimeout(fallbackTimer);
      if (error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError('Failed to load post. Please try again.');
      }
      setPostReady(true);
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Function to confirm optimistic reply
  const confirmOptimisticReply = useCallback((optimisticId: string, reloadPost: (id: string) => Promise<void>) => {
    setOptimisticReplies(prev => {
      const reply = prev.find(r => r.id === optimisticId);
      if (reply?.animatedOpacity) {
        Animated.timing(reply.animatedOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: shouldUseNativeDriver('opacity'),
        }).start();
        
        setTimeout(() => {
          if (postId) {
            reloadPost(String(postId));
          }
          setTimeout(() => {
            setOptimisticReplies(current => current.filter(r => r.id !== optimisticId));
          }, 200);
        }, 300);
      }
      return prev;
    });
  }, [postId]);

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
        confirmOptimisticReply(optimisticId, loadFromAPI);
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
  }, [replyText, postId, addOptimisticReply, confirmOptimisticReply, removeOptimisticReply, getAuthHeaders, loadFromAPI, refreshStatus, toast]);

  // Replies are now loaded with the post in loadPost and loadFromAPI
  // No separate loadReplies function needed

  const isAnonymous = post?.is_anonymous || false;
  const displayUser = isAnonymous 
    ? { name: 'Anonymous User', avatar: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png', isLawyer: false } // Detective icon for anonymous users
    : (post?.user || { name: 'User', avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png', isLawyer: false }); // Gray default for regular users
  const displayTimestamp = formatTimestamp(post?.created_at || null);
  const displayContent = post?.body || '';
  
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

  const categoryColors = {
    family: { bg: '#FEF2F2', text: '#BE123C', border: '#FECACA' },
    criminal: { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
    civil: { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
    labor: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    consumer: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
    others: { bg: '#F9FAFB', text: '#374151', border: '#E5E7EB' }
  } as const;

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
          <View style={tw`px-5 py-6 border-b border-gray-100`}>
            {/* User Info Skeleton */}
            <View style={tw`flex-row items-start mb-4`}>
              <SkeletonLoader width={56} height={56} borderRadius={28} style={tw`mr-4`} />
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
            <View style={tw`mt-6 pt-6 border-t border-gray-100`}>
              <SkeletonLoader width={100} height={18} borderRadius={4} style={tw`mb-4`} />
              {[1, 2].map((index) => (
                <View key={index} style={tw`flex-row items-start mb-4 pl-4 border-l-2 border-gray-100`}>
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
          if (from === 'search' && query) {
            router.push(`/search?query=${encodeURIComponent(query)}` as any);
          } else {
            router.push('/home' as any);
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
            width: 192
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
            <View style={tw`h-px bg-gray-200 mx-2`} />
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

      <ScrollView 
        style={tw`flex-1 bg-white`}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: isLawyer ? 80 : 20 }}
        showsVerticalScrollIndicator={false}
      >
        
        {!post && !loading && !postReady && error && (
          <View style={tw`px-5 py-6 items-center`}>
            <Text style={tw`text-gray-500 text-center mb-4`}>{error}</Text>
            <TouchableOpacity
              onPress={() => {
                setError(null);
                setLoading(true);
                // Trigger reload by updating a dependency
                setPost(null);
              }}
              style={tw`bg-blue-500 px-4 py-2 rounded-lg`}
              accessibilityLabel="Try loading the post again"
            >
              <Text style={tw`text-white font-medium`}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
        {post && (
          <View style={tw`px-5 py-6`}>
            <View style={tw`flex-row items-start mb-4`}>
                {isAnonymous ? (
                  <View style={tw`w-12 h-12 rounded-full border border-gray-200 items-center justify-center mr-3`}>
                    <User size={20} color="#6B7280" />
                  </View>
                ) : displayUser.avatar && !displayUser.avatar.includes('flaticon') ? (
                  <Image 
                    source={{ uri: displayUser.avatar }} 
                    style={tw`w-12 h-12 rounded-full mr-3`}
                  />
                ) : (
                  <View style={[tw`w-12 h-12 rounded-full items-center justify-center mr-3`, { backgroundColor: Colors.primary.blue }]}>
                    <Text style={tw`text-white font-semibold text-base`}>
                      {getInitials(displayUser.name)}
                    </Text>
                  </View>
                )}
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-start justify-between mb-1`}>
                  <View style={tw`flex-1 mr-3`}>
                    {/* [Full Name] [lawyer badge] */}
                    <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap'}}>
                      <Text style={tw`text-base font-semibold text-gray-900 mr-2`}>
                        {displayUser.name}
                      </Text>
                      {displayUser.isLawyer && (
                        <View style={tw`px-2 py-0.5 bg-green-50 rounded-full border border-green-100`}>
                          <View style={tw`flex-row items-center`}>
                            <Image 
                              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3472/3472620.png' }}
                              style={[tw`w-3 h-3 mr-1`, { tintColor: '#15803d' }]}
                            />
                            <Text style={tw`text-xs font-medium text-green-700`}>Verified Lawyer</Text>
                          </View>
                        </View>
                      )}
                    </View>
                    
                    {/* [username] [law category] - side by side */}
                    <View style={tw`flex-row items-center mt-1`}>
                      {!isAnonymous && (
                        <Text style={tw`text-sm text-gray-500 mr-2`}>
                          @{displayUser.name?.toLowerCase().replace(/\s+/g, '')}
                        </Text>
                      )}
                      
                      {post.domain && (
                        <View style={[
                          tw`px-3 py-1 rounded-full border`,
                          { 
                            backgroundColor: post.domain && categoryColors[post.domain] ? categoryColors[post.domain].bg : categoryColors.others.bg,
                            borderColor: post.domain && categoryColors[post.domain] ? categoryColors[post.domain].border : categoryColors.others.border 
                          }
                        ]}>
                          <Text style={[
                            tw`text-xs font-semibold`, 
                            { color: post.domain && categoryColors[post.domain] ? categoryColors[post.domain].text : categoryColors.others.text }
                          ]}> 
                            {post.domain ? post.domain.charAt(0).toUpperCase() + post.domain.slice(1) : 'Others'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                
                {/* [timestamp] - moved to bottom */}
              </View>
            </View>

            <Text style={tw`text-gray-800 text-base leading-6 mb-4`}>
              {showFullContent ? displayContent : contentPreview}
            </Text>
            {shouldShowReadMore && (
              <TouchableOpacity onPress={() => setShowFullContent(!showFullContent)}>
                <Text style={[tw`font-medium mb-2`, { color: Colors.primary.blue }]}>
                  {showFullContent ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
            
            {/* [timestamp] - at the bottom of post content */}
            <Text style={tw`text-xs text-gray-500 mb-2`}>
              {displayTimestamp}
            </Text>

            {/* Replies Section */}
            <View style={tw`mt-6 pt-6 border-t border-gray-100 bg-white`}>
              <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
                Replies ({[...replies, ...optimisticReplies].length})
              </Text>
              
              {repliesLoading ? (
                // Skeleton loaders for replies
                [1, 2, 3].map((index) => (
                  <View key={index} style={tw`flex-row items-start mb-4 pl-4`}>
                    <View style={tw`w-10 h-10 rounded-full border border-gray-200 mr-3`} />
                    <View style={tw`flex-1`}>
                        <View style={tw`h-4 border border-gray-200 rounded w-3/4 mb-2`} />
                        <View style={tw`h-4 border border-gray-200 rounded w-1/2`} />
                      </View>
                  </View>
                ))
              ) : [...replies, ...optimisticReplies].length > 0 ? (
                // Display actual replies and optimistic replies
                [...replies, ...optimisticReplies].map((reply) => {
                  const isReplyAnonymous = reply.is_anonymous || false;
                  const replyUser = isReplyAnonymous 
                    ? { name: 'Anonymous User', avatar: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png', isLawyer: false }
                    : (reply.user || { name: 'User', avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png', isLawyer: false });
                  const replyTimestamp = formatTimestamp(reply.created_at);
                  
                  const replyComponent = (
                    <View key={reply.id} style={tw`mb-6 pl-4 bg-white`}>
                      <View style={tw`flex-row items-start mb-2`}>
                        {isReplyAnonymous ? (
                          <View style={tw`w-10 h-10 rounded-full bg-gray-100 border border-gray-200 items-center justify-center mr-3`}>
                            <User size={16} color="#6B7280" />
                          </View>
                        ) : replyUser.avatar && !replyUser.avatar.includes('flaticon') ? (
                          <Image 
                            source={{ uri: replyUser.avatar }} 
                            style={tw`w-10 h-10 rounded-full mr-3`}
                          />
                        ) : (
                          <View style={[tw`w-10 h-10 rounded-full items-center justify-center mr-3`, { backgroundColor: Colors.primary.blue }]}>
                            <Text style={tw`text-white font-semibold text-sm`}>
                              {getInitials(replyUser.name)}
                            </Text>
                          </View>
                        )}
                        <View style={tw`flex-1`}>
                          {/* [Full Name] [lawyer badge] */}
                          <View style={tw`mb-2`}>
                            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                              <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                                <Text style={tw`text-base font-semibold text-gray-900 mr-2`}>
                                  {replyUser.name}
                                </Text>
                                {replyUser.isLawyer && (
                                  <View style={tw`px-2 py-0.5 bg-green-50 rounded-full border border-green-100`}>
                                    <View style={tw`flex-row items-center`}>
                                      <Shield size={10} color="#15803d" fill="#15803d" />
                                      <Text style={tw`text-xs font-medium text-green-700 ml-1`}>Verified Lawyer</Text>
                                    </View>
                                  </View>
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
                            {!isReplyAnonymous && (
                              <Text style={tw`text-sm text-gray-500 mt-1`}>
                                @{replyUser.name?.toLowerCase().replace(/\s+/g, '') || 'user'}
                              </Text>
                            )}
                          </View>
                          
                          {/* [post content] */}
                          <Text style={tw`text-gray-900 mb-2`}>{reply.body}</Text>
                          
                          {/* [timestamp] */}
                          <Text style={tw`text-xs text-gray-500`}>
                            {replyTimestamp}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Reply Menu Dropdown */}
                      {replyMenuOpen === reply.id && (
                        <>
                          <TouchableOpacity 
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 998
                            }} 
                            activeOpacity={1} 
                            onPress={() => setReplyMenuOpen(null)} 
                          />
                          <View style={{
                            position: 'absolute',
                            top: 30,
                            right: 0,
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
                            zIndex: 999,
                            width: 160
                          }}>
                            <TouchableOpacity
                              style={tw`flex-row items-center px-4 py-3`}
                              onPress={() => handleReportReplyPress(reply.id)}
                            >
                              <Flag size={16} color="#B91C1C" />
                              <Text style={tw`ml-3 text-red-700`}>Report reply</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  );
                  
                  // Wrap optimistic replies with animated opacity
                  if (reply.isOptimistic && reply.animatedOpacity) {
                    return (
                      <Animated.View
                        key={reply.id}
                        style={{ opacity: reply.animatedOpacity }}
                      >
                        {replyComponent}
                      </Animated.View>
                    );
                  }
                  
                  return replyComponent;
                })
              ) : (
                // No replies message
                <View style={tw`py-4 items-center bg-white`}>
                  <Text style={tw`text-gray-500 text-center italic`}>No replies yet</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Reply Input - Only visible for lawyers */}
      {isLawyer && post && (
        <View style={tw`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3`}>
          <View style={tw`flex-row items-center`}>
            <TextInput
              style={tw`flex-1 border border-gray-300 rounded-full px-4 py-2 mr-3 text-base`}
              placeholder="Write a reply..."
              value={replyText}
              onChangeText={setReplyText}
              multiline={false}
            />
            <TouchableOpacity
              onPress={handleSendReply}
              disabled={!replyText.trim() || isReplying}
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center`,
                {
                  backgroundColor: replyText.trim() && !isReplying ? Colors.primary.blue : '#D1D5DB'
                }
              ]}
            >
              <Send size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

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

    </SafeAreaView>
  );
};

export default ViewPost;


