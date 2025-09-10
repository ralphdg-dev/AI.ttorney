import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'tailwind-react-native-classnames';
import { LawyerRoute } from '../../components/auth/ProtectedRoute';
import LawyerNavbar from '../../components/lawyer/LawyerNavbar';
import LawyerTimeline from '../../components/lawyer/LawyerTimeline';
import RoleBasedHeader from '../../components/navigation/RoleBasedHeader';
import { Plus, MessageSquare, Users, TrendingUp } from 'lucide-react-native';

const LawyerForumPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'questions' | 'discussions' | 'cases'>('all');

  const stats = [
    { label: 'Active Discussions', value: '24', icon: MessageSquare, color: '#10B981' },
    { label: 'Legal Questions', value: '18', icon: Users, color: '#3B82F6' },
    { label: 'Case Studies', value: '12', icon: TrendingUp, color: '#8B5CF6' },
  ];

  const filters = [
    { id: 'all', label: 'All Posts' },
    { id: 'questions', label: 'Questions' },
    { id: 'discussions', label: 'Discussions' },
    { id: 'cases', label: 'Case Studies' },
  ];

  return (
    <LawyerRoute>
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <RoleBasedHeader variant="lawyer" />
        
        <ScrollView style={tw`flex-1 pb-24`} showsVerticalScrollIndicator={false}>
          {/* Forum Header */}
          <View style={tw`flex-row justify-between items-start px-5 py-5 bg-white border-b border-gray-200`}>
            <View style={tw`flex-1`}>
              <Text style={tw`text-3xl font-bold text-gray-900 mb-1`}>Legal Forum</Text>
              <Text style={tw`text-base text-gray-600 leading-6`}>Connect with fellow lawyers and share insights</Text>
            </View>
            
            <TouchableOpacity style={tw`flex-row items-center bg-blue-600 px-4 py-3 rounded-xl`}>
              <Plus size={20} color="white" strokeWidth={2} />
              <Text style={tw`text-white text-base font-semibold ml-2`}>New Post</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`px-5 mb-6`}>
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <View key={index} style={tw`bg-white p-4 rounded-xl mr-4 w-36 shadow-sm border border-gray-100`}>
                  <View style={tw`flex-row items-center justify-between mb-2`}>
                    <IconComponent size={20} color={stat.color} />
                    <Text style={tw`text-2xl font-bold text-gray-900`}>{stat.value}</Text>
                  </View>
                  <Text style={tw`text-sm text-gray-600 leading-5`}>{stat.label}</Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Filter Tabs */}
          <View style={tw`px-5 mb-6`}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-1`}>
              {filters.map((filterOption) => (
                <TouchableOpacity
                  key={filterOption.id}
                  style={tw`px-5 py-3 mx-1 rounded-full ${
                    filter === filterOption.id ? 'bg-blue-600' : 'bg-white border border-gray-200'
                  }`}
                  onPress={() => setFilter(filterOption.id as any)}
                >
                  <Text style={tw`text-sm font-medium ${
                    filter === filterOption.id ? 'text-white' : 'text-gray-700'
                  }`}>
                    {filterOption.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Timeline */}
          <View style={tw`flex-1`}>
            <LawyerTimeline filter={filter} />
          </View>
        </ScrollView>
        
        <LawyerNavbar activeTab="forum" />
      </SafeAreaView>
    </LawyerRoute>
  );
};

export default LawyerForumPage;
