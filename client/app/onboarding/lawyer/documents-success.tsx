import React from 'react';
import { SafeAreaView, StatusBar, View, Image, Text } from 'react-native';
import BackButton from '../../../components/ui/BackButton';
import { router } from 'expo-router';
import StickyFooterButton from '../../../components/ui/StickyFooterButton';

export default function DocumentsSuccess() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header with BackButton */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16 }}>
        <BackButton onPress={() => router.back()} />
      </View>

      {/* Centered content (raised) */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, marginTop: -170 }}>
        <Image
          source={require('../../../assets/images/registration/success.png')}
          style={{ width: 180, height: 180, marginBottom: 20 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
          Almost There!
        </Text>
        <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'center' }}>
          Your account is pending verification. We’ll send an update as soon as your credentials are confirmed. You can continue exploring the app as you wait!
        </Text>
      </View>

      {/* Sticky footer button */}
      <StickyFooterButton
        title="Explore Ai.ttorney"
        disabled={false}
        bottomOffset={16}
        onPress={() => router.push('/')}
      />
    </SafeAreaView>
  );
}
