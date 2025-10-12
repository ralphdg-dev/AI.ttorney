import { Animated, Easing, Platform } from 'react-native';

/**
 * Standardized animation utilities for consistent transitions across the app
 */

/**
 * Determines whether to use native driver based on platform and animation type
 * Native driver is not supported on web platform
 */
export const shouldUseNativeDriver = (animationType: 'opacity' | 'transform' | 'all' = 'all'): boolean => {
  // Native driver is not supported on web
  if (Platform.OS === 'web') {
    return false;
  }
  
  // For mobile platforms, native driver is supported for opacity and transform animations
  return true;
};

export const AnimationDurations = {
  fast: 150,
  normal: 250,
  slow: 350,
  verySlow: 500,
} as const;

export const AnimationEasings = {
  easeInOut: Easing.inOut(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeIn: Easing.in(Easing.ease),
  spring: Easing.elastic(1),
  bounce: Easing.bounce,
} as const;

/**
 * Fade animations
 */
export const fadeIn = (
  animatedValue: Animated.Value,
  duration: number = AnimationDurations.normal,
  easing = AnimationEasings.easeOut
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    easing,
    useNativeDriver: shouldUseNativeDriver('opacity'),
  });
};

export const fadeOut = (
  animatedValue: Animated.Value,
  duration: number = AnimationDurations.normal,
  easing = AnimationEasings.easeOut
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing,
    useNativeDriver: shouldUseNativeDriver('opacity'),
  });
};

/**
 * Scale animations
 */
export const scaleIn = (
  animatedValue: Animated.Value,
  duration: number = AnimationDurations.normal,
  easing = AnimationEasings.easeOut
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    easing,
    useNativeDriver: shouldUseNativeDriver('transform'),
  });
};

export const scaleOut = (
  animatedValue: Animated.Value,
  duration: number = AnimationDurations.normal,
  easing = AnimationEasings.easeOut
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing,
    useNativeDriver: shouldUseNativeDriver('transform'),
  });
};

/**
 * Slide animations
 */
export const slideInFromRight = (
  animatedValue: Animated.Value,
  distance: number = 300,
  duration: number = AnimationDurations.normal,
  easing = AnimationEasings.easeOut
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing,
    useNativeDriver: shouldUseNativeDriver('transform'),
  });
};

export const slideInFromLeft = (
  animatedValue: Animated.Value,
  distance: number = 300,
  duration: number = AnimationDurations.normal,
  easing = AnimationEasings.easeOut
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing,
    useNativeDriver: shouldUseNativeDriver('transform'),
  });
};

/**
 * Spring animations
 */
export const springAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  tension: number = 100,
  friction: number = 8
): Animated.CompositeAnimation => {
  return Animated.spring(animatedValue, {
    toValue,
    tension,
    friction,
    useNativeDriver: shouldUseNativeDriver('transform'),
  });
};

/**
 * Loading pulse animation
 */
export const createPulseAnimation = (
  animatedValue: Animated.Value,
  minOpacity: number = 0.3,
  maxOpacity: number = 1,
  duration: number = 1000
): Animated.CompositeAnimation => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: maxOpacity,
        duration: duration / 2,
        easing: AnimationEasings.easeInOut,
        useNativeDriver: shouldUseNativeDriver('opacity'),
      }),
      Animated.timing(animatedValue, {
        toValue: minOpacity,
        duration: duration / 2,
        easing: AnimationEasings.easeInOut,
        useNativeDriver: shouldUseNativeDriver('opacity'),
      }),
    ])
  );
};

/**
 * Stagger animation for lists
 */
export const createStaggerAnimation = (
  animatedValues: Animated.Value[],
  staggerDelay: number = 100,
  animationFactory: (value: Animated.Value) => Animated.CompositeAnimation
): Animated.CompositeAnimation => {
  return Animated.stagger(
    staggerDelay,
    animatedValues.map(animationFactory)
  );
};

/**
 * Shake animation for error states
 */
export const createShakeAnimation = (
  animatedValue: Animated.Value,
  intensity: number = 10,
  duration: number = 500
): Animated.CompositeAnimation => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: intensity,
      duration: duration / 8,
      useNativeDriver: shouldUseNativeDriver('transform'),
    }),
    Animated.timing(animatedValue, {
      toValue: -intensity,
      duration: duration / 8,
      useNativeDriver: shouldUseNativeDriver('transform'),
    }),
    Animated.timing(animatedValue, {
      toValue: intensity,
      duration: duration / 8,
      useNativeDriver: shouldUseNativeDriver('transform'),
    }),
    Animated.timing(animatedValue, {
      toValue: -intensity,
      duration: duration / 8,
      useNativeDriver: shouldUseNativeDriver('transform'),
    }),
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: duration / 2,
      useNativeDriver: shouldUseNativeDriver('transform'),
    }),
  ]);
};

/**
 * Rotation animation
 */
export const createRotationAnimation = (
  animatedValue: Animated.Value,
  duration: number = 1000
): Animated.CompositeAnimation => {
  return Animated.loop(
    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: shouldUseNativeDriver('transform'),
    })
  );
};
