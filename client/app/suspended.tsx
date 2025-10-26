import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, LogOut, Hourglass, Info, EyeOff, ShieldAlert } from 'lucide-react-native';
import { NetworkConfig } from '../utils/networkConfig';

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
        message: 'Your account has been suspended again.',
        warning: '⚠️ WARNING: One more suspension = permanent ban',
      };
    } else {
      return {
        title: 'Final Suspension',
        message: 'This is your last warning.',
        warning: '🚨 Next violation = permanent ban',
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
      <View className="bg-white px-4 pt-10 pb-3 border-b border-gray-200 items-center">
        <Image
          source={require('../assets/images/logo.png')}
          style={{ width: 140, height: 35 }}
          resizeMode="contain"
        />
      </View>

      <ScrollView className="flex-1">
        <View className="p-6 pt-16">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-3">We suspended your account</Text>
            {suspensionInfo?.suspension_end && (
              <Text className="text-sm text-gray-600 leading-5">
                Suspension ends {formatSuspensionEnd(suspensionInfo.suspension_end)}
              </Text>
            )}
            <Text className="text-sm text-gray-600 leading-5">
              This is your {suspensionMessage.title.toLowerCase()}.
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
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          className={`flex-row items-center justify-center bg-[#023D7B] py-3.5 px-6 rounded-lg gap-2 mt-2 ${isLoggingOut ? 'opacity-60' : ''}`}
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
