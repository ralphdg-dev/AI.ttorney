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
    if (user) {
      loadStatusAndRedirect();
    }
  }, [user]);


  const loadStatusAndRedirect = async () => {
    try {
      if (!user) {
        router.replace('/login');
        return;
      }

      if (!user.pending_lawyer) {
        // User doesn't have pending lawyer status, redirect normally
        const redirectPath = getRoleBasedRedirect(user.role, user.is_verified, false);
        router.replace(redirectPath as any);
        return;
      }

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      // Clear cache first to get fresh data
      lawyerApplicationService.clearStatusCache();
      
      // Fetch the actual application status with timeout
      const statusPromise = lawyerApplicationService.getApplicationStatus();
      
      let statusData;
      try {
        statusData = await Promise.race([statusPromise, timeoutPromise]);
      } catch (timeoutError) {
        // If timeout or error, default to pending status
        router.replace('/onboarding/lawyer/lawyer-status/pending');
        return;
      }

      let applicationStatus = null;
      if (statusData && (statusData as any).has_application && (statusData as any).application) {
        applicationStatus = (statusData as any).application.status;
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
        // If still no valid redirect path, default to pending
        router.replace('/onboarding/lawyer/lawyer-status/pending');
      }
    } catch (error) {
      console.error('Error loading application status:', error);
      // On error, redirect to pending as fallback
      if (user?.pending_lawyer) {
        router.replace('/onboarding/lawyer/lawyer-status/pending');
      } else {
        setError('Failed to load application status. Please check your connection.');
      }
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
