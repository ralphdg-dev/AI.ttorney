import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View, Text } from 'react-native';
import { lawyerApplicationService, LawyerApplicationStatus } from '../../../../services/lawyerApplicationService';
import StatusScreen from '../../../../components/ui/StatusScreen';
import LawyerStatusGuard from '../../../../components/LawyerStatusGuard';

export default function RejectedAcknowledgedStatus() {
  const [applicationData, setApplicationData] = useState<LawyerApplicationStatus | null>(null);
  const [canReapplyDate, setCanReapplyDate] = useState<string>('');

  useEffect(() => {
    loadApplicationStatus();
  }, []);

  const loadApplicationStatus = async () => {
    try {
      const status = await lawyerApplicationService.getApplicationStatus();
      if (status) {
        setApplicationData(status);
        
        // Calculate 1 year from rejection date (reviewed_at)
        if (status.application?.reviewed_at) {
          const rejectedDate = new Date(status.application.reviewed_at);
          const canReapplyDate = new Date(rejectedDate);
          canReapplyDate.setFullYear(canReapplyDate.getFullYear() + 1);
          
          setCanReapplyDate(canReapplyDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }));
        }
      }
    } catch (error) {
      console.error('Error loading application status:', error);
    }
  };

  const description = `Your lawyer application has been rejected and acknowledged. You may reapply for lawyer verification after ${canReapplyDate}. Until then, you can continue using AI.ttorney as a regular user.`;

  return (
    <LawyerStatusGuard requiredStatus="rejected">
      <StatusScreen
        image={require('../../../../assets/images/lawyer-registration/rejected.png')}
        title="Application Rejected"
        description={description}
        buttonLabel="Go to Home"
        onPress={() => router.push('/home')}
        imageAlt="Lawyer application rejected and acknowledged"
        showBackButton={false}
      />
    </LawyerStatusGuard>
  );
}
