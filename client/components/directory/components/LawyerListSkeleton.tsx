import React, { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";

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

export default function LawyerCardSkeleton() {
  return (
    <Box className="mx-6 mb-4 bg-white rounded-lg border border-gray-200 p-4">
      <HStack className="justify-between items-start mb-2">
        <VStack className="flex-1">
          <SkeletonBox width="60%" height={20} style={{ marginBottom: 8 }} />
          <SkeletonBox width="40%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonBox width="50%" height={16} style={{ marginTop: 8 }} />
        </VStack>

        <HStack className="items-center">
          <SkeletonBox width={8} height={8} style={{ borderRadius: 4, marginRight: 8 }} />
          <SkeletonBox width={70} height={14} />
        </HStack>
      </HStack>

      <HStack className="items-center mb-4">
        <SkeletonBox width={16} height={16} style={{ marginRight: 8 }} />
        <SkeletonBox width="30%" height={16} style={{ marginRight: 16 }} />
        <SkeletonBox width="25%" height={16} />
      </HStack>

      <SkeletonBox width="100%" height={44} style={{ borderRadius: 8 }} />
    </Box>
  );
}

export function LawyerListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <LawyerCardSkeleton key={index} />
      ))}
    </>
  );
}