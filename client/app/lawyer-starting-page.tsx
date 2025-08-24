import React from 'react';
import { View, Text, Image } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import { router } from 'expo-router';
import BackButton from '../components/ui/BackButton';
import credentialsImg from '../assets/images/lawyer-registration/credentials.png';
import selfieImg from '../assets/images/lawyer-registration/selfie.png';
import termsImg from '../assets/images/lawyer-registration/terms.png';
import PrimaryButton from "../components/ui/PrimaryButton";
import BottomActions from "../components/ui/BottomActions";


export default function LawyerStartingPage() {
  const handleBack = () => {
    // @ts-ignore: canGoBack may not exist on some expo-router versions
    if (typeof (router as any).canGoBack === 'function' && (router as any).canGoBack()) {
      router.back();
    } else {
      router.replace('/role-selection');
    }
  };
  const handleContinue = () => {
    router.push('/lawyer-reg');
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      <View style={tw`flex-row justify-between items-center px-6 pt-12 pb-4`}>
        <BackButton onPress={handleBack} />
      </View>
      <View style={tw`flex-1 justify-between`}>
        <View style={tw`px-10`}>
          {/* Heading */}
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#0f172a' }}>
            Let's get started
          </Text>

          {/* Subtitle */}
          <Text style={{
            fontSize: 14,
            lineHeight: 22,
            color: '#9ca3af',
            marginTop: 8,
            marginBottom: 20,
          }}>
            You are signing up as a <Text style={{ fontWeight: 'bold', color: '#9ca3af' }}>Lawyer</Text>. To protect users and maintain the integrity of our platform, all lawyers are required to complete identity and license verification.
          </Text>

          {/* Steps */}
          <View style={{ marginTop: 40 }}>
            {/* Step 1 */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 70,
                    height: 70,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: -10
                  }}
                >
                  <Image
                    source={credentialsImg}
                    style={{ width: 40, height: 40, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, color: '#111827' }}>
                    <Text style={{ fontWeight: 'bold' }}>Step 1: </Text>
                    Enter Legal Credentials and Upload IBP ID Card
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18, marginTop: 4 }}>
                    Input your Roll of Attorneys number, Roll Sign Date, and your Integrated Bar of the Philippines (IBP) ID to confirm your status as a licensed lawyer.
                  </Text>
                </View>
              </View>
            </View>

            {/* Step 2 */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 70,
                    height: 70,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: -18
                  }}
                >
                  <Image
                    source={selfieImg}
                    style={{ width: 40, height: 40, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, color: '#111827' }}>
                    <Text style={{ fontWeight: 'bold' }}>Step 2: </Text>
                    Take a Live Selfie
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18, marginTop: 4 }}>
                    Take a quick selfie to help us verify that your face matches the photo on your IBP ID.
                  </Text>
                </View>
              </View>
            </View>

            {/* Step 3 */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 70,
                    height: 70,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: -10
                  }}
                >
                  <Image
                    source={termsImg}
                    style={{ width: 40, height: 40, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, color: '#111827' }}>
                    <Text style={{ fontWeight: 'bold' }}>Step 3: </Text>
                    Acknowledgment of Lawyer Terms and Conditions
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18, marginTop: 4 }}>
                    Carefully review and agree to the Terms and Conditions for legal practitioners.
                  </Text>
                </View>
              </View>
            </View>

          </View>

        </View>
        <BottomActions>
          <PrimaryButton title="Continue" onPress={handleContinue} />
        </BottomActions>
      </View>
    </View>
  );
}