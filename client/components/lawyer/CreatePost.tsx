import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'tailwind-react-native-classnames';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

const LawyerCreatePost: React.FC = () => {
  const router = useRouter();
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'family' | 'criminal' | 'civil' | 'labor' | 'consumer' | 'others' | ''>('');
  
  const categories = [
    { id: 'family' as const, name: 'Family Law' },
    { id: 'criminal' as const, name: 'Criminal Law' },
    { id: 'civil' as const, name: 'Civil Law' },
    { id: 'labor' as const, name: 'Labor Law' },
    { id: 'consumer' as const, name: 'Consumer Law' },
    { id: 'others' as const, name: 'Others' },
  ];

  const handleBack = () => {
    router.back();
  };

  const handlePost = () => {
    if (!selectedCategory || !postContent.trim() || !postTitle.trim()) return;
    
    // Create post using new database schema
    const newPost = {
      id: String(Date.now()),
      title: postTitle.trim(),
      body: postContent.trim(),
      domain: selectedCategory,
      created_at: new Date().toISOString(),
      updated_at: null,
      user_id: 'lawyer_current', // Current logged-in lawyer
      is_anonymous: false,
      is_flagged: false,
      user: {
        name: 'Atty. Maria Santos', // Current logged-in lawyer
        username: 'attymaria',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        isLawyer: true,
        lawyerBadge: 'Verified Lawyer',
      },
      comments: 0
    };
    
    // TODO: Hook this up to backend API
    console.log('Creating new forum post:', newPost);
    router.back();
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-200`}>
        <TouchableOpacity onPress={handleBack} style={tw`p-2 -ml-2`}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={tw`text-xl font-bold text-gray-900`}>Create Post</Text>
        <View style={tw`w-10`} />
      </View>

      {/* Lawyer Notice */}
      <View style={tw`flex-row items-center bg-green-100 px-5 py-4 border-b border-green-200`}>
        <Ionicons name="shield-checkmark" size={16} color="#059669" />
        <Text style={tw`ml-2 text-sm font-medium text-green-600`}>
          Posting as a verified lawyer. Your advice will be marked with a lawyer badge.
        </Text>
      </View>

      {/* Categories */}
      <View style={tw`flex-1 px-5 py-6`}>
        <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
          {/* Category Selection */}
          <View style={tw`mb-6`}>
            <Text style={tw`text-lg font-semibold text-gray-900 mb-3`}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-1`}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={tw`px-4 py-2 mx-1 rounded-full ${
                    selectedCategory === cat.id ? 'bg-blue-600' : 'bg-gray-100'
                  }`}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={tw`text-sm font-medium ${
                    selectedCategory === cat.id ? 'text-white' : 'text-gray-700'
                  }`}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Post Title */}
          <View style={tw`mb-6`}>
            <Text style={tw`text-lg font-semibold text-gray-900 mb-3`}>Title</Text>
            <TextInput
              style={tw`bg-white border border-gray-200 rounded-xl p-4 text-base text-gray-900`}
              placeholder="Enter a descriptive title for your post..."
              placeholderTextColor="#9CA3AF"
              value={postTitle}
              onChangeText={setPostTitle}
              maxLength={100}
            />
            <Text style={tw`text-sm text-gray-500 mt-2 text-right`}>
              {postTitle.length}/100 characters
            </Text>
          </View>

          {/* Post Content */}
          <View style={tw`mb-6`}>
            <Text style={tw`text-lg font-semibold text-gray-900 mb-3`}>Content</Text>
            <TextInput
              style={tw`bg-white border border-gray-200 rounded-xl p-4 text-base text-gray-900 min-h-32`}
              placeholder="Share your legal question, insight, or start a discussion..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={8}
              value={postContent}
              onChangeText={setPostContent}
              textAlignVertical="top"
            />
            <Text style={tw`text-sm text-gray-500 mt-2 text-right`}>
              {postContent.length}/1000 characters
            </Text>
          </View>

          {/* Post Button */}
          <TouchableOpacity 
            style={tw`flex-row items-center justify-center py-4 px-6 rounded-xl ${
              (!selectedCategory || !postContent.trim() || !postTitle.trim()) ? 'bg-gray-300' : 'bg-blue-600'
            }`}
            onPress={handlePost}
            disabled={!selectedCategory || !postContent.trim() || !postTitle.trim()}
          >
            <Text style={tw`text-white text-base font-semibold`}>Post to Forum</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Disclaimer */}
      <View style={tw`bg-yellow-100 px-5 py-4 border-t border-yellow-200`}>
        <Text style={tw`text-sm font-medium text-yellow-600 text-center`}>
          Remember: This advice is for general information only and does not constitute attorney-client relationship.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default LawyerCreatePost;
