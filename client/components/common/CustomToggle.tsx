import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, Platform } from 'react-native';

interface CustomToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const CustomToggle: React.FC<CustomToggleProps> = ({
  value,
  onValueChange,
  size = 'md',
  disabled = false,
}) => {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [value, animatedValue]);

  const getSizes = () => {
    switch (size) {
      case 'sm':
        return { width: 32, height: 18, thumbSize: 14, padding: 2 };
      case 'lg':
        return { width: 48, height: 28, thumbSize: 22, padding: 3 };
      default:
        return { width: 38, height: 22, thumbSize: 18, padding: 2 };
    }
  };

  const { width, height, thumbSize, padding } = getSizes();

  const trackColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E7EB', '#3B82F6'], // Gray to Blue
  });

  const thumbTranslateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width - thumbSize - padding * 2],
  });

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={disabled ? 1 : 0.8}
      style={{
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Animated.View
        style={{
          width,
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor,
          justifyContent: 'center',
          padding,
        }}
      >
        <Animated.View
          style={{
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: '#FFFFFF',
            transform: [{ translateX: thumbTranslateX }],
            boxShadow: '0 2px 2px rgba(0, 0, 0, 0.2)',
            elevation: 3,
          }}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default CustomToggle;
