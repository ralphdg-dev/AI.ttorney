import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, TextInput, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MoreHorizontal, User, Send, Shield, MessageCircle } from 'lucide-react-native';
import tw from 'tailwind-react-native-classnames';
import { Box } from '../../components/ui/box';
import PostActionsMenu from '../../components/home/PostActionsMenu';
import Comments from '../../components/home/Comments';

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
  const [isReplying, setIsReplying] = useState(false);

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return 'Unknown time';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Mock data using new database schema
  const post: PostData = {
    id: postId as string || '1',
    title: 'Need Legal Advice on Protest-Related Charges',
    body: 'Hello po, baka may makasagot agad. Na-involve po ako sa protest actions at ngayon may kaso na akong rebellion at tinatangka pa akong kasuhan ng arson dahil daw sa mga nangyari during the rally. Hindi ko alam kung ano ang dapat kong gawin. May lawyer po ba na pwedeng mag-advise?',
    domain: 'criminal',
    created_at: '2024-01-15T09:30:00Z',
    updated_at: null,
    user_id: 'user_001',
    is_anonymous: false,
    is_flagged: false,
    user: {
      name: 'Ralph de Guzman',
      username: 'twizt3rfries',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      isLawyer: false,
    },
    comments: 3,
    replies: [
      {
        id: '1',
        body: 'For rebellion cases from protests: The key is proving specific intent. Mere participation in rallies is protected speech. The prosecution must show intent to overthrow the government, not just civil disobedience. Document everything and get legal representation immediately.',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: null,
        user_id: 'lawyer_001',
        is_anonymous: false,
        is_flagged: false,
        user: {
          name: 'Atty. Maria Santos',
          username: 'attymaria',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
          isLawyer: true,
          lawyerBadge: 'Verified Lawyer',
        },
      },
      {
        id: '2',
        body: 'Thank you Atty. Santos! This is very helpful information.',
        created_at: '2024-01-15T10:15:00Z',
        updated_at: null,
        user_id: 'user_002',
        is_anonymous: false,
        is_flagged: false,
        user: {
          name: 'Juan Dela Cruz',
          username: 'juan.dc',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
          isLawyer: false,
        },
      },
    ],
  };

  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [replies, setReplies] = useState<Reply[]>(post.replies);
  const [replyText, setReplyText] = useState<string>('');
  const [showFullContent, setShowFullContent] = useState<boolean>(false);

  const handleBackPress = () => {
    router.back();
  };

  const handleMorePress = () => {
    setMenuOpen((prev: boolean) => !prev);
  };

  // Use new schema or fallback to legacy props
  const displayUser = post.user || {
    name: post.is_anonymous ? 'Anonymous User' : 'Unknown User',
    username: post.is_anonymous ? 'anonymous' : 'unknown',
    avatar: '',
    isLawyer: false
  };
  const displayTimestamp = post.timestamp || formatTimestamp(post.created_at);
  const displayCategory = post.category || post.domain || 'others';
  const displayContent = post.content || post.body;

  // Clean category text similar to card and compute colors/label
  const cleanCategory = displayCategory.replace(' Related Post', '').replace(' Law', '').toUpperCase();

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
        return { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', textColor: '#1D4ED8' };
      case 'consumer':
        return { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', textColor: '#047857' };
      default:
        return { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', textColor: '#374151' };
    }
  };

  const getDisplayText = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory === 'labor') return 'WORK';
    if (['family', 'work', 'civil', 'criminal', 'consumer'].includes(lowerCategory)) {
      return category.toUpperCase();
    }
    return 'OTHERS';
  };

  const categoryColors = getCategoryColors(cleanCategory);
  const displayText = getDisplayText(cleanCategory);

  const isAnonymous = post.is_anonymous || (displayUser.username || '').toLowerCase() === 'anonymous' || (displayUser.name || '').toLowerCase().includes('anonymous');

  const handleTextChange = (text: string) => {
    if (text.length <= 500) {
      setReplyText(text);
    }
  };

  const handleSendReply = () => {
    const text = (replyText || '').trim();
    if (!text) return;
    
    setIsReplying(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const newReply: Reply = {
        id: String(Date.now()),
        body: text,
        created_at: new Date().toISOString(),
        updated_at: null,
        user_id: 'lawyer_current',
        is_anonymous: false,
        is_flagged: false,
        user: {
          name: 'Atty. Maria Santos',
          username: 'attymaria',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
          isLawyer: true,
          lawyerBadge: 'Verified Lawyer',
        },
      };
      setReplies((prev) => [newReply, ...prev]);
      setReplyText('');
      setIsReplying(false);
    }, 800);
  };

  const contentPreview = displayContent.length > 280 ? displayContent.substring(0, 280) + '...' : displayContent;
  const shouldShowReadMore = displayContent.length > 280;

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Enhanced Header */}
      <View style={tw`flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm`}>
        <TouchableOpacity 
          style={tw`p-2 rounded-full`} 
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <View style={tw`flex-1 items-center`}>
          <Text style={tw`text-lg font-bold text-gray-900`}>
            Legal Discussion
          </Text>
          <Text style={tw`text-xs text-gray-500 mt-0.5`}>
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </Text>
        </View>
        <TouchableOpacity 
          style={tw`p-2 rounded-full`} 
          onPress={handleMorePress}
          activeOpacity={0.7}
        >
          <MoreHorizontal size={20} color="#374151" />
        </TouchableOpacity>
      </View>

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
                <View style={[tw`px-3 py-1 rounded-full border`, {
                  backgroundColor: categoryColors.backgroundColor,
                  borderColor: categoryColors.borderColor,
                }]}>
                  <Text style={[tw`text-xs font-bold`, { color: categoryColors.textColor }]}>
                    {displayText}
                  </Text>
                </View>
              </View>
              <View style={tw`flex-row items-center`}>
                {!isAnonymous && (
                  <Text style={tw`text-sm text-gray-500 mr-1`}>
                    @{displayUser.username}
                  </Text>
                )}
                <Text style={tw`text-sm text-gray-500`}>
                  {!isAnonymous ? '• ' : ''}{displayTimestamp}
                </Text>
              </View>
            </View>
          </View>

          {/* Post Content */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-base leading-6 text-gray-900 mb-2`}>
              {showFullContent ? displayContent : contentPreview}
            </Text>
            {shouldShowReadMore && (
              <TouchableOpacity 
                onPress={() => setShowFullContent(!showFullContent)}
                style={tw`mt-2`}
                activeOpacity={0.7}
              >
                <Text style={tw`text-blue-600 font-medium text-sm`}>
                  {showFullContent ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Simplified Engagement Bar */}
          <View style={tw`flex-row items-center pt-4 border-t border-gray-100`}>
            <View style={tw`flex-row items-center`}>
              <MessageCircle size={18} color="#6B7280" />
              <Text style={tw`ml-2 text-sm text-gray-600 font-medium`}>
                {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
              </Text>
            </View>
          </View>
        </View>
        
        <Comments replies={replies.map(reply => ({
          id: reply.id,
          user: {
            name: reply.user?.name || (reply.is_anonymous ? 'Anonymous' : 'Unknown'),
            username: reply.user?.username || 'unknown',
            avatar: reply.user?.avatar || ''
          },
          timestamp: reply.timestamp || formatTimestamp(reply.created_at),
          content: reply.content || reply.body
        }))} />
      </ScrollView>

      {/* Enhanced Reply Composer */}
      <View style={tw`absolute left-0 right-0 bottom-0 bg-white border-t border-gray-200 shadow-lg`}>
        {/* Lawyer Status Bar */}
        <View style={tw`flex-row items-center justify-between bg-emerald-50 px-4 py-2 border-b border-emerald-100`}>
          <View style={tw`flex-row items-center`}>
            <Shield size={12} color="#059669" fill="#059669" />
            <Text style={tw`ml-2 text-xs font-medium text-emerald-700`}>
              Responding as Verified Lawyer
            </Text>
          </View>
        </View>
        
        {/* Input Area */}
        <Box className="p-4">
          <View style={tw`flex-row items-center bg-gray-50 border border-gray-300 rounded-lg px-3 py-2`}>
            <TextInput
              style={[
                tw`flex-1 text-base text-gray-900`,
                { 
                  minHeight: 32,
                  maxHeight: 76,
                  paddingRight: 8,
                  textAlignVertical: 'top'
                }
              ]}
              placeholder="Share helpful tips and general guidance..."
              placeholderTextColor="#9CA3AF"
              value={replyText}
              onChangeText={handleTextChange}
              multiline
            />
            <TouchableOpacity
              onPress={handleSendReply}
              disabled={!replyText?.trim() || isReplying}
              style={[
                tw`ml-2 rounded-full`,
                {
                  width: 32,
                  height: 32,
                  backgroundColor: replyText?.trim() && !isReplying ? '#1D4ED8' : '#D1D5DB',
                  justifyContent: 'center',
                  alignItems: 'center',
                }
              ]}
            >
              <Send 
                size={14} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
        </Box>
      </View>

      <PostActionsMenu
        open={menuOpen}
        onRequestClose={() => setMenuOpen(false)}
        bookmarked={bookmarked}
        onToggleBookmark={() => setBookmarked((prev: boolean) => !prev)}
        onReport={() => console.log('Report post')}
        position={{ top: 60, right: 16 }}
        minWidth={220}
      />
    </SafeAreaView>
  );
};

export default LawyerViewPost;
