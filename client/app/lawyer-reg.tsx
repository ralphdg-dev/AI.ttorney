import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';

export default function LawyerReg() {
  const navigation = useNavigation();
  const [rollNumber, setRollNumber] = useState('');
  const [rollSignDate, setRollSignDate] = useState('');
  const [ibpCard, setIbpCard] = useState(null);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleBrowseFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.assets && result.assets.length > 0) {
      setIbpCard(result.assets[0]);
    }
  };

  const handleNext = () => {
    // Implement navigation to next step (e.g., Live Selfie)
    navigation.navigate('lawyer-face-verification');
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
        <Text style={styles.stepperStep}>Step 1 of 3</Text>
        <Text style={styles.stepperNext}>
          Next: <Text style={styles.stepperNextLink}>Live Selfie</Text>
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.sectionTitle}>Submit Legal Credentials</Text>

        {/* Roll Number */}
        <Text style={styles.inputLabel}>
          Roll Number <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="012345"
          value={rollNumber}
          onChangeText={setRollNumber}
          placeholderTextColor="#9ca3af"
        />

        {/* Roll Sign Date */}
        <Text style={styles.inputLabel}>
          Roll Sign Date <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="012345"
          value={rollSignDate}
          onChangeText={setRollSignDate}
          placeholderTextColor="#9ca3af"
        />

        {/* IBP Card */}
        <Text style={styles.inputLabel}>
          IBP Card <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={handleBrowseFiles}
          activeOpacity={0.8}
        >
          <MaterialIcons name="cloud-upload" size={40} color="#38bdf8" />
          <Text style={styles.uploadText}>Browse Files</Text>
          <Text style={styles.uploadSubText}>
            Supported formats: JPEG, PNG. Max file size: 5MB.
          </Text>
          {ibpCard && (
            <Text style={styles.uploadedFileText}>
              {ibpCard.name}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <Text style={styles.bottomText}>
          By clicking “Next,” you agree to the identity verification process and will proceed to{' '}
          <Text style={styles.linkText}>facial recognition.</Text>
        </Text>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={22} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
        {/* Stepper Dots */}
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, { backgroundColor: '#1d4ed8' }]} />
          <View style={[styles.dot, { backgroundColor: '#d1d5db' }]} />
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
    paddingTop: 16,
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22223b',
    marginBottom: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 15,
    fontWeight: '600',
    color: '#22223b',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafbfc',
    marginBottom: 4,
    color: '#22223b',
  },
  uploadBox: {
    width: '100%',
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 18,
    borderStyle: 'dashed',
    padding: 12,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22223b',
    marginTop: 8,
  },
  uploadSubText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  uploadedFileText: {
    fontSize: 13,
    color: '#1d4ed8',
    marginTop: 6,
    fontStyle: 'italic',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  bottomText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 18,
  },
  linkText: {
    color: '#2563eb',
    textDecorationLine: 'underline',
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