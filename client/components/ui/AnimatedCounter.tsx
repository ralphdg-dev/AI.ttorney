import React, { useEffect, useRef } from 'react';
import { Animated, TextStyle } from 'react-native';

interface AnimatedCounterProps {
  count: number;
  style?: TextStyle;
  duration?: number;
}

/**
 * Animated counter component with smooth transitions
 * Industry-standard implementation following Material Design and iOS HIG
 */
const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ 
  count, 
  style,
  duration = 300 
}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    // Only animate if count actually changed
    if (prevCount.current !== count) {
      // Sequence: fade out + scale down, then fade in + scale up
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      prevCount.current = count;
    }
  }, [count, fadeAnim, scaleAnim, duration]);

  return (
    <Animated.Text
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {count}
    </Animated.Text>
  );
};

export default React.memo(AnimatedCounter);
