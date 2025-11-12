import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { lawyerApplicationService } from '../services/lawyerApplicationService';

export default function ApplyLawyer() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkApplicationStatus = async () => {
      try {
        const status = await lawyerApplicationService.getApplicationStatus();
        
        if (status?.has_application) {
          // User already has an application, redirect to appropriate status page
          const applicationStatus = status.application?.status;
          
          switch (applicationStatus) {
            case 'pending':
              // Redirect to dedicated pending status page
              router.replace('/onboarding/lawyer/lawyer-status/pending');
              break;
            case 'accepted':
              // User is already a verified lawyer, redirect to main app
              router.replace('/lawyer/forum');
              break;
            case 'rejected':
              // Check if 1 year has passed since rejection date
              const rejectionDate = status.application?.reviewed_at ? new Date(status.application.reviewed_at) : null;
              const oneYearLater = rejectionDate ? new Date(rejectionDate.getTime() + 365 * 24 * 60 * 60 * 1000) : null;
              const canReapplyAfterYear = oneYearLater ? new Date() >= oneYearLater : false;
              
              if (canReapplyAfterYear) {
                // 1 year has passed since rejection, allow reapplication
                router.replace('/onboarding/lawyer/verification-instructions');
              } else if (status.application?.acknowledged) {
                // Rejection acknowledged but still within 1 year restriction
                router.replace('/onboarding/lawyer/lawyer-status/rejected-acknowledged');
              } else {
                // Rejection not acknowledged yet, show rejection page
                router.replace('/onboarding/lawyer/lawyer-status/rejected');
              }
              break;
            case 'resubmission':
              // Allow resubmission, go to verification instructions
              router.replace('/onboarding/lawyer/verification-instructions');
              break;
            default:
              // Unknown status, go to verification instructions
              router.replace('/onboarding/lawyer/verification-instructions');
          }
        } else {
          // No existing application, start fresh
          router.replace('/onboarding/lawyer/verification-instructions');
        }
      } catch (error) {
        console.error('Error checking application status:', error);
        // On error, default to verification instructions
        router.replace('/onboarding/lawyer/verification-instructions');
      } finally {
        setIsChecking(false);
      }
    };

    checkApplicationStatus();
  }, []);

  // Return null since we're redirecting
  return null;
}
