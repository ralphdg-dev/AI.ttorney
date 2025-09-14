import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { router } from 'expo-router';
import { getRoleBasedRedirect } from '../config/routes';

export default function LoadingPage() {
  const { isAuthenticated, user, session, checkLawyerApplicationStatus } = useAuth();
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);

  useEffect(() => {
    // If user is not authenticated, redirect to login immediately
    if (!isAuthenticated || !user || !session) {
      router.replace('/login');
      return;
    }

    // If user is authenticated but we haven't checked their status yet
    if (isAuthenticated && user && session && !hasCheckedStatus) {
      const checkAndRedirect = async () => {
        try {
          setHasCheckedStatus(true);
          
          // Wait for router to be ready
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (user.pending_lawyer) {
            // Add timeout to prevent slow network from hanging
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 3000)
            );
            
            try {
              // Race between API call and timeout
              const statusData = await Promise.race([
                checkLawyerApplicationStatus(),
                timeoutPromise
              ]);
              
              let applicationStatus = null;
              if (statusData && statusData.has_application && statusData.application) {
                applicationStatus = statusData.application.status;
              }
              
              const redirectPath = getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer, applicationStatus || undefined);
              
              if (redirectPath && redirectPath !== 'loading') {
                router.replace(redirectPath as any);
              } else {
                // If still loading, default to pending status
                router.replace('/onboarding/lawyer/lawyer-status/pending' as any);
              }
            } catch (timeoutError) {
              // If timeout or API error, default to pending status
              console.warn('Status check timeout, defaulting to pending');
              router.replace('/onboarding/lawyer/lawyer-status/pending' as any);
            }
          } else {
            // User doesn't have pending lawyer status, redirect normally
            const redirectPath = getRoleBasedRedirect(user.role, user.is_verified, false);
            router.replace(redirectPath as any);
          }
        } catch (error) {
          console.error('Error checking status:', error);
          // Fallback redirect
          const redirectPath = getRoleBasedRedirect(user.role, user.is_verified, false);
          router.replace(redirectPath as any);
        }
      };

      // Add delay to ensure router is mounted before navigation
      setTimeout(checkAndRedirect, 100);
    }
  }, [isAuthenticated, user, session, hasCheckedStatus, checkLawyerApplicationStatus]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#023D7B" />
      <Text style={styles.text}>Loading your application status...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
});
