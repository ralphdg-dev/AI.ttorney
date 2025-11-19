'use client';
import React from 'react';
import { createToastHook } from '@gluestack-ui/toast';
import { AccessibilityInfo, Text, View, ViewStyle } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';
import { cssInterop } from 'nativewind';
import {
  Motion,
  AnimatePresence,
  MotionComponentProps,
} from '@legendapp/motion';
import {
  withStyleContext,
  useStyleContext,
} from '@gluestack-ui/nativewind-utils/withStyleContext';
import type { VariantProps } from '@gluestack-ui/nativewind-utils';

type IMotionViewProps = React.ComponentProps<typeof View> &
  MotionComponentProps<typeof View, ViewStyle, unknown, unknown, unknown>;

const MotionView = Motion.View as React.ComponentType<IMotionViewProps>;

const useToast = createToastHook(MotionView, AnimatePresence);
const SCOPE = 'TOAST';

cssInterop(MotionView, { className: 'style' });

const toastStyle = tva({
  base: 'px-4 py-3 mx-3 my-1 rounded-lg gap-1.5 web:pointer-events-auto',
  variants: {
    action: {
      error: 'bg-red-100',
      warning: 'bg-amber-100',
      success: 'bg-emerald-100',
      info: 'bg-blue-100',
      muted: 'bg-gray-100',
    },

    variant: {
      solid: '',
      outline: 'bg-white border border-gray-200',
    },
  },
});

const toastTitleStyle = tva({
  base: 'font-semibold tracking-md text-left',
  variants: {
    isTruncated: {
      true: '',
    },
    bold: {
      true: 'font-bold',
    },
    underline: {
      true: 'underline',
    },
    strikeThrough: {
      true: 'line-through',
    },
    size: {
      '2xs': 'text-2xs',
      'xs': 'text-xs',
      'sm': 'text-sm',
      'md': 'text-sm',
      'lg': 'text-base',
      'xl': 'text-lg',
      '2xl': 'text-xl',
      '3xl': 'text-2xl',
      '4xl': 'text-3xl',
      '5xl': 'text-4xl',
      '6xl': 'text-5xl',
    },
  },
  parentVariants: {
    variant: {
      solid: '',
      outline: '',
    },
    action: {
      error: 'text-red-700',
      warning: 'text-amber-700',
      success: 'text-emerald-700',
      info: 'text-blue-700',
      muted: 'text-gray-700',
    },
  },
  parentCompoundVariants: [
    {
      variant: 'outline',
      action: 'error',
      class: 'text-red-800',
    },
    {
      variant: 'outline',
      action: 'warning',
      class: 'text-amber-800',
    },
    {
      variant: 'outline',
      action: 'success',
      class: 'text-emerald-800',
    },
    {
      variant: 'outline',
      action: 'info',
      class: 'text-blue-800',
    },
    {
      variant: 'outline',
      action: 'muted',
      class: 'text-gray-800',
    },
  ],
});

const toastDescriptionStyle = tva({
  base: 'font-normal tracking-md text-left',
  variants: {
    isTruncated: {
      true: '',
    },
    bold: {
      true: 'font-bold',
    },
    underline: {
      true: 'underline',
    },
    strikeThrough: {
      true: 'line-through',
    },
    size: {
      '2xs': 'text-2xs',
      'xs': 'text-xs',
      'sm': 'text-xs',
      'md': 'text-xs',
      'lg': 'text-sm',
      'xl': 'text-base',
      '2xl': 'text-lg',
      '3xl': 'text-xl',
      '4xl': 'text-2xl',
      '5xl': 'text-3xl',
      '6xl': 'text-4xl',
    },
  },
  parentVariants: {
    variant: {
      solid: '',
      outline: '',
    },
    action: {
      error: 'text-red-600',
      warning: 'text-amber-600',
      success: 'text-emerald-600',
      info: 'text-blue-600',
      muted: 'text-gray-600',
    },
  },
  parentCompoundVariants: [
    {
      variant: 'outline',
      action: 'error',
      class: 'text-red-700',
    },
    {
      variant: 'outline',
      action: 'warning',
      class: 'text-amber-700',
    },
    {
      variant: 'outline',
      action: 'success',
      class: 'text-emerald-700',
    },
    {
      variant: 'outline',
      action: 'info',
      class: 'text-blue-700',
    },
    {
      variant: 'outline',
      action: 'muted',
      class: 'text-gray-700',
    },
  ],
});

const Root = withStyleContext(View, SCOPE);
type IToastProps = React.ComponentProps<typeof Root> & {
  className?: string;
} & VariantProps<typeof toastStyle>;

const Toast = React.forwardRef<React.ComponentRef<typeof Root>, IToastProps>(
  function Toast(
    { className, variant = 'solid', action = 'muted', ...props },
    ref
  ) {
    return (
      <Root
        ref={ref}
        className={toastStyle({ variant, action, class: className })}
        context={{ variant, action }}
        {...props}
      />
    );
  }
);

type IToastTitleProps = React.ComponentProps<typeof Text> & {
  className?: string;
} & VariantProps<typeof toastTitleStyle>;

const ToastTitle = React.forwardRef<
  React.ComponentRef<typeof Text>,
  IToastTitleProps
>(function ToastTitle({ className, size = 'md', children, ...props }, ref) {
  const { variant: parentVariant, action: parentAction } =
    useStyleContext(SCOPE);
  React.useEffect(() => {
    // Issue from react-native side
    // Hack for now, will fix this later
    AccessibilityInfo.announceForAccessibility(children as string);
  }, [children]);

  return (
    <Text
      {...props}
      ref={ref}
      aria-live="assertive"
      aria-atomic="true"
      role="alert"
      className={toastTitleStyle({
        size,
        class: className,
        parentVariants: {
          variant: parentVariant,
          action: parentAction,
        },
      })}
    >
      {children}
    </Text>
  );
});

type IToastDescriptionProps = React.ComponentProps<typeof Text> & {
  className?: string;
} & VariantProps<typeof toastDescriptionStyle>;

const ToastDescription = React.forwardRef<
  React.ComponentRef<typeof Text>,
  IToastDescriptionProps
>(function ToastDescription({ className, size = 'md', ...props }, ref) {
  const { variant: parentVariant } = useStyleContext(SCOPE);
  return (
    <Text
      ref={ref}
      {...props}
      className={toastDescriptionStyle({
        size,
        class: className,
        parentVariants: {
          variant: parentVariant,
        },
      })}
    />
  );
});

Toast.displayName = 'Toast';
ToastTitle.displayName = 'ToastTitle';
ToastDescription.displayName = 'ToastDescription';

export { useToast, Toast, ToastTitle, ToastDescription };
