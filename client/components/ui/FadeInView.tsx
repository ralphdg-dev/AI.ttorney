import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { fadeIn, AnimationDurations } from '@/utils/animations';

interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  testID?: string;
}

const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  duration = AnimationDurations.normal,
  delay = 0,
  style,
  testID,
}) => {
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      fadeIn(fadeValue, duration).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [fadeValue, duration, delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeValue,
        },
        style,
      ]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
};

export default React.memo(FadeInView);
