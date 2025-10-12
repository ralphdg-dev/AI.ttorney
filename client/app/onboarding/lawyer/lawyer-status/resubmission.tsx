import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { lawyerApplicationService, LawyerApplicationStatus } from '../../../../services/lawyerApplicationService';
import StatusScreen from '../../../../components/ui/StatusScreen';
import LawyerStatusGuard from '../../../../components/LawyerStatusGuard';
import { useStatusPolling } from '../../../../hooks/useStatusPolling';

export default function Resubmission() {
  const [, setApplicationData] = useState<LawyerApplicationStatus | null>(null);

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

  const description = "We found issues with your document submission. Please review the requirements and resubmit your documents to continue your lawyer application.";

  const handleBackToHome = () => {
    router.push('/home');
  };

  const handleResubmit = () => {
    router.push('/onboarding/lawyer/verification-instructions');
  };

  return (
    <LawyerStatusGuard requiredStatus="resubmission">
      <StatusScreen
        image={require('../../../../assets/images/lawyer-registration/resubmission.png')}
        title="Resubmission Required"
        description={description}
        buttonLabel="Resubmit Documents"
        onPress={handleResubmit}
        onBack={handleBackToHome}
        imageAlt="Document resubmission required"
      />
    </LawyerStatusGuard>
  );
}