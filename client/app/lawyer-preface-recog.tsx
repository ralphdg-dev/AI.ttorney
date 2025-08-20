import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import selfie from '../assets/images/selfie.jpg';
import photoID from '../assets/images/photo-id.jpg';

export default function FacialVerificationInstruction() {
  const navigation = useNavigation();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    // Navigate to camera screen
    navigation.navigate('lawyer-face-verification');
  };

  return (
    <SafeAreaView style={styles.container}>
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
        <Text style={styles.stepperStep}>Step 2 of 4</Text>
        <Text style={styles.stepperNext}>
          Next: <Text style={styles.stepperNextLink}>Face Verification</Text>
        </Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.instructionText}>
          We'll need a clear selfie of you holding your ID.{'\n'}
          Please ensure the ID in the photo is clear and{'\n'}
          matches the ID in the previous page.
        </Text>

        {/* Main Illustration */}
        <View style={styles.illustrationContainer}>
          <Image 
            source={selfie}
            style={styles.mainIllustration}
            resizeMode="contain"
          />
        </View>

        {/* Preview Section */}
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>PREVIEW</Text>
          
          {/* Preview Image */}
          <View style={styles.previewContainer}>
            <Image 
              source={photoID} 
              style={styles.previewImage}
              resizeMode="cover"
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={22} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
        
        {/* Stepper Dots */}
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, { backgroundColor: '#023D7B' }]} />
          <View style={[styles.dot, { backgroundColor: '#023D7B' }]} />
          <View style={[styles.dot, { backgroundColor: '#d1d5db' }]} />
          <View style={[styles.dot, { backgroundColor: '#d1d5db' }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
    backgroundColor: '#f8f9ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperStep: {
    fontSize: 15,
    color: '#023D7B',
    fontWeight: '500',
  },
  stepperNext: {
    fontSize: 15,
    color: '#023D7B',
  },
  stepperNextLink: {
    color: '#023D7B',
    fontWeight: 'bold',
  },
  View: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  instructionText: {
    fontSize: 16,
    color: '#22223b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    marginTop: 8,
  },
  illustrationContainer: {
    alignItems: 'center',
    width: '100%',
  },
  mainIllustration: {
    width: 240,
    height: 240,
  },
  previewSection: {
    width: '100%',
    alignItems: 'flex-start',
  },
  previewLabel: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  previewContainer: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    backgroundColor: '#fafbfc',
  },
  previewImage: {
    width: '100%',
    height: 240,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: '#023D7B',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
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
