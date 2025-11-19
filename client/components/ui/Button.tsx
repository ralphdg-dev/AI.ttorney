import React, { useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ViewStyle,
  TextStyle,
  Animated,
  GestureResponderEvent,
} from 'react-native';
import Colors from '@/constants/Colors';
import { shadowPresets } from '@/utils/shadowUtils';
import LoadingSpinner from './LoadingSpinner';
import { scaleIn, scaleOut } from '@/utils/animations';

interface ButtonProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  testID,
  icon,
  iconPosition = 'left',
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    scaleOut(scaleValue, 100).start();
  }, [disabled, loading, scaleValue]);

  const handlePressOut = useCallback(() => {
    if (disabled || loading) return;
    scaleIn(scaleValue, 100).start();
  }, [disabled, loading, scaleValue]);

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: Colors.primary.blue,
            borderWidth: 0,
          },
          text: {
            color: Colors.text.white,
          },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: Colors.background.secondary,
            borderWidth: 1,
            borderColor: Colors.border.light,
          },
          text: {
            color: Colors.text.primary,
          },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: Colors.primary.blue,
          },
          text: {
            color: Colors.primary.blue,
          },
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 0,
          },
          text: {
            color: Colors.primary.blue,
          },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: Colors.status.error,
            borderWidth: 0,
          },
          text: {
            color: Colors.text.white,
          },
        };
      default:
        return {
          container: {
            backgroundColor: Colors.primary.blue,
            borderWidth: 0,
          },
          text: {
            color: Colors.text.white,
          },
        };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'small':
        return {
          container: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            minHeight: 32,
          },
          text: {
            fontSize: 12,
            fontWeight: '600',
          },
        };
      case 'medium':
        return {
          container: {
            paddingHorizontal: 16,
            paddingVertical: 12,
            minHeight: 44,
          },
          text: {
            fontSize: 14,
            fontWeight: '600',
          },
        };
      case 'large':
        return {
          container: {
            paddingHorizontal: 20,
            paddingVertical: 16,
            minHeight: 52,
          },
          text: {
            fontSize: 16,
            fontWeight: '700',
          },
        };
      default:
        return {
          container: {
            paddingHorizontal: 16,
            paddingVertical: 12,
            minHeight: 44,
          },
          text: {
            fontSize: 14,
            fontWeight: '600',
          },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const isDisabled = disabled || loading;

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleValue }],
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          {
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isDisabled ? 0.6 : 1,
            ...shadowPresets.light,
          },
          variantStyles.container,
          sizeStyles.container,
          style,
        ]}
        testID={testID}
        activeOpacity={0.8}
      >
        {loading ? (
          <LoadingSpinner
            size={size === 'small' ? 'small' : 'medium'}
            color={variantStyles.text.color as string}
          />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <View style={{ marginRight: 8 }}>{icon}</View>
            )}
            <Text
              style={[
                variantStyles.text,
                sizeStyles.text,
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <View style={{ marginLeft: 8 }}>{icon}</View>
            )}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default React.memo(Button);
