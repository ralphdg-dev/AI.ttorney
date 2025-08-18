import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MessageCircle, MoreHorizontal } from 'lucide-react-native';
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
  onPostPress?: () => void;
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
  onPostPress,
}) => {
  const handleMorePress = () => {
    // TODO: Handle three dots press
    console.log('Three dots pressed');
  };

  const handlePostPress = () => {
    onPostPress?.();
  };

  // Clean category text by removing "Related Post" and simplifying names
  const cleanCategory = category.replace(' Related Post', '').replace(' Law', '').toUpperCase();

  // Get category colors based on category type
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
      case 'consumer':
        return { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', textColor: '#047857' };
      default:
        return { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', textColor: '#374151' };
    }
  };

  const categoryColors = getCategoryColors(cleanCategory);
  
  // Determine display text - show "OTHERS" for non-matching categories
  const getDisplayText = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (['family', 'work', 'civil', 'criminal', 'consumer'].includes(lowerCategory)) {
      return category.toUpperCase();
    }
    return 'OTHERS';
  };

  const displayText = getDisplayText(cleanCategory);

  return (
    <TouchableOpacity style={styles.container} onPress={handlePostPress} activeOpacity={0.95}>
      {/* User Info Row */}
      <View style={styles.userRow}>
        <Image 
          source={{ uri: user.avatar || 'https://via.placeholder.com/40' }} 
          style={styles.avatar} 
        />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{user.name}</Text>
            <View style={styles.categoryContainer}>
              <Text style={[styles.categoryText, {
                backgroundColor: categoryColors.backgroundColor,
                borderColor: categoryColors.borderColor,
                color: categoryColors.textColor,
              }]}>{displayText}</Text>
            </View>
          </View>
          <View style={styles.secondRow}>
            <Text style={styles.username}>@{user.username}</Text>
            <Text style={styles.timestamp}>• {timestamp}</Text>
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
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E8ED',
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
  secondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
});

export default Post;