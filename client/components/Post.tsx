import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MessageCircle, Bookmark, MoreHorizontal } from 'lucide-react-native';
import Colors from '../constants/Colors';

interface PostProps {
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
  onCommentPress?: () => void;
  onReportPress?: () => void;
  onBookmarkPress?: () => void;
}

const Post: React.FC<PostProps> = ({
  user,
  timestamp,
  category,
  content,
  comments,
  onCommentPress,
  onReportPress,
  onBookmarkPress,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleBookmarkPress = () => {
    setIsBookmarked(!isBookmarked);
    onBookmarkPress?.();
  };

  const handleMorePress = () => {
    // TODO: Handle three dots press
    console.log('Three dots pressed');
  };

  // Clean category text by removing "Related Post"
  const cleanCategory = category.replace(' Related Post', '');

  return (
    <View style={styles.container}>
      {/* User Info Row */}
      <View style={styles.userRow}>
        <Image 
          source={{ uri: user.avatar || 'https://via.placeholder.com/40' }} 
          style={styles.avatar} 
        />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.username}>@{user.username}</Text>
            <Text style={styles.timestamp}>• {timestamp}</Text>
          </View>
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryText}>{cleanCategory}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton} onPress={handleMorePress}>
          <MoreHorizontal size={16} color="#536471" />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <Text style={styles.content}>{content}</Text>

      {/* Engagement Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onCommentPress}>
          <MessageCircle size={18} color="#536471" />
          <Text style={styles.actionCount}>{comments}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.bookmarkButton} onPress={handleBookmarkPress}>
          <Bookmark size={18} color={isBookmarked ? "#1DA1F2" : "#536471"} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E1E8ED',
    marginBottom: 8,
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
  moreButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    fontSize: 15,
    lineHeight: 20,
    color: '#0F1419',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  bookmarkButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  actionCount: {
    fontSize: 13,
    color: '#536471',
  },
});

export default Post;