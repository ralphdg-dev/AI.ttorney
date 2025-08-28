import React from 'react';
import { View, Text } from 'react-native';

// TODO: Implement OTP success screen UI and logic.
// Do NOT add any navigation to this screen yet per request.
export default function OtpSuccess() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', textAlign: 'center' }}>
        OTP Success Screen Placeholder
      </Text>
      <Text style={{ marginTop: 8, color: '#6b7280', textAlign: 'center' }}>
        TODO: Replace this with the real success page after OTP verification.
      </Text>
    </View>
  );
}
