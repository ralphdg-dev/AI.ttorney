import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MoreHorizontal, User, Send } from 'lucide-react-native';
import PostActionsMenu from '../../components/home/PostActionsMenu';

import Comments from '../../components/home/Comments';

interface Reply {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
  };
  timestamp: string;
  content: string;
}

interface PostData {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
  };
  timestamp: string;
  category: string;
  content: string;
  comments: number;
  replies: Reply[];
}

const PostView: React.FC = () => {
  const router = useRouter();
  const { postId } = useLocalSearchParams();

  // Mock data - in real app, fetch based on postId
  const post: PostData = {
    id: postId as string || '1',
    user: {
      name: 'Ralph de Guzman',
      username: 'twizt3rfries',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    },
    timestamp: '1h',
    category: 'Criminal Law',
    content: 'Hello po, baka may makasagot agad. Na-involve po ako sa protest actions at ngayon may kaso na akong rebellion at tinatangka pa akong kasuhan ng arson dahil daw sa mga nangyari during the rally. Hindi ko alam kung ano ang dapat kong gawin. May lawyer po ba na pwedeng mag-advise?',
    comments: 2,
    replies: [
      {
        id: '1',
        user: {
          name: 'Maria Santos',
          username: 'maria.santos',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        },
        timestamp: '30m',
        content: 'Hello! I can help you with this. First, you need to get a lawyer immediately. The charges you mentioned are serious. Please visit our Lawyer Directory to find verified attorneys who can assist you.',
      },
      {
        id: '2',
        user: {
          name: 'Juan Dela Cruz',
          username: 'juan.dc',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        },
        timestamp: '15m',
        content: 'Agree with Atty. Santos. Go to our Lawyer Directory to connect with verified attorneys. Don\'t delay, these cases need immediate attention.',
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
    console.log('More menu toggled');
  };

  // Clean category text similar to card and compute colors/label
  const cleanCategory = post.category.replace(' Related Post', '').replace(' Law', '').toUpperCase();

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
        // treat labor as work
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

  const isAnonymous = (post.user.username || '').toLowerCase() === 'anonymous' || (post.user.name || '').toLowerCase().includes('anonymous');

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
                source={{ uri: post.user.avatar }} 
                style={styles.avatar} 
              />
            )}
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{post.user.name}</Text>
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
                {!isAnonymous && <Text style={styles.username}>@{post.user.username}</Text>}
                <Text style={styles.timestamp}>{!isAnonymous ? '• ' : ''}{post.timestamp}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.postContent}>{post.content}</Text>
        </View>

        {/* Comments Component */}
        <Comments replies={replies} />
      </ScrollView>

      {/* Reply composer */}
      <View style={styles.composerContainer}>
        <TextInput
          style={styles.composerInput}
          placeholder="Write a reply..."
          placeholderTextColor="#9CA3AF"
          value={replyText}
          onChangeText={setReplyText}
          multiline
        />
        <TouchableOpacity
          style={styles.composerSend}
          onPress={() => {
            const text = (replyText || '').trim();
            if (!text) return;
            // For demo: attribute to Atty. Maria Santos so naming stays consistent with attorney-only replies
            const maria = post.replies[0]?.user || {
              name: 'Maria Santos',
              username: 'maria.santos',
              avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
            };
            const newReply: Reply = {
              id: String(Date.now()),
              user: maria,
              timestamp: 'now',
              content: text,
            };
            setReplies((prev) => [newReply, ...prev]);
            setReplyText('');
          }}
        >
          <Send size={18} color="#FFFFFF" />
        </TouchableOpacity>
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
    marginBottom: 0,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1419',
    marginRight: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // Shadow to emphasize the top divider
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 5,
  },
  composerInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    color: '#111827',
    textAlignVertical: 'center',
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
  composerSendText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default PostView; 