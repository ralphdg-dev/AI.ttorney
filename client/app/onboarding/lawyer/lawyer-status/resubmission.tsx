import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { lawyerApplicationService, LawyerApplicationStatus } from '../../../../services/lawyerApplicationService';

export default function Resubmission() {
  const [applicationData, setApplicationData] = useState<LawyerApplicationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplicationStatus();
  }, []);

  const loadApplicationStatus = async () => {
    try {
      const status = await lawyerApplicationService.getApplicationStatus();
      if (status) {
        setApplicationData(status);
      } else {
        Alert.alert('Error', 'Failed to load application status');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while loading your application status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Loading application status...</Text>
      </View>
    );
  }

  const application = applicationData?.application;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#F59E0B' }}>
        Resubmission Required
      </Text>
      
      {application?.admin_notes && (
        <View style={{ backgroundColor: '#FFFBEB', padding: 16, borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#F59E0B' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#F59E0B', marginBottom: 8 }}>
            Feedback from Admin:
          </Text>
          <Text style={{ fontSize: 14, color: '#92400E' }}>
            {application.admin_notes}
          </Text>
        </View>
      )}

      <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#374151' }}>
        We found issues with your document submission. Please review the requirements and resubmit your documents to continue your lawyer application.
      </Text>

      <TouchableOpacity
        onPress={() => router.push('/onboarding/lawyer/upload-documents')}
        style={{ backgroundColor: '#F59E0B', padding: 15, borderRadius: 8, marginBottom: 12 }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Resubmit Documents</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/home')}
        style={{ backgroundColor: '#6B7280', padding: 15, borderRadius: 8 }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
}