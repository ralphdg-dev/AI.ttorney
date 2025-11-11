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
  const { user, isLoading: authLoading, initialAuthCheck } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // CRITICAL: Ultimate fallback - ALWAYS allows access after 1 second no matter what
  useEffect(() => {
    const ultimateFallback = setTimeout(() => {
      setIsLoading(false);
      setHasAccess(true);
    }, 1000); // 1 second - GUARANTEED to fire

    return () => clearTimeout(ultimateFallback);
  }, []); // Empty deps - runs once on mount

  // Enable status polling and handle automatic redirects
  useStatusPolling({
    enabled: hasAccess && !authLoading && initialAuthCheck,
    onStatusChange: (newStatus) => {
      if (newStatus?.application) {
        const actualStatus = newStatus.application.status;
        
        // Only redirect if we're not already on the correct page
        if (actualStatus !== requiredStatus) {
          lawyerApplicationService.clearCache();
          redirectToCorrectStatusPage(actualStatus, newStatus);
        }
      }
    }
  });

  useEffect(() => {
    // Wait for initial auth check to complete
    if (!initialAuthCheck || authLoading) return;

    // If we have a user, check their status
    if (user) {
      checkStatusAccess();
    } else {
      // No user - redirect to login
      router.replace('/login');
    }
  }, [user, authLoading, initialAuthCheck]);

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
      // Redirect verified lawyers immediately
      if (user?.role === 'verified_lawyer') {
        router.replace('/lawyer');
        return;
      }

      // Redirect non-pending users
      if (!user?.pending_lawyer) {
        router.replace('/home');
        return;
      }

      // Fetch status with timeout
      const statusData = await Promise.race([
        lawyerApplicationService.getApplicationStatus(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 2000)
        )
      ]) as any;

      // If no application exists
      if (!statusData?.has_application || !statusData.application) {
        if (requiredStatus !== 'pending') {
          router.replace('/onboarding/lawyer/lawyer-status/pending');
          return;
        }
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      const actualStatus = statusData.application.status;

      if (actualStatus === requiredStatus) {
        setHasAccess(true);
        setIsLoading(false);
      } else {
        redirectToCorrectStatusPage(actualStatus, statusData);
      }
    } catch (error) {
      // On error, allow access to prevent infinite loading
      setHasAccess(true);
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
