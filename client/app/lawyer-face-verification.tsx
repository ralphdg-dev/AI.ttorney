import React, { useState } from 'react';
import { SafeAreaView, StatusBar, View, Text, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import BackButton from '../components/ui/BackButton';
import StickyFooterButton from '../components/ui/StickyFooterButton';

export default function LawyerFaceVerification() {
  const [selfie, setSelfie] = useState<any | null>(null);

  const handleTakeSelfie = async () => {
    // On web, ImagePicker.launchCameraAsync may show a file dialog; still attempt for consistency
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is needed to take a photo.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      const a = res.assets[0];
      const maxSize = 5 * 1024 * 1024;
      if (a.fileSize && a.fileSize > maxSize) {
        Alert.alert('File too large', 'Please take a photo up to 5MB.');
        return;
      }
      setSelfie({ uri: a.uri, name: a.fileName || 'selfie.jpg', size: a.fileSize });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header with BackButton */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16 }}>
        <BackButton onPress={() => router.back()} />
      </View>

      {/* Content */}
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
          Take a selfie
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280', marginBottom: 16 }}>
          This is to verify that your face matches with the photo on your IBP ID card.
        </Text>

        {/* Guidance: icon + text rows */}
        <View style={{ gap: 10, marginBottom: 4 }}>
          {/* Row 1 */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../assets/images/lawyer-registration/hold.png')}
              style={{ width: 40, height: 40, borderRadius: 6, marginRight: 10 }}
              resizeMode="cover"
            />
            <Text style={{ flex: 1, fontSize: 16, color: '#111827' }}>
              Hold phone upright and make sure you are visible in the frame
            </Text>
          </View>
          {/* Row 2 */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../assets/images/lawyer-registration/lit.png')}
              style={{ width: 40, height: 40, borderRadius: 6, marginRight: 10 }}
              resizeMode="cover"
            />
            <Text style={{ flex: 1, fontSize: 16, color: '#111827' }}>
              Make sure you are in a well-lit area
            </Text>
          </View>
          {/* Row 3 */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../assets/images/lawyer-registration/face.png')}
              style={{ width: 40, height: 40, borderRadius: 6, marginRight: 10 }}
              resizeMode="cover"
            />
            <Text style={{ flex: 1, fontSize: 16, color: '#111827' }}>
              Ensure that face is not covered
            </Text>
          </View>
        </View>

        {/* Take live selfie button */}
        <TouchableOpacity
          onPress={handleTakeSelfie}
          activeOpacity={0.85}
          style={{
            marginTop: 20,
            width: '100%',
            paddingVertical: 14,
            backgroundColor: '#023D7B',
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Take live selfie</Text>
        </TouchableOpacity>

        {/* Preview */}
        {selfie && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ marginTop: 4, marginBottom: 8, color: '#6b7280', fontWeight: '700', letterSpacing: 0.5 }}>
              PREVIEW
            </Text>
            <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden', backgroundColor: 'white' }}>
              <Image
                source={{ uri: selfie.uri }}
                style={{ width: '100%', height: 260, backgroundColor: '#fff' }}
                resizeMode="contain"
              />
            </View>
          </View>
        )}
      </View>

      {/* Sticky footer */}
      <StickyFooterButton
        title="Next"
        disabled={!selfie}
        bottomOffset={16}
        onPress={() => router.push('/lawyer-terms')}
      />
    </SafeAreaView>
  );
}
