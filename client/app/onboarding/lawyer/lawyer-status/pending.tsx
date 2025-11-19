import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View, Text } from 'react-native';
import { lawyerApplicationService, LawyerApplicationStatus } from '../../../../services/lawyerApplicationService';
import StatusScreen from '../../../../components/ui/StatusScreen';
import LawyerStatusGuard from '../../../../components/LawyerStatusGuard';
import { LoadingWithTrivia } from '../../../../components/LoadingWithTrivia';

export default function PendingStatus() {
  const [applicationData, setApplicationData] = useState<LawyerApplicationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status polling is handled by LawyerStatusGuard

  useEffect(() => {
    loadApplicationStatus();
  }, []);

  const loadApplicationStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = await lawyerApplicationService.getApplicationStatus();
      setApplicationData(status || null);
    } catch (error) {
      console.error('Error loading application status:', error);
      setError('Failed to load application status. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingWithTrivia message="Loading application status..." showTrivia={true} />
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#EF4444', textAlign: 'center', marginBottom: 16 }}>{error}</Text>
        <Text 
          style={{ color: '#3B82F6', textDecorationLine: 'underline' }}
          onPress={loadApplicationStatus}
        >
          Retry
        </Text>
      </View>
    );
  }

  const application = applicationData?.application;
  const isResubmission = application?.version && application.version > 1;
  
  const title = isResubmission ? "Resubmission Under Review" : "Application Under Review";
  const description = isResubmission 
    ? `Your resubmitted application (Version ${application?.version}) is currently being reviewed by our team. We'll notify you once the review is complete.`
    : "Your application is currently being reviewed by our team. We'll notify you once the review is complete.";

  return (
    <LawyerStatusGuard requiredStatus="pending">
      <StatusScreen
        image={require('../../../../assets/images/lawyer-registration/pending.png')}
        title={title}
        description={description}
        buttonLabel="Go to Home"
        onPress={() => router.push('/home')}
        showBackButton={false}
        imageAlt="Lawyer application pending review"
      />
    </LawyerStatusGuard>
  );
}
