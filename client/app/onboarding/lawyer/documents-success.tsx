import React from 'react';
import { SafeAreaView, StatusBar, View, Image, Text } from 'react-native';
import { router } from 'expo-router';
import StickyFooterButton from '../../../components/ui/StickyFooterButton';
import Colors from '../../../constants/Colors';
import { useAuth } from '../../../contexts/AuthContext';

export default function DocumentsSuccess() {
  const { isAuthenticated } = useAuth();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

      {/* Centered content */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Image
          source={require('../../../assets/images/registration/success.png')}
          style={{ width: 180, height: 180, marginBottom: 20 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
          Almost There!
        </Text>
        <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'center' }}>
          Your account is pending verification. We'll send an update as soon as your credentials are confirmed. {isAuthenticated ? 'You can continue using the app while you wait!' : 'You can continue exploring the app as you wait!'}
        </Text>
      </View>

      {/* Sticky footer button */}
      <StickyFooterButton
        title={isAuthenticated ? "Back to Ai.ttorney" : "Explore Ai.ttorney"}
        disabled={false}
        bottomOffset={0}
        onPress={() => router.push('/')}
      />
    </SafeAreaView>
  );
}
