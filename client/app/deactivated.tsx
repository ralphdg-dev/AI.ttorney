import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, RotateCcw, User } from 'lucide-react-native';
import { NetworkConfig } from '../utils/networkConfig';
import { supabase } from '../config/supabase';
import { useRouter } from 'expo-router';

const DeactivatedPage: React.FC = () => {
  const { signOut, refreshProfile, session } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isReactivating, setIsReactivating] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
    } catch (error) {
      console.error('Error during logout:', error);
      setIsLoggingOut(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setIsReactivating(true);
      
      // Get the correct API URL using NetworkConfig
      const apiUrl = await NetworkConfig.getBestApiUrl();
      console.log('🔄 Reactivating account at:', apiUrl);
      
      // Use AuthContext session data (industry-standard pattern)
      console.log('🔍 Checking session from AuthContext...');
      console.log('📋 Session available:', session ? 'YES' : 'NO');
      console.log('🎫 Access token:', session?.access_token ? 'PRESENT' : 'MISSING');
      
      if (!session?.access_token) {
        console.error('❌ No authentication token available');
        setIsReactivating(false);
        return;
      }
      
      console.log('🚀 Making PATCH request with Authorization header...');
      const response = await fetch(`${apiUrl}/auth/reactivate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        console.log('✅ Account reactivated successfully');
        // Refresh profile to update account status
        await refreshProfile();
        console.log('🔄 Redirecting to home after successful reactivation...');
        // Force redirect to home after successful reactivation
        router.replace('/home');
      } else {
        console.error('❌ Failed to reactivate account:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error during reactivation:', error);
    } finally {
      setIsReactivating(false);
    }
  };

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

      <View className="flex-1 p-6 pt-8">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-3">Account Deactivated</Text>
          <Text className="text-sm text-gray-600 leading-5">
            Your account is currently deactivated. Reactivate your account to continue using the platform.
          </Text>
        </View>

        {/* What does this mean? */}
        <View className="mb-8">
          <Text className="text-base font-bold text-gray-900 mb-4">What does this mean?</Text>
          
          <View className="flex-row mb-5 items-center">
            <View className="w-10 h-10 rounded-full bg-blue-50 justify-center items-center mr-3">
              <RotateCcw size={20} color="#023D7B" />
            </View>
            <Text className="flex-1 text-sm text-gray-700 leading-5">
              You can reactivate your account at any time to restore full access to all features and content.
            </Text>
          </View>

          <View className="flex-row mb-5 items-center">
            <View className="w-10 h-10 rounded-full bg-blue-50 justify-center items-center mr-3">
              <User size={18} color="#023D7B" />
            </View>
            <Text className="flex-1 text-sm text-gray-700 leading-5">
              Your existing posts and comments currently appear as "Deactivated Account" instead of your username. Reactivating will restore your real name on all content.
            </Text>
          </View>
        </View>

        {/* Reactivate Button */}
        <TouchableOpacity
          className={`flex-row items-center justify-center bg-[#023D7B] py-3.5 px-6 rounded-lg gap-2 mb-3 ${isReactivating ? 'opacity-60' : ''}`}
          onPress={handleReactivate}
          disabled={isReactivating}
        >
          {isReactivating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <RotateCcw size={18} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold">Reactivate Account</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity
          className={`flex-row items-center justify-center bg-gray-100 py-3.5 px-6 rounded-lg gap-2 ${isLoggingOut ? 'opacity-60' : ''}`}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : (
            <>
              <LogOut size={18} color="#6B7280" />
              <Text className="text-gray-700 text-base font-semibold">Logout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DeactivatedPage;
