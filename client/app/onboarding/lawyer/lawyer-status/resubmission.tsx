import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { lawyerApplicationService, LawyerApplicationStatus } from '../../../../services/lawyerApplicationService';
import StatusScreen from '../../../../components/ui/StatusScreen';

export default function Resubmission() {
  const [applicationData, setApplicationData] = useState<LawyerApplicationStatus | null>(null);

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

  return (
    <StatusScreen
      image={require('../../../../assets/images/lawyer-registration/resubmission.png')}
      title="Resubmission Required"
      description={description}
      buttonLabel="Resubmit Documents"
      onPress={() => router.push('/onboarding/lawyer/resubmission')}
      imageAlt="Document resubmission required"
    />
  );
}