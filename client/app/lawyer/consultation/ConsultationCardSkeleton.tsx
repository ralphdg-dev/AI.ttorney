import React, { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import tw from "tailwind-react-native-classnames";
import { shouldUseNativeDriver } from "../../../utils/animations";

const SkeletonBox = ({ width, height, style }: any) => {
  const shimmerAnimatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnimatedValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Shimmer effect - horizontal sweep
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnimatedValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: shouldUseNativeDriver('transform'),
      })
    );

    // Subtle pulse effect
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimatedValue, {
          toValue: 0.95,
          duration: 1000,
          easing: Easing.bezier(0.4, 0.0, 0.6, 1),
          useNativeDriver: shouldUseNativeDriver('transform'),
        }),
        Animated.timing(pulseAnimatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.bezier(0.4, 0.0, 0.6, 1),
          useNativeDriver: shouldUseNativeDriver('transform'),
        }),
      ])
    );

    shimmerAnimation.start();
    pulseAnimation.start();

    return () => {
      shimmerAnimation.stop();
      pulseAnimation.stop();
    };
  }, [shimmerAnimatedValue, pulseAnimatedValue]);

  const shimmerTranslateX = shimmerAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: "#F3F4F6",
          borderRadius: 6,
          overflow: 'hidden',
          transform: [{ scale: pulseAnimatedValue }],
        },
        style,
      ]}
    >
      {/* Shimmer overlay */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          transform: [{ translateX: shimmerTranslateX }],
        }}
      />
      {/* Gradient shimmer effect */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          width: '30%',
          transform: [{ translateX: shimmerTranslateX }],
        }}
      />
    </Animated.View>
  );
};

export function ConsultationCardSkeleton({ index = 0 }: { index?: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Staggered entrance animation
    const delay = index * 100; // 100ms delay between each card
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: shouldUseNativeDriver('opacity'),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        delay,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: shouldUseNativeDriver('transform'),
      }),
    ]).start();
  }, [fadeAnim, translateY, index]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY }],
      }}
    >
      <View
        style={[
          tw`bg-white rounded-xl p-4 mb-3 border`,
          {
            borderColor: '#E5E7EB',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          },
        ]}
      >
      {/* Header */}
      <View style={tw`flex-row items-start justify-between mb-4`}>
        <View style={tw`flex-row items-center flex-1 mr-3`}>
          {/* Avatar */}
          <SkeletonBox width={48} height={48} style={{ borderRadius: 24 }} />
          
          <View style={tw`ml-3 flex-1`}>
            <SkeletonBox width="60%" height={16} style={{ marginBottom: 8 }} />
            <SkeletonBox width="40%" height={14} />
          </View>
        </View>

        {/* Status badge */}
        <SkeletonBox width={70} height={24} style={{ borderRadius: 12 }} />
      </View>

      {/* Message */}
      <SkeletonBox width="100%" height={40} style={{ marginBottom: 16 }} />

      {/* Footer */}
      <View style={tw`flex-row items-center justify-between mb-3`}>
        <SkeletonBox width={80} height={24} style={{ borderRadius: 12 }} />
        <SkeletonBox width={100} height={32} />
      </View>

      {/* Preferred schedule box */}
      <View style={tw`bg-gray-50 rounded-lg p-3 mb-3`}>
        <SkeletonBox width="50%" height={12} style={{ marginBottom: 8 }} />
        <View style={tw`flex-row items-center justify-between`}>
          <SkeletonBox width="40%" height={16} />
          <SkeletonBox width="30%" height={16} />
        </View>
      </View>

      {/* Action buttons */}
      <View style={tw`flex-row gap-2`}>
        <SkeletonBox width="48%" height={48} style={{ borderRadius: 12, marginRight: 12 }} />
      </View>
      </View>
    </Animated.View>
  );
}

export function ConsultationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <ConsultationCardSkeleton key={index} index={index} />
      ))}
    </>
  );
}

export default ConsultationCardSkeleton;