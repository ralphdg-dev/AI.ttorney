import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { lawyerApplicationService } from '../services/lawyerApplicationService';

interface LawyerStatusGuardProps {
  children: React.ReactNode;
  requiredStatus: 'pending' | 'resubmission' | 'rejected' | 'accepted';
}

export default function LawyerStatusGuard({ children, requiredStatus }: LawyerStatusGuardProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkStatusAccess();
  }, [user, requiredStatus]);

  const checkStatusAccess = async () => {
    try {
      // If user is not authenticated or doesn't have pending_lawyer flag
      if (!user) {
        router.replace('/login');
        return;
      }

      if (!user.pending_lawyer) {
        // User doesn't have pending lawyer status, redirect to their normal dashboard
        router.replace('/home');
        return;
      }

      // Fetch the actual application status
      const statusData = await lawyerApplicationService.getApplicationStatus();
      
      if (!statusData || !statusData.has_application || !statusData.application) {
        // No application found, only allow access to pending page
        if (requiredStatus !== 'pending') {
          router.replace('/onboarding/lawyer/lawyer-status/pending');
          return;
        }
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      const actualStatus = statusData.application.status;

      // Check if user's actual status matches the required status for this page
      if (actualStatus === requiredStatus) {
        setHasAccess(true);
      } else {
        // Redirect to the correct status page based on their actual status
        switch (actualStatus) {
          case 'pending':
            router.replace('/onboarding/lawyer/lawyer-status/pending');
            break;
          case 'resubmission':
            router.replace('/onboarding/lawyer/lawyer-status/resubmission');
            break;
          case 'rejected':
            router.replace('/onboarding/lawyer/lawyer-status/rejected');
            break;
          case 'accepted':
            router.replace('/onboarding/lawyer/lawyer-status/accepted');
            break;
          default:
            router.replace('/onboarding/lawyer/lawyer-status/pending');
        }
        return;
      }
    } catch (error) {
      console.error('LawyerStatusGuard: Error checking status access:', error);
      // On error, redirect to pending page as fallback
      if (requiredStatus !== 'pending') {
        router.replace('/onboarding/lawyer/lawyer-status/pending');
        return;
      }
      setHasAccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 16, color: '#4B5563' }}>
          Verifying access...
        </Text>
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#EF4444', textAlign: 'center' }}>
          Redirecting to your current status...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
