import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MoreHorizontal, Flag, ShieldCheck } from 'lucide-react-native';

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
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);

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
                <Text style={styles.replyUserName}>Atty. {reply.user.name}</Text>
                <Text style={styles.replyTimestamp}>• {reply.timestamp}</Text>
              </View>
              <View style={styles.replyMetaRow}>
                <ShieldCheck size={14} color="#16A34A" />
                <Text style={styles.replyVerifiedText}>Verified</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.replyMoreButton}
              onPress={() => setOpenReplyId((prev) => (prev === reply.id ? null : reply.id))}
            >
              <MoreHorizontal size={16} color="#536471" />
            </TouchableOpacity>
          </View>
          <View style={styles.replyCard}>
            <Text style={styles.replyContent}>{reply.content}</Text>
          </View>

          {/* Reply dropdown (local, report only) */}
          {openReplyId === reply.id && (
            <>
              <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={() => setOpenReplyId(null)}
              />
              <View style={styles.menuContainer}>
                <TouchableOpacity
                  style={styles.menuItem}
                  activeOpacity={0.8}
                  onPress={() => {
                    console.log('Report reply', reply.id);
                    // keep open per UX or close if desired
                  }}
                >
                  <Flag size={16} color="#B91C1C" />
                  <Text style={[styles.menuText, { color: '#B91C1C' }]}>Report reply</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    position: 'relative',
  },
  replyUserRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  replyMoreButton: {
    marginLeft: 'auto',
    padding: 6,
    borderRadius: 16,
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
    marginBottom: 2,
    gap: 6,
  },
  replyUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F1419',
    marginRight: 4,
  },
  replyTimestamp: {
    fontSize: 12,
    color: '#536471',
  },
  replyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  replyVerifiedText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
  replyContent: {
    fontSize: 14,
    lineHeight: 18,
    color: '#0F1419',
  },
  replyCard: {
    backgroundColor: '#FAFAFA', // light gray
    borderColor: '#E5E7EB', // lighter border
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginLeft: 44, // align under the text area
    marginTop: 4,
  },
  // Local dropdown styles
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 19,
  },
  menuContainer: {
    position: 'absolute',
    top: 28,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  menuText: {
    fontSize: 14,
    color: '#111827',
  },
});

export default Comments; 