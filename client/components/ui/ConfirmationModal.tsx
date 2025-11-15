import React from 'react';
import { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter } from './modal';
import { VStack } from './vstack';
import { HStack } from './hstack';
import { Text } from './text';
import { Heading } from './heading';
import { Button, ButtonText } from './button/';
import { Icon } from './icon';
import { AlertTriangle, Trash2, Info } from 'lucide-react-native';
import { Box } from './box';
import Colors from '../../constants/Colors';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isLoading = false
}) => {
  const getModalConfig = () => {
    switch (type) {
      case 'danger':
        return {
          icon: Trash2,
          iconColor: '#DC2626',
          iconBg: '#FEF2F2',
          title: title || 'Delete Item',
          message: message || 'Are you sure you want to delete this item? This action cannot be undone.',
          confirmText,
          confirmClass: 'bg-red-600 hover:bg-red-700'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: '#D97706',
          iconBg: '#FFFBEB',
          title: title || 'Confirm Action',
          message: message || 'Are you sure you want to proceed with this action?',
          confirmText,
          confirmClass: 'bg-[#023D7B] hover:bg-[#012B5A]'
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconColor: Colors.primary.blue,
          iconBg: '#E8F2FF',
          title: title || 'Confirm Action',
          message: message || 'Are you sure you want to proceed with this action?',
          confirmText,
          confirmClass: 'bg-[#023D7B] hover:bg-[#012B5A]'
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
          <Text className="text-gray-600 text-center text-sm">
            {config.message}
          </Text>
        </ModalBody>
        
        <ModalFooter className="p-4 pt-1">
          <HStack className="gap-2 w-full">
            <Button 
              variant="outline" 
              className="flex-1 py-3 rounded-lg border-gray-300 bg-transparent"
              onPress={onClose}
              disabled={isLoading}
            >
              <ButtonText className="text-gray-700 font-medium text-sm">
                {cancelText}
              </ButtonText>
            </Button>
            <Button 
              variant="solid"
              className={`flex-1 py-3 rounded-lg ${config.confirmClass}`}
              onPress={onConfirm}
              disabled={isLoading}
            >
              <ButtonText className="text-white font-semibold text-sm">
                {isLoading ? 'Loading...' : confirmText}
              </ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConfirmationModal;
