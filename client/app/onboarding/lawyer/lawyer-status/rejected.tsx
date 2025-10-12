import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { lawyerApplicationService, LawyerApplicationStatus } from '../../../../services/lawyerApplicationService';
import StatusScreen from '../../../../components/ui/StatusScreen';
import LawyerStatusGuard from '../../../../components/LawyerStatusGuard';
import { useStatusPolling } from '../../../../hooks/useStatusPolling';

export default function RejectedStatus() {
  const [applicationData, setApplicationData] = useState<LawyerApplicationStatus | null>(null);

  // Enable real-time status polling
  useStatusPolling({
    enabled: true,
    onStatusChange: (newStatus) => {
      if (newStatus) {
        setApplicationData(newStatus);
      }
    }
  });

  useEffect(() => {
    loadApplicationStatus();
  }, []);

  const loadApplicationStatus = async () => {
    try {
      const status = await lawyerApplicationService.getApplicationStatus();
      if (status) {
        setApplicationData(status);
      }
    } catch (error) {
      console.error('Error loading application status:', error);
    }
  };

  const canReapply = applicationData?.can_apply && !applicationData?.is_blocked;

  let description = "After review, we can't approve your lawyer application at this time. You can continue using AI.ttorney as a regular user";
  
  if (canReapply) {
    description += " or reapply for lawyer verification when you're ready.";
  } else {
    description += ".";
  }

  return (
    <LawyerStatusGuard requiredStatus="rejected">
      <StatusScreen
        image={require('../../../../assets/images/lawyer-registration/rejected.png')}
        title="Application Rejected"
        description={description}
        buttonLabel={canReapply ? "Reapply" : "Go to Home"}
        onPress={() => canReapply ? router.push('/onboarding/lawyer/upload-documents') : router.push('/home')}
        imageAlt="Lawyer application rejected"
      />
    </LawyerStatusGuard>
  );
}