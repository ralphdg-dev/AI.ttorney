import React from "react";
import { ScrollView, StatusBar, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text as GSText } from "@/components/ui/text";
import Navbar from "@/components/Navbar";
import Colors from "@/constants/Colors";

const BulletPoint = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
    <GSText size="md" style={{ color: Colors.text.sub, marginTop: 2 }}>•</GSText>
    <GSText size="md" style={{ color: Colors.text.body, flex: 1 }}>
      {children}
    </GSText>
  </View>
);

const InfoBox = ({ children }: { children: React.ReactNode }) => (
  <View style={{ 
    backgroundColor: '#F9FAFB', 
    padding: 14, 
    borderRadius: 6, 
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8 
  }}>
    {children}
  </View>
);

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Box className="flex-1 bg-white">
        <Header showBackButton={true} showMenu={false} onBackPress={() => router.back()} />

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
            Effective Date: January 1, 2025
          </GSText>

          {/* Content */}
          <VStack style={{ gap: 20 }}>
            {/* 1. Information We Collect */}
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                1. Information We Collect
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                We collect information to help improve your experience and maintain a safe platform. Depending on your role (guest, registered user, or verified lawyer), we may collect:
              </GSText>
              
              <VStack style={{ gap: 10, marginTop: 8 }}>
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

              <VStack style={{ gap: 10, marginTop: 8 }}>
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
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                2. How We Use Your Information
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                Ai.ttorney uses your information only for the following legitimate and specific purposes:
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>To provide personalized, bilingual legal information and educational content</BulletPoint>
                <BulletPoint>To verify lawyer identities and ensure platform integrity</BulletPoint>
                <BulletPoint>To enable account features such as bookmarks, history, and saved searches</BulletPoint>
                <BulletPoint>To moderate and maintain safe community interactions</BulletPoint>
                <BulletPoint>To respond to reports, feedback, or technical support requests</BulletPoint>
                <BulletPoint>To improve system performance and content accuracy</BulletPoint>
                <BulletPoint>To comply with legal obligations under Philippine law</BulletPoint>
              </VStack>
              <InfoBox>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  We do not sell, rent, or trade your personal information to third parties.
                </GSText>
              </InfoBox>
            </VStack>

            {/* 3. Data Sharing and Disclosure */}
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                3. Data Sharing and Disclosure
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                We share data only when necessary for lawful or operational reasons:
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>
                  <GSText bold>With verified admins and superadmins:</GSText> for platform management, moderation, and compliance review
                </BulletPoint>
                <BulletPoint>
                  <GSText bold>With legal validators and translators:</GSText> for content quality assurance and bilingual accuracy
                </BulletPoint>
                <BulletPoint>
                  <GSText bold>With service providers:</GSText> such as hosting, analytics, or content moderation tools (e.g., OpenAI's Moderation API) to detect harmful or inappropriate content. These services process data securely and only for the functions required
                </BulletPoint>
                <BulletPoint>
                  <GSText bold>When required by law:</GSText> We may disclose information if legally required by courts or government authorities
                </BulletPoint>
              </VStack>
              <InfoBox>
                <GSText size="sm" style={{ color: Colors.text.body }}>
                  All access is controlled through role-based access control (RBAC) and logged for transparency.
                </GSText>
              </InfoBox>
            </VStack>

            {/* 4. Data Storage and Security */}
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                4. Data Storage and Security
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>All data is stored in encrypted databases protected by access controls and secure protocols (HTTPS/TLS)</BulletPoint>
                <BulletPoint>Sensitive files (like lawyer verification documents) are encrypted and accessible only to authorized admins</BulletPoint>
                <BulletPoint>Audit logs record all significant admin activities to prevent misuse</BulletPoint>
                <BulletPoint>Regular reviews ensure continued compliance with the Data Privacy Act of 2012</BulletPoint>
              </VStack>
            </VStack>

            {/* 5. Data Retention */}
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                5. Data Retention
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>User accounts and content are retained as long as your account is active</BulletPoint>
                <BulletPoint>Guest sessions are temporary and automatically deleted after 15 chatbot queries or session expiry</BulletPoint>
                <BulletPoint>Lawyer verification records are retained only for as long as necessary for validation and audit purposes</BulletPoint>
                <BulletPoint>You may request account deletion at any time (see Section 8)</BulletPoint>
              </VStack>
            </VStack>

            {/* 6. Your Rights as a Data Subject */}
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                6. Your Rights as a Data Subject
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                Under the Data Privacy Act of 2012, you have the following rights:
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>
                  <GSText bold>Right to be informed</GSText> – know what data we collect and how it's used
                </BulletPoint>
                <BulletPoint>
                  <GSText bold>Right to access</GSText> – request a copy of your personal data
                </BulletPoint>
                <BulletPoint>
                  <GSText bold>Right to rectification</GSText> – correct any inaccurate or outdated information
                </BulletPoint>
                <BulletPoint>
                  <GSText bold>Right to object</GSText> – refuse data processing based on certain grounds
                </BulletPoint>
                <BulletPoint>
                  <GSText bold>Right to erasure or blocking</GSText> – request deletion of your data, subject to legal or contractual obligations
                </BulletPoint>
                <BulletPoint>
                  <GSText bold>Right to data portability</GSText> – request your data in a structured format
                </BulletPoint>
                <BulletPoint>
                  <GSText bold>Right to lodge a complaint</GSText> – file concerns with the National Privacy Commission (NPC) if you believe your rights have been violated
                </BulletPoint>
              </VStack>
            </VStack>

            {/* 7. Children's Privacy */}
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                7. Children's Privacy
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>Ai.ttorney is intended for users aged 18 years and above</BulletPoint>
                <BulletPoint>Minors may use limited guest features only under adult supervision</BulletPoint>
                <BulletPoint>We do not knowingly collect personal data from minors</BulletPoint>
              </VStack>
            </VStack>

            {/* 8. Managing Your Data */}
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                8. Managing Your Data
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                You may:
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>Access or edit your profile and preferences via Account Settings</BulletPoint>
                <BulletPoint>Delete your account by contacting our Data Protection Officer (DPO)</BulletPoint>
                <BulletPoint>Request copies or correction of your data by email</BulletPoint>
                <BulletPoint>All verified lawyers may also request removal of their profiles from the Legal Aid Directory at any time</BulletPoint>
              </VStack>
            </VStack>

            {/* 9. Third-Party Links and Integrations */}
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                9. Third-Party Links and Integrations
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                Ai.ttorney may use limited external integrations, such as:
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>Google Places API (for displaying public law firm maps)</BulletPoint>
                <BulletPoint>OpenAI Moderation API (for automated content screening)</BulletPoint>
              </VStack>
              <GSText size="md" style={{ color: Colors.text.body, marginTop: 8 }}>
                These tools are governed by their respective privacy policies. Ai.ttorney does not control or assume responsibility for external data processing outside its own system.
              </GSText>
            </VStack>

            {/* 10. Changes to This Privacy Policy */}
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                10. Changes to This Privacy Policy
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>We may update this Privacy Policy from time to time to reflect system updates or regulatory requirements</BulletPoint>
                <BulletPoint>We will notify users of any significant changes through in-app notices or email</BulletPoint>
              </VStack>
            </VStack>

            {/* Contact Information */}
            <VStack style={{ gap: 12, marginTop: 8, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                Contact Information
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:
              </GSText>
              <View style={{ backgroundColor: '#F9FAFB', padding: 14, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4 }}>
                <GSText size="sm" style={{ color: Colors.text.body }}>
                  Email: ai.ttorney@gmail.com
                </GSText>
              </View>
            </VStack>

            {/* Last Updated */}
            <VStack style={{ gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <GSText size="xs" style={{ color: Colors.text.sub, textAlign: 'center' }}>
                Last Updated: November 2025
              </GSText>
              <GSText size="xs" style={{ color: Colors.text.sub, textAlign: 'center' }}>
                © 2025 Ai.ttorney. All rights reserved.
              </GSText>
            </VStack>
          </VStack>
        </ScrollView>
        <Navbar />
      </Box>
    </SafeAreaView>
  );
}
