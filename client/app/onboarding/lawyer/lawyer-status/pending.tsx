import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { lawyerApplicationService, LawyerApplicationStatus } from '../../../../services/lawyerApplicationService';
import StatusScreen from '../../../../components/ui/StatusScreen';
import LawyerStatusGuard from '../../../../components/LawyerStatusGuard';

export default function PendingStatus() {
  const [applicationData, setApplicationData] = useState<LawyerApplicationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 16, color: '#4B5563' }}>Loading application status...</Text>
      </View>
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

  return (
    <LawyerStatusGuard requiredStatus="pending">
      <StatusScreen
        image={require('../../../../assets/images/lawyer-registration/pending.png')}
        title="Application Under Review"
        description="Your application is currently being reviewed by our team. We'll notify you once the review is complete."
        buttonLabel="Go to Home"
        onPress={() => router.push('/home')}
        showBackButton={false}
        imageAlt="Lawyer application pending review"
      />
    </LawyerStatusGuard>
  );
}
