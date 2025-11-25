/**
 * SafeAreaToast - A wrapper component that adds safe area insets to toast notifications
 * Ensures all toasts respect device navigation bars and notches
 * @module SafeAreaToast
 */

import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast, ToastTitle, ToastDescription } from './toast';

type ToastAction = 'error' | 'warning' | 'success' | 'info' | 'muted';

interface SafeAreaToastProps {
  id: string;
  action?: ToastAction;
  variant?: 'solid' | 'outline';
  title?: string;
  description?: string;
  placement?: 'top' | 'bottom';
  children?: React.ReactNode;
}

export const SafeAreaToast: React.FC<SafeAreaToastProps> = ({
  id,
  action = 'muted',
  variant = 'solid',
  title,
  description,
  placement = 'bottom',
  children,
}) => {
  const insets = useSafeAreaInsets();

  // Calculate safe area padding based on placement
  const getSafeAreaStyle = () => {
    if (placement === 'top') {
      return { paddingTop: insets.top || 0 };
    } else {
      // bottom placement - account for navbar height + safe area
      return { marginBottom: 56 + (insets.bottom || 0) + 20 };
    }
  };

  const safeAreaStyle = getSafeAreaStyle();

  // If custom children are provided, wrap them with safe area
  if (children) {
    return (
      <View style={safeAreaStyle}>
        {children}
      </View>
    );
  }

  // Default toast with title and description
  return (
    <View style={safeAreaStyle}>
      <Toast nativeID={id} action={action} variant={variant}>
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && <ToastDescription>{description}</ToastDescription>}
      </Toast>
    </View>
  );
};

/**
 * Higher-order function to create a safe area toast renderer
 * @param placement - Toast placement ('top' or 'bottom')
 * @param action - Toast action type
 * @param variant - Toast variant
 * @param title - Toast title
 * @param description - Toast description
 * @returns - A render function that can be used with toast.show()
 */
export const createSafeAreaToastRenderer = (
  placement: 'top' | 'bottom' = 'bottom',
  action: ToastAction = 'muted',
  variant: 'solid' | 'outline' = 'solid',
  title?: string,
  description?: string
) => {
  const SafeAreaToastRenderer = ({ id }: { id: string }) => (
    <SafeAreaToast
      id={id}
      placement={placement}
      action={action}
      variant={variant}
      title={title}
      description={description}
    />
  );
  SafeAreaToastRenderer.displayName = 'SafeAreaToastRenderer';
  return SafeAreaToastRenderer;
};

/**
 * Higher-order function to create a safe area toast renderer with custom content
 * @param placement - Toast placement ('top' or 'bottom')
 * @param children - Custom toast content
 * @returns - A render function that can be used with toast.show()
 */
export const createSafeAreaCustomToastRenderer = (
  placement: 'top' | 'bottom' = 'bottom',
  children: React.ReactNode
) => {
  const SafeAreaCustomToastRenderer = ({ id }: { id: string }) => (
    <SafeAreaToast
      id={id}
      placement={placement}
    >
      {children}
    </SafeAreaToast>
  );
  SafeAreaCustomToastRenderer.displayName = 'SafeAreaCustomToastRenderer';
  return SafeAreaCustomToastRenderer;
};
