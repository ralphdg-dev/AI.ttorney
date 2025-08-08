import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';

export default function LawyerFaceVerification() {
  const navigation = useNavigation();
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    navigation.navigate('lawyer-terms');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={26} color="#6b7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lawyer Account Verification</Text>
      </View>

      {/* Stepper */}
      <View style={styles.stepperContainer}>
        <Text style={styles.stepperStep}>Step 2 of 3</Text>
        <Text style={styles.stepperNext}>
          Next: <Text style={styles.stepperNextLink}>Terms & Conditions</Text>
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
            <View style={styles.avatarCircle}>
    {Platform.OS === 'web' ? (
        <Text style={{ textAlign: 'center', color: '#9ca3af' }}>
        Camera is not supported on web. Please use a mobile device.
        </Text>
    ) : hasPermission === null ? (
        <Text>Requesting camera...</Text>
    ) : hasPermission === false ? (
        <Text style={{ color: 'red', textAlign: 'center' }}>No access to camera</Text>
    ) : Camera.Constants && Camera.Constants.Type ? (
        <Camera
        ref={cameraRef}
        style={styles.avatarImg}
        type={Camera.Constants.Type.front}
        onCameraReady={() => setIsCameraReady(true)}
        ratio="1:1"
        />
    ) : (
        <Text style={{ color: 'red', textAlign: 'center' }}>
        Camera is not available.
        </Text>
    )}
    </View>

        <Text style={styles.sectionTitle}>Live Photo Recognition</Text>
        <Text style={styles.sectionSubtitle}>
          In order to improve the success rate, please follow these requirements below
        </Text>
        <Text style={styles.sectionInstruction}>
          Take a selfie while holding your IBP card clearly next to your face.
        </Text>

        {/* Requirements */}
        <View style={styles.requirementsRow}>
          <View style={styles.requirementItem}>
            <Feather name="smartphone" size={28} color="#0ea5e9" />
            <Text style={styles.requirementText}>Hold phone{'\n'}upright</Text>
          </View>
          <View style={styles.requirementItem}>
            <Feather name="sun" size={28} color="#0ea5e9" />
            <Text style={styles.requirementText}>Well-lit</Text>
          </View>
          <View style={styles.requirementItem}>
            <Feather name="user-check" size={28} color="#0ea5e9" />
            <Text style={styles.requirementText}>Make sure{'\n'}your face is{'\n'}not covered</Text>
          </View>
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={22} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
        {/* Stepper Dots */}
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, { backgroundColor: '#1d4ed8' }]} />
          <View style={[styles.dot, { backgroundColor: '#1d4ed8' }]} />
          <View style={[styles.dot, { backgroundColor: '#d1d5db' }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 30 : 20,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  headerBack: {
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22223b',
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stepperStep: {
    fontSize: 15,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  stepperNext: {
    fontSize: 15,
    color: '#64748b',
  },
  stepperNextLink: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  avatarCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 4,
    borderColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22223b',
    marginBottom: 8,
    marginTop: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 2,
  },
  sectionInstruction: {
    fontSize: 15,
    color: '#1d4ed8',
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 2,
    fontWeight: '500',
  },
  requirementsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    width: '100%',
    paddingHorizontal: 12,
  },
  requirementItem: {
    alignItems: 'center',
    flex: 1,
  },
  requirementText: {
    fontSize: 13,
    color: '#22223b',
    textAlign: 'center',
    marginTop: 6,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    marginTop: 2,
    width: '100%',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
});