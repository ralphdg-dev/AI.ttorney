import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, Alert, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import { Mail, Phone, Calendar, Clock, MessageSquare, Settings, AlertTriangle } from 'lucide-react-native';
import { Button, ButtonText } from '../../../components/ui/button/';
import { HStack } from '../../../components/ui/hstack';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/toast';
import { createSafeAreaToastRenderer } from '../../../components/ui/SafeAreaToast';
import ConfirmationModal from '../../../components/lawyer/consultation/ConfirmationModal';
import { formatConsultationTime } from '../../../utils/consultationUtils';
import { NetworkConfig } from '../../../utils/networkConfig';
import { safeGoBack } from '../../../utils/navigationHelper';
import Header from '../../../components/Header';
import { LawyerNavbar } from '../../../components/lawyer/shared';
import Colors from '../../../constants/Colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 18,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTime: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    flexShrink: 1,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  messageText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  detailsContainer: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabelText: {
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  detailValue: {
    color: '#374151',
    fontWeight: '500',
  },
  modeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  footer: {
    paddingBottom: 16,
  },
  successText: {
    fontWeight: '600',
    textAlign: 'center',
    color: '#059669',
    paddingVertical: 8,
  },
  errorText: {
    fontWeight: '600',
    textAlign: 'center',
    color: '#DC2626',
    paddingVertical: 8,
  },
});

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
  profile_photo: string | null;
}

const ConsultationDetailPage: React.FC = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { session, user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [consultation, setConsultation] = useState<ConsultationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState<'accept' | 'reject' | 'complete' | null>(null);

  // Extract consultation ID safely
  const consultationId = Array.isArray(id) ? id[0] : id;

  // Redirect if no consultation ID
  if (!consultationId) {
    console.error('❌ No consultation ID provided');
    router.back();
    return null;
  }

  // Fetch consultation details
  const fetchConsultationDetails = useCallback(async () => {
    if (!consultationId || !session?.access_token) return;

    try {
      setLoading(true);
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(
        `${apiUrl}/api/consult-actions/${consultationId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Consultation API Response:', JSON.stringify(data, null, 2));
        console.log('📸 Profile Photo Fields:', {
          profile_photo: data.profile_photo
        });
        
        const normalizedData: ConsultationRequest = {
          ...data,
          client_name: data.client_name || 'Unknown Client',
          profile_photo: data.profile_photo ?? null,
        };
        
        console.log('✅ Final Normalized Data:', {
          client_name: normalizedData.client_name,
          profile_photo: normalizedData.profile_photo
        });
        
        setConsultation(normalizedData);
      } else {
        Alert.alert('Error', 'Failed to load consultation details');
        safeGoBack(router, {
          isGuestMode: false,
          isAuthenticated,
          userRole: user?.role,
          currentPath: pathname,
        });
      }
    } catch (error) {
      console.error('Error fetching consultation details:', error);
      Alert.alert('Error', 'Failed to load consultation details');
      safeGoBack(router, {
        isGuestMode: false,
        isAuthenticated,
        userRole: user?.role,
        currentPath: pathname,
      });
    } finally {
      setLoading(false);
    }
  }, [consultationId, session?.access_token, router, pathname, isAuthenticated, user?.role]);

  useEffect(() => {
    if (consultationId && session?.access_token) {
      fetchConsultationDetails();
    }
  }, [consultationId, session?.access_token, fetchConsultationDetails]);

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Unknown time';
    
    try {
      const now = new Date();
      // Handle different timestamp formats and ensure proper parsing
      let requestedAt: Date;
      
      // If timestamp doesn't have timezone info, treat as UTC
      if (!/Z|[+-]\d{2}:?\d{2}$/.test(timestamp)) {
        requestedAt = new Date(timestamp + 'Z');
      } else {
        requestedAt = new Date(timestamp);
      }
      
      // Validate the parsed date
      if (isNaN(requestedAt.getTime())) {
        return 'Invalid date';
      }
      
      const diffInMs = now.getTime() - requestedAt.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      } else if (diffInDays < 30) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      } else {
        // For very old dates, show the actual date
        return requestedAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: requestedAt.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Unknown time';
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
        
        // Show success toast instead of Alert
        toast.show({
          placement: 'top',
          duration: 3000,
          render: createSafeAreaToastRenderer(
            'top',
            'success',
            'solid',
            `Consultation ${action}ed successfully`
          ),
        });
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
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
        <Header 
          title="Loading..."
          showBackButton={true}
          onBackPress={() => safeGoBack(router, {
            isGuestMode: false,
            isAuthenticated,
            userRole: user?.role,
            currentPath: pathname,
          })}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={Colors.primary.blue} 
            style={{ marginBottom: 16 }}
          />
          <Text style={{
            fontSize: 16,
            color: '#6B7280',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            Loading consultation details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const requestTimestamp = consultation.requested_at || consultation.created_at || consultation.updated_at;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <Header 
        title="Request"
        showBackButton={true}
        onBackPress={() => safeGoBack(router, {
          isGuestMode: false,
          isAuthenticated,
          userRole: user?.role,
          currentPath: pathname,
        })}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
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
              <View style={styles.alertContainer}>
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
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.clientInfo}>
                {consultation.profile_photo ? (
                  <Image
                    source={{ uri: consultation.profile_photo }}
                    style={styles.avatar}
                    resizeMode="cover"
                    onError={(error) => {
                      console.log('❌ Image Load Error:', error.nativeEvent.error);
                      console.log('❌ Failed URI:', consultation.profile_photo);
                    }}
                    onLoad={() => {
                      console.log('✅ Image Loaded Successfully:', consultation.profile_photo);
                    }}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {consultation.client_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.clientDetails}>
                  <Text 
                    style={styles.clientName}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.8}
                  >
                    {consultation.client_name}
                  </Text>
                  <View style={styles.statusRow}>
                    <Clock size={14} color="#6B7280" />
                    <Text 
                      style={styles.statusTime}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.92}
                      ellipsizeMode="clip"
                    >
                      Requested {formatTimeAgo(requestTimestamp)}
                    </Text>
                  </View>
                </View>
              </View>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor:
                    consultation.status === 'pending'
                      ? '#FEF3C7'  // Light yellow
                      : consultation.status === 'accepted'
                        ? '#FEF3C7'  // Light orange
                        : consultation.status === 'completed'
                          ? '#D1FAE5'  // Light green
                          : '#FEE2E2'  // Light red
                }}
              >
                <Text style={{ 
                  fontSize: 10, 
                  fontWeight: '600', 
                  textTransform: 'uppercase', 
                  color:
                    consultation.status === 'pending'
                      ? '#78350F'  // Dark yellow
                      : consultation.status === 'accepted'
                        ? '#78350F'  // Dark orange
                        : consultation.status === 'completed'
                          ? '#064E3B'  // Dark green
                          : '#7F1D1D'  // Dark red
                }}>
                  {consultation.status === 'accepted' ? 'ongoing' : consultation.status}
                </Text>
              </View>
            </View>

            <View style={styles.divider}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <View style={styles.contactRow}>
                <Mail size={16} color={Colors.primary.blue} />
                <Text style={styles.contactText}>{consultation.client_email}</Text>
              </View>
              {consultation.mobile_number && (
                <View style={styles.contactRow}>
                  <Phone size={16} color={Colors.primary.blue} />
                  <Text style={styles.contactText}>{consultation.mobile_number}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Consultation Details Card */}
          <View style={styles.card}>
            <Text style={styles.messageTitle}>
              Consultation Details
            </Text>

            <View style={styles.detailsContainer}>
              {consultation.consultation_mode && (
                <View style={styles.detailRow}>
                  <View style={styles.detailLabel}>
                    <Settings size={16} color="#6B7280" />
                    <Text style={styles.detailLabelText}>Mode</Text>
                  </View>
                  <View style={[
                    styles.modeBadge,
                    consultation.consultation_mode === 'online' ? 
                      { backgroundColor: '#E8F4FD', borderColor: '#C1E4F7' } :
                      { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }
                  ]}>
                    <Text style={[
                      styles.modeText,
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
                <View style={styles.detailRow}>
                  <View style={styles.detailLabel}>
                    <Calendar size={16} color="#6B7280" />
                    <Text style={styles.detailLabelText}>Preferred Date</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {new Date(consultation.consultation_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              )}

              {consultation.consultation_time && (
                <View style={styles.detailRow}>
                  <View style={styles.detailLabel}>
                    <Clock size={16} color="#6B7280" />
                    <Text style={styles.detailLabelText}>Preferred Time</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {formatConsultationTime(consultation.consultation_time)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Message Card */}
          <View style={styles.card}>
            <View style={styles.messageHeader}>
              <MessageSquare size={20} color={Colors.primary.blue} />
              <Text style={styles.messageTitle}>
                Client Message
              </Text>
            </View>
            <Text style={styles.messageText}>
              {consultation.message}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.footer}>
            {consultation.status === 'pending' && (
              <HStack className="gap-3">
                <Button 
                  className="flex-1 rounded-lg min-h-[52px]"
                  style={{ backgroundColor: '#EF4444' }}
                  onPress={() => handleActionClick('reject')}
                >
                  <ButtonText 
                    className="font-semibold text-white text-center text-lg leading-[22px]"
                  >
                    Decline
                  </ButtonText>
                </Button>
                <Button 
                  className="flex-1 rounded-lg min-h-[52px]"
                  style={{ backgroundColor: '#16A34A' }}
                  onPress={() => handleActionClick('accept')}
                >
                  <ButtonText 
                    className="font-semibold text-white text-center text-lg leading-[22px]"
                  >
                    Accept
                  </ButtonText>
                </Button>
              </HStack>
            )}

            {consultation.status === 'accepted' && (
              <Button 
                className="rounded-lg min-h-[52px]"
                style={{ backgroundColor: Colors.primary.blue }}
                onPress={() => handleActionClick('complete')}
              >
                <ButtonText 
                  className="font-semibold text-white text-center text-lg leading-[22px]"
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.85}
                >
                  Finish Session
                </ButtonText>
              </Button>
            )}
            
            {consultation.status === 'completed' && (
              <Text style={styles.successText}>
                ✓ Consultation completed successfully
              </Text>
            )}
            
            {consultation.status === 'rejected' && (
              <Text style={styles.errorText}>
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