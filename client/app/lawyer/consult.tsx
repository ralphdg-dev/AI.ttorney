import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageCircle, Video, Clock, Calendar, TrendingUp, MapPin } from 'lucide-react-native';
import LawyerNavbar from '../../components/lawyer/LawyerNavbar';
import Header from '../../components/Header';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';

interface ConsultationRequest {
  id: string;
  client: {
    name: string;
    avatar: string;
  };
  message: string;
  mode: 'onsite' | 'online';
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  requested_at: string | null;
  consultation_date: string | null;
  consultation_time: string | null;
  user_id: string | null;
  lawyer_id: string | null;
  responded_at?: string | null;
}

const LawyerConsultPage: React.FC = () => {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');

  const sampleRequests: ConsultationRequest[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      client: {
        name: 'Sarah Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      },
      message: 'I need urgent consultation regarding child custody modification due to changed circumstances. My ex-spouse has relocated and I need to understand my legal options.',
      mode: 'online',
      status: 'pending',
      requested_at: '2 hours ago',
      consultation_date: '2024-09-15',
      consultation_time: '14:30',
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      lawyer_id: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      client: {
        name: 'Michael Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      },
      message: 'I need help with contract review for a new partnership agreement. There are some liability concerns I want to discuss.',
      mode: 'onsite',
      status: 'accepted',
      requested_at: '4 hours ago',
      consultation_date: '2024-09-14',
      consultation_time: '15:00',
      user_id: '123e4567-e89b-12d3-a456-426614174002',
      lawyer_id: '123e4567-e89b-12d3-a456-426614174100',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      client: {
        name: 'Lisa Rodriguez',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      },
      message: 'Emergency consultation regarding arrest warrant and bail procedures. I need immediate legal guidance.',
      mode: 'online',
      status: 'completed',
      requested_at: '1 day ago',
      consultation_date: '2024-09-13',
      consultation_time: '10:00',
      user_id: '123e4567-e89b-12d3-a456-426614174003',
      lawyer_id: '123e4567-e89b-12d3-a456-426614174100',
    },
  ];

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'online':
        return Video;
      case 'onsite':
        return MapPin;
      default:
        return MessageCircle;
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'online':
        return { bg: '#E8F4FD', border: '#C1E4F7', text: Colors.primary.blue };
      case 'onsite':
        return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' };
      default:
        return { bg: '#F3F4F6', border: '#D1D5DB', text: '#374151' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'accepted':
        return { bg: '#E8F4FD', text: Colors.primary.blue };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#991B1B' };
      case 'completed':
        return { bg: '#D1FAE5', text: '#065F46' };
      default:
        return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  const filteredRequests = filter === 'all' ? sampleRequests : sampleRequests.filter(req => req.status === filter);

  const handleRequestPress = (requestId: string) => {
    console.log(`Consultation request ${requestId} pressed`);
    router.push(`/lawyer/consultation/${requestId}`);
  };

  const handleAcceptRequest = (requestId: string, event?: any) => {
    if (event) {
      event.stopPropagation();
    }
    console.log(`Accept consultation ${requestId}`);
    // TODO: Accept consultation request
  };

  const handleCompleteRequest = (requestId: string, event?: any) => {
    if (event) {
      event.stopPropagation();
    }
    console.log('Mark session completed', requestId);
    // TODO: Mark consultation as completed
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <Header 
        variant="lawyer-consult"
        title="Consultations"
        showSearch={true}
        onSearchPress={() => console.log('Search consultations')}
      />
      
      <ScrollView 
        style={tw`flex-1`}
        contentContainerStyle={tw`pb-24`}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Stats Grid */}
        <View style={tw`px-4 pt-6 pb-2`}>
          <Text style={tw`text-xl font-bold text-gray-900 mb-4`}>Overview</Text>
          <View style={tw`flex-row flex-wrap -mr-3`}>
            <View style={[tw`bg-white rounded-xl p-4 flex-1 border border-gray-100 mr-3 mb-3`, { minWidth: 144, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }]}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <View style={[tw`p-2 rounded-lg`, { backgroundColor: '#FED7AA' }]}>
                  <Clock size={20} color="#EA580C" />
                </View>
                <Text style={tw`text-2xl font-bold text-gray-900`}>12</Text>
              </View>
              <Text style={tw`text-sm font-medium text-gray-600`}>Pending Requests</Text>
              <Text style={[tw`text-xs mt-1`, { color: '#EA580C' }]}>+3 from yesterday</Text>
            </View>
            
            <View style={[tw`bg-white rounded-xl p-4 flex-1 border border-gray-100 mr-3 mb-3`, { minWidth: 144, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }]}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <View style={[tw`p-2 rounded-lg`, { backgroundColor: '#E8F4FD' }]}>
                  <Calendar size={20} color={Colors.primary.blue} />
                </View>
                <Text style={tw`text-2xl font-bold text-gray-900`}>8</Text>
              </View>
              <Text style={tw`text-sm font-medium text-gray-600`}>Today&apos;s Sessions</Text>
              <Text style={[tw`text-xs mt-1`, { color: Colors.primary.blue }]}>Next at 2:00 PM</Text>
            </View>
          </View>
          
          <View style={tw`flex-row flex-wrap -mr-3 mt-3`}>
            <View style={[tw`bg-white rounded-xl p-4 flex-1 border border-gray-100 mr-3`, { minWidth: 144, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }]}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <View style={[tw`p-2 rounded-lg`, { backgroundColor: '#DCFCE7' }]}>
                  <TrendingUp size={20} color="#16A34A" />
                </View>
                <Text style={tw`text-2xl font-bold text-gray-900`}>24</Text>
              </View>
              <Text style={tw`text-sm font-medium text-gray-600`}>Completed</Text>
              <Text style={tw`text-xs text-green-600 mt-1`}>This month</Text>
            </View>
            
            <View style={[tw`bg-white rounded-xl p-4 flex-1 border border-gray-100 mr-3`, { minWidth: 144, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }]}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <View style={[tw`p-2 rounded-lg`, { backgroundColor: '#F3E8FF' }]}>
                  <MessageCircle size={20} color="#7C3AED" />
                </View>
                <Text style={tw`text-2xl font-bold text-gray-900`}>156</Text>
              </View>
              <Text style={tw`text-sm font-medium text-gray-600`}>Total Requests</Text>
              <Text style={tw`text-xs text-purple-600 mt-1`}>All time</Text>
            </View>
          </View>
        </View>

        {/* Enhanced Filter Tabs */}
        <View style={tw`px-4 py-4`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-1`}>
            <View style={tw`flex-row -mr-3`}>
              {['all', 'pending', 'accepted', 'completed'].map((filterOption) => (
                <TouchableOpacity
                  key={filterOption}
                  style={[
                    tw`px-5 py-3 rounded-full border mr-3`,
                    { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' },
                    filter === filterOption 
                      ? [tw`border-0`, { backgroundColor: Colors.primary.blue }] 
                      : tw`bg-white border-gray-200`
                  ]}
                  onPress={() => setFilter(filterOption as 'all' | 'pending' | 'accepted' | 'completed')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    tw`text-sm font-semibold capitalize`,
                    filter === filterOption 
                      ? tw`text-white` 
                      : tw`text-gray-700`
                  ]}>
                    {filterOption === 'all' ? 'All Requests' : filterOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Enhanced Consultation Cards */}
        <View style={tw`px-4`}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <Text style={tw`text-lg font-bold text-gray-900`}>
              {filter === 'all' ? 'All Requests' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Requests`}
            </Text>
            <Text style={tw`text-sm text-gray-500`}>
              {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
            </Text>
          </View>
          
          {filteredRequests.map((request) => {
            const ModeIcon = getModeIcon(request.mode);
            const modeStyle = getModeColor(request.mode);
            const statusStyle = getStatusColor(request.status);
            
            return (
              <View
                key={request.id}
                style={[tw`bg-white rounded-2xl p-5 mb-4 border border-gray-100`, { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }]}
              >
                {/* Enhanced Header */}
                <View style={tw`flex-row items-start justify-between mb-4`}>
                  <View style={tw`flex-row items-center flex-1 mr-3`}>
                    <View style={tw`relative`}>
                      <Image 
                        source={{ uri: request.client.avatar }} 
                        style={tw`w-12 h-12 rounded-full`}
                      />
                      {request.status === 'pending' && (
                        <View style={[tw`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white`, { backgroundColor: '#F97316' }]} />
                      )}
                    </View>
                    
                    <View style={tw`ml-3 flex-1`}>
                      <View style={tw`flex-row items-center mb-1`}>
                        <Text style={tw`text-base font-semibold text-gray-900 mr-2`}>
                          {request.client.name}
                        </Text>
                      </View>
                      <Text style={tw`text-sm text-gray-600 font-medium`} accessibilityLabel={`Consultation request from ${request.client.name}`}>Consultation Request</Text>
                    </View>
                  </View>
                  
                  <View style={tw`items-end`}>
                    <View style={[
                      tw`px-3 py-1 rounded-full`,
                      { backgroundColor: statusStyle.bg }
                    ]}>
                      <Text style={[
                        tw`text-xs font-semibold uppercase`,
                        { color: statusStyle.text }
                      ]}>
                        {request.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Message */}
                <Text style={tw`text-sm text-gray-700 leading-5 mb-4`} numberOfLines={2} accessibilityLabel={`Message: ${request.message}`}>
                  {request.message}
                </Text>

                {/* Enhanced Footer */}
                <View style={tw`flex-row items-center justify-between mb-3`}>
                  <View style={tw`flex-row items-center flex-wrap`}>
                    {/* Consultation Mode */}
                    <View style={[
                      tw`flex-row items-center px-3 py-1 rounded-full border`,
                      {
                        backgroundColor: modeStyle.bg,
                        borderColor: modeStyle.border,
                      }
                    ]}>
                      <ModeIcon size={12} color={modeStyle.text} />
                      <Text style={[
                        tw`text-xs font-medium ml-1 capitalize`,
                        { color: modeStyle.text }
                      ]}>
                        {request.mode}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Time and Duration */}
                  <View style={tw`items-end flex-shrink-0`}>
                    <View style={tw`flex-row items-center mb-1`}>
                      <Clock size={12} color="#6B7280" />
                      <Text style={tw`text-gray-500 text-xs ml-1`}>
                        {request.requested_at}
                      </Text>
                    </View>
                    <Text style={[tw`text-xs font-semibold`, { color: Colors.primary.blue }]}>
                      Requested
                    </Text>
                  </View>
                </View>

                {/* Preferred Date and Time */}
                {(request.consultation_date || request.consultation_time) && (
                  <View style={tw`bg-gray-50 rounded-lg p-3 mb-3`}>
                    <Text style={tw`text-xs font-semibold text-gray-600 mb-2`}>Client&apos;s Preferred Schedule:</Text>
                    <View style={tw`flex-row items-center justify-between`}>
                      {request.consultation_date && (
                        <View style={tw`flex-row items-center`}>
                          <Calendar size={14} color="#6B7280" />
                          <Text style={tw`text-sm text-gray-700 ml-2 font-medium`}>
                            {new Date(request.consultation_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </Text>
                        </View>
                      )}
                      {request.consultation_time && (
                        <View style={tw`flex-row items-center`}>
                          <Clock size={14} color="#6B7280" />
                          <Text style={tw`text-sm text-gray-700 ml-2 font-medium`}>
                            {new Date(`2000-01-01T${request.consultation_time}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                {request.status === 'pending' && (
                  <TouchableOpacity
                    style={[tw`py-3 rounded-xl mt-2`, { backgroundColor: Colors.primary.blue, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }]}
                    onPress={(event) => handleAcceptRequest(request.id, event)}
                    accessibilityLabel={`Accept consultation request from ${request.client.name}`}
                    accessibilityRole="button"
                    activeOpacity={0.85}
                  >
                    <Text style={tw`text-white text-center font-semibold text-sm`}>
                      Accept Consultation
                    </Text>
                  </TouchableOpacity>
                )}
                
                {request.status === 'accepted' && (
                  <TouchableOpacity 
                    style={[tw`bg-green-600 py-3 rounded-xl mt-2`, { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }]}
                    onPress={(event) => handleCompleteRequest(request.id, event)}
                    accessibilityLabel={`Mark consultation with ${request.client.name} as completed`}
                    accessibilityRole="button"
                    activeOpacity={0.85}
                  >
                    <Text style={tw`text-white text-center font-semibold text-sm`}>Mark Session Completed</Text>
                  </TouchableOpacity>
                )}
                
                {/* View Details Button */}
                <TouchableOpacity
                  style={tw`bg-gray-100 py-3 rounded-xl mt-3 border border-gray-200`}
                  onPress={() => handleRequestPress(request.id)}
                  accessibilityLabel={`View consultation details for ${request.client.name}`}
                  accessibilityRole="button"
                  activeOpacity={0.7}
                >
                  <Text style={tw`text-gray-700 text-center font-semibold text-sm`}>
                    View Details
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <LawyerNavbar activeTab="consult" />
    </SafeAreaView>
  );
};


export default LawyerConsultPage;
