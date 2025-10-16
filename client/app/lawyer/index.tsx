import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from "react-native";
import { useRouter } from 'expo-router';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';
import { 
  Calendar, 
  ArrowUpRight,
  TrendingUp,
  Video,
  MapPin
} from "lucide-react-native";
import LawyerNavbar from '../../components/lawyer/LawyerNavbar';
import Header from '../../components/Header';
import ConsultationCalendar from '../../components/lawyer/ConsultationCalendar';
import { SidebarWrapper } from '../../components/AppSidebar';

const LawyerDashboard: React.FC = () => {
  const router = useRouter();

  const handleNotificationPress = () => {
    router.push('/notifications');
  };
  
  // Get current date and time in Philippine timezone
  const getCurrentDateTime = () => {
    const now = new Date();
    const phTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    
    const date = phTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const time = phTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    return { date, time };
  };

  const { date } = getCurrentDateTime();


  // Recent consultation data matching consultation_requests database schema
  const recentConsultations = [
    {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      lawyer_id: 'b2c3d4e5-f6g7-8901-bcde-f23456789012',
      client_name: 'Sarah Johnson',
      message: 'Need help reviewing employment contract terms and conditions',
      status: 'pending' as const,
      requested_at: '2024-01-15T10:30:00Z',
      responded_at: null,
      consultation_date: '2025-09-15',
      consultation_time: '14:00:00',
      mode: 'online' as const
    },
    {
      id: 'g58bd21c-69dd-5483-b678-1f13c3d4e580',
      user_id: 'c3d4e5f6-g7h8-9012-cdef-g34567890123',
      lawyer_id: 'b2c3d4e5-f6g7-8901-bcde-f23456789012',
      client_name: 'Michael Chen',
      message: 'Boundary dispute with neighbor regarding property lines',
      status: 'accepted' as const,
      requested_at: '2024-01-14T14:20:00Z',
      responded_at: '2024-01-14T15:30:00Z',
      consultation_date: '2025-09-16',
      consultation_time: '10:30:00',
      mode: 'onsite' as const
    },
    {
      id: 'h69ce32d-7aee-6594-c789-2g24d4e5f691',
      user_id: 'd4e5f6g7-h8i9-0123-defg-h45678901234',
      lawyer_id: 'b2c3d4e5-f6g7-8901-bcde-f23456789012',
      client_name: 'Emma Rodriguez',
      message: 'Custody arrangement questions after separation',
      status: 'completed' as const,
      requested_at: '2024-01-13T09:15:00Z',
      responded_at: '2024-01-13T10:00:00Z',
      consultation_date: '2025-09-14',
      consultation_time: '16:00:00',
      mode: 'online' as const
    }
  ];

  const quickStats = [
    { 
      label: 'Today\'s Consultations', 
      value: '5', 
      icon: Calendar, 
      color: '#059669',
      bgColor: '#ECFDF5',
      change: '+2 from yesterday',
      changeType: 'positive'
    },
    { 
      label: 'Total Consultations', 
      value: '127', 
      icon: TrendingUp, 
      color: '#0369A1',
      bgColor: '#EFF6FF',
      change: '+8 this month',
      changeType: 'positive'
    },
  ];



  return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <Header 
          variant="home"
          showMenu={true}
          showNotifications={true}
          onNotificationPress={handleNotificationPress}
        />
      
      <ScrollView style={tw`flex-1 pb-24`} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={tw`mx-6 mt-6 mb-6 p-6 bg-white rounded-2xl border border-gray-200`}>
          <View style={tw`flex-row items-center mb-3`}>
            <Calendar size={16} color="#6B7280" />
            <Text style={tw`text-sm text-gray-600 font-medium ml-2`}>{date}</Text>
          </View>
          
          <Text style={tw`text-2xl font-bold text-gray-900 mb-2`}>Good morning, Atty. Santos</Text>
          <Text style={tw`text-gray-600 text-base`}>Here&apos;s what&apos;s happening with your practice today</Text>
        </View>
        
        {/* Quick Stats */}
        <View style={tw`px-4 mb-6`}>
          <View style={tw`flex-row -mx-2`}>
            {quickStats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <TouchableOpacity key={index} style={tw`flex-1 px-2`} activeOpacity={0.7}>
                  <View style={tw`bg-white p-4 rounded-2xl border border-gray-200 h-36 justify-between`}>
                    <View style={tw`flex-row items-center justify-between mb-2`}>
                      <View style={[tw`w-10 h-10 rounded-xl justify-center items-center`, { backgroundColor: stat.bgColor }]}>
                        <IconComponent size={18} color={stat.color} strokeWidth={2.5} />
                      </View>
                      <View style={tw`flex-row items-center`}>
                        <ArrowUpRight size={12} color={stat.changeType === 'positive' ? '#059669' : '#DC2626'} strokeWidth={2} />
                      </View>
                    </View>
                    <View style={tw`flex-1 justify-center`}>
                      <Text style={tw`text-xl font-bold text-gray-900 mb-1`}>{stat.value}</Text>
                      <Text style={tw`text-xs text-gray-600 mb-1 leading-4`} numberOfLines={2}>{stat.label}</Text>
                    </View>
                    <Text style={tw`text-xs ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'} font-medium`} numberOfLines={1}>{stat.change}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Consultation Calendar */}
        <View style={tw`mx-4 mb-6`}>
          <ConsultationCalendar 
            consultations={recentConsultations.map(consultation => ({
              id: consultation.id,
              consultation_date: consultation.consultation_date,
              status: consultation.status,
              mode: consultation.mode,
              client_name: consultation.client_name,
              consultation_time: consultation.consultation_time,
              message: consultation.message
            }))}
            onDatePress={(date) => {
              console.log('Date pressed:', date);
              // Navigate to consultations for specific date
              router.push(`/lawyer/consult?date=${date}`);
            }}
            onConsultationPress={(consultationId) => {
              console.log('Consultation pressed:', consultationId);
              router.push(`/lawyer/consultation/${consultationId}`);
            }}
          />
        </View>

        {/* Recent Consultations */}
        <View style={tw`mx-4 mb-6 p-6 bg-white rounded-2xl border border-gray-200`}>
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <View>
              <Text style={tw`text-lg font-bold text-gray-900`}>Recent Activity</Text>
              <Text style={tw`text-sm text-gray-500 mt-1`}>Latest consultation requests</Text>
            </View>
            <TouchableOpacity style={[tw`px-4 py-2 rounded-lg`, { backgroundColor: '#E8F4FD' }]} activeOpacity={0.7}>
              <Text style={[tw`text-sm font-semibold`, { color: Colors.primary.blue }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <View>
            {recentConsultations.map((consultation, index) => {
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
              
              const getModeColor = (mode: string) => {
                switch (mode) {
                  case 'online':
                    return { bg: '#E8F4FD', text: Colors.primary.blue };
                  case 'onsite':
                    return { bg: '#F0FDF4', text: '#16A34A' };
                  default:
                    return { bg: '#F3F4F6', text: '#374151' };
                }
              };
              
              const statusStyle = getStatusColor(consultation.status);
              const modeStyle = getModeColor(consultation.mode);
              
              return (
                <TouchableOpacity 
                  key={consultation.id} 
                  style={[
                    tw`bg-white rounded-2xl border border-gray-200 p-4`, 
                    { marginBottom: index < recentConsultations.length - 1 ? 16 : 0 }
                  ]} 
                  activeOpacity={0.92}
                  onPress={() => {
                    console.log('Navigating to consultation:', consultation.id);
                    router.push(`/lawyer/consultation/${consultation.id}`);
                  }}
                >
                  {/* Header */}
                  <View style={tw`flex-row items-start justify-between mb-3`}>
                    <View style={tw`flex-1 mr-3`}>
                      <Text style={tw`text-base font-semibold text-gray-900 mb-1`}>
                        {consultation.client_name}
                      </Text>
                      <Text style={tw`text-sm text-gray-600`} numberOfLines={2}>
                        {consultation.message}
                      </Text>
                    </View>
                    
                    <View style={[
                      tw`px-3 py-1 rounded-full`,
                      { backgroundColor: statusStyle.bg }
                    ]}>
                      <Text style={[
                        tw`text-xs font-semibold uppercase`,
                        { color: statusStyle.text }
                      ]}>
                        {consultation.status}
                      </Text>
                    </View>
                  </View>

                  {/* Footer */}
                  <View style={tw`flex-row items-center justify-between`}>
                    <View style={tw`flex-row items-center`}>
                      <View style={[
                        tw`flex-row items-center px-2 py-1 rounded-full mr-3`,
                        { backgroundColor: modeStyle.bg }
                      ]}>
                        {consultation.mode === 'online' && <Video size={12} color={modeStyle.text} />}
                        {consultation.mode === 'onsite' && <MapPin size={12} color={modeStyle.text} />}
                        <Text style={[
                          tw`text-xs font-medium ml-1 capitalize`,
                          { color: modeStyle.text }
                        ]}>
                          {consultation.mode}
                        </Text>
                      </View>
                      
                      <View style={tw`flex-row items-center`}>
                        <Calendar size={12} color="#6B7280" />
                        <Text style={tw`text-xs text-gray-500 ml-1`}>
                          {new Date(consultation.consultation_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={tw`text-xs text-gray-400`}>View Details →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <LawyerNavbar activeTab="home" />
      <SidebarWrapper />
    </SafeAreaView>
  );
};

export default LawyerDashboard;
