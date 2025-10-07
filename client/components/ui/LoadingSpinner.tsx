import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';
import Colors from '@/constants/Colors';
import { createRotationAnimation } from '@/utils/animations';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: ViewStyle;
  testID?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = Colors.primary.blue,
  style,
  testID,
}) => {
  const rotationValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = createRotationAnimation(rotationValue, 1000);
    animation.start();

    return () => {
      animation.stop();
    };
  }, [rotationValue]);

  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32,
  };

  const spinnerSize = sizeMap[size];

  const rotation = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      style={[
        {
          width: spinnerSize,
          height: spinnerSize,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
      testID={testID}
    >
      <Animated.View
        style={{
          width: spinnerSize,
          height: spinnerSize,
          borderWidth: 2,
          borderColor: `${color}20`,
          borderTopColor: color,
          borderRadius: spinnerSize / 2,
          transform: [{ rotate: rotation }],
        }}
      />
    </View>
  );
};

export default React.memo(LoadingSpinner);
