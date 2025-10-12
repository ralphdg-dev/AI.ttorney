import { useRef, useState, useEffect } from 'react';
import { Animated } from 'react-native';
import { shouldUseNativeDriver } from '@/utils/animations';
import { State } from 'react-native-gesture-handler';

export function useOnboardingAnimation(totalSlides: number) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnims = useRef([
    new Animated.Value(0), // Slide 0
    new Animated.Value(0), // Slide 1
    new Animated.Value(0), // Slide 2
    new Animated.Value(0), // Slide 3
  ]).current;

  // Initialize first progress dot as active
  useEffect(() => {
    progressAnims[0].setValue(1);
  }, [progressAnims]);

  const animateProgress = (newSlide: number) => {
    // Animate out current slide progress
    Animated.timing(progressAnims[currentSlide], {
      toValue: 0,
      duration: 150,
      useNativeDriver: shouldUseNativeDriver('opacity'),
    }).start();

    // Animate in new slide progress
    Animated.timing(progressAnims[newSlide], {
      toValue: 1,
      duration: 150,
      useNativeDriver: shouldUseNativeDriver('opacity'),
    }).start();
  };

  const goToNextSlide = (onComplete?: () => void) => {
    if (currentSlide < totalSlides - 1) {
      // Fade out current slide
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: shouldUseNativeDriver('opacity'),
      }).start(() => {
        const newSlide = currentSlide + 1;
        setCurrentSlide(newSlide);
        animateProgress(newSlide);
        // Fade in new slide
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: shouldUseNativeDriver('opacity'),
        }).start();
      });
    } else {
      onComplete?.();
    }
  };

  const goToPreviousSlide = () => {
    if (currentSlide > 0) {
      // Fade out current slide
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: shouldUseNativeDriver('opacity'),
      }).start(() => {
        const newSlide = currentSlide - 1;
        setCurrentSlide(newSlide);
        animateProgress(newSlide);
        // Fade in new slide
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: shouldUseNativeDriver('opacity'),
        }).start();
      });
    }
  };

  const onGestureEvent = (event: any) => {
    // Only track gesture, don't navigate here
  };

  const onHandlerStateChange = (event: any, onComplete?: () => void) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      // If swiped left significantly, go to next slide
      if (translationX < -50 && currentSlide < totalSlides - 1) {
        goToNextSlide(onComplete);
      }
      // If swiped right significantly, go to previous slide
      if (translationX > 50 && currentSlide > 0) {
        goToPreviousSlide();
      }
    }
  };

  return {
    currentSlide,
    fadeAnim,
    progressAnims,
    goToNextSlide,
    goToPreviousSlide,
    onGestureEvent,
    onHandlerStateChange,
  };
} 