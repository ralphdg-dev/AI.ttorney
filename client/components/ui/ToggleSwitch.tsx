import React, { useRef, useEffect, useMemo } from 'react';
import { View, Animated, TouchableOpacity, Dimensions, Platform, Pressable } from 'react-native';
import Colors from '@/constants/Colors';
import { createShadowStyle } from '@/utils/shadowUtils';

export interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
  style?: any;
  // Optional overrides
  activeTrackColor?: string;
  inactiveTrackColor?: string;
  activeThumbColor?: string;
  inactiveThumbColor?: string;
}

// A reusable toggle that uses the app's primary blue when enabled
export default function ToggleSwitch({
  value,
  onValueChange,
  disabled = false,
  style,
  testID,
  // Blue ON state (light blue track, dark blue thumb), neutral OFF state
  activeTrackColor = '#93C5FD', // light blue
  inactiveTrackColor = '#E5E7EB', // gray-200
  activeThumbColor = Colors.primary.blue, // dark blue thumb
  inactiveThumbColor = '#9CA3AF', // gray-400
}: ToggleSwitchProps) {
  const WIDTH = 48;
  const HEIGHT = 28;
  const PADDING = 2;
  const THUMB_SIZE = HEIGHT - PADDING * 2; // 24

  const animated = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [value, animated]);

  const translateX = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [0, WIDTH - THUMB_SIZE - PADDING * 2],
  });

  const trackBg = useMemo(() => (value ? activeTrackColor : inactiveTrackColor), [value, activeTrackColor, inactiveTrackColor]);
  const thumbBg = useMemo(() => (value ? activeThumbColor : inactiveThumbColor), [value, activeThumbColor, inactiveThumbColor]);
  const thumbBorder = useMemo(() => ({
    borderWidth: value ? 0 : 1,
    borderColor: value ? 'transparent' : '#D1D5DB', // gray-300
  }), [value]);

  const handleToggle = () => {
    if (disabled) return;
    onValueChange(!value);
  };

  return (
    <Pressable
      onPress={handleToggle}
      disabled={disabled}
      style={[
        {
          width: WIDTH,
          height: HEIGHT,
          borderRadius: HEIGHT / 2,
          backgroundColor: trackBg,
          padding: PADDING,
          opacity: disabled ? 0.6 : 1,
          justifyContent: 'center',
        },
        // @ts-ignore web pointer cursor
        { cursor: disabled ? 'not-allowed' : 'pointer' },
        style,
      ]}
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View
        style={[
          {
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            backgroundColor: thumbBg,
            transform: [{ translateX }],
            ...createShadowStyle({
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              elevation: 1,
            }),
          },
          thumbBorder,
        ]}
      />
    </Pressable>
  );
}
