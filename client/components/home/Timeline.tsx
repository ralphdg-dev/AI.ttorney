import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Post from './Post';
import Colors from '../../constants/Colors';

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
}

interface TimelineProps {
  context?: 'user' | 'lawyer';
}

const Timeline: React.FC<TimelineProps> = ({ context = 'user' }) => {
  const router = useRouter();

  // Sample data for demonstration - Twitter/X style
  const samplePosts: PostData[] = [
    {
      id: '1',
      user: {
        name: 'Ralph de Guzman',
        username: 'twizt3rfries',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      },
      timestamp: '1h',
      category: 'Criminal Law',
      content: 'Hello po, baka may makasagot agad. Na-involve po ako sa protest actions at ngayon may kaso na akong rebellion at tinatangka pa akong kasuhan ng arson dahil daw sa mga nangyari during the rally. Hindi ko alam kung ano ang dapat kong gawin. May lawyer po ba na pwedeng mag-advise?',
      comments: 3,
    },
    {
      id: '2',
      user: {
        name: 'Anonymous User',
        username: 'anonymous',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      },
      timestamp: '3h',
      category: 'Traffic Violation',
      content: 'Hello po! Nahuli daw ako ng NCAP pero hindi ako ang driver ng sasakyan. May way po ba para ma-contest ito? Wala rin akong sasakyan sa pangalan ko.',
      comments: 12,
    },
    {
      id: '3',
      user: {
        name: 'LeBron James',
        username: 'lebbyjames',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
      },
      timestamp: '5h',
      category: 'Family Law',
      content: 'Pwede po ba akong humingi ng child support kahit hindi kami kasal ng nanay ng anak ko? May anak kami pero hindi kami nagpakasal. Ano po ang dapat kong gawin para sa anak namin?',
      comments: 2,
    },
    {
      id: '4',
      user: {
        name: 'Willie Revillame',
        username: 'pengej4cket',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      },
      timestamp: '5h',
      category: 'Labor Law',
      content: 'Nagresign po ako nang maayos at may clearance na, pero hanggang ngayon wala pa rin akong natatanggap na back pay o final pay. 2 months na po. Ano po dapat kong gawin para ma-claim ito?',
      comments: 2,
    },
    {
      id: '6',
      user: {
        name: 'Juan Dela Cruz',
        username: 'juan.dc',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      },
      timestamp: '8h',
      category: 'Civil Law',
      content: 'May utang sa akin na 50k pero ayaw magbayad. Pwede po ba sa small claims court? Ano po ang requirements at proseso? Salamat po sa makakasagot.',
      comments: 5,
    },
  ];

  const handleCommentPress = (postId: string) => {
    console.log(`Comment pressed for post ${postId}`);
    // TODO: Navigate to comments screen
  };

  const handleReportPress = (postId: string) => {
    console.log(`Report pressed for post ${postId}`);
    // TODO: Show report modal
  };

  const handlePostPress = (postId: string) => {
    console.log(`Post pressed for post ${postId}`);
    const route = context === 'lawyer' ? `/lawyer/ViewPost?postId=${postId}` : `/home/ViewPost?postId=${postId}`;
    router.push(route as any);
  };

  const handleCreatePost = () => {
    console.log('Create post pressed');
    const route = context === 'lawyer' ? '/lawyer/CreatePost' : '/home/CreatePost';
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      {/* Timeline */}
      <ScrollView 
        style={styles.timeline}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
      >
        {samplePosts.map((post) => (
          <Post
            key={post.id}
            id={post.id}
            user={post.user}
            timestamp={post.timestamp}
            category={post.category}
            content={post.content}
            comments={post.comments}
            onCommentPress={() => handleCommentPress(post.id)}
            onReportPress={() => handleReportPress(post.id)}
            onPostPress={() => handlePostPress(post.id)}
          />
        ))}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Create Post Button */}
      <TouchableOpacity style={styles.createPostButton} onPress={handleCreatePost} activeOpacity={0.8}>
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  timeline: {
    flex: 1,
  },
  timelineContent: {
    paddingVertical: 10, // Add some padding at the top and bottom
  },
  bottomSpacer: {
    height: 80, // Add a spacer at the bottom to prevent content from being hidden
  },
  createPostButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: Colors.primary.blue,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary.blue,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default Timeline; 