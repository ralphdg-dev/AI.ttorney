import React, { useCallback } from 'react';
import { ScrollView, StatusBar, View } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Text as GSText } from '@/components/ui/text';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { safeGoBack } from '@/utils/navigationHelper';
import Navbar from "@/components/Navbar";
import { GuestNavbar } from "@/components/guest";

// Reusable BulletPoint component
const BulletPoint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={{ flexDirection: 'row', marginBottom: 4 }}>
    <GSText size="md" style={{ color: Colors.text.body, marginRight: 8 }}>{'\u2022'}</GSText>
    <GSText size="md" style={{ color: Colors.text.body, flex: 1 }}>{children}</GSText>
  </View>
);

// Reusable InfoBox component
const InfoBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={{ backgroundColor: '#F0F9FF', padding: 8, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: Colors.primary.blue, marginTop: 4 }}>
    {children}
  </View>
);

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { isGuestMode, isAuthenticated, user } = useAuth();

  // Intelligent back navigation handler (FAANG best practice)
  const handleBackPress = useCallback(() => {
    safeGoBack(router, {
      isGuestMode,
      isAuthenticated,
      userRole: user?.role,
      currentPath: pathname,
    });
  }, [router, isGuestMode, isAuthenticated, user?.role, pathname]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Box className="flex-1 bg-white">
      <Header showBackButton={true} showMenu={false} onBackPress={handleBackPress} />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <GSText size="2xl" bold style={{ color: Colors.text.head, marginBottom: 8 }}>
          Privacy Policy
        </GSText>
        <GSText size="sm" style={{ color: Colors.text.sub, marginBottom: 24 }}>
          Effective Date: November 10, 2025
        </GSText>

        {/* Content */}
        <VStack style={{ gap: 12 }}>
          {/* 1. Information We Collect */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              1. Information We Collect
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              We collect information to help improve your experience and maintain a safe platform. Depending on your role (guest, registered user, or verified lawyer), we may collect:
            </GSText>
            
            <VStack style={{ gap: 6, marginTop: 4 }}>
              <GSText size="md" bold style={{ color: Colors.text.head }}>
                a. Information You Provide
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>Account details (name, email address, password) when you register an account</BulletPoint>
                <BulletPoint>Profile information such as your language preference, region, or bookmarked items</BulletPoint>
                <BulletPoint>Chatbot inputs and searches – questions you ask through Ai.ttorney's chatbot for generating responses</BulletPoint>
                <BulletPoint>Forum submissions – posts, questions, or reports you submit to the community forum</BulletPoint>
                <BulletPoint>Consultation requests (for verified lawyers only)</BulletPoint>
                <BulletPoint>Verification details (for lawyers only) – including IBP ID, Roll of Attorneys number, and supporting documents</BulletPoint>
              </VStack>
              <InfoBox>
                <GSText size="sm" style={{ color: Colors.text.body, fontStyle: 'italic' }}>
                  Note: These are used only for identity verification and are not publicly displayed.
                </GSText>
              </InfoBox>
            </VStack>

            <VStack style={{ gap: 6, marginTop: 4 }}>
              <GSText size="md" bold style={{ color: Colors.text.head }}>
                b. Automatically Collected Information
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>Device information: device type, Android version, unique session ID, and general location (city/region only)</BulletPoint>
                <BulletPoint>Usage data: features used, time spent in-app, errors or crashes, and analytics to improve performance</BulletPoint>
                <BulletPoint>Cookies or local storage: to remember your preferences and maintain session security</BulletPoint>
              </VStack>
            </VStack>
          </VStack>

          {/* 2. How We Use Your Information */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              2. How We Use Your Information
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Ai.ttorney uses your information only for the following legitimate and specific purposes:
            </GSText>
            <VStack style={{ paddingLeft: 12 }}>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} To provide personalized, bilingual legal information and educational content.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} To verify lawyer identities and ensure platform integrity.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} To enable account features such as bookmarks, history, and saved searches.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} To moderate and maintain safe community interactions.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} To respond to reports, feedback, or technical support requests.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} To improve system performance and content accuracy.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} To comply with legal obligations under Philippine law.
              </GSText>
            </VStack>
            <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
              We do not sell, rent, or trade your personal information to third parties.
            </GSText>
          </VStack>

          {/* 3. Data Sharing and Disclosure */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              3. Data Sharing and Disclosure
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              We share data only when necessary for lawful or operational reasons:
            </GSText>
            <VStack style={{ paddingLeft: 12 }}>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} With verified admins and superadmins: for platform management, moderation, and compliance review.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} With legal validators and translators: for content quality assurance and bilingual accuracy.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} With service providers: such as hosting, analytics, or content moderation tools (e.g., OpenAI's Moderation API) to detect harmful or inappropriate content. These services process data securely and only for the functions required.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} When required by law: We may disclose information if legally required by courts or government authorities.
              </GSText>
            </VStack>
            <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
              All access is controlled through role-based access control (RBAC) and logged for transparency.
            </GSText>
          </VStack>

          {/* 4. Data Storage and Security */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              4. Data Storage and Security
            </GSText>
            <VStack style={{ paddingLeft: 12 }}>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} All data is stored in encrypted databases protected by access controls and secure protocols (HTTPS/TLS).
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Sensitive files (like lawyer verification documents) are encrypted and accessible only to authorized admins.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Audit logs record all significant admin activities to prevent misuse.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Regular reviews ensure continued compliance with the Data Privacy Act of 2012.
              </GSText>
            </VStack>
          </VStack>

          {/* Section 5 */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              5. Data Retention
            </GSText>
            <VStack style={{ gap: 8, paddingLeft: 16 }}>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} User accounts and content are retained as long as your account is active.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Guest sessions are temporary and automatically deleted after 15 chatbot queries or session expiry.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Lawyer verification records are retained only for as long as necessary for validation and audit purposes.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} You may request account deletion at any time (see Section 8).
              </GSText>
            </VStack>
          </VStack>

          {/* Section 6 */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              6. Your Rights as a Data Subject
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Under the Data Privacy Act of 2012, you have the following rights:
            </GSText>
            <VStack style={{ gap: 8, paddingLeft: 16 }}>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Right to be informed – know what data we collect and how it's used.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Right to access – request a copy of your personal data.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Right to rectification – correct any inaccurate or outdated information.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Right to object – refuse data processing based on certain grounds.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Right to erasure or blocking – request deletion of your data, subject to legal or contractual obligations.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Right to data portability – request your data in a structured format.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Right to lodge a complaint – file concerns with the National Privacy Commission (NPC) if you believe your rights have been violated.
              </GSText>
            </VStack>
          </VStack>

          {/* Section 7 */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              7. Children's Privacy
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Ai.ttorney is intended for users aged 18 years and above. Minors may use limited guest features only under adult supervision. We do not knowingly collect personal data from minors.
            </GSText>
          </VStack>

          {/* Section 8 */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              8. Managing Your Data
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              You may:
            </GSText>
            <VStack style={{ gap: 8, paddingLeft: 16 }}>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Access or edit your profile and preferences via Account Settings.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Delete your account by contacting our Data Protection Officer (DPO).
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Request copies or correction of your data by email.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} All verified lawyers may also request removal of their profiles from the Legal Aid Directory at any time.
              </GSText>
            </VStack>
          </VStack>

          {/* Section 9 */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              9. Third-Party Links and Integrations
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Ai.ttorney may use limited external integrations, such as:
            </GSText>
            <VStack style={{ gap: 8, paddingLeft: 16 }}>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} Google Places API (for displaying public law firm maps)
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                {'\u2022'} OpenAI Moderation API (for automated content screening)
              </GSText>
            </VStack>
            <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
              These tools are governed by their respective privacy policies. Ai.ttorney does not control or assume responsibility for external data processing outside its own system.
            </GSText>
          </VStack>

          {/* Section 10 */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              10. Changes to This Privacy Policy
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              We may update this Privacy Policy from time to time to reflect system updates or regulatory requirements. We will notify users of any significant changes through in-app notices or email.
            </GSText>
          </VStack>

          {/* Last Updated */}
          <VStack style={{ gap: 12, marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
            <GSText size="sm" style={{ color: Colors.text.sub }}>
              Last updated: January 2025
            </GSText>
          </VStack>
        </VStack>
      </ScrollView>
      {isGuestMode ? (
        <GuestNavbar activeTab="learn" />
      ) : (
        <Navbar activeTab="profile" />
      )}
    </Box>
    </SafeAreaView>
  );
}