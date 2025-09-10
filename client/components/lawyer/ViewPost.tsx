import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MoreHorizontal, User, Send, Shield } from 'lucide-react-native';
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

  const handleSendReply = () => {
    const text = (replyText || '').trim();
    if (!text) return;
    
    // As a lawyer, replies are marked with lawyer badge using new schema
    const newReply: Reply = {
      id: String(Date.now()),
      body: text,
      created_at: new Date().toISOString(),
      updated_at: null,
      user_id: 'lawyer_current',
      is_anonymous: false,
      is_flagged: false,
      user: {
        name: 'Atty. Maria Santos', // Current logged-in lawyer
        username: 'attymaria',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        isLawyer: true,
        lawyerBadge: 'Verified Lawyer',
      },
    };
    setReplies((prev) => [newReply, ...prev]);
    setReplyText('');
  };

  return (
    <View style={[styles.container, { position: 'relative' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ArrowLeft size={20} color="#536471" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity style={styles.moreButton} onPress={handleMorePress}>
          <MoreHorizontal size={20} color="#536471" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 64 }} showsVerticalScrollIndicator={false}>
        {/* Main Post */}
        <View style={styles.postContainer}>
          <View style={styles.userRow}>
            {isAnonymous ? (
              <View style={[styles.avatar, styles.anonymousAvatar]}>
                <User size={20} color="#6B7280" />
              </View>
            ) : (
              <Image 
                source={{ uri: displayUser.avatar }} 
                style={styles.avatar} 
              />
            )}
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <View style={styles.nameContainer}>
                  <Text style={styles.userName}>{displayUser.name}</Text>
                  {displayUser.isLawyer && (
                    <View style={styles.lawyerBadge}>
                      <Shield size={14} color="#059669" fill="#059669" />
                      <Text style={styles.lawyerBadgeText}>Lawyer</Text>
                    </View>
                  )}
                </View>
                <View style={styles.categoryContainer}>
                  <Text style={[styles.categoryText, {
                    backgroundColor: categoryColors.backgroundColor,
                    borderColor: categoryColors.borderColor,
                    color: categoryColors.textColor,
                  }]}>
                    {displayText}
                  </Text>
                </View>
              </View>
              <View style={styles.secondRow}>
                {!isAnonymous && <Text style={styles.username}>@{displayUser.username}</Text>}
                <Text style={styles.timestamp}>{!isAnonymous ? '• ' : ''}{displayTimestamp}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.postContent}>{displayContent}</Text>
        </View>

        {/* Comments Component */}
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

      {/* Reply composer with lawyer notice */}
      <View style={styles.composerContainer}>
        <View style={styles.lawyerNotice}>
          <Shield size={12} color="#059669" />
          <Text style={styles.lawyerNoticeText}>Replying as verified lawyer</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.composerInput}
            placeholder="Share your legal advice..."
            placeholderTextColor="#9CA3AF"
            value={replyText}
            onChangeText={setReplyText}
            multiline
          />
          <TouchableOpacity
            style={styles.composerSend}
            onPress={handleSendReply}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <PostActionsMenu
        open={menuOpen}
        onRequestClose={() => setMenuOpen(false)}
        bookmarked={bookmarked}
        onToggleBookmark={() => setBookmarked((prev: boolean) => !prev)}
        onReport={() => console.log('Report post')}
        position={{ top: 48, right: 12 }}
        minWidth={200}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF3F4',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F1419',
  },
  moreButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  postContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
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
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1419',
    marginRight: 8,
  },
  lawyerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginRight: 8,
  },
  lawyerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 2,
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
  secondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  anonymousAvatar: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postContent: {
    fontSize: 15,
    lineHeight: 20,
    color: '#0F1419',
    marginBottom: 12,
  },
  composerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 5,
  },
  lawyerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  lawyerNoticeText: {
    marginLeft: 4,
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  composerInput: {
    flex: 1,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    color: '#111827',
    textAlignVertical: 'top',
  },
  composerSend: {
    height: 36,
    paddingHorizontal: 12,
    paddingVertical: 0,
    backgroundColor: '#023D7B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LawyerViewPost;
