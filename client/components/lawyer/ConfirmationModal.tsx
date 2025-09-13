import React from 'react';
import { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/modal';
import { VStack } from '../ui/vstack';
import { HStack } from '../ui/hstack';
import { Text } from '../ui/text';
import { Heading } from '../ui/heading';
import { Button, ButtonText } from '../ui/button';
import { Icon } from '../ui/icon';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react-native';
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
          title: 'Accept Consultation',
          message: `Are you sure you want to accept the consultation request from ${clientName}? This will notify the client and allow you to schedule the session.`,
          confirmText: 'Accept Request',
          confirmColor: Colors.primary.blue,
          cancelText: 'Cancel'
        };
      case 'reject':
        return {
          icon: XCircle,
          iconColor: '#DC2626',
          title: 'Decline Consultation',
          message: `Are you sure you want to decline the consultation request from ${clientName}? This action cannot be undone and the client will be notified.`,
          confirmText: 'Decline Request',
          confirmColor: '#DC2626',
          cancelText: 'Cancel'
        };
      case 'complete':
        return {
          icon: CheckCircle,
          iconColor: '#059669',
          title: 'Mark as Completed',
          message: `Are you sure you want to mark the consultation with ${clientName} as completed? This will close the consultation and update your records.`,
          confirmText: 'Mark Completed',
          confirmColor: '#059669',
          cancelText: 'Cancel'
        };
      default:
        return {
          icon: AlertTriangle,
          iconColor: '#D97706',
          title: 'Confirm Action',
          message: 'Are you sure you want to proceed with this action?',
          confirmText: 'Confirm',
          confirmColor: Colors.primary.blue,
          cancelText: 'Cancel'
        };
    }
  };

  const config = getModalConfig();
  const IconComponent = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader className="pb-4">
          <VStack className="items-center gap-3">
            <Icon 
              as={IconComponent} 
              size="xl" 
              style={{ color: config.iconColor }}
            />
            <Heading size="lg" className="text-typography-900 text-center">
              {config.title}
            </Heading>
          </VStack>
        </ModalHeader>
        
        <ModalBody className="py-2">
          <Text className="text-typography-700 text-center leading-6">
            {config.message}
          </Text>
        </ModalBody>
        
        <ModalFooter className="pt-4">
          <HStack className="gap-3 w-full">
            <Button 
              variant="outline" 
              className="flex-1"
              onPress={onClose}
            >
              <ButtonText>{config.cancelText}</ButtonText>
            </Button>
            <Button 
              className="flex-1"
              style={{ backgroundColor: config.confirmColor }}
              onPress={onConfirm}
            >
              <ButtonText>{config.confirmText}</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConfirmationModal;
