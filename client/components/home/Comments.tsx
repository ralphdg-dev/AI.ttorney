import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Colors from '../../constants/Colors';

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

interface CommentsProps {
  replies: Reply[];
}

const Comments: React.FC<CommentsProps> = ({ replies }) => {
  return (
    <View style={styles.repliesContainer}>
      <Text style={styles.repliesTitle}>Replies</Text>
      {replies.map((reply) => (
        <View key={reply.id} style={styles.replyContainer}>
          <View style={styles.replyUserRow}>
            <Image 
              source={{ uri: reply.user.avatar }} 
              style={styles.replyAvatar} 
            />
            <View style={styles.replyUserInfo}>
              <View style={styles.replyNameRow}>
                <Text style={styles.replyUserName}>{reply.user.name}</Text>
                <Text style={styles.replyUsername}>@{reply.user.username}</Text>
                <Text style={styles.replyTimestamp}>• {reply.timestamp}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.replyContent}>{reply.content}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  repliesContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  repliesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F1419',
    marginBottom: 16,
  },
  replyContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  replyUserRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  replyUserInfo: {
    flex: 1,
  },
  replyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  replyUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F1419',
    marginRight: 4,
  },
  replyUsername: {
    fontSize: 14,
    color: '#536471',
    marginRight: 4,
  },
  replyTimestamp: {
    fontSize: 14,
    color: '#536471',
  },
  replyContent: {
    fontSize: 14,
    lineHeight: 18,
    color: '#0F1419',
    marginLeft: 44, // Align with username
  },
});

export default Comments; 