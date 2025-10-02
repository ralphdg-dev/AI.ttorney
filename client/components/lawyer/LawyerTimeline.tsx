import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Post from '../home/Post';
import Colors from '../../constants/Colors';
import { Database } from '../../types/database.types';

type ForumPost = Database['public']['Tables']['forum_posts']['Row'];
type User = Database['public']['Tables']['users']['Row'];

type ForumPostWithUser = ForumPost & {
  user: User;
  reply_count: number;
};

const LawyerTimeline: React.FC = () => {
  const router = useRouter();

  // Sample data for demonstration using forum_posts schema
  const samplePosts: ForumPostWithUser[] = [
    {
      id: 'post_001',
      title: 'Need urgent legal advice regarding protest-related charges',
      body: 'Hello po, baka may makasagot agad. Na-involve po ako sa protest actions at ngayon may kaso na akong rebellion at tinatangka pa akong kasuhan ng arson dahil daw sa mga nangyari during the rally. Hindi ko alam kung ano ang dapat kong gawin. May lawyer po ba na pwedeng mag-advise?',
      domain: 'criminal',
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      updated_at: null,
      user_id: 'user_001',
      is_anonymous: false,
      is_flagged: false,
      user: {
        id: 'user_001',
        email: 'ralph@example.com',
        username: 'twizt3rfries',
        full_name: 'Ralph de Guzman',
        role: 'registered_user',
        is_verified: true,
        birthdate: null,
        created_at: null,
        updated_at: null,
      },
      reply_count: 3,
    },
    {
      id: 'post_002',
      title: 'NCAP violation - not the actual driver',
      body: 'Hello po! Nahuli daw ako ng NCAP pero hindi ako ang driver ng sasakyan. May way po ba para ma-contest ito? Wala rin akong sasakyan sa pangalan ko.',
      domain: 'civil',
      created_at: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
      updated_at: null,
      user_id: 'user_002',
      is_anonymous: true,
      is_flagged: false,
      user: {
        id: 'user_002',
        email: 'anon@example.com',
        username: 'anonymous',
        full_name: 'Anonymous User',
        role: 'registered_user',
        is_verified: true,
        birthdate: null,
        created_at: null,
        updated_at: null,
      },
      reply_count: 12,
    },
    {
      id: 'post_003',
      title: 'Child support without marriage',
      body: 'Pwede po ba akong humingi ng child support kahit hindi kami kasal ng nanay ng anak ko? May anak kami pero hindi kami nagpakasal. Ano po ang dapat kong gawin para sa anak namin?',
      domain: 'family',
      created_at: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
      updated_at: null,
      user_id: 'user_003',
      is_anonymous: false,
      is_flagged: false,
      user: {
        id: 'user_003',
        email: 'lebron@example.com',
        username: 'lebbyjames',
        full_name: 'LeBron James',
        role: 'registered_user',
        is_verified: true,
        birthdate: null,
        created_at: null,
        updated_at: null,
      },
      reply_count: 2,
    },
    {
      id: 'post_004',
      title: 'Final pay not released after 2 months',
      body: 'Nagresign po ako nang maayos at may clearance na, pero hanggang ngayon wala pa rin akong natatanggap na back pay o final pay. 2 months na po. Ano po dapat kong gawin para ma-claim ito?',
      domain: 'labor',
      created_at: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
      updated_at: null,
      user_id: 'user_004',
      is_anonymous: false,
      is_flagged: false,
      user: {
        id: 'user_004',
        email: 'willie@example.com',
        username: 'pengej4cket',
        full_name: 'Willie Revillame',
        role: 'registered_user',
        is_verified: true,
        birthdate: null,
        created_at: null,
        updated_at: null,
      },
      reply_count: 2,
    },
    {
      id: 'post_005',
      title: 'Small claims court for 50k debt',
      body: 'May utang sa akin na 50k pero ayaw magbayad. Pwede po ba sa small claims court? Ano po ang requirements at proseso? Salamat po sa makakasagot.',
      domain: 'civil',
      created_at: new Date(Date.now() - 28800000).toISOString(), // 8 hours ago
      updated_at: null,
      user_id: 'user_005',
      is_anonymous: false,
      is_flagged: false,
      user: {
        id: 'user_005',
        email: 'juan@example.com',
        username: 'juan.dc',
        full_name: 'Juan Dela Cruz',
        role: 'registered_user',
        is_verified: true,
        birthdate: null,
        created_at: null,
        updated_at: null,
      },
      reply_count: 5,
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
    router.push(`/lawyer/ViewPost?postId=${postId}` as any);
  };

  const handleCreatePost = () => {
    console.log('Create post pressed');
    router.push('/lawyer/CreatePost' as any);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Timeline */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {samplePosts.map((post) => {
          // Convert database timestamp to relative time
          const getRelativeTime = (timestamp: string) => {
            const now = new Date();
            const postTime = new Date(timestamp);
            const diffMs = now.getTime() - postTime.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            
            if (diffHours < 1) return 'now';
            if (diffHours < 24) return `${diffHours}h`;
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays}d`;
          };

          // Convert domain to display category
          const getDomainDisplayName = (domain: string | null) => {
            if (!domain) return 'General';
            switch (domain) {
              case 'criminal': return 'Criminal Law';
              case 'civil': return 'Civil Law';
              case 'family': return 'Family Law';
              case 'labor': return 'Labor Law';
              case 'consumer': return 'Consumer Law';
              default: return 'General';
            }
          };

          return (
            <Post
              key={post.id}
              id={post.id}
              user={{
                name: post.user.full_name || post.user.username,
                username: post.user.username,
                avatar: `https://images.unsplash.com/photo-${Math.random() > 0.5 ? '1472099645785-5658abf4ff4e' : '1507003211169-0a1dd7228f2d'}?w=150&h=150&fit=crop&crop=face`,
              }}
              timestamp={getRelativeTime(post.created_at || '')}
              category={getDomainDisplayName(post.domain)}
              content={post.body}
              comments={post.reply_count}
              onCommentPress={() => handleCommentPress(post.id)}
              onReportPress={() => handleReportPress(post.id)}
              onPostPress={() => handlePostPress(post.id)}
            />
          );
        })}
        <View className="h-20" />
      </ScrollView>

      {/* Floating Create Post Button */}
      <TouchableOpacity 
        style={[
          {
            position: 'absolute',
            bottom: 80,
            right: 20,
            backgroundColor: Colors.primary.blue,
            width: 56,
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: `0 4px 8px ${Colors.primary.blue}30`,
            elevation: 8,
          }
        ]} 
        onPress={handleCreatePost} 
        activeOpacity={0.8}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

export default LawyerTimeline;
