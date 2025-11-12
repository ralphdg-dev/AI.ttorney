import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { lawyerApplicationService, LawyerApplicationStatus } from '../../../../services/lawyerApplicationService';
import StatusScreen from '../../../../components/ui/StatusScreen';
import LawyerStatusGuard from '../../../../components/LawyerStatusGuard';

export default function RejectedStatus() {
  const [applicationData, setApplicationData] = useState<LawyerApplicationStatus | null>(null);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Status polling is handled by LawyerStatusGuard

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

  const handleAcknowledgeRejection = async () => {
    try {
      setIsAcknowledging(true);
      
      // Call API to acknowledge the rejection
      const result = await lawyerApplicationService.acknowledgeRejection();
      
      if (result.success) {
        // Redirect to the acknowledged rejection page
        router.replace('/onboarding/lawyer/lawyer-status/rejected-acknowledged');
      } else {
        Alert.alert('Error', 'Failed to acknowledge rejection. Please try again.');
      }
    } catch (error) {
      console.error('Error acknowledging rejection:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  const canReapply = applicationData?.can_apply && !applicationData?.is_blocked;

  // Calculate reapplication date (1 year from rejection)
  let reapplicationDate = '';
  if (applicationData?.application?.reviewed_at) {
    const rejectedDate = new Date(applicationData.application.reviewed_at);
    const canReapplyDate = new Date(rejectedDate);
    canReapplyDate.setFullYear(canReapplyDate.getFullYear() + 1);
    
    reapplicationDate = canReapplyDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  let description = "After review, we can't approve your lawyer application at this time. You can continue using Ai.ttorney as a regular user";
  
  if (canReapply && reapplicationDate) {
    description += ` or reapply for lawyer verification after 1 year on ${reapplicationDate}.`;
  } else if (canReapply) {
    description += " or reapply for lawyer verification when you're ready.";
  } else {
    description += ".";
  }

  // Check if user has already acknowledged the rejection
  const hasAcknowledged = applicationData?.application?.acknowledged;
  
  return (
    <LawyerStatusGuard requiredStatus="rejected">
      <StatusScreen
        image={require('../../../../assets/images/lawyer-registration/rejected.png')}
        title="Application Rejected"
        description={description}
        buttonLabel={isAcknowledging ? "Acknowledging..." : (hasAcknowledged ? "Go to Home" : (canReapply ? "Acknowledge & Continue" : "Go to Home"))}
        onPress={hasAcknowledged ? () => router.push('/home') : (canReapply ? handleAcknowledgeRejection : () => router.push('/home'))}
        imageAlt="Lawyer application rejected"
      />
    </LawyerStatusGuard>
  );
}