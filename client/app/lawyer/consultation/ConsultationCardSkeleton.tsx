import React, { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import tw from "tailwind-react-native-classnames";

const SkeletonBox = ({ width, height, style }: any) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: "#E5E7EB",
          borderRadius: 6,
          opacity,
        },
        style,
      ]}
    />
  );
};

export function ConsultationCardSkeleton() {
  return (
    <View
      style={[
        tw`bg-white rounded-2xl p-5 mb-4 border border-gray-100`,
        {
          boxShadow:
            "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
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
  );
}

export function ConsultationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <ConsultationCardSkeleton key={index} />
      ))}
    </>
  );
}

export default ConsultationCardSkeleton;