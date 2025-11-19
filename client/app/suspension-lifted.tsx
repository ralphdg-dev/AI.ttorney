import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Home, Sparkles, Shield, AlertCircle } from 'lucide-react-native';
import { NetworkConfig } from '../utils/networkConfig';

interface SuspensionLiftedInfo {
  suspension_end: string | null;
  lifted_at: string | null;
  was_lifted_by_admin: boolean;
}

export default function SuspensionLiftedScreen() {
  const { user, signOut, session, isLoading: authLoading } = useAuth();
  const [suspensionInfo, setSuspensionInfo] = useState<SuspensionLiftedInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    // Wait for auth context to finish loading
    if (authLoading) {
      return;
    }

    // Wait for session to be available before fetching
    if (session?.access_token) {
      fetchSuspensionInfo();
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
          suspension_end: data.suspension_end,
          lifted_at: data.lifted_at,
          was_lifted_by_admin: data.was_lifted_by_admin || false,
        });
      } else {
        // Set default info to stop loading
        setSuspensionInfo({
          suspension_end: null,
          lifted_at: null,
          was_lifted_by_admin: false,
        });
      }
    } catch (error) {
      console.error('Error fetching suspension info:', error);
      // Set default info to stop loading
      setSuspensionInfo({
        suspension_end: null,
        lifted_at: null,
        was_lifted_by_admin: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToHome = async () => {
    try {
      setAcknowledging(true);
      
      if (!session?.access_token) {
        router.replace('/login');
        return;
      }

      // Call API to acknowledge the lifted suspension
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/user/acknowledge-suspension-lifted`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Navigate to home after successful acknowledgment
        router.replace('/home');
      } else {
        console.error('Failed to acknowledge suspension lifted');
        // Still navigate to home even if acknowledgment fails
        router.replace('/home');
      }
    } catch (error) {
      console.error('Error acknowledging suspension lifted:', error);
      // Still navigate to home even if acknowledgment fails
      router.replace('/home');
    } finally {
      setAcknowledging(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
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

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const wasLiftedByAdmin = suspensionInfo?.was_lifted_by_admin;

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
          {/* Success Icon */}
          <View className="items-center mb-6">
            <Image
              source={require('../assets/images/registration/success.png')}
              style={{ width: 120, height: 120 }}
              resizeMode="contain"
            />
          </View>

          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
              Welcome Back!
            </Text>
            <Text className="text-base text-gray-600 leading-6 text-center">
              {wasLiftedByAdmin 
                ? 'Your suspension has been lifted by an admin. Your appeal was successful!'
                : 'Your suspension period has ended and you can now access your account again.'}
            </Text>
          </View>

          {/* Suspension Details */}
          {(suspensionInfo?.suspension_end || (wasLiftedByAdmin && suspensionInfo?.lifted_at)) && (
            <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
              {suspensionInfo?.suspension_end && (
                <Text className="text-sm text-green-800 mb-1">
                  Original end date: {formatDate(suspensionInfo.suspension_end)}
                </Text>
              )}
              
              {wasLiftedByAdmin && suspensionInfo?.lifted_at && (
                <Text className="text-sm text-green-800">
                  Lifted by admin: {formatDate(suspensionInfo.lifted_at)}
                </Text>
              )}
            </View>
          )}

          {/* What's Next? */}
          <View className="mb-8">
            <Text className="text-base font-bold text-gray-900 mb-4">What's next?</Text>
            
            <View className="flex-row mb-5 items-center">
              <View className="w-10 h-10 rounded-full bg-blue-50 justify-center items-center mr-3">
                <Sparkles size={20} color="#023D7B" />
              </View>
              <Text className="flex-1 text-sm text-gray-700 leading-5">
                You now have full access to all features of AI.ttorney.
              </Text>
            </View>

            <View className="flex-row mb-5 items-center">
              <View className="w-10 h-10 rounded-full bg-blue-50 justify-center items-center mr-3">
                <Shield size={20} color="#023D7B" />
              </View>
              <Text className="flex-1 text-sm text-gray-700 leading-5">
                Please continue to follow our Community Guidelines to maintain a positive environment.
              </Text>
            </View>

            <View className="flex-row mb-5 items-center">
              <View className="w-10 h-10 rounded-full bg-blue-50 justify-center items-center mr-3">
                <AlertCircle size={20} color="#023D7B" />
              </View>
              <Text className="flex-1 text-sm text-gray-700 leading-5">
                Your strike count has been reset. Future violations may result in another suspension.
              </Text>
            </View>
          </View>

          {/* Return to Home Button */}
          <TouchableOpacity
            className={`flex-row items-center justify-center bg-[#023D7B] py-3.5 px-6 rounded-lg gap-2 ${acknowledging ? 'opacity-60' : ''}`}
            onPress={handleReturnToHome}
            disabled={acknowledging}
          >
            {acknowledging ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Home size={18} color="#FFFFFF" />
                <Text className="text-white text-base font-semibold">Return to Home</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
