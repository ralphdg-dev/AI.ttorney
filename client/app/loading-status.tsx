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
      const statusData = await lawyerApplicationService.getApplicationStatus();
      let applicationStatus = null;
      
      if (statusData && statusData.has_application && statusData.application) {
        applicationStatus = statusData.application.status;
      }

      // Get the correct redirect path with the actual status
      const redirectPath = getRoleBasedRedirect(
        user.role, 
        user.is_verified, 
        user.pending_lawyer, 
        applicationStatus || undefined
      );

      if (redirectPath && redirectPath !== 'loading') {
        router.replace(redirectPath as any);
      } else {
        // Only fallback to pending if we truly have no status
        if (user.pending_lawyer) {
          router.replace('/onboarding/lawyer/lawyer-status/pending');
        } else {
          // User doesn't have pending_lawyer, redirect to normal dashboard
          const normalRedirect = getRoleBasedRedirect(user.role, user.is_verified, false);
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
