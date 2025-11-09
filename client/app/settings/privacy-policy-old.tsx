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
        <GSText size="2xl" bold style={{ color: Colors.text.head, marginBottom: 24 }}>
          Privacy Policy
        </GSText>

        {/* Content */}
        <VStack style={{ gap: 20 }}>
          {/* Information We Collect */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              1. Information We Collect
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              We collect information to help improve your experience and maintain a safe platform. Depending on your role (guest, registered user, or verified lawyer), we may collect:
            </GSText>
            <GSText size="md" bold style={{ color: Colors.text.head, marginTop: 8 }}>
              a. Information You Provide
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              • Account details (name, email address, password) when you register an account.{'\n'}
              • Profile information such as your language preference, region, or bookmarked items.{'\n'}
              • Chatbot inputs and searches – questions you ask through Ai.ttorney's chatbot for generating responses.{'\n'}
              • Forum submissions – posts, questions, or reports you submit to the community forum.{'\n'}
              • Consultation requests (for verified lawyers only).{'\n'}
              • Verification details (for lawyers only) – including IBP ID, Roll of Attorneys number, and supporting documents.{'\n'}
              Note: These are used only for identity verification and are not publicly displayed.
            </GSText>
            <GSText size="md" bold style={{ color: Colors.text.head, marginTop: 8 }}>
              b. Automatically Collected Information
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              • Device information: device type, Android version, unique session ID, and general location (city/region only).{'\n'}
              • Usage data: features used, time spent in-app, errors or crashes, and analytics to improve performance.{'\n'}
              • Cookies or local storage: to remember your preferences and maintain session security.
            </GSText>
          </VStack>

          {/* How We Use Your Information */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              2. How We Use Your Information
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Ai.ttorney uses your information only for the following legitimate and specific purposes:{'\n\n'}
              • To provide personalized, bilingual legal information and educational content.{'\n'}
              • To verify lawyer identities and ensure platform integrity.{'\n'}
              • To enable account features such as bookmarks, history, and saved searches.{'\n'}
              • To moderate and maintain safe community interactions.{'\n'}
              • To respond to reports, feedback, or technical support requests.{'\n'}
              • To improve system performance and content accuracy.{'\n'}
              • To comply with legal obligations under Philippine law.{'\n\n'}
              We do not sell, rent, or trade your personal information to third parties.
            </GSText>
          </VStack>

          {/* Data Sharing and Disclosure */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              3. Data Sharing and Disclosure
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              We share data only when necessary for lawful or operational reasons:{'\n\n'}
              • With verified admins and superadmins: for platform management, moderation, and compliance review.{'\n'}
              • With legal validators and translators: for content quality assurance and bilingual accuracy.{'\n'}
              • With service providers: such as hosting, analytics, or content moderation tools (e.g., OpenAI's Moderation API) to detect harmful or inappropriate content. These services process data securely and only for the functions required.{'\n'}
              • When required by law: We may disclose information if legally required by courts or government authorities.{'\n\n'}
              All access is controlled through role-based access control (RBAC) and logged for transparency.
            </GSText>
          </VStack>

          {/* Data Storage and Security */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              4. Data Storage and Security
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              • All data is stored in encrypted databases protected by access controls and secure protocols (HTTPS/TLS).{'\n'}
              • Sensitive files (like lawyer verification documents) are encrypted and accessible only to authorized admins.{'\n'}
              • Audit logs record all significant admin activities to prevent misuse.{'\n'}
              • Regular reviews ensure continued compliance with the Data Privacy Act of 2012.
            </GSText>
          </VStack>

          {/* Data Retention */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              5. Data Retention
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              • User accounts and content are retained as long as your account is active.{'\n'}
              • Guest sessions are temporary and automatically deleted after 15 chatbot queries or session expiry.{'\n'}
              • Lawyer verification records are retained only for as long as necessary for validation and audit purposes.{'\n'}
              • You may request account deletion at any time (see Section 8).
            </GSText>
          </VStack>

          {/* Your Rights as a Data Subject */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              6. Your Rights as a Data Subject
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Under the Data Privacy Act of 2012, you have the following rights:{'\n\n'}
              • Right to be informed – know what data we collect and how it's used.{'\n'}
              • Right to access – request a copy of your personal data.{'\n'}
              • Right to rectification – correct any inaccurate or outdated information.{'\n'}
              • Right to object – refuse data processing based on certain grounds.{'\n'}
              • Right to erasure or blocking – request deletion of your data, subject to legal or contractual obligations.{'\n'}
              • Right to data portability – request your data in a structured format.{'\n'}
              • Right to lodge a complaint – file concerns with the National Privacy Commission (NPC) if you believe your rights have been violated.
            </GSText>
          </VStack>

          {/* Children's Privacy */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              7. Children's Privacy
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              • Ai.ttorney is intended for users aged 18 years and above.{'\n'}
              • Minors may use limited guest features only under adult supervision.{'\n'}
              • We do not knowingly collect personal data from minors.
            </GSText>
          </VStack>

          {/* Managing Your Data */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              8. Managing Your Data
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              You may:{'\n\n'}
              • Access or edit your profile and preferences via Account Settings.{'\n'}
              • Delete your account by contacting our Data Protection Officer (DPO).{'\n'}
              • Request copies or correction of your data by email.{'\n'}
              • All verified lawyers may also request removal of their profiles from the Legal Aid Directory at any time.
            </GSText>
          </VStack>

          {/* Third-Party Links and Integrations */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              9. Third-Party Links and Integrations
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Ai.ttorney may use limited external integrations, such as:{'\n\n'}
              • Google Places API (for displaying public law firm maps){'\n'}
              • OpenAI Moderation API (for automated content screening){'\n\n'}
              These tools are governed by their respective privacy policies. Ai.ttorney does not control or assume responsibility for external data processing outside its own system.
            </GSText>
          </VStack>

          {/* Changes to This Privacy Policy */}
          <VStack style={{ gap: 12 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              10. Changes to This Privacy Policy
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              • We may update this Privacy Policy from time to time to reflect system updates or regulatory requirements.{'\n'}
              • We will notify users of any significant changes through in-app notices or email.
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
      <Navbar />
    </Box>
    </SafeAreaView>
  );
}