import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LoadingWithTrivia } from '../components/LoadingWithTrivia';

export default function ApplyLawyer() {
  const { user, session, checkLawyerApplicationStatus } = useAuth();

  useEffect(() => {
    const checkApplicationStatus = async () => {
      console.log('Starting application status check...');
      console.log('User data:', user);
      console.log('Session data:', !!session);
      
      // Check if user is authenticated
      if (!session || !user) {
        console.log('No authenticated user, redirecting to verification instructions');
        router.push('/onboarding/lawyer/verification-instructions');
        return;
      }

      // Check if user has pending_lawyer flag
      if (user.pending_lawyer) {
        console.log('User has pending_lawyer flag, checking application status via AuthContext...');
        
        try {
          // Use the AuthContext method which has proper token handling
          const applicationData = await checkLawyerApplicationStatus();
          
          if (applicationData && applicationData.has_application && applicationData.application) {
            const status = applicationData.application.status;
            console.log('Application status:', status);
            
            switch (status) {
              case 'pending':
                router.push('/onboarding/lawyer/lawyer-status/pending');
                break;
              case 'accepted':
                router.push('/onboarding/lawyer/lawyer-status/accepted');
                break;
              case 'rejected':
                router.push('/onboarding/lawyer/lawyer-status/rejected');
                break;
              default:
                router.push('/onboarding/lawyer/verification-instructions');
            }
          } else {
            console.log('No application found but user has pending_lawyer flag, redirecting to pending');
            router.push('/onboarding/lawyer/lawyer-status/pending');
          }
        } catch (error) {
          console.error('Error checking application status:', error);
          // Fallback: go to pending status
          router.push('/onboarding/lawyer/lawyer-status/pending');
        }
      } else {
        console.log('User does not have pending_lawyer flag, redirecting to verification instructions');
        router.push('/onboarding/lawyer/verification-instructions');
      }
    };

    // Execute immediately without delay to prevent double loading
    checkApplicationStatus();
  }, [user, session, checkLawyerApplicationStatus]);

  // Show loading immediately to prevent white page flash
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, backgroundColor: '#1F2937' }}>
        <LoadingWithTrivia 
          message="LOADING..."
          showTrivia={true}
        />
      </View>
    </SafeAreaView>
  );
}
