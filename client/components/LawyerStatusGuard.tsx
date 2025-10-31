import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { lawyerApplicationService } from '../services/lawyerApplicationService';
import { useStatusPolling } from '../hooks/useStatusPolling';
import { LoadingWithTrivia } from './LoadingWithTrivia';

interface LawyerStatusGuardProps {
  children: React.ReactNode;
  requiredStatus: 'pending' | 'resubmission' | 'rejected' | 'accepted';
}

export default function LawyerStatusGuard({ children, requiredStatus }: LawyerStatusGuardProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Enable status polling and handle automatic redirects
  useStatusPolling({
    enabled: true,
    onStatusChange: (newStatus) => {
      if (newStatus?.application) {
        const actualStatus = newStatus.application.status;
        
        // Clear cache when status changes
        lawyerApplicationService.clearCache();
        
        // Only redirect if we're not already on the correct page
        if (actualStatus !== requiredStatus) {
          console.log(`Status changed to ${actualStatus}, current page requires ${requiredStatus}`);
          redirectToCorrectStatusPage(actualStatus, newStatus);
        }
      }
    }
  });

  useEffect(() => {
    checkStatusAccess();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, requiredStatus]);

  const redirectToCorrectStatusPage = (actualStatus: string, statusData: any) => {
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
  };

  const checkStatusAccess = async () => {
    try {
      // If user is not authenticated or doesn't have pending_lawyer flag
      if (!user) {
        console.log('LawyerStatusGuard: No user, redirecting to login');
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
            // If it's a resubmission pending (version > 1), show pending with resubmission context
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
    return <LoadingWithTrivia />;
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
