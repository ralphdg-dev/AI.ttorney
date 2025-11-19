import React, { useCallback } from 'react';
import { ScrollView, StatusBar, View } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Text as GSText } from '@/components/ui/text';
import Navbar from "@/components/Navbar";
import { GuestNavbar } from "@/components/guest";
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { safeGoBack } from '@/utils/navigationHelper';

// Reusable BulletPoint component
const BulletPoint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={{ flexDirection: 'row', marginBottom: 4 }}>
    <GSText size="md" style={{ color: Colors.text.body, marginRight: 8 }}>{'\u2022'}</GSText>
    <GSText size="md" style={{ color: Colors.text.body, flex: 1 }}>{children}</GSText>
  </View>
);

export default function TermsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { isGuestMode, isAuthenticated, user } = useAuth();

  // Determine if user is a verified lawyer
  const isVerifiedLawyer = user?.role === 'verified_lawyer';
  const isRegisteredUser = user?.role === 'registered_user';

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
          Terms of Use {isVerifiedLawyer ? 'for Lawyer Users' : isRegisteredUser ? 'for Legal Seekers' : ''}
        </GSText>
        <GSText size="sm" style={{ color: Colors.text.sub, marginBottom: 4 }}>
          Effective Date: November 10, 2025
        </GSText>
        <GSText size="sm" style={{ color: Colors.text.sub, marginBottom: 24 }}>
          Last Updated: November 10, 2025
        </GSText>

        {/* Content */}
        <VStack style={{ gap: 16 }}>
          {/* Introduction */}
          <VStack style={{ gap: 8 }}>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Welcome to Ai.ttorney ("we," "our," or "us"). These Terms of Use ("Terms") govern your access to and use of the Ai.ttorney platform{isVerifiedLawyer ? ' as a Lawyer User. By registering or using the platform, you agree to comply with these Terms and applicable laws, including the Code of Professional Responsibility and Accountability (CPRA) of the Integrated Bar of the Philippines (IBP).' : isRegisteredUser ? ' as a Legal Seeker — a user seeking free legal consultation, general legal knowledge, or access to educational resources.' : '.'}
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              {isVerifiedLawyer ? 'If you do not agree, please do not use Ai.ttorney.' : isRegisteredUser ? 'By using Ai.ttorney, you agree to these Terms. If you do not agree, please stop using the Platform.' : 'Please read these terms carefully before using the platform.'}
            </GSText>
          </VStack>

          {/* Purpose of the Platform */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              1. Purpose of the Platform
            </GSText>
            {isVerifiedLawyer ? (
              <>
                <GSText size="md" style={{ color: Colors.text.body }}>
                  Ai.ttorney is a legal literacy and access-to-justice platform that connects verified legal professionals ("Lawyer Users") with individuals seeking general legal assistance ("Legal Seekers").
                </GSText>
                <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                  The Platform allows lawyers to:
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Accept or reject consultation requests made by Legal Seekers</BulletPoint>
                  <BulletPoint>Share general legal knowledge in the community forum</BulletPoint>
                  <BulletPoint>Participate in public legal awareness efforts</BulletPoint>
                </VStack>
                <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                  Ai.ttorney is not a law firm, does not practice law, and does not provide or participate in attorney-client relationships. It serves only as a neutral platform to facilitate pro bono consultation scheduling and public legal education.
                </GSText>
              </>
            ) : isRegisteredUser ? (
              <>
                <GSText size="md" style={{ color: Colors.text.body }}>
                  Ai.ttorney helps individuals connect with verified legal professionals offering free (pro bono) consultations and general legal guidance.
                </GSText>
                <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                  We also provide educational content, community discussions, and AI-assisted legal literacy tools.
                </GSText>
                <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                  Ai.ttorney is not a law firm, does not provide legal advice, and is not a party to any lawyer-client relationship.
                </GSText>
              </>
            ) : null}
          </VStack>

          {/* Eligibility */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              2. Eligibility
            </GSText>
            {isVerifiedLawyer ? (
              <>
                <GSText size="md" style={{ color: Colors.text.body }}>
                  To register as a Lawyer User, you must:
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Be a licensed attorney in good standing with the Integrated Bar of the Philippines</BulletPoint>
                  <BulletPoint>Submit verifiable credentials upon registration</BulletPoint>
                  <BulletPoint>Use the Platform solely for pro bono purposes</BulletPoint>
                </VStack>
                <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                  We reserve the right to verify your credentials and deny or revoke access if information provided is inaccurate or misleading.
                </GSText>
              </>
            ) : isRegisteredUser ? (
              <>
                <GSText size="md" style={{ color: Colors.text.body }}>
                  You must:
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Be at least 18 years old</BulletPoint>
                  <BulletPoint>Provide truthful information when booking consultations</BulletPoint>
                  <BulletPoint>Use the Platform only for lawful and personal purposes</BulletPoint>
                </VStack>
              </>
            ) : null}
          </VStack>

          {/* Consultation Rules */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              3. {isVerifiedLawyer ? 'Consultation Rules' : 'Consultations'}
            </GSText>
            {isVerifiedLawyer ? (
              <>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>All consultations are pro bono (free of charge)</BulletPoint>
                  <BulletPoint>Consultations are scheduled only through the Ai.ttorney booking feature</BulletPoint>
                  <BulletPoint>There is no in-app chat or messaging between lawyers and users</BulletPoint>
                  <BulletPoint>Once a consultation is booked, the Lawyer User must initiate contact with the Legal Seeker using the information provided in the booking details (e.g., email, phone)</BulletPoint>
                  <BulletPoint>Consultations must comply with IBP ethical standards and applicable laws</BulletPoint>
                </VStack>
                <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                  Lawyer Users must not:
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Request or accept payment, gifts, or compensation for any consultation arranged via Ai.ttorney</BulletPoint>
                  <BulletPoint>Offer or solicit paid services outside the Platform in connection with any Ai.ttorney booking</BulletPoint>
                  <BulletPoint>Use Ai.ttorney for lead generation or firm promotion</BulletPoint>
                </VStack>
              </>
            ) : isRegisteredUser ? (
              <>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>All consultations booked through Ai.ttorney are pro bono (free)</BulletPoint>
                  <BulletPoint>Consultations are scheduled through the booking system only — there is no chat or messaging feature</BulletPoint>
                  <BulletPoint>After a booking is accepted, the Lawyer User will contact you directly using your provided contact details</BulletPoint>
                  <BulletPoint>Consultations occur outside the app (e.g., via phone, email, or meeting) based on lawyer discretion</BulletPoint>
                </VStack>
                <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                  You agree not to:
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Offer or send payment to any lawyer through Ai.ttorney</BulletPoint>
                  <BulletPoint>Request or expect legal representation through the Platform</BulletPoint>
                  <BulletPoint>Share unnecessary or sensitive details publicly, especially in the forum</BulletPoint>
                </VStack>
              </>
            ) : null}
          </VStack>

          {/* Community Forum / Conduct */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              4. {isVerifiedLawyer ? 'Conduct in the Community Forum' : 'Community Forum and Content'}
            </GSText>
            {isVerifiedLawyer ? (
              <>
                <GSText size="md" style={{ color: Colors.text.body }}>
                  Lawyer Users are encouraged to share general legal knowledge to promote public awareness. However, you must:
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Provide educational and general information only</BulletPoint>
                  <BulletPoint>Not give case-specific advice or solicit legal representation</BulletPoint>
                  <BulletPoint>Not promote your law firm, services, or external links</BulletPoint>
                  <BulletPoint>Maintain professionalism and respect for all participants</BulletPoint>
                </VStack>
              </>
            ) : isRegisteredUser ? (
              <>
                <GSText size="md" style={{ color: Colors.text.body }}>
                  Ai.ttorney provides a Community Forum for public discussion of general legal topics.
                </GSText>
                <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                  Please note:
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Lawyers may only share general legal information, not personalized legal advice</BulletPoint>
                  <BulletPoint>You must not treat forum posts or chatbot responses as official legal opinions</BulletPoint>
                  <BulletPoint>Any content you post must be respectful, lawful, and accurate</BulletPoint>
                </VStack>
              </>
            ) : null}
          </VStack>

          {/* Confidentiality / Privacy */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              5. {isVerifiedLawyer ? 'Confidentiality' : 'Privacy and Data Protection'}
            </GSText>
            {isVerifiedLawyer ? (
              <>
                <GSText size="md" style={{ color: Colors.text.body }}>
                  You must:
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Respect the privacy and confidentiality of any Legal Seeker data shared through Ai.ttorney</BulletPoint>
                  <BulletPoint>Avoid requesting or collecting unnecessary personal or case details beyond what's required for scheduling</BulletPoint>
                  <BulletPoint>Handle any received information responsibly and in accordance with the Data Privacy Act of 2012 (RA 10173)</BulletPoint>
                </VStack>
              </>
            ) : isRegisteredUser ? (
              <>
                <GSText size="md" style={{ color: Colors.text.body }}>
                  Your personal data is protected under the Data Privacy Act of 2012 (RA 10173).
                </GSText>
                <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                  We collect and process only information needed to facilitate your consultation booking and account management.
                </GSText>
                <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                  For full details, please review our Privacy Policy.
                </GSText>
              </>
            ) : null}
          </VStack>

          {/* Liability Disclaimer */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              6. {isVerifiedLawyer ? 'Liability Disclaimer' : 'Limitation of Liability'}
            </GSText>
            {isVerifiedLawyer ? (
              <>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Ai.ttorney is not responsible for any interaction, communication, or outcome arising from consultations</BulletPoint>
                  <BulletPoint>Ai.ttorney does not verify, endorse, or monitor the legal advice or assistance given by Lawyer Users</BulletPoint>
                  <BulletPoint>You acknowledge that any professional relationship that may form after a consultation occurs outside Ai.ttorney's scope and responsibility</BulletPoint>
                  <BulletPoint>Ai.ttorney shall not be liable for any claims, losses, damages, or disputes between Lawyer Users and Legal Seekers</BulletPoint>
                </VStack>
              </>
            ) : isRegisteredUser ? (
              <>
                <GSText size="md" style={{ color: Colors.text.body }}>
                  You acknowledge and agree that:
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Ai.ttorney does not control or guarantee the quality or accuracy of any information provided by Lawyer Users</BulletPoint>
                  <BulletPoint>Ai.ttorney is not responsible for the content, advice, or outcome of any consultation</BulletPoint>
                  <BulletPoint>Ai.ttorney does not verify or participate in any lawyer-client relationship that may form after consultation</BulletPoint>
                  <BulletPoint>Ai.ttorney is not liable for any damages, misunderstandings, or disputes arising from use of the Platform or interactions with Lawyer Users</BulletPoint>
                </VStack>
              </>
            ) : null}
          </VStack>

          {/* Violation Criteria and Enforcement */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              7. Violation Criteria and Enforcement
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Ai.ttorney maintains a three-strike system for violations. Users may be suspended or banned for the following conduct:
            </GSText>
            <VStack style={{ paddingLeft: 12 }}>
              <BulletPoint>Posting false, abusive, defamatory, or harassing content</BulletPoint>
              <BulletPoint>Attempting to bypass the booking process or payment restrictions</BulletPoint>
              <BulletPoint>Misusing lawyer contact details for solicitation or harassment</BulletPoint>
              <BulletPoint>Sharing AI-generated or plagiarized content without attribution</BulletPoint>
              <BulletPoint>Violating IBP ethical standards (for lawyers)</BulletPoint>
              <BulletPoint>Misrepresenting credentials or identity</BulletPoint>
              <BulletPoint>Engaging in fraudulent or unlawful activities</BulletPoint>
            </VStack>
            
            <GSText size="md" style={{ color: Colors.text.body, marginTop: 8 }}>
              <GSText size="md" bold style={{ color: Colors.text.body }}>Suspension Duration:</GSText>
            </GSText>
            <VStack style={{ paddingLeft: 12 }}>
              <BulletPoint>First offense: 7-day temporary suspension</BulletPoint>
              <BulletPoint>Second offense: 30-day temporary suspension</BulletPoint>
              <BulletPoint>Third offense: 90-day temporary suspension</BulletPoint>
              <BulletPoint>Severe violations: Immediate permanent ban at discretion</BulletPoint>
            </VStack>
            
            <GSText size="md" style={{ color: Colors.text.body, marginTop: 8 }}>
              <GSText size="md" bold style={{ color: Colors.text.body }}>Permanent Ban Conditions:</GSText>
            </GSText>
            <VStack style={{ paddingLeft: 12 }}>
              <BulletPoint>Accumulation of three (3) strikes within 12 months</BulletPoint>
              <BulletPoint>Illegal activities or threats of violence</BulletPoint>
              <BulletPoint>Repeated harassment or hate speech</BulletPoint>
              <BulletPoint>Fraudulent behavior or identity misrepresentation</BulletPoint>
              <BulletPoint>Systematic violation of platform terms</BulletPoint>
            </VStack>
            
            <GSText size="md" style={{ color: Colors.text.body, marginTop: 8 }}>
              <GSText size="md" bold style={{ color: Colors.text.body }}>Appeal Process:</GSText>
            </GSText>
            <VStack style={{ paddingLeft: 12 }}>
              <BulletPoint>Suspended users may submit one appeal per suspension</BulletPoint>
              <BulletPoint>Appeals must be submitted within 7 days of suspension</BulletPoint>
              <BulletPoint>Include detailed explanation and any supporting evidence</BulletPoint>
              <BulletPoint>Appeals are reviewed by admin within 3-5 business days</BulletPoint>
              <BulletPoint>Approved appeals result in immediate suspension lift</BulletPoint>
              <BulletPoint>Rejected appeals may be resubmitted with new evidence only</BulletPoint>
            </VStack>
            
            <GSText size="md" style={{ color: Colors.text.body, marginTop: 8 }}>
              <GSText size="md" bold style={{ color: Colors.text.body }}>Strike Reset:</GSText>
            </GSText>
            <VStack style={{ paddingLeft: 12 }}>
              <BulletPoint>Strikes reset to zero after 12 months of good conduct</BulletPoint>
              <BulletPoint>Successful appeals also reset strike count to zero</BulletPoint>
            </VStack>
          </VStack>

          {/* Termination */}
          {isRegisteredUser && (
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                8. Termination
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                Ai.ttorney may suspend or terminate your access if you:
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>Violate these Terms</BulletPoint>
                <BulletPoint>Provide false or misleading information</BulletPoint>
                <BulletPoint>Engage in misconduct or unlawful activity</BulletPoint>
              </VStack>
              <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                You may also request account deletion anytime.
              </GSText>
            </VStack>
          )}

          {/* Modifications */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              {isVerifiedLawyer ? '9. Modifications' : '10. Modifications'}
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              Ai.ttorney may update these Terms {isVerifiedLawyer ? 'at any time' : 'periodically'}. Continued use after {isVerifiedLawyer ? 'revisions' : 'updates'} {isVerifiedLawyer ? 'means you agree to' : 'constitutes acceptance of'} the {isVerifiedLawyer ? 'updated version' : 'new Terms'}.
            </GSText>
          </VStack>

          {/* Governing Law */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              {isVerifiedLawyer ? '9. Governing Law' : '10. Governing Law'}
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              These Terms are governed by the laws of the Republic of the Philippines{isRegisteredUser ? ', and any dispute shall be brought before the proper courts of the Philippines' : ''}.
            </GSText>
          </VStack>

          {/* Contact Information */}
          <VStack style={{ gap: 8 }}>
            <GSText size="lg" bold style={{ color: Colors.text.head }}>
              {isVerifiedLawyer ? '10. Contact' : '11. Contact'}
            </GSText>
            <GSText size="md" style={{ color: Colors.text.body }}>
              For questions {isVerifiedLawyer ? 'or clarifications' : 'or assistance'}, please contact:
            </GSText>
            <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4 }}>
              <GSText size="sm" style={{ color: Colors.text.body }}>
                Email: ai.ttorney@gmail.com
              </GSText>
            </View>
          </VStack>

          {/* Last Updated */}
          <VStack style={{ gap: 12, marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
            <GSText size="sm" style={{ color: Colors.text.sub }}>
              Last updated: November 2025
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