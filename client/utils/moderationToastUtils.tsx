/**
 * Utility functions for displaying moderation-related toast notifications
 * Eliminates code duplication across components
 * @module moderationToastUtils
 */

import React from 'react';
import { View } from 'react-native';
import { Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';

type ToastAction = 'error' | 'warning' | 'success' | 'info' | 'muted';

interface ToastInstance {
  show: (config: {
    placement: 'top' | 'bottom';
    duration: number;
    render: (props: { id: string }) => React.ReactElement;
  }) => void;
}

/**
 * Show a moderation-related toast notification
 * @param toast - Toast instance from useToast()
 * @param action - Toast action type (error, warning, etc.)
 * @param title - Toast title
 * @param description - Toast description/message
 * @param duration - Duration in milliseconds (default: 5000)
 */
export const showModerationToast = (
  toast: ToastInstance,
  action: ToastAction,
  title: string,
  description: string,
  duration: number = 5000
): void => {
  toast.show({
    placement: 'top',
    duration,
    render: ({ id }) => {
      return (
        <Toast nativeID={id} action={action} variant="solid">
          <ToastTitle>{title}</ToastTitle>
          <ToastDescription>{description}</ToastDescription>
        </Toast>
      );
    },
  });
};

/**
 * Show a strike added toast with detailed strike information
 */
export const showStrikeAddedToast = (
  toast: ToastInstance,
  detail: string,
  strikeCount?: number,
  suspensionCount?: number
): void => {
  let enhancedMessage = detail;
  
  if (strikeCount !== undefined) {
    enhancedMessage += `\n\nStrike ${strikeCount}/3`;
  }
  
  showModerationToast(toast, 'warning', 'Strike Added', enhancedMessage, 6000);
};

/**
 * Show an account suspended toast with suspension details
 */
export const showSuspendedToast = (
  toast: ToastInstance,
  detail: string,
  suspensionCount?: number,
  suspensionEnd?: string
): void => {
  let enhancedMessage = detail;
  
  if (suspensionCount !== undefined) {
    enhancedMessage += `\n\nSuspension ${suspensionCount}/3`;
    
    const remainingSuspensions = 3 - suspensionCount;
    if (remainingSuspensions > 0) {
      enhancedMessage += `\n${remainingSuspensions} more suspension${remainingSuspensions > 1 ? 's' : ''} until permanent ban`;
    }
  }
  
  if (suspensionEnd) {
    try {
      const date = new Date(suspensionEnd);
      const formattedDate = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      enhancedMessage += `\n\nSuspended until: ${formattedDate}`;
    } catch {
      // Ignore date formatting errors
    }
  }
  
  showModerationToast(toast, 'error', 'Account Suspended', enhancedMessage, 10000);
};

/**
 * Show an account banned toast
 */
export const showBannedToast = (toast: ToastInstance, detail: string): void => {
  const enhancedMessage = detail + '\n\nThis is a permanent ban after 3 suspensions.\nContact support if you believe this is an error.';
  showModerationToast(toast, 'error', 'Permanently Banned', enhancedMessage, 15000);
};

/**
 * Show an access denied toast
 */
export const showAccessDeniedToast = (toast: ToastInstance, detail: string): void => {
  showModerationToast(toast, 'error', 'Access Denied', detail, 7000);
};

/**
 * Show a content validation toast at the bottom for promotional/external link warnings
 * Positioned above the navbar to avoid blocking navigation
 * @param toast - Toast instance from useToast()
 * @param action - Toast action type (error, warning, etc.)
 * @param title - Toast title
 * @param description - Toast description/message
 * @param duration - Duration in milliseconds (default: 5000)
 */
export const showContentValidationToast = (
  toast: ToastInstance,
  action: ToastAction,
  title: string,
  description: string,
  duration: number = 5000
): void => {
  toast.show({
    placement: 'bottom',
    duration,
    render: ({ id }) => {
      return (
        <View style={{ marginBottom: 80 }}>
          <Toast 
            nativeID={id} 
            action={action} 
            variant="solid"
          >
            <ToastTitle>{title}</ToastTitle>
            <ToastDescription>{description}</ToastDescription>
          </Toast>
        </View>
      );
    },
  });
};
