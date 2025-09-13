import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { lawyerApplicationService } from '../services/lawyerApplicationService';
import { getRoleBasedRedirect } from '../config/routes';

export default function LoadingStatus() {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatusAndRedirect();
  }, []);

  const loadStatusAndRedirect = async () => {
    try {
      if (!user) {
        router.push('/login');
        return;
      }

      if (!user.pending_lawyer) {
        // User doesn't have pending lawyer status, redirect normally
        const redirectPath = getRoleBasedRedirect(user.role, user.is_verified, false);
        router.push(redirectPath as any);
        return;
      }

      // Fetch the actual application status
      console.log('Fetching application status for user:', user.email);
      const statusData = await lawyerApplicationService.getApplicationStatus();
      let applicationStatus = null;
      
      console.log('Raw API response:', JSON.stringify(statusData, null, 2));
      
      if (statusData && statusData.has_application && statusData.application) {
        applicationStatus = statusData.application.status;
        console.log('Found application status:', applicationStatus);
      } else {
        console.log('No application found or no status data');
        console.log('statusData exists:', !!statusData);
        console.log('has_application:', statusData?.has_application);
        console.log('application exists:', !!statusData?.application);
      }

      // Get the correct redirect path with the actual status
      const redirectPath = getRoleBasedRedirect(
        user.role, 
        user.is_verified, 
        user.pending_lawyer, 
        applicationStatus || undefined
      );

      console.log('Redirect path determined:', redirectPath);

      if (redirectPath && redirectPath !== 'loading') {
        console.log('Redirecting to:', redirectPath);
        router.replace(redirectPath as any);
      } else {
        // Only fallback to pending if we truly have no status
        console.log('No valid redirect path, checking if user should have status...');
        if (user.pending_lawyer) {
          console.log('User has pending_lawyer flag but no status found, defaulting to pending');
          router.replace('/onboarding/lawyer/lawyer-status/pending');
        } else {
          // User doesn't have pending_lawyer, redirect to normal dashboard
          const normalRedirect = getRoleBasedRedirect(user.role, user.is_verified, false);
          console.log('User has no pending_lawyer flag, redirecting to:', normalRedirect);
          router.replace(normalRedirect as any);
        }
      }
    } catch (error) {
      console.error('Error loading application status:', error);
      setError('Failed to load application status. Please check your connection.');
    }
  };

  const handleRetry = () => {
    setError(null);
    loadStatusAndRedirect();
  };

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#EF4444', textAlign: 'center', marginBottom: 16 }}>
          {error}
        </Text>
        <Text 
          style={{ color: '#3B82F6', textDecorationLine: 'underline' }}
          onPress={handleRetry}
        >
          Retry
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={{ marginTop: 16, color: '#4B5563' }}>
        Loading your application status...
      </Text>
    </View>
  );
}
