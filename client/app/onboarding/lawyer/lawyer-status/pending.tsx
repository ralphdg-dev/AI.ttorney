import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { lawyerApplicationService, LawyerApplicationStatus } from '../../../../services/lawyerApplicationService';
import StatusScreen from '../../../../components/ui/StatusScreen';

export default function PendingStatus() {
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

  return (
    <StatusScreen
      image={require('../../../../assets/images/lawyer-registration/pending.png')}
      title="Application Under Review"
      description="Your application is currently being reviewed by our team. We'll notify you once the review is complete."
      buttonLabel="Go to Home"
      onPress={() => router.push('/home')}
      showBackButton={false}
      imageAlt="Lawyer application pending review"
    />
  );
}
