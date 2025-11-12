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
        console.log('Application data received:', status);
        console.log('Application reviewed_at:', status.application?.reviewed_at);
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

  const handleBackButton = () => {
    // Clear any cached data to prevent status guard interference
    lawyerApplicationService.clearCache();
    
    // Force navigation to home, bypassing any guards or redirections
    router.replace('/home');
  };

  const canReapply = applicationData?.can_apply && !applicationData?.is_blocked;

  // Calculate reapplication date (1 year from rejection)
  let reapplicationDate = '';
  let reapplicationYear = '';
  
  console.log('Calculating reapplication date...');
  console.log('Application data:', applicationData);
  console.log('Reviewed at field:', applicationData?.application?.reviewed_at);
  
  if (applicationData?.application?.reviewed_at) {
    const rejectedDate = new Date(applicationData.application.reviewed_at);
    console.log('Rejected date parsed:', rejectedDate);
    
    const canReapplyDate = new Date(rejectedDate);
    canReapplyDate.setFullYear(canReapplyDate.getFullYear() + 1);
    console.log('Can reapply date:', canReapplyDate);
    
    reapplicationDate = canReapplyDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    reapplicationYear = canReapplyDate.getFullYear().toString();
    console.log('Reapplication year:', reapplicationYear);
  } else {
    console.log('No reviewed_at date found in application data');
  }

  let description = "After review, we can't approve your lawyer application at this time. You can continue using Ai.ttorney as a regular user";
  
  if (canReapply && reapplicationDate) {
    description += ` or reapply for lawyer verification after ${reapplicationDate}.`;
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
        buttonLabel={isAcknowledging ? "Acknowledging..." : (hasAcknowledged ? "Back to Home" : "Acknowledge & Continue")}
        onPress={hasAcknowledged ? () => router.push('/home') : handleAcknowledgeRejection}
        onBack={handleBackButton}
        imageAlt="Lawyer application rejected"
      />
    </LawyerStatusGuard>
  );
}