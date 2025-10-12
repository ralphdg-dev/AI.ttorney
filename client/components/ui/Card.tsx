import React from 'react';
import { View, ViewStyle, TouchableOpacity, GestureResponderEvent } from 'react-native';
import Colors from '@/constants/Colors';
import { shadowPresets } from '@/utils/shadowUtils';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'small' | 'medium' | 'large';
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
  testID?: string;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  onPress,
  style,
  testID,
  className,
}) => {
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: Colors.background.primary,
          ...shadowPresets.medium,
          borderRadius: 12,
        };
      case 'outlined':
        return {
          backgroundColor: Colors.background.primary,
          borderWidth: 1,
          borderColor: Colors.border.light,
          borderRadius: 12,
        };
      case 'flat':
        return {
          backgroundColor: Colors.background.secondary,
          borderRadius: 8,
        };
      default:
        return {
          backgroundColor: Colors.background.primary,
          ...shadowPresets.light,
          borderRadius: 12,
        };
    }
  };

  const getPaddingStyles = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'small':
        return { padding: 8 };
      case 'medium':
        return { padding: 16 };
      case 'large':
        return { padding: 24 };
      default:
        return { padding: 16 };
    }
  };

  const cardStyles = [
    getVariantStyles(),
    getPaddingStyles(),
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        testID={testID}
        activeOpacity={0.95}
        className={className}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyles} testID={testID} className={className}>
      {children}
    </View>
  );
};

export default React.memo(Card);
