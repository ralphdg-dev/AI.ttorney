import React, { useState } from 'react';
import { router } from 'expo-router';
import { lawyerApplicationService } from '../../../../services/lawyerApplicationService';
import StatusScreen from '../../../../components/ui/StatusScreen';
import LawyerStatusGuard from '../../../../components/LawyerStatusGuard';
import { useAuth } from '../../../../contexts/AuthContext';
import { Alert } from 'react-native';

export default function Resubmission() {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const { refreshUserData } = useAuth();

  // Status polling is handled by LawyerStatusGuard

  const description = "We found issues with your document submission. Please review the requirements and resubmit your documents to continue your lawyer application.";

  const handleResubmit = async () => {
    try {
      setIsAcknowledging(true);
      
      console.log('🔄 Acknowledging resubmission...');
      // Call API to acknowledge the resubmission
      const result = await lawyerApplicationService.acknowledgeResubmission();
      
      if (result.success) {
        console.log('✅ Resubmission acknowledged, refreshing user data...');
        // Refresh user data in AuthContext to clear pending_lawyer flag
        await refreshUserData();
        console.log('✅ User data refreshed, navigating to verification instructions...');
        
        // Navigate to verification instructions to start resubmission
        router.push('/onboarding/lawyer/verification-instructions');
      } else {
        console.error('❌ Failed to acknowledge resubmission:', result.message);
        Alert.alert('Error', result.message || 'Failed to acknowledge resubmission. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error acknowledging resubmission:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  return (
    <LawyerStatusGuard requiredStatus="resubmission">
      <StatusScreen
        image={require('../../../../assets/images/lawyer-registration/resubmission.png')}
        title="Resubmission Required"
        description={description}
        buttonLabel="Resubmit Documents"
        onPress={handleResubmit}
        showBackButton={false}
        imageAlt="Document resubmission required"
      />
    </LawyerStatusGuard>
  );
}