import React, { useState } from 'react';
import { ScrollView, View, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Mail, Phone, Calendar, Clock, MessageSquare, Settings, AlertTriangle } from 'lucide-react-native';
import { Button, ButtonText } from '../../../components/ui/button';
import { HStack } from '../../../components/ui/hstack';
import Colors from '../../../constants/Colors';
import tw from 'tailwind-react-native-classnames';
import Header from '../../../components/Header';
import LawyerNavbar from '../../../components/lawyer/LawyerNavbar';
import ConfirmationModal from '../../../components/lawyer/ConfirmationModal';

interface ConsultationRequest {
  id: string;
  client: {
    name: string;
    avatar: string;
    email: string;
    phone: string;
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

const ConsultationDetailPage: React.FC = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState<'accept' | 'reject' | 'complete' | null>(null);

  // Sample data - in real app, fetch based on ID
  const consultation: ConsultationRequest = {
    id: id as string || '550e8400-e29b-41d4-a716-446655440001',
    client: {
      name: 'Sarah Johnson',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      email: 'sarah.johnson@email.com',
      phone: '+63 912 345 6789',
    },
    message: 'I need urgent consultation regarding child custody modification due to changed circumstances. My ex-spouse has relocated and I need to understand my legal options. This is a complex situation involving interstate custody laws and I would appreciate your expertise in family law matters.',
    mode: 'online',
    status: 'pending',
    requested_at: '2 hours ago',
    consultation_date: '2024-09-15',
    consultation_time: '14:30',
    user_id: '123e4567-e89b-12d3-a456-426614174001',
    lawyer_id: null,
  };



  const handleAction = (action: 'accept' | 'reject' | 'complete') => {
    setActionType(action);
    setShowConfirmModal(true);
  };

  const confirmAction = () => {
    console.log(`${actionType} consultation ${id}`);
    setShowConfirmModal(false);
    setActionType(null);
    // TODO: Implement actual API call
    // Navigate back or update status
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <Header 
        title={`Request #${consultation.status.toUpperCase()}-${consultation.id.slice(-4)}`}
        showBackButton={true}
        onBackPress={() => router.back()}
      />

      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        <View style={tw`p-4`}>
          {/* Disclaimer */}
          {consultation.status === 'pending' && (
            <View style={{
              backgroundColor: '#DBEAFE',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#93C5FD'
            }}>
              <View style={tw`flex-row items-center mb-2`}>
                <AlertTriangle size={16} color="#F59E0B" />
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#1E3A8A',
                  marginLeft: 8
                }}>Professional Notice</Text>
              </View>
              <Text style={{
                fontSize: 12,
                lineHeight: 16,
                color: '#1E3A8A'
              }}>
                Upon acceptance, conduct consultations outside the app and contact the client directly. AI.ttorney facilitates consultation scheduling only and is not liable for any activities beyond this platform.
              </Text>
            </View>
          )}

          {/* Client Information Card */}
          <View style={tw`bg-white rounded-2xl p-6 mb-4 shadow-sm border border-gray-100`}>
            <View style={tw`flex-row justify-between items-start mb-4`}>
              <View style={tw`flex-row items-center flex-1`}>
                <Image 
                  source={{ uri: consultation.client.avatar }} 
                  style={tw`w-16 h-16 rounded-full mr-4`}
                />
                <View style={tw`flex-1`}>
                  <Text style={tw`text-xl font-bold text-gray-900 mb-1`}>
                    {consultation.client.name}
                  </Text>
                  <View style={tw`flex-row items-center`}>
                    <Clock size={14} color="#6B7280" />
                    <Text style={tw`text-sm text-gray-600 ml-2`}>
                      Requested {consultation.requested_at}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[
                tw`px-3 py-1 rounded-full`,
                consultation.status === 'pending' ? { backgroundColor: '#FEF3C7' } :
                consultation.status === 'accepted' ? { backgroundColor: '#E8F4FD' } :
                consultation.status === 'completed' ? { backgroundColor: '#D1FAE5' } :
                { backgroundColor: '#FEE2E2' }
              ]}>
                <Text style={[
                  tw`text-xs font-semibold uppercase`,
                  consultation.status === 'pending' ? { color: '#92400E' } :
                  consultation.status === 'accepted' ? { color: Colors.primary.blue } :
                  consultation.status === 'completed' ? { color: '#065F46' } :
                  { color: '#991B1B' }
                ]}>
                  {consultation.status}
                </Text>
              </View>
            </View>

            <View style={tw`border-t border-gray-200 pt-4`}>
              <Text style={tw`text-sm font-semibold text-gray-700 mb-3`}>Contact Information</Text>
              <View style={tw`flex-row items-center mb-2`}>
                <Mail size={16} color={Colors.primary.blue} />
                <Text style={tw`text-gray-700 ml-3 flex-1`}>{consultation.client.email}</Text>
              </View>
              <View style={tw`flex-row items-center`}>
                <Phone size={16} color={Colors.primary.blue} />
                <Text style={tw`text-gray-700 ml-3 flex-1`}>{consultation.client.phone}</Text>
              </View>
            </View>
          </View>

          {/* Consultation Details Card */}
          <View style={tw`bg-white rounded-2xl p-6 mb-4 shadow-sm border border-gray-100`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
              Consultation Details
            </Text>

            <View style={tw`space-y-4`}>
              <View style={tw`flex-row justify-between items-center mb-3`}>
                <View style={tw`flex-row items-center`}>
                  <Settings size={16} color="#6B7280" />
                  <Text style={tw`font-medium text-gray-600 ml-2`}>Mode</Text>
                </View>
                <View style={[
                  tw`px-3 py-1 rounded-full border`,
                  consultation.mode === 'online' ? 
                    { backgroundColor: '#E8F4FD', borderColor: '#C1E4F7' } :
                    { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }
                ]}>
                  <Text style={[
                    tw`text-xs font-medium capitalize`,
                    consultation.mode === 'online' ? 
                      { color: Colors.primary.blue } :
                      { color: '#16A34A' }
                  ]}>
                    {consultation.mode}
                  </Text>
                </View>
              </View>

              <View style={tw`flex-row justify-between items-center mb-3`}>
                <View style={tw`flex-row items-center`}>
                  <Calendar size={16} color="#6B7280" />
                  <Text style={tw`font-medium text-gray-600 ml-2`}>Preferred Date</Text>
                </View>
                <Text style={tw`text-gray-700 font-medium`}>
                  {consultation.consultation_date 
                    ? new Date(consultation.consultation_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'Not specified'
                  }
                </Text>
              </View>

              <View style={tw`flex-row justify-between items-center`}>
                <View style={tw`flex-row items-center`}>
                  <Clock size={16} color="#6B7280" />
                  <Text style={tw`font-medium text-gray-600 ml-2`}>Preferred Time</Text>
                </View>
                <Text style={tw`text-gray-700 font-medium`}>
                  {consultation.consultation_time 
                    ? new Date(`2000-01-01T${consultation.consultation_time}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })
                    : 'Not specified'
                  }
                </Text>
              </View>
            </View>
          </View>

          {/* Message Card */}
          <View style={tw`bg-white rounded-2xl p-6 mb-4 shadow-sm border border-gray-100`}>
            <View style={tw`flex-row items-center mb-4`}>
              <MessageSquare size={18} color={Colors.primary.blue} />
              <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>
                Client Message
              </Text>
            </View>
            <Text style={tw`text-gray-700 leading-6`}>
              {consultation.message}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={tw`pb-4`}>
            {consultation.status === 'pending' && (
              <HStack className="gap-3">
                <Button 
                  className="flex-1 py-3 rounded-lg"
                  style={{ backgroundColor: '#EF4444' }}
                  onPress={() => handleAction('reject')}
                >
                  <ButtonText className="font-semibold text-base text-white">Decline</ButtonText>
                </Button>
                <Button 
                  className="flex-1 py-3 rounded-lg"
                  style={{ backgroundColor: Colors.primary.blue }}
                  onPress={() => handleAction('accept')}
                >
                  <ButtonText className="font-semibold text-base text-white">Accept</ButtonText>
                </Button>
              </HStack>
            )}

            {consultation.status === 'accepted' && (
              <Button 
                className="py-3 rounded-lg"
                action="positive"
                onPress={() => handleAction('complete')}
              >
                <ButtonText className="font-semibold text-base">Mark as Completed</ButtonText>
              </Button>
            )}
            
            {consultation.status === 'completed' && (
              <Text style={tw`font-semibold text-center text-green-600 py-2`}>
                ✓ Consultation completed successfully
              </Text>
            )}
            
            {consultation.status === 'rejected' && (
              <Text style={tw`font-semibold text-center text-red-600 py-2`}>
                ✗ Request declined
              </Text>
            )}
          </View>
        </View>
        
        {/* Bottom padding */}
        <View style={{ height: 80 }} />
      </ScrollView>

      <LawyerNavbar activeTab="consult" />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmAction}
        actionType={actionType}
        clientName={consultation.client.name}
      />
    </SafeAreaView>
  );
};

export default ConsultationDetailPage;
