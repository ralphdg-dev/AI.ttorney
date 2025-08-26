import React from 'react';
import { SafeAreaView, StatusBar, View, Text } from 'react-native';
import BackButton from '../components/ui/BackButton';
import { router } from 'expo-router';

export default function DocumentsSuccess() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header with BackButton */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16 }}>
        <BackButton onPress={() => router.back()} />
      </View>

      {/* Content */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
          Documents Submitted
        </Text>
        <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'center' }}>
          Your documents were uploaded successfully.
        </Text>
      </View>
    </SafeAreaView>
  );
}
