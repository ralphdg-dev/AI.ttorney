import React, { useMemo, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
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

// Default configuration - can be overridden via props
const DEFAULT_MODAL_CONFIG = {
  sm: {
    MAX_WIDTH: 320,
    ICON_SIZE: 40,
    ICON_INNER_SIZE: 20,
  },
  md: {
    MAX_WIDTH: 340,
    ICON_SIZE: 48,
    ICON_INNER_SIZE: 24,
  },
  lg: {
    MAX_WIDTH: 400,
    ICON_SIZE: 56,
    ICON_INNER_SIZE: 28,
  },
} as const;

// Universal constants (truly invariant)
const MODAL_CONSTANTS = {
  MIN_BUTTON_HEIGHT: 44, // iOS HIG minimum touch target (accessibility requirement)
  SAFE_AREA_PADDING: 8,
  MIN_FOOTER_PADDING: 16,
} as const;

// Type-safe modal configuration
interface ModalConfig {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  message: string;
  confirmText: string;
  confirmClass: string;
}

type ModalSize = 'sm' | 'md' | 'lg';

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
  size?: ModalSize; // Allow size customization
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
  isLoading = false,
  size = 'md', // Default to medium size
}) => {
  const insets = useSafeAreaInsets();

  // Get size-specific configuration
  const sizeConfig = DEFAULT_MODAL_CONFIG[size];

  // Memoize config to prevent recalculation on every render
  const config = useMemo<ModalConfig>(() => {
    const baseConfig = {
      confirmText,
    };

    switch (type) {
      case 'danger':
        return {
          ...baseConfig,
          icon: Trash2,
          iconColor: '#DC2626', // red-600
          iconBg: '#FEF2F2', // red-50
          title: title || 'Delete Item',
          message: message || 'Are you sure you want to delete this item? This action cannot be undone.',
          confirmClass: 'bg-red-600 active:bg-red-700',
        };
      case 'warning':
        return {
          ...baseConfig,
          icon: AlertTriangle,
          iconColor: '#D97706', // amber-600
          iconBg: '#FFFBEB', // amber-50
          title: title || 'Confirm Action',
          message: message || 'Are you sure you want to proceed with this action?',
          confirmClass: 'bg-[#023D7B] active:bg-[#012B5A]',
        };
      case 'info':
      default:
        return {
          ...baseConfig,
          icon: Info,
          iconColor: Colors.primary.blue,
          iconBg: '#E8F2FF', // blue-50
          title: title || 'Confirm Action',
          message: message || 'Are you sure you want to proceed with this action?',
          confirmClass: 'bg-[#023D7B] active:bg-[#012B5A]',
        };
    }
  }, [type, title, message, confirmText]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  const handleConfirm = useCallback(() => {
    if (!isLoading) {
      onConfirm();
    }
  }, [isLoading, onConfirm]);

  // Calculate footer padding with safe area
  const footerPaddingBottom = useMemo(
    () => Math.max(MODAL_CONSTANTS.MIN_FOOTER_PADDING, insets.bottom + MODAL_CONSTANTS.SAFE_AREA_PADDING),
    [insets.bottom]
  );

  const IconComponent = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalBackdrop className="bg-black/50" />
      <ModalContent 
        className="bg-white rounded-2xl shadow-2xl border-0 mx-4" 
        style={{ maxWidth: sizeConfig.MAX_WIDTH }}
      >
        <ModalHeader className="px-4 pt-5 pb-0">
          <VStack className="items-center w-full gap-2">
            <Box 
              className="rounded-full flex items-center justify-center" 
              style={{ 
                width: sizeConfig.ICON_SIZE, 
                height: sizeConfig.ICON_SIZE,
                backgroundColor: config.iconBg 
              }}
            >
              <Icon 
                as={IconComponent} 
                size="lg" 
                style={{ 
                  width: sizeConfig.ICON_INNER_SIZE, 
                  height: sizeConfig.ICON_INNER_SIZE,
                  color: config.iconColor 
                }}
              />
            </Box>
            <Heading size="md" className="font-bold text-center text-gray-900">
              {config.title}
            </Heading>
          </VStack>
        </ModalHeader>
        
        <ModalBody className="px-4 py-2">
          <Text className="text-sm leading-5 text-center text-gray-600">
            {config.message}
          </Text>
        </ModalBody>
        
        <ModalFooter className="px-4 pt-2" style={{ paddingBottom: footerPaddingBottom }}>
          <HStack className="w-full gap-2">
            <Button 
              variant="outline" 
              className="flex-1 py-2.5 rounded-lg border-gray-300 bg-transparent"
              style={{ minHeight: MODAL_CONSTANTS.MIN_BUTTON_HEIGHT }}
              onPress={handleClose}
              disabled={isLoading}
              accessibilityLabel={`${cancelText} button`}
              accessibilityRole="button"
            >
              <ButtonText 
                className="text-sm font-medium text-gray-700" 
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {cancelText}
              </ButtonText>
            </Button>
            <Button 
              variant="solid"
              className={`flex-1 py-2.5 rounded-lg ${config.confirmClass}`}
              style={{ minHeight: MODAL_CONSTANTS.MIN_BUTTON_HEIGHT }}
              onPress={handleConfirm}
              disabled={isLoading}
              accessibilityLabel={`${config.confirmText} button`}
              accessibilityRole="button"
            >
              <ButtonText 
                className="text-sm font-semibold text-white" 
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isLoading ? 'Loading...' : config.confirmText}
              </ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConfirmationModal;
