import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from "react-native";
import tw from 'tailwind-react-native-classnames';
import { 
  Calendar, 
  CheckCircle, 
  ArrowUpRight,
  TrendingUp,
  Clock,
  Activity,
  Video,
  MapPin
} from "lucide-react-native";
import { LawyerRoute } from '../../components/auth/ProtectedRoute';
import LawyerNavbar from '../../components/lawyer/LawyerNavbar';
import Header from '../../components/Header';

const LawyerDashboard: React.FC = () => {
  
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

  // Sample consultation data matching database schema
  const consultationStats = {
    pending: 8,
    accepted: 12,
    completed: 45,
    rejected: 3,
    total: 68
  };

  const recentConsultations = [
    {
      id: 1,
      user_id: 'user123',
      lawyer_id: 'lawyer456',
      consultation_type: 'legal_advice',
      legal_issue: 'Contract Review',
      description: 'Need help reviewing employment contract terms and conditions',
      status: 'pending',
      created_at: '2024-01-15T10:30:00Z',
      consultation_date: '2024-01-18',
      consultation_time: '14:00:00',
      mode: 'online',
      client_name: 'Maria Santos'
    },
    {
      id: 2,
      user_id: 'user124',
      lawyer_id: 'lawyer456',
      consultation_type: 'document_review',
      legal_issue: 'Property Dispute',
      description: 'Boundary dispute with neighbor regarding property lines',
      status: 'accepted',
      created_at: '2024-01-14T14:20:00Z',
      consultation_date: '2024-01-17',
      consultation_time: '10:30:00',
      mode: 'onsite',
      client_name: 'Juan Dela Cruz'
    },
    {
      id: 3,
      user_id: 'user125',
      lawyer_id: 'lawyer456',
      consultation_type: 'legal_consultation',
      legal_issue: 'Family Law',
      description: 'Custody arrangement questions after separation',
      status: 'completed',
      created_at: '2024-01-13T09:15:00Z',
      consultation_date: '2024-01-15',
      consultation_time: '16:00:00',
      mode: 'online',
      client_name: 'Ana Rodriguez'
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
    <LawyerRoute>
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <Header 
          variant="home"
          showMenu={true}
          showNotifications={true}
        />
        
        <ScrollView style={tw`flex-1 pb-24`} showsVerticalScrollIndicator={false}>
          {/* Welcome Section */}
          <View style={tw`mx-6 mt-6 mb-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm`}>
            <View style={tw`flex-row items-center mb-3`}>
              <Calendar size={16} color="#6B7280" />
              <Text style={tw`text-sm text-gray-600 font-medium ml-2`}>{date}</Text>
            </View>
            
            <Text style={tw`text-2xl font-bold text-gray-900 mb-2`}>Good morning, Atty. Santos</Text>
            <Text style={tw`text-gray-600 text-base`}>Here&apos;s what&apos;s happening with your practice today</Text>
          </View>
          
          {/* Quick Stats */}
          <View style={tw`px-6 mb-6`}>
            <View style={tw`flex-row -mx-2`}>
              {quickStats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <TouchableOpacity key={index} style={tw`flex-1 px-2`} activeOpacity={0.7}>
                    <View style={tw`bg-white p-4 rounded-2xl border border-gray-100 h-36 justify-between`}>
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

          {/* Consultation Status */}
          <View style={tw`mx-6 mb-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm`}>
            <View style={tw`flex-row justify-between items-center mb-6`}>
              <View>
                <Text style={tw`text-lg font-bold text-gray-900`}>Consultation Overview</Text>
                <Text style={tw`text-sm text-gray-500 mt-1`}>Current consultation status</Text>
              </View>
              <TouchableOpacity style={tw`px-4 py-2 bg-blue-50 rounded-lg`} activeOpacity={0.7}>
                <Text style={tw`text-blue-600 text-sm font-semibold`}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={tw`bg-gray-50 p-6 rounded-2xl border border-gray-100`}>
              <View style={tw`flex-row justify-between mb-4`}>
                <View style={tw`flex-1 items-center`}>
                  <View style={tw`w-16 h-16 bg-blue-100 rounded-2xl justify-center items-center mb-3`}>
                    <Clock size={24} color="#2563EB" strokeWidth={2} />
                  </View>
                  <Text style={tw`text-2xl font-bold text-gray-900 mb-1`}>{consultationStats.pending}</Text>
                  <Text style={tw`text-sm text-gray-600 font-medium`}>Pending</Text>
                </View>
                <View style={tw`flex-1 items-center`}>
                  <View style={tw`w-16 h-16 bg-yellow-100 rounded-2xl justify-center items-center mb-3`}>
                    <Activity size={24} color="#D97706" strokeWidth={2} />
                  </View>
                  <Text style={tw`text-2xl font-bold text-gray-900 mb-1`}>{consultationStats.accepted}</Text>
                  <Text style={tw`text-sm text-gray-600 font-medium`}>Accepted</Text>
                </View>
                <View style={tw`flex-1 items-center`}>
                  <View style={tw`w-16 h-16 bg-green-100 rounded-2xl justify-center items-center mb-3`}>
                    <CheckCircle size={24} color="#059669" strokeWidth={2} />
                  </View>
                  <Text style={tw`text-2xl font-bold text-gray-900 mb-1`}>{consultationStats.completed}</Text>
                  <Text style={tw`text-sm text-gray-600 font-medium`}>Completed</Text>
                </View>
              </View>
              
              {/* Progress Bar */}
              <View style={tw`mt-4`}>
                <View style={tw`flex-row justify-between mb-2`}>
                  <Text style={tw`text-xs text-gray-500 font-medium`}>Total: {consultationStats.total} consultations</Text>
                  <Text style={tw`text-xs text-gray-500 font-medium`}>{Math.round((consultationStats.completed / consultationStats.total) * 100)}% completed</Text>
                </View>
                <View style={tw`h-2 bg-gray-200 rounded-full overflow-hidden`}>
                  <View style={tw`flex-row h-full`}>
                    <View style={[tw`bg-blue-500`, { width: `${(consultationStats.pending / consultationStats.total) * 100}%` }]} />
                    <View style={[tw`bg-yellow-400`, { width: `${(consultationStats.accepted / consultationStats.total) * 100}%` }]} />
                    <View style={[tw`bg-green-500`, { width: `${(consultationStats.completed / consultationStats.total) * 100}%` }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Recent Consultations */}
          <View style={tw`mx-6 mb-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm`}>
            <View style={tw`flex-row justify-between items-center mb-6`}>
              <View>
                <Text style={tw`text-lg font-bold text-gray-900`}>Recent Activity</Text>
                <Text style={tw`text-sm text-gray-500 mt-1`}>Latest consultation requests</Text>
              </View>
              <TouchableOpacity style={tw`px-4 py-2 bg-blue-50 rounded-lg`} activeOpacity={0.7}>
                <Text style={tw`text-blue-600 text-sm font-semibold`}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <View>
              {recentConsultations.map((consultation, index) => (
                <TouchableOpacity 
                  key={consultation.id} 
                  style={[
                    tw`bg-white rounded-3xl border border-gray-100 shadow-sm`, 
                    { marginBottom: index < recentConsultations.length - 1 ? 20 : 0 }
                  ]} 
                  activeOpacity={0.95}
                >
                  <View style={tw`p-6`}>
                    {/* Header */}
                    <View style={tw`flex-row justify-between items-start mb-4`}>
                      <View style={tw`flex-1 mr-4`}>
                        <Text style={tw`text-lg font-bold text-gray-900 mb-1`}>
                          {consultation.client_name}
                        </Text>
                        <Text style={tw`text-sm text-gray-500 font-medium`}>
                          {consultation.legal_issue}
                        </Text>
                      </View>
                      
                      <View style={tw`px-4 py-2 rounded-full ${
                        consultation.status === 'completed' ? 'bg-green-50 border border-green-200' :
                        consultation.status === 'pending' ? 'bg-blue-50 border border-blue-200' : 
                        consultation.status === 'accepted' ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'
                      }`}>
                        <Text style={tw`text-xs font-semibold ${
                          consultation.status === 'completed' ? 'text-green-700' :
                          consultation.status === 'pending' ? 'text-blue-700' : 
                          consultation.status === 'accepted' ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {consultation.status === 'accepted' ? 'Accepted' : 
                           consultation.status === 'completed' ? 'Completed' : 
                           consultation.status === 'rejected' ? 'Rejected' : 'Pending'}
                        </Text>
                      </View>
                    </View>

                    {/* Consultation Details */}
                    <View style={tw`bg-gray-50 rounded-2xl p-4 mb-4`}>
                      <View style={tw`flex-row items-center justify-between`}>
                        <View style={tw`flex-row items-center flex-1`}>
                          <View style={tw`w-8 h-8 bg-blue-100 rounded-lg justify-center items-center mr-3`}>
                            <Calendar size={16} color="#3B82F6" />
                          </View>
                          <View>
                            <Text style={tw`text-sm font-semibold text-gray-900`}>
                              {new Date(consultation.consultation_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </Text>
                            <Text style={tw`text-xs text-gray-600`}>
                              {new Date(`2000-01-01T${consultation.consultation_time}`).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={tw`flex-row items-center`}>
                          <View style={[tw`w-8 h-8 rounded-lg justify-center items-center mr-2`, {
                            backgroundColor: consultation.mode === 'online' ? '#EFF6FF' : '#F0FDF4'
                          }]}>
                            {consultation.mode === 'online' && <Video size={16} color="#3B82F6" />}
                            {consultation.mode === 'onsite' && <MapPin size={16} color="#059669" />}
                          </View>
                          <Text style={tw`text-sm font-medium ${
                            consultation.mode === 'online' ? 'text-blue-700' : 'text-green-700'
                          }`}>
                            {consultation.mode === 'online' ? 'Online' : 'Onsite'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Footer */}
                    <View style={tw`flex-row items-center justify-between`}>
                      <Text style={tw`text-xs text-gray-500`}>
                        Requested {new Date(consultation.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                      
                      <View style={tw`flex-row items-center`}>
                        <Text style={tw`text-xs text-gray-400 mr-2`}>View Details</Text>
                        <View style={tw`w-6 h-6 bg-gray-100 rounded-full justify-center items-center`}>
                          <Text style={tw`text-gray-600 text-xs`}>→</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <LawyerNavbar activeTab="home" />
      </SafeAreaView>
    </LawyerRoute>
  );
};

export default LawyerDashboard;
