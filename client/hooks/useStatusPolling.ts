import { useEffect, useRef } from 'react';
import { router, usePathname } from 'expo-router';
import { lawyerApplicationService, LawyerApplicationStatus } from '../services/lawyerApplicationService';
import { useAuth } from '../contexts/AuthContext';

interface UseStatusPollingOptions {
  enabled?: boolean;
  onStatusChange?: (status: LawyerApplicationStatus | null) => void;
}

export function useStatusPolling({ enabled = true, onStatusChange }: UseStatusPollingOptions = {}) {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const { user, session } = useAuth();
  const currentPath = usePathname();

  useEffect(() => {
    if (!enabled || !user || !session) {
      return;
    }

    // Start polling
    lawyerApplicationService.startStatusPolling();

    // Simple polling without subscriptions since subscribeToStatusChanges doesn't exist
    let pollingInterval: any;
    
    const pollStatus = async () => {
      try {
        if (!user || !session) {
          console.log('useStatusPolling: User not authenticated, stopping polling');
          if (pollingInterval) clearInterval(pollingInterval);
          return;
        }

        const newStatus = await lawyerApplicationService.getApplicationStatus();
        
        // Call custom callback if provided
        if (onStatusChange) {
          onStatusChange(newStatus);
        }

        // Auto-redirect to correct status page based on new status
        if (newStatus?.application) {
          const newStatus_ = newStatus.application.status;
          
          // Determine the correct path for the new status
          let correctPath = '';
          switch (newStatus_) {
            case 'pending':
              correctPath = '/onboarding/lawyer/lawyer-status/pending';
              break;
            case 'resubmission':
              correctPath = '/onboarding/lawyer/lawyer-status/resubmission';
              break;
            case 'rejected':
              correctPath = '/onboarding/lawyer/lawyer-status/rejected';
              break;
            case 'accepted':
              correctPath = '/onboarding/lawyer/lawyer-status/accepted';
              break;
          }

          // Only redirect if we're on a different status page
          if (correctPath && currentPath !== correctPath && currentPath.includes('/lawyer-status/')) {
            console.log(`Status changed to ${newStatus_}, redirecting from ${currentPath} to ${correctPath}`);
            // Add delay to ensure router is ready
            setTimeout(() => {
              router.replace(correctPath as any);
            }, 100);
          }
        }
      } catch (error) {
        console.warn('Status polling error:', error);
      }
    };

    // Start polling every 60 seconds (1 minute)
    pollingInterval = setInterval(pollStatus, 60000);
    
    // Initial poll
    pollStatus();

    const unsubscribe = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      lawyerApplicationService.stopStatusPolling();
    };
  }, [enabled, onStatusChange, user, session, currentPath]);

  return {
    stopPolling: () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      lawyerApplicationService.stopStatusPolling();
    }
  };
}
