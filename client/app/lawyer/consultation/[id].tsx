import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VStack } from '../../../components/ui/vstack';
import { HStack } from '../../../components/ui/hstack';
import { Text } from '../../../components/ui/text';
import { Heading } from '../../../components/ui/heading';
import { Button, ButtonText } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Badge, BadgeText } from '../../../components/ui/badge';
import { Avatar, AvatarImage, AvatarFallbackText } from '../../../components/ui/avatar';
import { Divider } from '../../../components/ui/divider';
import Colors from '../../../constants/Colors';
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
  urgency: 'low' | 'medium' | 'high';
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
    urgency: 'high',
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'accepted':
        return 'info';
      case 'completed':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'muted';
    }
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
    <SafeAreaView className="flex-1 bg-background-50">
      <Header 
        title={`Request #${consultation.status.toUpperCase()}-${consultation.id.slice(-4)}`}
        showBackButton={true}
        onBackPress={() => router.back()}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <VStack className="gap-6 p-6">
          {/* Client Information Card */}
          <Card className="p-6">
            <VStack className="gap-4">
              <HStack className="justify-between items-center">
                <HStack className="gap-3 items-center">
                  <Avatar size="lg">
                    <AvatarImage source={{ uri: consultation.client.avatar }} />
                    <AvatarFallbackText>{consultation.client.name}</AvatarFallbackText>
                  </Avatar>
                  <VStack>
                    <Heading size="lg" className="text-typography-900">
                      {consultation.client.name}
                    </Heading>
                    <Text size="sm" className="text-typography-600">
                      Requested {consultation.requested_at}
                    </Text>
                  </VStack>
                </HStack>
                <Badge variant="solid" action={getStatusColor(consultation.status)}>
                  <BadgeText className="capitalize">{consultation.status}</BadgeText>
                </Badge>
              </HStack>

              <Divider />

              {/* Contact Information */}
              <VStack className="gap-3">
                <Text size="sm" className="font-medium text-typography-700">Contact</Text>
                <Text className="text-typography-700">{consultation.client.email}</Text>
                <Text className="text-typography-700">{consultation.client.phone}</Text>
              </VStack>
            </VStack>
          </Card>

          {/* Consultation Details Card */}
          <Card className="p-6">
            <VStack className="gap-4">
              <Heading size="md" className="text-typography-900">
                Consultation Details
              </Heading>

              <VStack className="gap-3">
                <HStack className="justify-between items-center">
                  <Text className="font-medium text-typography-600">Mode</Text>
                  <Text 
                    className="font-medium capitalize"
                    style={{ color: consultation.mode === 'online' ? Colors.primary.blue : '#059669' }}
                  >
                    {consultation.mode}
                  </Text>
                </HStack>

                <HStack className="justify-between items-center">
                  <Text className="font-medium text-typography-600">Preferred Date</Text>
                  <Text className="text-typography-700">
                    {consultation.consultation_date 
                      ? new Date(consultation.consultation_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'Not specified'
                    }
                  </Text>
                </HStack>

                <HStack className="justify-between items-center">
                  <Text className="font-medium text-typography-600">Preferred Time</Text>
                  <Text className="text-typography-700">
                    {consultation.consultation_time 
                      ? new Date(`2000-01-01T${consultation.consultation_time}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })
                      : 'Not specified'
                    }
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </Card>

          {/* Message Card */}
          <Card className="p-6">
            <VStack className="gap-4">
              <Heading size="md" className="text-typography-900">
                Client Message
              </Heading>
              <Text className="leading-6 text-typography-700">
                {consultation.message}
              </Text>
              {consultation.urgency && (
                <Badge 
                  variant="solid" 
                  action={consultation.urgency === 'high' ? 'error' : consultation.urgency === 'medium' ? 'warning' : 'success'}
                  className="self-start"
                >
                  <BadgeText className="capitalize">{consultation.urgency} Priority</BadgeText>
                </Badge>
              )}
            </VStack>
          </Card>

          {/* Action Buttons */}
          <VStack className="gap-3">
            {consultation.status === 'pending' && (
              <HStack className="gap-3">
                <Button 
                  className="flex-1 py-3 rounded-lg"
                  style={{ backgroundColor: Colors.primary.blue, height: 48 }}
                  onPress={() => handleAction('accept')}
                >
                  <ButtonText className="text-base font-medium text-white">Accept</ButtonText>
                </Button>
                <Button 
                  className="flex-1 py-3 rounded-lg"
                  style={{ backgroundColor: '#EF4444', height: 48 }}
                  onPress={() => handleAction('reject')}
                >
                  <ButtonText className="text-base font-medium text-white">Decline</ButtonText>
                </Button>
              </HStack>
            )}

            {consultation.status === 'accepted' && (
              <Button 
                className="py-3 rounded-lg"
                style={{ height: 48, backgroundColor: '#10B981' }}
                onPress={() => handleAction('complete')}
              >
                <ButtonText className="text-base font-medium text-white">Mark as Completed</ButtonText>
              </Button>
            )}
            
            {consultation.status === 'completed' && (
              <Text className="font-medium text-center text-green-600">
                Consultation completed successfully
              </Text>
            )}
            
            {consultation.status === 'rejected' && (
              <Text className="font-medium text-center text-red-600">
                Request declined
              </Text>
            )}
          </VStack>
        </VStack>
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
