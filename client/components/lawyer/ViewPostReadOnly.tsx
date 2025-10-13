import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { User, Shield, MessageCircle, Bookmark, MoreHorizontal, Flag } from 'lucide-react-native';
import ReportModal from '../common/ReportModal';
import { ReportService } from '../../services/reportService';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';
import Header from '../Header';
import { BookmarkService } from '../../services/bookmarkService';
import { useAuth } from '../../contexts/AuthContext';
import SkeletonLoader from '../ui/SkeletonLoader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useForumCache } from '../../contexts/ForumCacheContext';

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
  replies: Reply[];
  timestamp?: string;
  category?: string;
  content?: string;
  isBookmarked?: boolean;
  users?: any;
}

const ViewPostReadOnly: React.FC = () => {
  const router = useRouter();
  const { postId } = useLocalSearchParams();
  const { user: currentUser, session, isAuthenticated } = useAuth();
  const { getCachedPost, getCachedPostFromForum, setCachedPost, updatePostComments, prefetchPost } = useForumCache();
  const [showFullContent, setShowFullContent] = useState(false);
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [postReady, setPostReady] = useState(false);
  const [commentsReady, setCommentsReady] = useState(false);
  const [, setCurrentTime] = useState(new Date());
  const [bookmarked, setBookmarked] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
      
      if (__DEV__) console.warn('ViewPost: No authentication token available');
      return { 'Content-Type': 'application/json' };
    } catch (error) {
      if (__DEV__) console.error('ViewPost auth error:', error);
      return { 'Content-Type': 'application/json' };
    }
  }, [session?.access_token]);

  // Reset states when postId changes
  useEffect(() => {
    setMenuOpen(false);
    setBookmarked(false);
    setIsBookmarkLoading(false);
    setReportModalVisible(false);
    setIsReportLoading(false);
  }, [postId]);

  // Helper function to format timestamp with real-time updates using device time
  const formatTimestamp = useCallback((timestamp: string | null): string => {
    if (!timestamp) return 'Unknown time';
    
    // Handle timezone properly - treat timestamps without timezone as UTC
    const hasTz = /Z|[+-]\d{2}:?\d{2}$/.test(timestamp);
    const normalized = hasTz ? timestamp : `${timestamp}Z`;
    
    const now = new Date().getTime();
    const postTime = new Date(normalized).getTime();
    
    if (isNaN(postTime)) return 'Invalid time';
    
    const diffInMinutes = Math.floor((now - postTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return new Date(normalized).toLocaleDateString();
  }, []); // Remove unnecessary currentTime dependency

  // Real-time timer effect - update more frequently for better responsiveness
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
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
      if (__DEV__) console.warn('ViewPost: Missing user ID or post ID');
      return;
    }

    setIsBookmarkLoading(true);
    try {
      const result = await BookmarkService.toggleBookmark(String(postId), currentUser.id, session);
      if (result.success) {
        setBookmarked(result.isBookmarked);
        setMenuOpen(false);
        if (__DEV__) console.log('Bookmark updated:', result.isBookmarked);
      } else {
        if (__DEV__) console.error('Failed to toggle bookmark:', result.error);
      }
    } catch (error) {
      if (__DEV__) console.error('Error toggling bookmark:', error);
    } finally {
      setIsBookmarkLoading(false);
    }
  }, [currentUser?.id, postId, session]);

  const handleReportPress = () => {
    setMenuOpen(false);
    setReportModalVisible(true);
  };

  const handleSubmitReport = async (reason: string, category: string, reasonContext?: string) => {
    if (!currentUser?.id || !postId) {
      throw new Error('Missing user ID or post ID');
    }

    setIsReportLoading(true);
    try {
      // Check if user has already reported this post
      const existingReport = await ReportService.hasUserReported(
        String(postId), 
        'post', 
        currentUser.id,
        session
      );

      if (existingReport.success && existingReport.hasReported) {
        throw new Error('You have already reported this post');
      }

      const result = await ReportService.submitReport(
        String(postId),
        'post',
        reason,
        currentUser.id,
        reasonContext,
        session
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit report');
      }

      if (__DEV__) console.log('Report submitted successfully');
    } finally {
      setIsReportLoading(false);
    }
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
        
        if (cachedPostWithComments && cachedPostWithComments.commentsLoaded) {
          if (__DEV__) console.log('✅ Using cached post with comments - instant load!');
          
          // Map cached data to component state
          const mappedPost: PostData = {
            id: cachedPostWithComments.id,
            user: cachedPostWithComments.user,
            timestamp: cachedPostWithComments.timestamp || '',
            category: cachedPostWithComments.category || 'others',
            content: cachedPostWithComments.content || cachedPostWithComments.body || '',
            comments: cachedPostWithComments.replies.length,
            isBookmarked: cachedPostWithComments.isBookmarked,
            body: cachedPostWithComments.body || '',
            domain: (cachedPostWithComments.domain as any) || 'others',
            created_at: cachedPostWithComments.created_at || null,
            user_id: cachedPostWithComments.user_id || null,
            is_anonymous: cachedPostWithComments.is_anonymous || false,
            is_flagged: cachedPostWithComments.is_flagged || false,
            users: cachedPostWithComments.users,
            replies: cachedPostWithComments.replies
          };
          
          // Show everything at once since we have complete data
          setPost(mappedPost);
          setReplies(cachedPostWithComments.replies);
          setPostReady(true);
          setCommentsReady(true);
          setLoading(false);
          return;
        }
        
        // Step 2: Check if we have basic post data from forum cache
        const forumPost = getCachedPostFromForum(String(postId));
        
        if (forumPost) {
          if (__DEV__) console.log(`📦 Using forum cache for post (shows ${forumPost.comments} comments), loading comments separately`);
          
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
            users: forumPost.users,
            replies: []
          };
          
          // Don't show the post yet - wait for comments to load
          setPost(mappedPost);
          setPostReady(true);
          
          // Load comments and show everything together when ready
          if (__DEV__) console.log(`🔄 About to load comments for cached post (expecting ${forumPost.comments} comments)`);
          loadComments(String(postId), mappedPost);
          return;
        }
        
        // Step 3: No cache available, fetch from API
        if (__DEV__) console.log('🌐 No cache available, fetching from API');
        await loadFromAPI(String(postId));
        
      } catch (error: any) {
        if (__DEV__) console.error('ViewPost: Error in loadPost:', error);
        setError('Failed to load post. Please try again.');
        setLoading(false);
      }
    };
    
    loadPost();
  }, [postId, getCachedPost, getCachedPostFromForum]);
  
  // Load comments only (when we have post from forum cache)
  const loadComments = async (postId: string, postData: PostData) => {
    if (__DEV__) console.log(`🔄 Starting to load comments for post ${postId}`);
    setLoadingComments(true);
    
    try {
      const headers = await getAuthHeaders();
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      
      if (__DEV__) console.log(`📡 Fetching comments from: ${API_BASE_URL}/api/forum/posts/${postId}/replies`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s for comments only
      
      const repliesResponse = await fetch(`${API_BASE_URL}/api/forum/posts/${postId}/replies`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (__DEV__) console.log(`📡 Comments response status: ${repliesResponse.status}`);
      
      if (repliesResponse.ok) {
        const repliesData = await repliesResponse.json();
        if (__DEV__) console.log('📡 Comments response data:', JSON.stringify(repliesData, null, 2));
        
        let rows = null;
        if (repliesData.success && repliesData.data) {
          rows = (repliesData.data as any)?.data || repliesData.data;
        } else if (Array.isArray(repliesData)) {
          rows = repliesData;
        } else {
          // Try to extract data from different response formats
          rows = repliesData.data || repliesData;
        }
        
        if (__DEV__) console.log('📡 Processed comments rows:', rows);
        if (__DEV__) console.log('📡 Is rows an array?', Array.isArray(rows));
        if (__DEV__) console.log('📡 Rows length:', rows?.length);
        
        if (Array.isArray(rows)) {
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
                avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
                isLawyer: replyUserData?.role === 'verified_lawyer',
                lawyerBadge: replyUserData?.role === 'verified_lawyer' ? 'Verified' : undefined,
              },
            };
          });
          
          if (__DEV__) console.log(`💬 Mapped ${mappedReplies.length} comments successfully`);
          setReplies(mappedReplies);
          setCommentsReady(true);
          
          // Cache the complete post with comments
          const postWithComments = {
            ...postData,
            replies: mappedReplies,
            commentsLoaded: true,
            commentsTimestamp: Date.now()
          };
          
          setCachedPost(postId, postWithComments as any);
          updatePostComments(postId, mappedReplies);
          
          if (__DEV__) console.log(`💬 Loaded ${mappedReplies.length} comments and cached complete post`);
        } else {
          if (__DEV__) console.log('📡 No comments found or invalid format');
          setReplies([]);
          setCommentsReady(true); // Still mark as ready even if no comments
        }
      } else {
        const errorText = await repliesResponse.text().catch(() => 'Unknown error');
        if (__DEV__) console.error(`❌ ViewPost: Failed to load replies: ${repliesResponse.status} - ${errorText}`);
        if (__DEV__) console.error('❌ Response headers:', Object.fromEntries(repliesResponse.headers.entries()));
        setReplies([]);
        setCommentsReady(true); // Mark as ready even on error
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        if (__DEV__) console.error('ViewPost: Error loading comments:', error);
      }
      setReplies([]);
      setCommentsReady(true); // Mark as ready even on error
    } finally {
      if (__DEV__) console.log('🔄 Finished loading comments');
      setLoadingComments(false);
    }
  };
  
  // Fallback to API when no cache available
  const loadFromAPI = async (postId: string) => {
    const fallbackTimer = setTimeout(() => {
      if (__DEV__) console.log('ViewPost: Fallback timer triggered - request taking too long');
      setError('Request timed out. Please try again.');
      setLoading(false);
    }, 30000);
    
    try {
      const headers = await getAuthHeaders();
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      
      const postResponse = await fetch(`${API_BASE_URL}/api/forum/posts/${postId}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      clearTimeout(fallbackTimer);
      
      if (!postResponse.ok) {
        const errorText = await postResponse.text().catch(() => 'Unknown error');
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
            avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
            isLawyer: userData?.role === 'verified_lawyer',
            lawyerBadge: userData?.role === 'verified_lawyer' ? 'Verified' : undefined,
          },
          comments: 0,
          replies: [],
        };
        
        // Don't show the post yet - wait for comments to load
        setPost(mapped);
        setPostReady(true);
        
        // Load comments and show everything together when ready
        if (__DEV__) console.log('🔄 Loading comments for API-fetched post');
        loadComments(postId, mapped);
      } else {
        setError('Post data not found');
        setPostReady(true);
        setCommentsReady(true);
      }
    } catch (error: any) {
      clearTimeout(fallbackTimer);
      if (error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError('Failed to load post. Please try again.');
      }
      setPostReady(true);
      setCommentsReady(true);
    }
  };

  // Removed separate replies loading effect - now handled in parallel with post loading

  const isAnonymous = post?.is_anonymous || false;
  const displayUser = isAnonymous 
    ? { name: 'Anonymous User', avatar: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png', isLawyer: false } // Detective icon for anonymous users
    : (post?.user || { name: 'User', avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png', isLawyer: false }); // Gray default for regular users
  const displayTimestamp = formatTimestamp(post?.created_at || null);
  const displayContent = post?.body || '';
  const repliesToShow = replies;
  
  // Wait for both post and comments to be ready before showing content
  React.useEffect(() => {
    if (postReady && commentsReady) {
      if (__DEV__) console.log('✅ Both post and comments ready - showing content');
      setLoading(false);
    }
  }, [postReady, commentsReady]);
  
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
    <SafeAreaView style={[tw`flex-1 bg-white`, { position: 'relative', zIndex: 1 }]}>
      {/* Loading Overlay - Covers any parent loading indicators */}
      {(loading || !postReady || !commentsReady) && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'white',
          zIndex: 9999,
        }}>
          {/* Header Space */}
          <View style={{ height: 60 }} />
          
          {/* Skeleton Content */}
          <View style={tw`bg-white px-5 py-6 border-b border-gray-100`}>
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
        onBackPress={() => router.back()}
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
            top: 100,
            right: 16,
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 20,
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
        style={tw`flex-1`}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        
        {!post && !loading && !postReady && !commentsReady && error && (
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
            >
              <Text style={tw`text-white font-medium`}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
        {post && (
          <View style={tw`bg-white px-5 py-6 border-b border-gray-100`}>
            <View style={tw`flex-row items-start mb-4`}>
              {isAnonymous ? (
                <View style={tw`w-14 h-14 rounded-full bg-gray-100 border border-gray-200 items-center justify-center mr-4`}>
                  <User size={24} color="#6B7280" />
                </View>
              ) : (
                <Image 
                  source={{ uri: displayUser.avatar }} 
                  style={tw`w-14 h-14 rounded-full mr-4`}
                />
              )}
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center justify-between mb-1`}>
                  <View style={tw`flex-row items-center flex-1 mr-3`}>
                    <Text style={tw`text-base font-bold text-gray-900 mr-2 flex-shrink`}>
                      {displayUser.name}
                    </Text>
                    {displayUser.isLawyer && (
                      <View style={tw`flex-row items-center bg-emerald-50 px-2 py-1 rounded border border-emerald-200`}>
                        <Shield size={10} color="#059669" fill="#059669" />
                        <Text style={tw`text-xs font-semibold text-emerald-700 ml-1`}>
                          Verified
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {post.domain && (
                    <View style={[
                      tw`px-3 py-1 rounded-full border`,
                      { backgroundColor: categoryColors[post.domain]?.bg || categoryColors.others.bg,
                        borderColor: categoryColors[post.domain]?.border || categoryColors.others.border }
                    ]}>
                      <Text style={[tw`text-xs font-semibold`, { color: categoryColors[post.domain]?.text || categoryColors.others.text }]}> 
                        {post.domain?.charAt(0).toUpperCase() + post.domain?.slice(1)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={tw`text-sm text-gray-500`}>
                  {!isAnonymous ? `@${displayUser.name?.toLowerCase().replace(/\s+/g, '')}` : 'Anonymous'} • {displayTimestamp}
                </Text>
              </View>
            </View>

            <Text style={tw`text-gray-800 text-base leading-6 mb-4`}>
              {showFullContent ? displayContent : contentPreview}
            </Text>
            {shouldShowReadMore && (
              <TouchableOpacity onPress={() => setShowFullContent(!showFullContent)}>
                <Text style={[tw`font-medium mb-4`, { color: Colors.primary.blue }]}>
                  {showFullContent ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {post && (
          <View style={tw`bg-white px-5 py-4`}>
            <View style={tw`flex-row items-center mb-4`}>
              <MessageCircle size={20} color="#6B7280" />
              <Text style={tw`text-gray-700 font-semibold ml-2`}>
                {repliesToShow.length} {repliesToShow.length === 1 ? 'Reply' : 'Replies'}
              </Text>
            </View>
          {repliesToShow.map((reply) => (
              <View key={reply.id} style={tw`mb-4 pb-4 border-b border-gray-100`}>
                <View style={tw`flex-row items-start`}>
                  <Image 
                    source={{ uri: reply.user?.avatar || (reply.is_anonymous ? 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' : 'https://cdn-icons-png.flaticon.com/512/847/847969.png') }} 
                    style={tw`w-10 h-10 rounded-full mr-3`}
                  />
                  <View style={tw`flex-1`}>
                    <View style={tw`flex-row items-center mb-1`}>
                      <Text style={tw`font-semibold text-gray-900 mr-2`}>
                        {reply.user?.name || 'Anonymous'}
                      </Text>
                      {reply.user?.isLawyer && (
                        <View style={tw`flex-row items-center bg-emerald-50 px-2 py-1 rounded border border-emerald-200`}>
                          <Shield size={8} color="#059669" fill="#059669" />
                          <Text style={tw`text-xs font-semibold text-emerald-700 ml-1`}>
                            Verified
                          </Text>
                        </View>
                      )}
                      <Text style={tw`text-sm text-gray-500 ml-2`}>
                        {formatTimestamp(reply.created_at)}
                      </Text>
                    </View>
                    <Text style={tw`text-gray-800 leading-5`}>
                      {reply.body}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleSubmitReport}
        targetType="post"
        isLoading={isReportLoading}
      />

    </SafeAreaView>
  );
};

export default ViewPostReadOnly;


