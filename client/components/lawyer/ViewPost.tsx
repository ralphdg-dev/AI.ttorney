import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, TextInput, SafeAreaView, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { User, Shield, MessageCircle, Bookmark, MoreHorizontal, Flag, Send } from 'lucide-react-native';
import ReportModal from '../common/ReportModal';
import { ReportService } from '../../services/reportService';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';
import Header from '../Header';
import apiClient from '@/lib/api-client';
import { BookmarkService } from '../../services/bookmarkService';
import { useAuth } from '../../contexts/AuthContext';

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
  // Legacy props for backward compatibility
  timestamp?: string;
  content?: string;
  // Optimistic UI props
  isOptimistic?: boolean;
  animatedOpacity?: Animated.Value;
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
  // Legacy props for backward compatibility
  timestamp?: string;
  category?: string;
  content?: string;
}

const LawyerViewPost: React.FC = () => {
  const router = useRouter();
  const { postId } = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showFullContent, setShowFullContent] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bookmarked, setBookmarked] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Reset states when postId changes
  useEffect(() => {
    setMenuOpen(false);
    setBookmarked(false);
    setIsBookmarkLoading(false);
    setReportModalVisible(false);
    setIsReportLoading(false);
  }, [postId]);

  // Helper function to format timestamp with real-time updates
  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return 'Unknown time';
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor((currentTime.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const [post, setPost] = useState<PostData | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [optimisticReplies, setOptimisticReplies] = useState<Reply[]>([]);

  // Real-time timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Check initial bookmark status
  useEffect(() => {
    const checkBookmarkStatus = async () => {
      if (currentUser?.id && postId) {
        setIsBookmarkLoading(true);
        
        const result = await BookmarkService.isBookmarked(String(postId), currentUser.id);
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
  }, [postId, currentUser?.id]);

  const handleBookmarkPress = async () => {
    if (!currentUser?.id || !postId) {
      console.log('Missing user ID or post ID:', { userId: currentUser?.id, postId });
      return;
    }

    console.log('Attempting to toggle bookmark for:', { postId: String(postId), userId: currentUser.id });
    setIsBookmarkLoading(true);
    try {
      const result = await BookmarkService.toggleBookmark(String(postId), currentUser.id);
      console.log('Bookmark toggle result:', result);
      if (result.success) {
        setBookmarked(result.isBookmarked);
        setMenuOpen(false);
        console.log('Bookmark updated successfully:', result.isBookmarked);
      } else {
        console.error('Failed to toggle bookmark:', result.error);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  const handleReportPress = () => {
    setMenuOpen(false);
    setReportModalVisible(true);
  };

  const handleSubmitReport = async (reason: string, category: string) => {
    if (!currentUser?.id || !postId) {
      throw new Error('Missing user ID or post ID');
    }

    setIsReportLoading(true);
    try {
      // Check if user has already reported this post
      const existingReport = await ReportService.hasUserReported(
        String(postId), 
        'post', 
        currentUser.id
      );

      if (existingReport.success && existingReport.hasReported) {
        throw new Error('You have already reported this post');
      }

      const result = await ReportService.submitReport(
        String(postId),
        'post',
        reason,
        currentUser.id
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit report');
      }

      console.log('Report submitted successfully');
    } finally {
      setIsReportLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!postId) return;
      const res = await apiClient.getForumPostById(String(postId));
      if (res.success && (res.data as any)?.data) {
        const row = (res.data as any).data;
        const mapped: PostData = {
          id: String(row.id),
          title: undefined,
          body: row.body,
          domain: (row.category as any) || 'others',
          created_at: row.created_at || null,
          updated_at: row.updated_at || null,
          user_id: row.user_id || null,
          is_anonymous: !!row.is_anonymous,
          is_flagged: !!row.is_flagged,
          user: undefined,
          comments: 0,
          replies: [],
        };
        setPost(mapped);
      } else {
        setPost(null);
      }
      const rep = await apiClient.getForumReplies(String(postId));
      if (rep.success && Array.isArray((rep.data as any)?.data)) {
        const rows = (rep.data as any).data as any[];
        const mappedReplies: Reply[] = rows.map((r: any) => ({
          id: String(r.id),
          body: r.reply_body ?? r.body,
          created_at: r.created_at || null,
          updated_at: r.updated_at || null,
          user_id: r.user_id || null,
          is_anonymous: !!r.is_anonymous,
          is_flagged: !!r.is_flagged,
          user: undefined,
        }));
        setReplies(mappedReplies);
      } else {
        setReplies([]);
      }
    };
    load();
  }, [postId]);

  // Derived data
  const isAnonymous = post?.is_anonymous || false;
  const displayUser = isAnonymous ? { name: 'Anonymous User', avatar: '', isLawyer: false } : (post?.user || { name: 'Unknown User', avatar: '', isLawyer: false });
  const displayTimestamp = formatTimestamp(post?.created_at || null);
  const displayContent = post?.body || '';

  // Category colors mapping
  const categoryColors = {
    family: { bg: '#FEF2F2', text: '#BE123C', border: '#FECACA' },
    criminal: { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
    civil: { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
    labor: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    consumer: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
    others: { bg: '#F9FAFB', text: '#374151', border: '#E5E7EB' }
  };

  const handleTextChange = (text: string) => {
    setReplyText(text);
  };

  // Function to add optimistic reply
  const addOptimisticReply = useCallback((replyData: { body: string }) => {
    const animatedOpacity = new Animated.Value(0.5); // Start with 50% opacity
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
        avatar: (currentUser as any)?.avatar || '',
        isLawyer: true,
        lawyerBadge: 'Verified'
      },
      isOptimistic: true,
      animatedOpacity,
    };

    setOptimisticReplies(prev => [...prev, optimisticReply]);
    return optimisticReply.id;
  }, [currentUser]);

  // Function to confirm optimistic reply (make it fully opaque)
  const confirmOptimisticReply = useCallback((optimisticId: string) => {
    setOptimisticReplies(prev => {
      const reply = prev.find(r => r.id === optimisticId);
      if (reply?.animatedOpacity) {
        Animated.timing(reply.animatedOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // Remove optimistic reply after animation and reload real replies
          setOptimisticReplies(current => current.filter(r => r.id !== optimisticId));
          // Reload replies to get the real reply
          loadReplies();
        });
      }
      return prev;
    });
  }, []);

  // Function to remove failed optimistic reply
  const removeOptimisticReply = useCallback((optimisticId: string) => {
    setOptimisticReplies(prev => prev.filter(r => r.id !== optimisticId));
  }, []);

  // Function to reload replies
  const loadReplies = useCallback(async () => {
    if (!postId) return;
    const rep = await apiClient.getForumReplies(String(postId));
    if (rep.success && Array.isArray((rep.data as any)?.data)) {
      const rows = (rep.data as any).data as any[];
      const mappedReplies: Reply[] = rows.map((r: any) => ({
        id: String(r.id),
        body: r.reply_body ?? r.body,
        created_at: r.created_at || null,
        updated_at: r.updated_at || null,
        user_id: r.user_id || null,
        is_anonymous: !!r.is_anonymous,
        is_flagged: !!r.is_flagged,
        user: undefined,
      }));
      setReplies(mappedReplies);
    }
  }, [postId]);

  const handleSendReply = async () => {
    const text = replyText.trim();
    if (!text || !postId) return;
    
    // Add optimistic reply immediately
    const optimisticId = addOptimisticReply({ body: text });
    
    // Clear input immediately for better UX
    setReplyText('');
    
    try {
      setIsReplying(true);
      const resp = await apiClient.createForumReply(String(postId), { body: text, is_anonymous: false });
      if (resp.success) {
        // Confirm the optimistic reply (animate to full opacity)
        confirmOptimisticReply(optimisticId);
      } else {
        // Remove the optimistic reply on failure
        removeOptimisticReply(optimisticId);
        // Restore the text on failure
        setReplyText(text);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      // Remove the optimistic reply on error
      removeOptimisticReply(optimisticId);
      // Restore the text on error
      setReplyText(text);
    } finally {
      setIsReplying(false);
    }
  };


  const contentPreview = displayContent.length > 280 ? displayContent.substring(0, 280) + '...' : displayContent;
  const shouldShowReadMore = displayContent.length > 280;

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <Header 
        title="Post"
        showBackButton={true}
        onBackPress={() => router.back()}
        rightComponent={
          <TouchableOpacity
            onPress={() => setMenuOpen(!menuOpen)}
            style={tw`p-2`}
          >
            <MoreHorizontal size={24} color="#6B7280" />
          </TouchableOpacity>
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
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Main Post */}
        <View style={tw`bg-white px-5 py-6 border-b border-gray-100`}>
          {/* User Info Row */}
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
                
                
                {post?.domain && (
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


          {/* Post Content */}
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

        {/* Comments Section */}
        <View style={tw`bg-white px-5 py-4`}>
          <View style={tw`flex-row items-center mb-4`}>
            <MessageCircle size={20} color="#6B7280" />
            <Text style={tw`text-gray-700 font-semibold ml-2`}>
              {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
            </Text>
          </View>

          {/* Replies List */}
          {[...replies, ...optimisticReplies].map((reply) => {
            const replyComponent = (
              <View key={reply.id} style={tw`mb-4 pb-4 border-b border-gray-100`}>
                <View style={tw`flex-row items-start`}>
                  <Image 
                    source={{ uri: reply.user?.avatar || '' }} 
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
          })}
        </View>
      </ScrollView>

      {/* Reply Input */}
      <View style={tw`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3`}>
        <View style={tw`flex-row items-center`}>
          <TextInput
            style={tw`flex-1 border border-gray-300 rounded-full px-4 py-2 mr-3 text-base`}
            placeholder="Write a reply..."
            value={replyText}
            onChangeText={handleTextChange}
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

export default LawyerViewPost;
