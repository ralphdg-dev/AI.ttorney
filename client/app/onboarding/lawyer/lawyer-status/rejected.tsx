import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { lawyerApplicationService, LawyerApplicationStatus } from '../../../../services/lawyerApplicationService';

export default function RejectedStatus() {
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
  const canReapply = applicationData?.can_apply && !applicationData?.is_blocked;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#DC2626' }}>
        Application Rejected
      </Text>
      
      {application?.admin_notes && (
        <View style={{ backgroundColor: '#FEF2F2', padding: 16, borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#DC2626' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#DC2626', marginBottom: 8 }}>
            Feedback from Admin:
          </Text>
          <Text style={{ fontSize: 14, color: '#7F1D1D' }}>
            {application.admin_notes}
          </Text>
        </View>
      )}

      <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#374151' }}>
        Your lawyer application has been rejected. Please review the feedback above and address the issues.
      </Text>

      {applicationData?.is_blocked ? (
        <View style={{ backgroundColor: '#FEF2F2', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#DC2626', textAlign: 'center' }}>
            You have reached the maximum number of application attempts and are temporarily blocked from reapplying.
          </Text>
        </View>
      ) : canReapply ? (
        <TouchableOpacity
          onPress={() => router.push('/onboarding/lawyer/upload-documents')}
          style={{ backgroundColor: '#2563EB', padding: 15, borderRadius: 8, marginBottom: 12 }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Reapply</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        onPress={() => router.push('/home')}
        style={{ backgroundColor: '#6B7280', padding: 15, borderRadius: 8 }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
}