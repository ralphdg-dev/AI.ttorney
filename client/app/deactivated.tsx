import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, RotateCcw } from 'lucide-react-native';

const DeactivatedPage: React.FC = () => {
  const { signOut, refreshProfile } = useAuth();
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
      
      // Get current session token
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/reactivate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        console.log('✅ Account reactivated successfully');
        // Refresh profile to update account status
        await refreshProfile();
      } else {
        console.error('❌ Failed to reactivate account');
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
