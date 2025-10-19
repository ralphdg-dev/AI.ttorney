import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Mail, Phone, Calendar, Clock, MessageSquare, Settings, AlertTriangle } from 'lucide-react-native';
import { Button, ButtonText } from '../../../components/ui/button/';
import { HStack } from '../../../components/ui/hstack';
import { useAuth } from '../../../contexts/AuthContext';
import Colors from '../../../constants/Colors';
import tw from 'tailwind-react-native-classnames';
import { NetworkConfig } from '../../../utils/networkConfig';
import Header from '../../../components/Header';
import { LawyerNavbar } from '../../../components/lawyer/shared';
import { ConfirmationModal } from '../../../components/lawyer/consultation';

interface ConsultationRequest {
  id: string;
  user_id: string;
  lawyer_id: string | null;
  message: string;
  email: string | null;
  mobile_number: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  consultation_date: string | null;
  consultation_time: string | null;
  consultation_mode: 'online' | 'onsite' | null;
  requested_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  client_name: string;
  client_email: string;
  client_username: string | null;
}

const ConsultationDetailPage: React.FC = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const [consultation, setConsultation] = useState<ConsultationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState<'accept' | 'reject' | 'complete' | null>(null);

  // Fetch consultation details
  const fetchConsultationDetails = useCallback(async () => {
    if (!id || !session?.access_token) return;

    try {
      setLoading(true);
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(
        `${apiUrl}/api/consult-actions/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConsultation(data);
      } else {
        Alert.alert('Error', 'Failed to load consultation details');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching consultation details:', error);
      Alert.alert('Error', 'Failed to load consultation details');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, session?.access_token, router]);

  useEffect(() => {
    if (id && session?.access_token) {
      fetchConsultationDetails();
    }
  }, [id, session?.access_token, fetchConsultationDetails]);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const requestedAt = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - requestedAt.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  const handleAction = async (action: 'accept' | 'reject' | 'complete') => {
    if (!consultation || !session?.access_token) return;

    try {
      let endpoint = '';
      switch (action) {
        case 'accept':
          endpoint = 'accept';
          break;
        case 'reject':
          endpoint = 'reject';
          break;
        case 'complete':
          endpoint = 'complete';
          break;
      }

      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(
        `${apiUrl}/api/consult-actions/${consultation.id}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        // Refresh the consultation data
        await fetchConsultationDetails();
        Alert.alert('Success', `Consultation ${action}ed successfully`);
      } else {
        Alert.alert('Error', `Failed to ${action} consultation`);
      }
    } catch (error) {
      console.error('Error updating consultation:', error);
      Alert.alert('Error', `Failed to ${action} consultation`);
    } finally {
      setShowConfirmModal(false);
      setActionType(null);
    }
  };

  const handleActionClick = (action: 'accept' | 'reject' | 'complete') => {
    setActionType(action);
    setShowConfirmModal(true);
  };

  if (loading || !consultation) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top', 'left', 'right']}>
        <Header 
          title="Loading..."
          showBackButton={true}
          onBackPress={() => router.back()}
        />
        <View style={tw`flex-1 justify-center items-center`}>
          <Text>Loading consultation details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top', 'left', 'right']}>
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
                <View style={tw`w-16 h-16 rounded-full bg-gray-200 items-center justify-center mr-4`}>
                  <Text style={tw`text-gray-600 font-semibold text-lg`}>
                    {consultation.client_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-xl font-bold text-gray-900 mb-1`}>
                    {consultation.client_name}
                  </Text>
                  <View style={tw`flex-row items-center`}>
                    <Clock size={14} color="#6B7280" />
                    <Text style={tw`text-sm text-gray-600 ml-2`}>
                      Requested {formatTimeAgo(consultation.requested_at)}
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
                <Text style={tw`text-gray-700 ml-3 flex-1`}>{consultation.client_email}</Text>
              </View>
              {consultation.mobile_number && (
                <View style={tw`flex-row items-center`}>
                  <Phone size={16} color={Colors.primary.blue} />
                  <Text style={tw`text-gray-700 ml-3 flex-1`}>{consultation.mobile_number}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Consultation Details Card */}
          <View style={tw`bg-white rounded-2xl p-6 mb-4 shadow-sm border border-gray-100`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
              Consultation Details
            </Text>

            <View style={tw`gap-4`}>
              {consultation.consultation_mode && (
                <View style={tw`flex-row justify-between items-center mb-3`}>
                  <View style={tw`flex-row items-center`}>
                    <Settings size={16} color="#6B7280" />
                    <Text style={tw`font-medium text-gray-600 ml-2`}>Mode</Text>
                  </View>
                  <View style={[
                    tw`px-3 py-1 rounded-full border`,
                    consultation.consultation_mode === 'online' ? 
                      { backgroundColor: '#E8F4FD', borderColor: '#C1E4F7' } :
                      { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }
                  ]}>
                    <Text style={[
                      tw`text-xs font-medium capitalize`,
                      consultation.consultation_mode === 'online' ? 
                        { color: Colors.primary.blue } :
                        { color: '#16A34A' }
                    ]}>
                      {consultation.consultation_mode}
                    </Text>
                  </View>
                </View>
              )}

              {consultation.consultation_date && (
                <View style={tw`flex-row justify-between items-center mb-3`}>
                  <View style={tw`flex-row items-center`}>
                    <Calendar size={16} color="#6B7280" />
                    <Text style={tw`font-medium text-gray-600 ml-2`}>Preferred Date</Text>
                  </View>
                  <Text style={tw`text-gray-700 font-medium`}>
                    {new Date(consultation.consultation_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              )}

              {consultation.consultation_time && (
                <View style={tw`flex-row justify-between items-center`}>
                  <View style={tw`flex-row items-center`}>
                    <Clock size={16} color="#6B7280" />
                    <Text style={tw`font-medium text-gray-600 ml-2`}>Preferred Time</Text>
                  </View>
                  <Text style={tw`text-gray-700 font-medium`}>
                    {consultation.consultation_time}
                  </Text>
                </View>
              )}
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
                  onPress={() => handleActionClick('reject')}
                >
                  <ButtonText className="font-semibold text-base text-white">Decline</ButtonText>
                </Button>
                <Button 
                  className="flex-1 py-3 rounded-lg"
                  style={{ backgroundColor: Colors.primary.blue }}
                  onPress={() => handleActionClick('accept')}
                >
                  <ButtonText className="font-semibold text-base text-white">Accept</ButtonText>
                </Button>
              </HStack>
            )}

            {consultation.status === 'accepted' && (
              <Button 
                className="py-3 rounded-lg"
                action="positive"
                onPress={() => handleActionClick('complete')}
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
        onConfirm={() => actionType && handleAction(actionType)}
        actionType={actionType}
        clientName={consultation.client_name}
      />
    </SafeAreaView>
  );
};

export default ConsultationDetailPage;