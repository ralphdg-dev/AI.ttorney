import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WifiOff, X, RefreshCw } from 'lucide-react-native';
import tw from 'tailwind-react-native-classnames';
import NetInfo from '@react-native-community/netinfo';
import Colors from '../../constants/Colors';

interface NoInternetModalProps {
  visible: boolean;
  onDismiss?: () => void;
}

const NoInternetModal: React.FC<NoInternetModalProps> = ({ visible, onDismiss }) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Check network state
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        // If connected, dismiss modal
        onDismiss?.();
      }
    } catch (error) {
      console.error('Error checking network:', error);
    } finally {
      // Add a small delay for better UX
      setTimeout(() => {
        setIsRetrying(false);
      }, 500);
    }
  };

  const handleClose = () => {
    onDismiss?.();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center px-4`}>
        <View style={tw`bg-white rounded-lg w-full max-w-md p-6`}>
          {/* Close Button */}
          <TouchableOpacity
            onPress={handleClose}
            style={tw`absolute top-4 right-4 p-1 z-10`}
          >
            <X size={20} color="#6B7280" />
          </TouchableOpacity>

          <View style={tw`items-center mb-6 mt-4`}>
            <View style={tw`w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4`}>
              <WifiOff size={32} color="#EF4444" />
            </View>
          </View>
          <Text style={tw`text-xl font-semibold text-gray-900 mb-2 text-center`}>
            No Internet Connection
          </Text>
          <Text style={tw`text-sm text-gray-600 text-center leading-5 mb-6`}>
            Please check your internet connection and try again. Some features may not be available until you're back online.
          </Text>

          {/* Retry Button */}
          <TouchableOpacity
            onPress={handleRetry}
            disabled={isRetrying}
            style={[
              tw`w-full py-3 rounded-lg flex-row items-center justify-center`,
              { backgroundColor: isRetrying ? '#D1D5DB' : Colors.primary.blue }
            ]}
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color="#fff" style={tw`mr-2`} />
            ) : (
              <RefreshCw size={18} color="#fff" style={tw`mr-2`} />
            )}
            <Text style={tw`text-center font-medium text-white`}>
              {isRetrying ? 'Checking...' : 'Retry Connection'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default NoInternetModal;
