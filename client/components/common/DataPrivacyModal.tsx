import React from 'react';
import { View } from 'react-native';
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalHeader, ModalFooter, ModalCloseButton } from '@/components/ui/modal';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { Text as GSText } from '@/components/ui/text';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Colors from '@/constants/Colors';

interface DataPrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

const BulletPoint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={{ flexDirection: 'row', marginBottom: 4 }}>
    <GSText size="md" style={{ color: Colors.text.body, marginRight: 8 }}>{'\u2022'}</GSText>
    <GSText size="md" style={{ color: Colors.text.body, flex: 1 }}>{children}</GSText>
  </View>
);

const DataPrivacyModal: React.FC<DataPrivacyModalProps> = ({ visible, onClose }) => {
  return (
    <Modal isOpen={visible} onClose={onClose} size="lg">
      <ModalBackdrop onPress={onClose} />
      <ModalContent>
        <ModalHeader className="items-start">
          <GSText size="xl" bold style={{ color: Colors.text.head }}>Data Privacy Notice</GSText>
          <ModalCloseButton onPress={onClose} className="absolute right-2 top-2 p-2" />
        </ModalHeader>
        <GSText size="xs" style={{ color: Colors.text.sub, marginTop: 4 }}>In accordance with the Data Privacy Act of 2012 (Republic Act No. 10173)</GSText>

        <ModalBody className="max-h-[60vh]">
          <VStack style={{ gap: 16 }}>
            {/* Introduction */}
            <VStack style={{ gap: 8 }}>
              <GSText size="md" style={{ color: Colors.text.body }}>
                Ai.ttorney respects and protects your right to privacy. This Data Privacy Notice explains how we collect, use, store, and protect your personal data when you create an account and use the platform.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                By using Ai.ttorney and creating an account, you acknowledge that your personal data will be processed in accordance with the Data Privacy Act of 2012 (RA 10173) and its Implementing Rules and Regulations.
              </GSText>
            </VStack>

            {/* What We Collect */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>1. Personal Data We Collect</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                When you register as a Legal Seeker, we may collect the following personal data:
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>Full name</BulletPoint>
                <BulletPoint>Email address</BulletPoint>
                <BulletPoint>Username</BulletPoint>
                <BulletPoint>Birthdate (for age verification)</BulletPoint>
                <BulletPoint>Optional information you choose to share when using the platform</BulletPoint>
              </VStack>
            </VStack>

            {/* Purpose of Processing */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>2. Purpose of Collection and Processing</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                Your personal data is collected and processed for the following legitimate purposes:
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>To create and manage your Ai.ttorney account</BulletPoint>
                <BulletPoint>To verify your identity and eligibility to use the service</BulletPoint>
                <BulletPoint>To connect you with lawyers who may provide free legal consultation</BulletPoint>
                <BulletPoint>To send you important notices about your account, consultations, and security</BulletPoint>
                <BulletPoint>To maintain the safety, integrity, and proper functioning of the platform</BulletPoint>
              </VStack>
            </VStack>

            {/* Legal Basis */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>3. Legal Basis for Processing</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                We process your personal data based on your consent and our legitimate interest in providing a secure and reliable legal assistance platform.
              </GSText>
            </VStack>

            {/* Data Sharing */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>4. Data Sharing and Confidentiality</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                We do not sell your personal data. Your information may be shared only with:
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>Verified lawyers on the platform, only as needed to facilitate your consultation</BulletPoint>
                <BulletPoint>Service providers that help us operate the platform (e.g., cloud hosting, email services), subject to confidentiality and data protection obligations</BulletPoint>
                <BulletPoint>Government agencies or authorities, only when required by law or valid legal process</BulletPoint>
              </VStack>
            </VStack>

            {/* Data Retention */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>5. Data Retention</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                We retain your personal data only for as long as necessary to fulfill the purposes stated above, comply with legal obligations, and resolve disputes. When no longer needed, your data will be securely deleted or anonymized.
              </GSText>
            </VStack>

            {/* Your Rights */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>6. Your Rights Under the Data Privacy Act</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                In accordance with RA 10173, you have the right to:
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint>Be informed about how your personal data is collected and used</BulletPoint>
                <BulletPoint>Access and request a copy of your personal data that we hold</BulletPoint>
                <BulletPoint>Correct or update inaccurate or incomplete data</BulletPoint>
                <BulletPoint>Object to, suspend, or withdraw your consent to processing, subject to legal and contractual limitations</BulletPoint>
                <BulletPoint>File a complaint with the National Privacy Commission if you believe your data privacy rights have been violated</BulletPoint>
              </VStack>
            </VStack>

            {/* Contact Details */}
            <VStack style={{ gap: 8 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>7. Contact and Inquiries</GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                If you have questions or requests regarding your personal data or this notice, you may contact us at:
              </GSText>
              <Box style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4 }}>
                <GSText size="sm" style={{ color: Colors.text.body }}>
                  Email: ai.ttorney@gmail.com
                </GSText>
              </Box>
            </VStack>

            {/* Final Note */}
            <VStack style={{ gap: 8 }}>
              <GSText size="md" style={{ color: Colors.text.body }}>
                By proceeding with registration and using Ai.ttorney, you confirm that you have read and understood this Data Privacy Notice and that you consent to the collection and processing of your personal data as described above.
              </GSText>
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

export default DataPrivacyModal;
