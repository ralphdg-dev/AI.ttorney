import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, TextInput, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { User, Send, Shield, MessageCircle } from 'lucide-react-native';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';
import Header from '../Header';

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
  const [replyText, setReplyText] = useState('');
  const [showFullContent, setShowFullContent] = useState(false);

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
          username: 'atty_maria',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
          isLawyer: true,
          lawyerBadge: 'Criminal Law Specialist'
        }
      },
      {
        id: '2',
        body: 'Agree with Atty. Santos. Also, for arson charges - they need to prove you actually set fire to property with intent. Being present during a rally where fires occurred is not enough. Keep all evidence of your actual activities during the protest.',
        created_at: '2024-01-15T11:30:00Z',
        updated_at: null,
        user_id: 'lawyer_002',
        is_anonymous: false,
        is_flagged: false,
        user: {
          name: 'Atty. John Cruz',
          username: 'atty_john',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
          isLawyer: true,
          lawyerBadge: 'Public Interest Lawyer'
        }
      }
    ]
  };

  // Derived data
  const isAnonymous = post.is_anonymous || false;
  const displayUser = isAnonymous ? { name: 'Anonymous User', avatar: '', isLawyer: false } : (post.user || { name: 'Unknown User', avatar: '', isLawyer: false });
  const displayTimestamp = formatTimestamp(post.created_at);
  const displayContent = post.body || '';
  const replies = post.replies || [];

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

  const handleSendReply = () => {
    if (replyText.trim()) {
      console.log('Sending reply:', replyText);
      setIsReplying(true);
      
      setTimeout(() => {
        setReplyText('');
        setIsReplying(false);
      }, 800);
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
      />

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
          {replies.map((reply) => (
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
          ))}
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

    </SafeAreaView>
  );
};

export default LawyerViewPost;
