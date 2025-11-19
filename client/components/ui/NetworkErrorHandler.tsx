import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';
import { apiClient } from '../../lib/api-client';

interface NetworkErrorHandlerProps {
  error?: string;
  onRetry?: () => void;
  showDiagnostics?: boolean;
}

export const NetworkErrorHandler: React.FC<NetworkErrorHandlerProps> = ({
  error,
  onRetry,
  showDiagnostics = __DEV__
}) => {
  const isNetworkError = error && (
    error.includes('Network request failed') ||
    error.includes('Cannot connect to server') ||
    error.includes('timeout') ||
    error.includes('Failed to fetch')
  );

  if (!isNetworkError) {
    return null;
  }

  const handleRunDiagnostics = async () => {
    try {
      const result = await apiClient.testNetworkConnection();
      
      Alert.alert(
        'Network Diagnostics',
        result.success 
          ? 'Network connection is working properly.'
          : `Network issue detected: ${result.error}`,
        [
          { text: 'OK' },
          ...(result.success ? [] : [
            {
              text: 'Refresh Connection',
              onPress: async () => {
                await apiClient.refreshNetworkConnection();
                onRetry?.();
              }
            }
          ])
        ]
      );
    } catch (error) {
      Alert.alert(
        'Diagnostics Failed',
        'Unable to run network diagnostics. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRefreshConnection = async () => {
    try {
      await apiClient.refreshNetworkConnection();
      onRetry?.();
    } catch (error) {
      Alert.alert(
        'Connection Refresh Failed',
        'Unable to refresh network connection. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={[tw`p-4 m-4 rounded-lg border`, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
      <View style={tw`flex-row items-center mb-2`}>
        <Ionicons name="wifi-outline" size={20} color="#dc2626" style={tw`mr-2`} />
        <Text style={[tw`font-semibold`, { color: '#dc2626' }]}>
          Network Connection Issue
        </Text>
      </View>
      
      <Text style={[tw`text-sm mb-3`, { color: '#7f1d1d' }]}>
        {error}
      </Text>

      <View style={tw`flex-row flex-wrap`}>
        {onRetry && (
          <TouchableOpacity
            style={[
              tw`px-3 py-2 rounded mr-2 mb-2`,
              { backgroundColor: Colors.primary.blue }
            ]}
            onPress={onRetry}
          >
            <Text style={[tw`text-sm font-medium`, { color: 'white' }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            tw`px-3 py-2 rounded mr-2 mb-2 border`,
            { borderColor: Colors.primary.blue }
          ]}
          onPress={handleRefreshConnection}
        >
          <Text style={[tw`text-sm font-medium`, { color: Colors.primary.blue }]}>
            Refresh Connection
          </Text>
        </TouchableOpacity>

        {showDiagnostics && (
          <TouchableOpacity
            style={[
              tw`px-3 py-2 rounded mb-2 border`,
              { borderColor: '#6b7280' }
            ]}
            onPress={handleRunDiagnostics}
          >
            <Text style={[tw`text-sm font-medium`, { color: '#6b7280' }]}>
              Run Diagnostics
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={tw`mt-2`}>
        <Text style={[tw`text-xs`, { color: '#6b7280' }]}>
          💡 Tips: Check your internet connection, ensure the server is running, or try switching networks.
        </Text>
      </View>
    </View>
  );
};

export default NetworkErrorHandler;
