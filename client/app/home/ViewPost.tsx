import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, MoreHorizontal } from 'lucide-react-native';
import Colors from '../../constants/Colors';
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
    comments: 3,
    replies: [
      {
        id: '1',
        user: {
          name: 'Atty. Maria Santos',
          username: 'maria.santos',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        },
        timestamp: '30m',
        content: 'Hello! I can help you with this. First, you need to get a lawyer immediately. The charges you mentioned are serious. Contact the Public Attorney\'s Office (PAO) for free legal assistance.',
      },
      {
        id: '2',
        user: {
          name: 'Juan Dela Cruz',
          username: 'juan.dc',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        },
        timestamp: '15m',
        content: 'Agree with Atty. Santos. PAO is your best option for free legal help. Don\'t delay, these cases need immediate attention.',
      },
      {
        id: '3',
        user: {
          name: 'Anonymous User',
          username: 'anonymous',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        },
        timestamp: '5m',
        content: 'Make sure to document everything and gather evidence. Photos, videos, witnesses - everything helps.',
      },
    ],
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleMorePress = () => {
    console.log('Three dots pressed');
  };

  const handleReplyPress = () => {
    console.log('Reply pressed');
    // TODO: Implement reply functionality
  };

  // Clean category text by removing "Related Post"
  const cleanCategory = post.category.replace(' Related Post', '');

  return (
    <View style={styles.container}>
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Post */}
        <View style={styles.postContainer}>
          <View style={styles.userRow}>
            <Image 
              source={{ uri: post.user.avatar }} 
              style={styles.avatar} 
            />
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{post.user.name}</Text>
                <Text style={styles.username}>@{post.user.username}</Text>
                <Text style={styles.timestamp}>• {post.timestamp}</Text>
              </View>
              <View style={styles.categoryContainer}>
                <Text style={styles.categoryText}>{cleanCategory}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.postContent}>{post.content}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleReplyPress}>
              <MessageCircle size={18} color="#536471" />
              <Text style={styles.actionCount}>{post.comments}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Component */}
        <Comments replies={post.replies} />
      </ScrollView>
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
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1419',
    marginRight: 4,
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
    color: '#1DA1F2',
    backgroundColor: '#E8F5FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  postContent: {
    fontSize: 15,
    lineHeight: 20,
    color: '#0F1419',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  actionCount: {
    fontSize: 13,
    color: '#536471',
  },
});

export default PostView; 