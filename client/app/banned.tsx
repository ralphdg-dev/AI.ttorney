import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, ShieldAlert, Info, Trash2, XCircle } from 'lucide-react-native';

const BannedPage: React.FC = () => {
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
    } catch (error) {
      console.error('Error during logout:', error);
      setIsLoggingOut(false);
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
          <Text className="text-2xl font-bold text-gray-900 mb-3">Your account was permanently banned</Text>
          <Text className="text-sm text-gray-600 leading-5">
            This action is permanent and cannot be appealed.
          </Text>
        </View>

        {/* What does this mean? */}
        <View className="mb-8">
          <Text className="text-base font-bold text-gray-900 mb-4">What does this mean?</Text>
          
          <View className="flex-row mb-5 items-center">
            <View className="w-10 h-10 rounded-full bg-red-50 justify-center items-center mr-3">
              <ShieldAlert size={20} color="#DC2626" />
            </View>
            <Text className="flex-1 text-sm text-gray-700 leading-5">
              Your account has been permanently removed for severe or repeated violations of our Community Guidelines.
            </Text>
          </View>

          <View className="flex-row mb-5 items-center">
            <View className="w-10 h-10 rounded-full bg-red-50 justify-center items-center mr-3">
              <Info size={20} color="#DC2626" />
            </View>
            <Text className="flex-1 text-sm text-gray-700 leading-5">
              You will no longer have access to any features of Ai.ttorney, including chatbot, forum, and legal consultations.
            </Text>
          </View>

          <View className="flex-row mb-5 items-center">
            <View className="w-10 h-10 rounded-full bg-red-50 justify-center items-center mr-3">
              <Trash2 size={20} color="#DC2626" />
            </View>
            <Text className="flex-1 text-sm text-gray-700 leading-5">
              Your content is no longer visible to other users in the app.
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          className={`flex-row items-center justify-center bg-[#023D7B] py-3.5 px-6 rounded-lg gap-2 ${isLoggingOut ? 'opacity-60' : ''}`}
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
    </View>
  );
};

export default BannedPage;
