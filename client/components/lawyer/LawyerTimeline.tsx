import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import { Plus } from 'lucide-react-native';
import LawyerPost from './LawyerPost';

interface PostData {
  id: string;
  title: string;
  body: string;
  domain: 'family' | 'criminal' | 'civil' | 'labor' | 'consumer' | 'others' | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  is_anonymous: boolean | null;
  is_flagged: boolean | null;
  user?: {
    name: string;
    username: string;
    avatar: string;
    isLawyer: boolean;
    lawyerBadge?: string;
  };
  comments?: number;
}

interface LawyerTimelineProps {
  filter?: 'all' | 'questions' | 'discussions' | 'cases';
}

const LawyerTimeline: React.FC<LawyerTimelineProps> = ({ filter = 'all' }) => {

  // Sample data matching forum_posts schema
  const samplePosts: PostData[] = [
    {
      id: '1',
      title: 'Important Family Code Amendment Updates',
      body: 'Important update on the new Family Code amendments. All practitioners should be aware of the changes in custody arrangements effective this month.',
      domain: 'family',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: null,
      user_id: 'lawyer_001',
      is_anonymous: false,
      is_flagged: false,
      user: {
        name: 'Atty. Maria Santos',
        username: '@maria_santos',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        isLawyer: true,
        lawyerBadge: 'Family Law Specialist'
      },
      comments: 24
    },
    {
      id: '2',
      title: 'Traffic Violation - Need Legal Advice',
      body: 'I need advice regarding a traffic violation case. The officer claims I was speeding but I have dashcam footage showing otherwise. What are my options?',
      domain: 'criminal',
      created_at: '2024-01-15T06:30:00Z',
      updated_at: null,
      user_id: 'user_002',
      is_anonymous: false,
      is_flagged: false,
      user: {
        name: 'John Doe',
        username: '@johndoe',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        isLawyer: false
      },
      comments: 12
    },
    {
      id: '3',
      title: 'SEC Compliance Best Practices for Startups',
      body: 'Discussion: Best practices for handling SEC compliance in startup companies. Share your experiences and insights.',
      domain: 'civil',
      created_at: '2024-01-15T04:30:00Z',
      updated_at: null,
      user_id: 'lawyer_003',
      is_anonymous: false,
      is_flagged: false,
      user: {
        name: 'Atty. Robert Chen',
        username: '@robert_chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        isLawyer: true,
        lawyerBadge: 'Corporate Law Expert'
      },
      comments: 18
    },
    {
      id: '4',
      title: 'Overtime Compensation Issue',
      body: 'My employer is asking me to work overtime without proper compensation. Is this legal? What steps should I take?',
      domain: 'labor',
      created_at: '2024-01-15T02:30:00Z',
      updated_at: null,
      user_id: 'user_004',
      is_anonymous: false,
      is_flagged: false,
      user: {
        name: 'Sarah Kim',
        username: '@sarahkim',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        isLawyer: false
      },
      comments: 31
    },
    {
      id: '5',
      title: 'Criminal Defense Case Study',
      body: 'Case study: Successfully defended a client against false accusations. Key strategies that made the difference in court.',
      domain: 'criminal',
      created_at: '2024-01-14T10:30:00Z',
      updated_at: null,
      user_id: 'lawyer_005',
      is_anonymous: false,
      is_flagged: false,
      user: {
        name: 'Atty. Lisa Rodriguez',
        username: '@lisa_rodriguez',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
        isLawyer: true,
        lawyerBadge: 'Criminal Defense Attorney'
      },
      comments: 45
    },
    {
      id: '6',
      title: 'Defective Product Refund Rights',
      body: 'Bought a defective product online. The seller refuses to refund or replace. What are my rights as a consumer?',
      domain: 'consumer',
      created_at: '2024-01-14T10:30:00Z',
      updated_at: null,
      user_id: 'user_006',
      is_anonymous: false,
      is_flagged: false,
      user: {
        name: 'Mike Johnson',
        username: '@mikejohnson',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        isLawyer: false
      },
      comments: 8
    }
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
    // TODO: Show ViewPost component as modal or navigate to dedicated page
  };

  const handleCreatePost = () => {
    console.log('Create lawyer post pressed');
    // TODO: Show CreatePost component as modal or navigate to dedicated page
  };

  // Filter posts based on the filter prop
  const filteredPosts = samplePosts.filter(post => {
    if (filter === 'all') return true;
    if (filter === 'questions') return !post.user?.isLawyer;
    if (filter === 'discussions') return post.user?.isLawyer;
    if (filter === 'cases') return post.domain?.includes('criminal') || post.domain?.includes('civil');
    return true;
  });

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Timeline */}
      <ScrollView 
        style={tw`flex-1`}
        contentContainerStyle={tw`py-2`}
        showsVerticalScrollIndicator={false}
      >
        {filteredPosts.map((post) => (
          <LawyerPost
            key={post.id}
            id={post.id}
            title={post.title}
            body={post.body}
            domain={post.domain}
            created_at={post.created_at}
            updated_at={post.updated_at}
            user_id={post.user_id}
            is_anonymous={post.is_anonymous}
            is_flagged={post.is_flagged}
            user={post.user}
            comments={post.comments}
            onCommentPress={() => handleCommentPress(post.id)}
            onReportPress={() => handleReportPress(post.id)}
            onPostPress={() => handlePostPress(post.id)}
          />
        ))}
        <View style={tw`h-20`} />
      </ScrollView>

      {/* Floating Create Post Button */}
      <TouchableOpacity style={tw`absolute bottom-20 right-5 bg-blue-600 w-14 h-14 rounded-full justify-center items-center shadow-lg`} onPress={handleCreatePost} activeOpacity={0.8}>
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};


export default LawyerTimeline;
