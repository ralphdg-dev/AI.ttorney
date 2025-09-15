import React, { useEffect, useState } from 'react';
import { View, SafeAreaView, StatusBar, Text, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackButton from '../../../components/ui/BackButton';
import StickyFooterButton from '../../../components/ui/StickyFooterButton';
import { router } from 'expo-router';
import { lawyerApplicationService } from '../../../services/lawyerApplicationService';

export default function LawyerTerms() {
  const [enabled, setEnabled] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let remaining = 5;
    setSecondsLeft(remaining);
    const interval = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setEnabled(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    
    try {
      // Get stored application data from AsyncStorage
      const rollNumber = await AsyncStorage.getItem('lawyer_roll_number');
      const rollSignDate = await AsyncStorage.getItem('lawyer_roll_sign_date');
      const fullName = await AsyncStorage.getItem('lawyer_full_name');
      const ibpCardPath = await AsyncStorage.getItem('lawyer_ibp_card_path');
      const selfiePath = await AsyncStorage.getItem('lawyer_selfie_path');

      console.log('Retrieved data from AsyncStorage:', {
        rollNumber,
        rollSignDate,
        fullName,
        ibpCardPath,
        selfiePath
      });

      if (!rollNumber || !rollSignDate || !fullName) {
        Alert.alert('Missing Information', 'Some required information is missing. Please go back and complete all steps.');
        return;
      }

      const applicationData = {
        full_name: fullName,
        roll_signing_date: rollSignDate,
        ibp_id: ibpCardPath || '',
        roll_number: rollNumber,
        selfie: selfiePath || '',
      };

      console.log('Submitting application data:', applicationData);

      const result = await lawyerApplicationService.submitApplication(applicationData);

      console.log('Submission result:', result);

      if (result.success) {
        // Clear stored data
        await AsyncStorage.multiRemove([
          'lawyer_roll_number',
          'lawyer_roll_sign_date', 
          'lawyer_full_name',
          'lawyer_ibp_card_path',
          'lawyer_selfie_path'
        ]);
        
        router.push('./documents-success');
      } else {
        Alert.alert('Submission Failed', result.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Submit application error:', error);
      Alert.alert('Error', `An error occurred while submitting your application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header with BackButton */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16 }}>
        <BackButton onPress={() => router.back()} />
      </View>

      {/* Terms content (placeholder) */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 }}>
          Terms and Conditions
        </Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Last updated: August 2025</Text>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>1. Introduction</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </Text>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>2. Usage</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </Text>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>3. Privacy</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
            Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </Text>
        </View>

        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
          The button below will be enabled after you have viewed this page for 5 seconds.
        </Text>
      </ScrollView>

      {/* Sticky footer button */}
      <StickyFooterButton
        title={isSubmitting ? 'Submitting...' : (enabled ? 'Submit Documents' : `Submit Documents (${secondsLeft})`)}
        disabled={!enabled || isSubmitting}
        bottomOffset={16}
        onPress={handleSubmitApplication}
      />
    </SafeAreaView>
  );
}
