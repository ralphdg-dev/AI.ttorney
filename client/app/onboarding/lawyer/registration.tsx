import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import BackButton from '../../../components/ui/BackButton';

export default function LawyerRegistration() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header with BackButton */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16 }}>
        <BackButton onPress={() => router.back()} />
      </View>

      {/* Registration content goes here */}
      <View style={{ flex: 1 }} />
    </View>
  );
}