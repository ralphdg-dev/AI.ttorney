import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { lawyerApplicationService, LawyerApplicationStatus } from '../../../../services/lawyerApplicationService';

export default function AcceptedStatus() {
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
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#059669' }}>
        🎉 Application Accepted!
      </Text>
      
      <View style={{ backgroundColor: '#ECFDF5', padding: 16, borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#059669' }}>
        <Text style={{ fontSize: 16, textAlign: 'center', color: '#065F46', fontWeight: '600' }}>
          Congratulations! Your lawyer application has been approved.
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'center', color: '#047857', marginTop: 8 }}>
          You are now a verified lawyer and can access all lawyer features.
        </Text>
      </View>

      {application?.admin_notes && (
        <View style={{ backgroundColor: '#F0F9FF', padding: 16, borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#0284C7' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#0284C7', marginBottom: 8 }}>
            Message from Admin:
          </Text>
          <Text style={{ fontSize: 14, color: '#0C4A6E' }}>
            {application.admin_notes}
          </Text>
        </View>
      )}

      {application?.reviewed_at && (
        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 20, textAlign: 'center' }}>
          Approved on: {new Date(application.reviewed_at).toLocaleDateString()}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => router.push('/lawyer')}
        style={{ backgroundColor: '#059669', padding: 15, borderRadius: 8, marginBottom: 12 }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Go to Lawyer Dashboard</Text>
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