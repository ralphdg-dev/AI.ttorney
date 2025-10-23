/**
 * Utility functions for displaying moderation-related toast notifications
 * Eliminates code duplication across components
 * @module moderationToastUtils
 */

import React from 'react';
import { Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';

type ToastAction = 'error' | 'warning' | 'success' | 'info' | 'attention';

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
 * Show a strike added toast
 */
export const showStrikeAddedToast = (toast: ToastInstance, detail: string): void => {
  showModerationToast(toast, 'warning', 'Content Violation - Strike Added', detail, 5000);
};

/**
 * Show an account suspended toast
 */
export const showSuspendedToast = (toast: ToastInstance, detail: string): void => {
  showModerationToast(toast, 'error', 'Account Suspended', detail, 7000);
};

/**
 * Show an account banned toast
 */
export const showBannedToast = (toast: ToastInstance, detail: string): void => {
  showModerationToast(toast, 'error', 'Account Permanently Banned', detail, 10000);
};

/**
 * Show an access denied toast
 */
export const showAccessDeniedToast = (toast: ToastInstance, detail: string): void => {
  showModerationToast(toast, 'error', 'Access Denied', detail, 7000);
};
