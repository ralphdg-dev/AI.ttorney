import React from 'react';
import { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/modal';
import { VStack } from '../ui/vstack';
import { Text } from '../ui/text';
import { Heading } from '../ui/heading';
import { Button, ButtonText } from '../ui/button/';
import { Icon } from '../ui/icon';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react-native';
import { Box } from '../ui/box';
import Colors from '../../constants/Colors';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionType: 'accept' | 'reject' | 'complete' | null;
  clientName?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  clientName = 'this client'
}) => {
  const getModalConfig = () => {
    switch (actionType) {
      case 'accept':
        return {
          icon: CheckCircle,
          iconColor: Colors.primary.blue,
          iconBg: '#E8F2FF',
          title: 'Accept Consultation',
          message: `Are you sure you want to accept the consultation request from ${clientName}? This will notify the client and allow you to schedule the session.`,
          confirmText: 'Accept Request',
          confirmVariant: 'solid' as const,
          confirmClass: 'bg-[#023D7B] hover:bg-[#012B5A]',
          cancelText: 'Cancel'
        };
      case 'reject':
        return {
          icon: XCircle,
          iconColor: '#DC2626',
          iconBg: '#FEF2F2',
          title: 'Decline Consultation',
          message: `Are you sure you want to decline the consultation request from ${clientName}? This action cannot be undone and the client will be notified.`,
          confirmText: 'Decline Request',
          confirmVariant: 'solid' as const,
          confirmClass: 'bg-red-600 hover:bg-red-700',
          cancelText: 'Cancel'
        };
      case 'complete':
        return {
          icon: CheckCircle,
          iconColor: '#059669',
          iconBg: '#F0FDF4',
          title: 'Mark as Completed',
          message: `Are you sure you want to mark the consultation with ${clientName} as completed? This will close the consultation and update your records.`,
          confirmText: 'Mark Completed',
          confirmVariant: 'solid' as const,
          confirmClass: 'bg-green-600 hover:bg-green-700',
          cancelText: 'Cancel'
        };
      default:
        return {
          icon: AlertTriangle,
          iconColor: '#D97706',
          iconBg: '#FFFBEB',
          title: 'Confirm Action',
          message: 'Are you sure you want to proceed with this action?',
          confirmText: 'Confirm',
          confirmVariant: 'solid' as const,
          confirmClass: 'bg-[#023D7B] hover:bg-[#012B5A]',
          cancelText: 'Cancel'
        };
    }
  };

  const config = getModalConfig();
  const IconComponent = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBackdrop className="bg-black/50" />
      <ModalContent className="bg-white rounded-2xl shadow-2xl border-0 mx-4 max-w-md">
        <ModalHeader className="pb-0 pt-6 px-4">
          <VStack className="items-center gap-3 w-full">
            <Box className={`w-12 h-12 rounded-full flex items-center justify-center`} style={{ backgroundColor: config.iconBg }}>
              <Icon 
                as={IconComponent} 
                size="lg" 
                className="w-6 h-6"
                style={{ color: config.iconColor }}
              />
            </Box>
            <Heading size="lg" className="text-gray-900 text-center font-bold">
              {config.title}
            </Heading>
          </VStack>
        </ModalHeader>
        
        <ModalBody className="px-4 py-3">
          <Text className="text-gray-600 text-center text-sm" style={{ lineHeight: 20 }}>
            {config.message}
          </Text>
        </ModalBody>
        
        <ModalFooter className="p-4 pt-1">
          <VStack className="gap-2 w-full">
            <Button 
              variant={config.confirmVariant}
              className={`w-full py-3 rounded-lg ${config.confirmClass}`}
              onPress={onConfirm}
            >
              <ButtonText className="text-white font-semibold text-sm">
                {config.confirmText}
              </ButtonText>
            </Button>
            <Button 
              variant="outline" 
              className="w-full py-3 rounded-lg border-gray-300 bg-transparent"
              onPress={onClose}
            >
              <ButtonText className="text-gray-700 font-medium text-sm">
                {config.cancelText}
              </ButtonText>
            </Button>
          </VStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConfirmationModal;
