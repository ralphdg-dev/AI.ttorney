import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';
import { apiClient } from '../../lib/api-client';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  isNetworkError: boolean;
}

export class NetworkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isNetworkError: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const isNetworkError = error.message.includes('Network request failed') ||
                          error.message.includes('Failed to fetch') ||
                          error.message.includes('timeout') ||
                          error.name === 'TypeError';

    return {
      hasError: true,
      error,
      isNetworkError
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({
      error,
      errorInfo,
      isNetworkError: error.message.includes('Network request failed') ||
                     error.message.includes('Failed to fetch') ||
                     error.message.includes('timeout') ||
                     error.name === 'TypeError'
    });

    // Log error for debugging
    console.error('NetworkErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isNetworkError: false
    });
  };

  handleRefreshConnection = async () => {
    try {
      await apiClient.refreshNetworkConnection();
      this.handleRetry();
    } catch (error) {
      console.error('Failed to refresh connection:', error);
    }
  };

  handleRunDiagnostics = async () => {
    try {
      const result = await apiClient.testNetworkConnection();
      console.log('Network diagnostics result:', result);
    } catch (error) {
      console.error('Network diagnostics failed:', error);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.state.isNetworkError) {
        return (
          <View style={tw`flex-1 justify-center items-center p-6`}>
            <View style={[tw`p-6 rounded-lg w-full max-w-sm`, { backgroundColor: '#fef2f2' }]}>
              <View style={tw`items-center mb-4`}>
                <Ionicons name="wifi-outline" size={48} color="#dc2626" style={tw`mb-2`} />
                <Text style={[tw`text-lg font-bold text-center`, { color: '#dc2626' }]}>
                  Network Connection Error
                </Text>
              </View>

              <Text style={[tw`text-sm text-center mb-4`, { color: '#7f1d1d' }]}>
                {this.state.error?.message || 'Unable to connect to the server. Please check your internet connection.'}
              </Text>

              <View style={tw`space-y-2`}>
                <TouchableOpacity
                  style={[
                    tw`py-3 px-4 rounded-lg`,
                    { backgroundColor: Colors.primary.blue }
                  ]}
                  onPress={this.handleRetry}
                >
                  <Text style={[tw`text-center font-medium`, { color: 'white' }]}>
                    Try Again
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    tw`py-3 px-4 rounded-lg border`,
                    { borderColor: Colors.primary.blue }
                  ]}
                  onPress={this.handleRefreshConnection}
                >
                  <Text style={[tw`text-center font-medium`, { color: Colors.primary.blue }]}>
                    Refresh Connection
                  </Text>
                </TouchableOpacity>

                {__DEV__ && (
                  <TouchableOpacity
                    style={[
                      tw`py-3 px-4 rounded-lg border`,
                      { borderColor: '#6b7280' }
                    ]}
                    onPress={this.handleRunDiagnostics}
                  >
                    <Text style={[tw`text-center font-medium`, { color: '#6b7280' }]}>
                      Run Diagnostics
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={tw`mt-4`}>
                <Text style={[tw`text-xs text-center`, { color: '#6b7280' }]}>
                  💡 Check your internet connection or try switching networks
                </Text>
              </View>
            </View>
          </View>
        );
      }

      // Generic error fallback
      return (
        <View style={tw`flex-1 justify-center items-center p-6`}>
          <View style={[tw`p-6 rounded-lg w-full max-w-sm`, { backgroundColor: '#fef2f2' }]}>
            <View style={tw`items-center mb-4`}>
              <Ionicons name="alert-circle-outline" size={48} color="#dc2626" style={tw`mb-2`} />
              <Text style={[tw`text-lg font-bold text-center`, { color: '#dc2626' }]}>
                Something went wrong
              </Text>
            </View>

            <Text style={[tw`text-sm text-center mb-4`, { color: '#7f1d1d' }]}>
              An unexpected error occurred. Please try again.
            </Text>

            <TouchableOpacity
              style={[
                tw`py-3 px-4 rounded-lg`,
                { backgroundColor: Colors.primary.blue }
              ]}
              onPress={this.handleRetry}
            >
              <Text style={[tw`text-center font-medium`, { color: 'white' }]}>
                Try Again
              </Text>
            </TouchableOpacity>

            {__DEV__ && this.state.error && (
              <ScrollView style={tw`mt-4 max-h-32`}>
                <Text style={[tw`text-xs`, { color: '#6b7280' }]}>
                  Error: {this.state.error.message}
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

export default NetworkErrorBoundary;
