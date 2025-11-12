import React, { useEffect, useState } from 'react';
import { View, StatusBar, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../../components/Header';
import StickyFooterButton from '../../../components/ui/StickyFooterButton';
import { router } from 'expo-router';
import Colors from '../../../constants/Colors';
import { lawyerApplicationService } from '../../../services/lawyerApplicationService';

export default function LawyerTerms() {
  const [enabled, setEnabled] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let remaining = 5;
    setSecondsLeft(remaining);
    const interval = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setEnabled(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    
    try {
      // Get stored application data from AsyncStorage
      const rollNumber = await AsyncStorage.getItem('lawyer_roll_number');
      const rollSignDate = await AsyncStorage.getItem('lawyer_roll_sign_date');
      const fullName = await AsyncStorage.getItem('lawyer_full_name');
      const ibpCardPath = await AsyncStorage.getItem('lawyer_ibp_card_path');
      const selfiePath = await AsyncStorage.getItem('lawyer_selfie_path');

      console.log('Retrieved data from AsyncStorage:', {
        rollNumber,
        rollSignDate,
        fullName,
        ibpCardPath,
        selfiePath
      });

      if (!rollNumber || !rollSignDate || !fullName) {
        Alert.alert('Missing Information', 'Some required information is missing. Please go back and complete all steps.');
        return;
      }

      const applicationData = {
        full_name: fullName,
        roll_signing_date: rollSignDate,
        ibp_id: ibpCardPath || '',
        roll_number: rollNumber,
        selfie: selfiePath || '',
      };

      console.log('Submitting application data:', applicationData);

      // Check if user has existing application to determine if this is a resubmission
      const currentStatus = await lawyerApplicationService.getApplicationStatus();
      const isResubmission = currentStatus?.has_application && 
                            (currentStatus.application?.status === 'rejected' || 
                             currentStatus.application?.status === 'resubmission');

      console.log('Current application status:', currentStatus);
      console.log('Is resubmission:', isResubmission);

      let result;
      if (isResubmission) {
        console.log('Calling resubmitApplication...');
        result = await lawyerApplicationService.resubmitApplication(applicationData);
      } else {
        console.log('Calling submitApplication...');
        result = await lawyerApplicationService.submitApplication(applicationData);
      }

      console.log('Submission result:', result);

      if (result.success) {
        // Clear stored data
        await AsyncStorage.multiRemove([
          'lawyer_roll_number',
          'lawyer_roll_sign_date', 
          'lawyer_full_name',
          'lawyer_ibp_card_path',
          'lawyer_selfie_path'
        ]);
        
        router.push('/onboarding/lawyer/documents-success');
      } else {
        Alert.alert('Submission Failed', result.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Submit application error:', error);
      Alert.alert('Error', `An error occurred while submitting your application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

      <Header 
        showBackButton={true}
        onBackPress={() => router.back()}
        backgroundColor={Colors.background.primary}
      />

      {/* Terms content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
          Terms of Use for Lawyer Users
        </Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Effective Date: November 10, 2025</Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Last Updated: November 10, 2025</Text>

        {/* Introduction */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 8 }}>
            Welcome to Ai.ttorney ("we," "our," or "us"). These Terms of Use ("Terms") govern your access to and use of the Ai.ttorney platform as a Lawyer User. By registering or using the platform, you agree to comply with these Terms and applicable laws, including the Code of Professional Responsibility and Accountability (CPRA) of the Integrated Bar of the Philippines (IBP).
          </Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>
            If you do not agree, please do not use Ai.ttorney.
          </Text>
        </View>

        {/* 1. Purpose of the Platform */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>1. Purpose of the Platform</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 8 }}>
            Ai.ttorney is a legal literacy and access-to-justice platform that connects verified legal professionals ("Lawyer Users") with individuals seeking general legal assistance ("Legal Seekers").
          </Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 4 }}>
            The Platform allows lawyers to:
          </Text>
          <View style={{ paddingLeft: 12, marginBottom: 8 }}>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Accept or reject consultation requests made by Legal Seekers</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Share general legal knowledge in the community forum</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Participate in public legal awareness efforts</Text>
          </View>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>
            Ai.ttorney is not a law firm, does not practice law, and does not provide or participate in attorney-client relationships. It serves only as a neutral platform to facilitate pro bono consultation scheduling and public legal education.
          </Text>
        </View>

        {/* 2. Eligibility */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>2. Eligibility</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 4 }}>
            To register as a Lawyer User, you must:
          </Text>
          <View style={{ paddingLeft: 12, marginBottom: 8 }}>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Be a licensed attorney in good standing with the Integrated Bar of the Philippines</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Submit verifiable credentials upon registration</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Use the Platform solely for pro bono purposes</Text>
          </View>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>
            We reserve the right to verify your credentials and deny or revoke access if information provided is inaccurate or misleading.
          </Text>
        </View>

        {/* 3. Consultation Rules */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>3. Consultation Rules</Text>
          <View style={{ paddingLeft: 12, marginBottom: 8 }}>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• All consultations are pro bono (free of charge)</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Consultations are scheduled only through the Ai.ttorney booking feature</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• There is no in-app chat or messaging between lawyers and users</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Once a consultation is booked, the Lawyer User must initiate contact with the Legal Seeker using the information provided in the booking details (e.g., email, phone)</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Consultations must comply with IBP ethical standards and applicable laws</Text>
          </View>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 4 }}>
            Lawyer Users must not:
          </Text>
          <View style={{ paddingLeft: 12 }}>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Request or accept payment, gifts, or compensation for any consultation arranged via Ai.ttorney</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Offer or solicit paid services outside the Platform in connection with any Ai.ttorney booking</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Use Ai.ttorney for lead generation or firm promotion</Text>
          </View>
        </View>

        {/* 4. Conduct in the Community Forum */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>4. Conduct in the Community Forum</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 4 }}>
            Lawyer Users are encouraged to share general legal knowledge to promote public awareness. However, you must:
          </Text>
          <View style={{ paddingLeft: 12 }}>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Provide educational and general information only</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Not give case-specific advice or solicit legal representation</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Not promote your law firm, services, or external links</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Maintain professionalism and respect for all participants</Text>
          </View>
        </View>

        {/* 5. Confidentiality */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>5. Confidentiality</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 4 }}>
            You must:
          </Text>
          <View style={{ paddingLeft: 12 }}>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Respect the privacy and confidentiality of any Legal Seeker data shared through Ai.ttorney</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Avoid requesting or collecting unnecessary personal or case details beyond what's required for scheduling</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Handle any received information responsibly and in accordance with the Data Privacy Act of 2012 (RA 10173)</Text>
          </View>
        </View>

        {/* 6. Liability Disclaimer */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>6. Liability Disclaimer</Text>
          <View style={{ paddingLeft: 12 }}>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Ai.ttorney is not responsible for any interaction, communication, or outcome arising from consultations</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Ai.ttorney does not verify, endorse, or monitor the legal advice or assistance given by Lawyer Users</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• You acknowledge that any professional relationship that may form after a consultation occurs outside Ai.ttorney's scope and responsibility</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Ai.ttorney shall not be liable for any claims, losses, damages, or disputes between Lawyer Users and Legal Seekers</Text>
          </View>
        </View>

        {/* 7. Account Suspension and Termination */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>7. Account Suspension and Termination</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 4 }}>
            Ai.ttorney may suspend or terminate your access if you:
          </Text>
          <View style={{ paddingLeft: 12 }}>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Violate these Terms or IBP ethical rules</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Misrepresent your credentials or identity</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Solicit, advertise, or request payment through the Platform</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>• Engage in unprofessional or unlawful behavior</Text>
          </View>
        </View>

        {/* 8. Modifications */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>8. Modifications</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>
            Ai.ttorney may update these Terms at any time. Continued use after revisions means you agree to the updated version.
          </Text>
        </View>

        {/* 9. Governing Law */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>9. Governing Law</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>
            These Terms are governed by the laws of the Republic of the Philippines.
          </Text>
        </View>

        {/* 10. Contact */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>10. Contact</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 4 }}>
            For questions or clarifications, please contact:
          </Text>
          <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text style={{ fontSize: 13, color: '#4b5563' }}>
              Email: ai.ttorney@gmail.com
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
          The button below will be enabled after you have viewed this page for 5 seconds.
        </Text>
      </ScrollView>

      {/* Sticky footer button */}
      <StickyFooterButton
        title={isSubmitting ? 'Submitting...' : (enabled ? 'Submit Documents' : `Submit Documents (${secondsLeft})`)}
        disabled={!enabled || isSubmitting}
        bottomOffset={0}
        onPress={handleSubmitApplication}
      />
    </SafeAreaView>
  );
}
