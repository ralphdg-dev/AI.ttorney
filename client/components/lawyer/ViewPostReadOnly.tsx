import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { User, Bookmark, MoreHorizontal, Flag } from 'lucide-react-native';
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
}



const ViewPostReadOnly: React.FC = () => {
  const router = useRouter();
  const { postId } = useLocalSearchParams();
  const { user: currentUser, session, isAuthenticated } = useAuth();
  const { getCachedPost, getCachedPostFromForum, setCachedPost, updatePostComments, prefetchPost } = useForumCache();
  const [showFullContent, setShowFullContent] = useState(false);
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postReady, setPostReady] = useState(false);
  const [, setCurrentTime] = useState(new Date());
  const [bookmarked, setBookmarked] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

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
      
      if (diffInSeconds < 60) return `${diffInSeconds}s`;
      
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d`;
      
      // For posts older than 7 days, display the date in MM/DD/YYYY format
      return `${postDate.getMonth() + 1}/${postDate.getDate()}/${postDate.getFullYear()}`;
    } catch (error) {
      // Fallback for any parsing errors
      return 'Unknown time';
    }
  }, []);

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
        
        if (cachedPostWithComments) {
          if (__DEV__) console.log('✅ Using cached post with comments - instant load!');
          
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
          if (cachedPostWithComments.replies) {
            setReplies(cachedPostWithComments.replies);
            setRepliesLoading(false);
          }
          return;
        }
        
        // Step 2: Check if we have basic post data from forum cache
        const forumPost = getCachedPostFromForum(String(postId));
        
        if (forumPost) {
          if (__DEV__) console.log(`📦 Using forum cache for post with forum_replies`);
          
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
          
          // Show the post immediately
          setPost(mappedPost);
          setPostReady(true);
          setLoading(false);
          
          // If forum_replies exist in the forum cache, use them
          if (forumPost.forum_replies) {
            const mappedReplies = forumPost.forum_replies.map((r: any) => {
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
                }
              };
            });
            
            setReplies(mappedReplies);
            setRepliesLoading(false);
            
            // Cache the post with replies
            const postWithComments = {
              ...mappedPost,
              replies: mappedReplies,
              commentsLoaded: true,
              commentsTimestamp: Date.now()
            };
            setCachedPost(String(postId), postWithComments as any);
          }
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
        };
        
        // Show the post immediately
        setPost(mapped);
        setPostReady(true);
        setLoading(false);
        
        // Fetch replies immediately after post
        try {
          const repliesResponse = await fetch(`${API_BASE_URL}/api/forum/posts/${postId}/replies`, {
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
                    avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
                    isLawyer: replyUserData?.role === 'verified_lawyer',
                    lawyerBadge: replyUserData?.role === 'verified_lawyer' ? 'Verified' : undefined,
                  }
                };
              });
              
              // Update UI with replies
              setReplies(mappedReplies);
              setRepliesLoading(false);
              
              // Cache the complete post with replies
              const postWithComments = {
                ...mapped,
                replies: mappedReplies,
                commentsLoaded: true,
                commentsTimestamp: Date.now()
              };
              setCachedPost(String(postId), postWithComments as any);
            }
          }
        } catch (error) {
          if (__DEV__) console.warn('Error fetching replies:', error);
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
  };

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
      if (__DEV__) console.log('✅ Post ready - showing content');
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
    <SafeAreaView style={[tw`flex-1`, { position: 'relative', zIndex: 1, backgroundColor: 'transparent' }]}>
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
        onBackPress={() => router.push('/home' as any)}
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
        style={tw`flex-1 bg-white`}
        contentContainerStyle={{ flexGrow: 1 }}
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
                ) : (
                  <Image 
                    source={{ uri: displayUser.avatar }} 
                    style={tw`w-12 h-12 rounded-full mr-3`}
                  />
                )}
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center justify-between mb-1`}>
                  <View style={tw`flex-1 mr-3`}>
                    <View style={tw`flex-row items-center mb-1 flex-wrap`}>
                      <Text style={tw`text-sm font-bold text-gray-900 mr-1`}>
                        {displayUser.name}
                      </Text>
                      {displayUser.isLawyer && (
                        <View style={tw`bg-blue-100 px-2 py-0.5 rounded-full mr-2 inline-flex`}>
                          <Text style={tw`text-xs font-semibold text-blue-700`}>
                            Verified Lawyer
                          </Text>
                        </View>
                      )}
                      <Text style={tw`text-sm text-gray-500`}>
                        @{!isAnonymous ? displayUser.name?.toLowerCase().replace(/\s+/g, '') : 'anonymous'}
                      </Text>
                    </View>
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
                <Text style={tw`text-sm text-gray-500 mt-1`}>
                  {displayTimestamp}
                </Text>
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

            {/* Replies Section */}
            <View style={tw`mt-6 pt-6 border-t border-gray-100 bg-white`}>
              <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
                Replies ({replies.length})
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
              ) : replies.length > 0 ? (
                // Display actual replies
                replies.map((reply) => {
                  const isReplyAnonymous = reply.is_anonymous || false;
                  const replyUser = isReplyAnonymous 
                    ? { name: 'Anonymous User', avatar: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png', isLawyer: false }
                    : (reply.user || { name: 'User', avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png', isLawyer: false });
                  const replyTimestamp = formatTimestamp(reply.created_at);
                  
                  return (
                    <View key={reply.id} style={tw`mb-6 pl-4 bg-white`}>
                      <View style={tw`flex-row items-start mb-2`}>
                        {isReplyAnonymous ? (
                          <View style={tw`w-10 h-10 rounded-full bg-gray-100 border border-gray-200 items-center justify-center mr-3`}>
                            <User size={16} color="#6B7280" />
                          </View>
                        ) : (
                          <Image 
                            source={{ uri: replyUser.avatar }} 
                            style={tw`w-10 h-10 rounded-full mr-3`}
                          />
                        )}
                        <View style={tw`flex-1`}>
                          <View style={tw`mb-2`}>
                          <Text style={tw`text-base font-bold text-gray-900 mb-1`}>
                            {replyUser.name}
                          </Text>
                          {replyUser.isLawyer && (
                            <View style={tw`flex-row items-center mb-1`}>
                              <View style={tw`flex-row items-center px-2 py-0.5 bg-green-50 rounded-full border border-green-100`}>
                                <Image 
                                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3472/3472620.png' }}
                                  style={tw`w-3 h-3 mr-1 tint-green-700`}
                                />
                                <Text style={tw`text-xs font-medium text-green-700`}>Verified Lawyer</Text>
                              </View>
                            </View>
                          )}
                          <Text style={tw`text-sm text-gray-500`}>
                            @{!isReplyAnonymous ? replyUser.username : 'anonymous'}
                          </Text>
                        </View>
                        <Text style={tw`text-gray-900 mb-2`}>{reply.body}</Text>
                        <Text style={tw`text-xs text-gray-500`}>
                          {replyTimestamp}
                        </Text>
                        </View>
                      </View>
                    </View>
                  );
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


