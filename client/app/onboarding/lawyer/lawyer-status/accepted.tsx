import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View, Text } from 'react-native';
import { lawyerApplicationService, LawyerApplicationStatus } from '../../../../services/lawyerApplicationService';
import StatusScreen from '../../../../components/ui/StatusScreen';
import LawyerStatusGuard from '../../../../components/LawyerStatusGuard';
import { useAuth } from '../../../../contexts/AuthContext';

export default function AcceptedStatus() {
  const [, setApplicationData] = useState<LawyerApplicationStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const { user, refreshUserData } = useAuth();

  // CRITICAL: Force show content after 1 second no matter what
  useEffect(() => {
    console.log('🎯 AcceptedStatus: Component mounted');
    const forceShowTimeout = setTimeout(() => {
      console.log('🎯 AcceptedStatus: Force showing content after 1s');
      setShowContent(true);
    }, 1000);

    loadApplicationStatus();

    return () => clearTimeout(forceShowTimeout);
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

  const handleContinueAsLawyer = async () => {
    if (isProcessing) return;
    
    console.log('🚀 Starting lawyer activation...');
    setIsProcessing(true);
    
    try {
      console.log('📞 Calling activateVerifiedLawyer API...');
      const result = await lawyerApplicationService.activateVerifiedLawyer();
      console.log('📥 API response:', result);
      
      if (result.success) {
        console.log('✅ Activation successful, refreshing user data...');
        // Refresh user data in AuthContext to update role
        await refreshUserData();
        console.log('✅ User data refreshed, navigating to lawyer dashboard...');
        
        // Navigate to lawyer dashboard
        router.replace('/lawyer' as any);
      } else {
        console.error('❌ Activation failed:', result.message);
        setIsProcessing(false);
        alert(`Failed to activate lawyer account: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Error during activation:', error);
      setIsProcessing(false);
      alert('An error occurred. Please check the console and try again.');
    }
  };

  // Show loading fallback if guard is taking too long
  if (!showContent) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <LawyerStatusGuard requiredStatus="accepted">
      <StatusScreen
        image={require('../../../../assets/images/lawyer-registration/accepted.png')}
        title="Application Approved!"
        description="Congratulations! Your application has been approved. Click Continue to become a verified lawyer."
        buttonLabel={isProcessing ? "Processing..." : "Continue as Lawyer"}
        onPress={handleContinueAsLawyer}
        showBackButton={false}
        imageAlt="Lawyer application approved"
      />
    </LawyerStatusGuard>
  );
}