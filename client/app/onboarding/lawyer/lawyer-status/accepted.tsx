import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { lawyerApplicationService, LawyerApplicationStatus } from '../../../../services/lawyerApplicationService';
import StatusScreen from '../../../../components/ui/StatusScreen';
import { useAuth } from '../../../../contexts/AuthContext';

export default function AcceptedStatus() {
  const [applicationData, setApplicationData] = useState<LawyerApplicationStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { refreshUserData } = useAuth();

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

  const handleGoToDashboard = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Clear the pending_lawyer flag since user is now fully onboarded
      const result = await lawyerApplicationService.clearPendingLawyerStatus();
      
      if (result.success) {
        // Refresh user data in AuthContext to update pending_lawyer flag
        await refreshUserData();
        
        // Small delay to ensure state is updated
        setTimeout(() => {
          router.push('/lawyer');
        }, 100);
      } else {
        console.error('Failed to clear pending lawyer status:', result.message);
        // Still navigate to dashboard even if API call fails
        router.push('/lawyer');
      }
    } catch (error) {
      console.error('Error clearing pending lawyer status:', error);
      // Still navigate to dashboard even if there's an error
      router.push('/lawyer');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <StatusScreen
      image={require('../../../../assets/images/lawyer-registration/accepted.png')}
      title="Application Accepted!"
      description="Congratulations! Your lawyer application has been approved. You now have access to the lawyer dashboard and all lawyer features."
      buttonLabel={isProcessing ? "Processing..." : "Go to Lawyer Dashboard"}
      onPress={handleGoToDashboard}
      imageAlt="Lawyer application accepted"
    />
  );
}