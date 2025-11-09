import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Image, TextInput, Alert, Modal } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, LogOut, Hourglass, Info, EyeOff, ShieldAlert, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { NetworkConfig } from '../utils/networkConfig';
import { appealService, Appeal } from '../services/appealService';

interface SuspensionInfo {
  suspension_count: number;
  suspension_end: string | null;
  account_status: string;
}

export default function SuspendedScreen() {
  const { user, signOut, session, isLoading: authLoading } = useAuth();
  const [suspensionInfo, setSuspensionInfo] = useState<SuspensionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Appeal state
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [existingAppeal, setExistingAppeal] = useState<Appeal | null>(null);
  const [loadingAppeal, setLoadingAppeal] = useState(true);
  const [showAppealModal, setShowAppealModal] = useState(false);

  useEffect(() => {
    // Wait for auth context to finish loading
    if (authLoading) {
      return;
    }

    // Wait for session to be available before fetching
    if (session?.access_token) {
      fetchSuspensionInfo();
      checkExistingAppeal();
    } else {
      // Session is null after auth loading complete, redirect to login
      router.replace('/login');
    }
  }, [session, authLoading]);

  const fetchSuspensionInfo = async () => {
    try {
      if (!session?.access_token) {
        router.replace('/login');
        return;
      }

      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/user/moderation-status`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSuspensionInfo({
          suspension_count: data.suspension_count || 0,
          suspension_end: data.suspension_end,
          account_status: data.account_status,
        });
      } else {
        const errorText = await response.text();
        // Set default suspension info to stop loading
        setSuspensionInfo({
          suspension_count: 1,
          suspension_end: null,
          account_status: 'suspended',
        });
      }
    } catch (error) {
      // Set default suspension info to stop loading
      setSuspensionInfo({
        suspension_count: 1,
        suspension_end: null,
        account_status: 'suspended',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkExistingAppeal = async () => {
    try {
      if (!session?.access_token) return;
      
      const latestAppeal = await appealService.getLatestAppeal(session.access_token);
      setExistingAppeal(latestAppeal);
    } catch (error) {
      console.error('Error checking existing appeal:', error);
    } finally {
      setLoadingAppeal(false);
    }
  };

  const handleSubmitAppeal = async () => {
    console.log('handleSubmitAppeal called', { appealReasonLength: appealReason.length });
    
    if (appealReason.length === 0) {
      Alert.alert('Appeal Required', 'Please provide an appeal reason.');
      return;
    }

    if (appealReason.length > 2000) {
      Alert.alert('Appeal Too Long', 'Please keep your appeal reason under 2000 characters.');
      return;
    }

    try {
      setSubmittingAppeal(true);
      
      if (!session?.access_token) {
        Alert.alert('Error', 'You must be logged in to submit an appeal');
        return;
      }

      const appeal = await appealService.submitAppeal(
        appealReason,
        additionalContext || undefined,
        session.access_token
      );

      setExistingAppeal(appeal);
      setShowAppealForm(false);
      setShowAppealModal(false);
      setAppealReason('');
      setAdditionalContext('');
      
      Alert.alert(
        'Appeal Submitted',
        'Your appeal has been submitted successfully. An admin will review it soon.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit appeal. Please try again.');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setIsLoggingOut(false);
    }
  };

  const formatSuspensionEnd = (endDate: string | null) => {
    if (!endDate) return 'Unknown';
    try {
      const date = new Date(endDate);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown';
    }
  };

  const getSuspensionMessage = (count: number) => {
    if (count === 1) {
      return {
        title: 'First Suspension',
        message: 'Your account has been suspended for violating our community guidelines.',
        warning: null,
      };
    } else if (count === 2) {
      return {
        title: 'Second Suspension',
        message: 'One more and your account will be permanently banned.',
        warning: null,
      };
    } else {
      return {
        title: 'Final Suspension',
        message: 'This is your last warning. Next violation = permanent ban.',
        warning: null,
      };
    }
  };

  const getAppealStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          text: 'Pending Review',
          description: 'Your appeal is waiting to be reviewed by an admin.'
        };
      case 'under_review':
        return {
          icon: Clock,
          color: '#3B82F6',
          bgColor: '#DBEAFE',
          text: 'Under Review',
          description: 'An admin is currently reviewing your appeal.'
        };
      case 'approved':
        return {
          icon: CheckCircle,
          color: '#10B981',
          bgColor: '#D1FAE5',
          text: 'Approved',
          description: 'Your appeal was approved! Your suspension has been lifted.'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: '#EF4444',
          bgColor: '#FEE2E2',
          text: 'Rejected',
          description: 'Your appeal was reviewed and rejected.'
        };
      default:
        return {
          icon: Clock,
          color: '#6B7280',
          bgColor: '#F3F4F6',
          text: 'Unknown',
          description: 'Appeal status unknown.'
        };
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const suspensionCount = suspensionInfo?.suspension_count || 0;
  const suspensionMessage = getSuspensionMessage(suspensionCount);

  return (
    <View className="flex-1 bg-white">
      {/* Simple Header with Logo Only */}
      <View className="bg-white px-4 pt-6 pb-3 border-b border-gray-200 items-center">
        <Image
          source={require('../assets/images/logo.png')}
          style={{ width: 140, height: 35 }}
          resizeMode="contain"
        />
      </View>

      <ScrollView className="flex-1">
        <View className="p-6 pt-8">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-3">We suspended your account</Text>
            {suspensionInfo?.suspension_end && (
              <Text className="text-sm text-gray-600 leading-5">
                Suspension ends {formatSuspensionEnd(suspensionInfo.suspension_end)}
              </Text>
            )}
            <Text className="text-sm text-gray-600 leading-5">
              This is your {suspensionMessage.title.toLowerCase()}. {suspensionMessage.message}
            </Text>
          </View>

          {/* Warning Badge */}
          {suspensionMessage.warning && (
            <View className="flex-row items-center bg-yellow-100 p-3 rounded-lg mb-6 gap-2.5">
              <AlertTriangle size={20} color="#DC2626" />
              <Text className="flex-1 text-xs text-yellow-900 font-semibold leading-tight">{suspensionMessage.warning}</Text>
            </View>
          )}

        {/* What does this mean? */}
        <View className="mb-8">
          <Text className="text-base font-bold text-gray-900 mb-4">What does this mean?</Text>
          
          <View className="flex-row mb-5 items-center">
            <View className="w-10 h-10 rounded-full bg-blue-50 justify-center items-center mr-3">
              <ShieldAlert size={20} color="#023D7B" />
            </View>
            <Text className="flex-1 text-sm text-gray-700 leading-5">
              Your account activity needs to align with our Community Guidelines.
            </Text>
          </View>

          <View className="flex-row mb-5 items-center">
            <View className="w-10 h-10 rounded-full bg-blue-50 justify-center items-center mr-3">
              <Info size={20} color="#023D7B" />
            </View>
            <Text className="flex-1 text-sm text-gray-700 leading-5">
              You'll be notified each time you get a strike. Three strikes leads to suspension. Your strikes reset after each suspension. Three suspensions leads to permanent ban.
            </Text>
          </View>

          <View className="flex-row mb-5 items-center">
            <View className="w-10 h-10 rounded-full bg-blue-50 justify-center items-center mr-3">
              <EyeOff size={20} color="#023D7B" />
            </View>
            <Text className="flex-1 text-sm text-gray-700 leading-5">
              Your account is currently restricted and cannot be accessed by others.
            </Text>
          </View>
        </View>

        {/* What can I do? */}
        <View className="mb-8">
          <Text className="text-base font-bold text-gray-900 mb-4">What can I do?</Text>
          
          <View className="flex-row mb-5 items-center">
            <View className="w-10 h-10 rounded-full bg-blue-50 justify-center items-center mr-3">
              <Hourglass size={20} color="#023D7B" />
            </View>
            <Text className="flex-1 text-sm text-gray-700 leading-5">
              Wait until your suspension ends. Common violations include harassment, spam, or inappropriate content in either chatbot or forum.
            </Text>
          </View>

          <View className="flex-row mb-5 items-center">
            <View className="w-10 h-10 rounded-full bg-blue-50 justify-center items-center mr-3">
              <MessageSquare size={20} color="#023D7B" />
            </View>
            <Text className="flex-1 text-sm text-gray-700 leading-5">
              Submit an appeal if you believe this suspension is unfair or was made in error.
            </Text>
          </View>
        </View>

        {/* Appeal Section */}
        {!loadingAppeal && (
          <View style={{ marginBottom: (!existingAppeal && !showAppealForm) ? 16 : 32 }}>
            {existingAppeal ? (
              <View>
                <Text className="text-base font-bold text-gray-900 mb-4">Your Appeal</Text>
                {(() => {
                  const statusInfo = getAppealStatusInfo(existingAppeal.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <View className="border border-gray-200 rounded-lg p-4 mb-4">
                      <View className="flex-row items-center mb-3">
                        <View 
                          className="w-10 h-10 rounded-full justify-center items-center mr-3"
                          style={{ backgroundColor: statusInfo.bgColor }}
                        >
                          <StatusIcon size={20} color={statusInfo.color} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-900">{statusInfo.text}</Text>
                          <Text className="text-xs text-gray-600">{statusInfo.description}</Text>
                        </View>
                      </View>

                      <View className="bg-gray-50 p-3 rounded-lg mb-3">
                        <Text className="text-xs text-gray-600 mb-1">Your Appeal:</Text>
                        <Text className="text-sm text-gray-900">{existingAppeal.appeal_reason}</Text>
                        {existingAppeal.additional_context && (
                          <>
                            <Text className="text-xs text-gray-600 mt-2 mb-1">Additional Context:</Text>
                            <Text className="text-sm text-gray-900">{existingAppeal.additional_context}</Text>
                          </>
                        )}
                      </View>

                      {existingAppeal.status === 'rejected' && existingAppeal.rejection_reason && (
                        <View className="bg-red-50 p-3 rounded-lg border border-red-200">
                          <Text className="text-xs font-semibold text-red-900 mb-1">Rejection Reason:</Text>
                          <Text className="text-sm text-red-800">{existingAppeal.rejection_reason}</Text>
                        </View>
                      )}

                      <Text className="text-xs text-gray-500 mt-3">
                        Submitted: {new Date(existingAppeal.created_at).toLocaleString()}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            ) : (
              <TouchableOpacity
                className="bg-blue-50 border border-blue-200 py-2.5 px-6 rounded-lg mb-0"
                onPress={() => setShowAppealModal(true)}
              >
                <View className="flex-row items-center justify-center gap-2">
                  <MessageSquare size={18} color="#023D7B" />
                  <Text className="text-[#023D7B] text-base font-semibold">Appeal This Suspension</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Modal
          visible={showAppealModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAppealModal(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-2xl p-5">
              <Text className="text-base font-bold text-gray-900 mb-4">Submit an Appeal</Text>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Why do you believe this suspension is unfair? *
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 text-sm text-gray-900 min-h-[120px]"
                  placeholder="Explain your situation..."
                  value={appealReason}
                  onChangeText={setAppealReason}
                  multiline
                  textAlignVertical="top"
                  maxLength={2000}
                />
                <Text className="text-xs text-gray-500 mt-1">
                  {appealReason.length}/2000 characters
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Additional Context (Optional)
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 text-sm text-gray-900 min-h-[80px]"
                  placeholder="Any additional information that may help..."
                  value={additionalContext}
                  onChangeText={setAdditionalContext}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <Text className="text-xs text-gray-500 mt-1">
                  {additionalContext.length}/1000 characters
                </Text>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 bg-[#023D7B] py-3 px-4 rounded-lg"
                  style={{ opacity: (submittingAppeal || appealReason.length === 0) ? 0.5 : 1 }}
                  onPress={handleSubmitAppeal}
                  disabled={submittingAppeal || appealReason.length === 0}
                >
                  {submittingAppeal ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-sm font-semibold text-center">Submit Appeal</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 bg-gray-200 py-3 px-4 rounded-lg"
                  onPress={() => {
                    setShowAppealModal(false);
                    setShowAppealForm(false);
                    setAppealReason('');
                    setAdditionalContext('');
                  }}
                  disabled={submittingAppeal}
                >
                  <Text className="text-gray-700 text-sm font-semibold text-center">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Logout Button */}
        <TouchableOpacity
          className={`flex-row items-center justify-center bg-[#023D7B] py-3.5 px-6 rounded-lg gap-2 mt-0 ${isLoggingOut ? 'opacity-60' : ''}`}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <LogOut size={18} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold">Logout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}
