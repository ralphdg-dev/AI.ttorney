import React from 'react';
import { View } from 'react-native';
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalHeader, ModalFooter, ModalCloseButton } from '@/components/ui/modal';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { Text as GSText } from '@/components/ui/text';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Colors from '@/constants/Colors';

// Local bullet component to match terms page style
const BulletPoint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={{ flexDirection: 'row', marginBottom: 4 }}>
    <GSText size="md" style={{ color: Colors.text.body, marginRight: 8 }}>{'\u2022'}</GSText>
    <GSText size="md" style={{ color: Colors.text.body, flex: 1 }}>{children}</GSText>
  </View>
);

interface TermsOfServiceModalProps {
  visible: boolean;
  onClose: () => void;
}

// This modal is a standalone version of the Terms (registered user perspective)
const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ visible, onClose }) => {
  return (
    <Modal isOpen={visible} onClose={onClose} size="lg">
      <ModalBackdrop onPress={onClose} />
      <ModalContent>
        <ModalHeader className="items-start">
          <GSText size="xl" bold style={{ color: Colors.text.head }}>Terms of Use for Legal Seekers</GSText>
          <ModalCloseButton onPress={onClose} className="absolute right-2 top-2 p-2" />
        </ModalHeader>
        <GSText size="xs" style={{ color: Colors.text.sub, marginTop: 4 }}>Effective Date: November 10, 2025</GSText>
        <GSText size="xs" style={{ color: Colors.text.sub, marginBottom: 8 }}>Last Updated: November 10, 2025</GSText>

        <ModalBody className="max-h-[60vh]">
          <VStack style={{ gap: 16 }}>
            {/* Introduction */}
            <VStack style={{ gap: 8 }}>
              <GSText size="md" style={{ color: Colors.text.body }}>
                Welcome to Ai.ttorney ("we," "our," or "us"). These Terms of Use ("Terms") govern your access to and use of the Ai.ttorney platform as a Legal Seeker — a user seeking free legal consultation, general legal knowledge, or access to educational resources.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                By using Ai.ttorney, you agree to these Terms. If you do not agree, please stop using the Platform.
              </GSText>
            </VStack>

            {/* Purpose of the Platform */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>1. Purpose of the Platform</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                Ai.ttorney helps individuals connect with verified legal professionals offering free (pro bono) consultations and general legal guidance.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                We also provide educational content, community discussions, and AI-assisted legal literacy tools.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                Ai.ttorney is not a law firm, does not provide legal advice, and is not a party to any lawyer-client relationship.
              </GSText>
            </VStack>

            {/* Eligibility */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>2. Eligibility</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>You must:</GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>Be at least 18 years old</BulletPoint>
                <BulletPoint>Provide truthful information when booking consultations</BulletPoint>
                <BulletPoint>Use the Platform only for lawful and personal purposes</BulletPoint>
              </VStack>
            </VStack>

            {/* Consultations */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>3. Consultations</GSText>
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
            </VStack>

            {/* Community Forum and Content */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>4. Community Forum and Content</GSText>
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
            </VStack>

            {/* Privacy and Data Protection */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>5. Privacy and Data Protection</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                Your personal data is protected under the Data Privacy Act of 2012 (RA 10173).
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                We collect and process only information needed to facilitate your consultation booking and account management.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                For full details, please review our Privacy Policy.
              </GSText>
            </VStack>

            {/* Limitation of Liability */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>6. Limitation of Liability</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                You acknowledge and agree that:
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>Ai.ttorney does not control or guarantee the quality or accuracy of any information provided by Lawyer Users</BulletPoint>
                <BulletPoint>Ai.ttorney is not responsible for the content, advice, or outcome of any consultation</BulletPoint>
                <BulletPoint>Ai.ttorney does not verify or participate in any lawyer-client relationship that may form after consultation</BulletPoint>
                <BulletPoint>Ai.ttorney is not liable for any damages, misunderstandings, or disputes arising from use of the Platform or interactions with Lawyer Users</BulletPoint>
              </VStack>
            </VStack>

            {/* Prohibited Conduct */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>7. Prohibited Conduct</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                You agree not to:
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>Post false, abusive, or defamatory content</BulletPoint>
                <BulletPoint>Attempt to bypass the booking process</BulletPoint>
                <BulletPoint>Misuse lawyer contact details for solicitation or harassment</BulletPoint>
                <BulletPoint>Share AI-generated or plagiarized content in the forum</BulletPoint>
              </VStack>
              <GSText size="md" style={{ color: Colors.text.body, marginTop: 4 }}>
                Violation may result in immediate account suspension or permanent banning.
              </GSText>
            </VStack>

            {/* Violation Criteria and Enforcement */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>7. Violation Criteria and Enforcement</GSText>
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

            {/* Modifications */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>8. Modifications</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                Ai.ttorney may update these Terms periodically. Continued use after updates constitutes acceptance of the new Terms.
              </GSText>
            </VStack>

            {/* Governing Law */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>9. Governing Law</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                These Terms are governed by the laws of the Republic of the Philippines, and any dispute shall be brought before the proper courts of the Philippines.
              </GSText>
            </VStack>

            {/* Contact Information */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>10. Contact</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                For questions or assistance, please contact:
              </GSText>
              <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4 }}>
                <GSText size="sm" style={{ color: Colors.text.body }}>
                  Email: ai.ttorney@gmail.com
                </GSText>
              </View>
            </VStack>

            {/* Last Updated */}
            <VStack style={{ gap: 12, marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <GSText size="sm" style={{ color: Colors.text.sub }}>Last updated: November 2025</GSText>
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <PrimaryButton title="Close" onPress={onClose} />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TermsOfServiceModal;
