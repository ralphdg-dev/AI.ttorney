import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { lawyerApplicationService, LawyerApplicationStatus } from '../services/lawyerApplicationService';

interface UseStatusPollingOptions {
  enabled?: boolean;
  onStatusChange?: (status: LawyerApplicationStatus | null) => void;
}

export function useStatusPolling({ enabled = true, onStatusChange }: UseStatusPollingOptions = {}) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Start polling
    lawyerApplicationService.startStatusPolling();

    // Subscribe to status changes
    const unsubscribe = lawyerApplicationService.onStatusChange((newStatus) => {
      // Call custom callback if provided
      if (onStatusChange) {
        onStatusChange(newStatus);
      }

      // Auto-redirect to correct status page based on new status
      if (newStatus?.application) {
        const currentPath = window.location.pathname;
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
          router.replace(correctPath);
        }
      }
    });

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      lawyerApplicationService.stopStatusPolling();
    };
  }, [enabled, onStatusChange]);

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
