import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { shouldUseNativeDriver } from "../../../utils/animations";

const SkeletonBox = ({ width, height, style }: any) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: shouldUseNativeDriver('opacity'),
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: shouldUseNativeDriver('opacity'),
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

export default function LawyerCardSkeleton() {
  return (
    <Box className="mb-3 bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header Section */}
      <Box className="p-4 pb-3">
        <HStack className="justify-between items-start mb-3">
          {/* Left Section - Name & Specialization */}
          <VStack className="flex-1 pr-2">
            {/* Lawyer name */}
            <SkeletonBox width="70%" height={18} style={{ marginBottom: 8 }} />
            
            {/* Specialization badges */}
            <HStack className="items-center flex-wrap">
              <SkeletonBox width={80} height={20} style={{ borderRadius: 10, marginRight: 4, marginBottom: 4 }} />
              <SkeletonBox width={60} height={20} style={{ borderRadius: 10, marginBottom: 4 }} />
            </HStack>
          </VStack>

          {/* Right Section - Location Badge */}
          <VStack className="items-end">
            <SkeletonBox width={70} height={24} style={{ borderRadius: 12 }} />
          </VStack>
        </HStack>
      </Box>

      {/* Divider */}
      <Box className="h-px bg-gray-100 mx-3" />

      {/* Schedule Section */}
      <Box className="p-4 pt-2">
        {/* Available Days */}
        <VStack className="mb-3">
          <HStack className="items-center mb-1">
            <SkeletonBox width={14} height={14} style={{ marginRight: 6, borderRadius: 7 }} />
            <SkeletonBox width={100} height={14} />
          </HStack>
          <HStack className="flex-wrap gap-1">
            <SkeletonBox width={50} height={22} style={{ borderRadius: 4, marginRight: 4 }} />
            <SkeletonBox width={50} height={22} style={{ borderRadius: 4, marginRight: 4 }} />
            <SkeletonBox width={50} height={22} style={{ borderRadius: 4 }} />
          </HStack>
        </VStack>

        {/* Available Times */}
        <VStack className="mb-3">
          <HStack className="items-center mb-1">
            <SkeletonBox width={14} height={14} style={{ marginRight: 6, borderRadius: 7 }} />
            <SkeletonBox width={110} height={14} />
          </HStack>
          <HStack className="flex-wrap gap-1.5">
            <SkeletonBox width={60} height={22} style={{ borderRadius: 4, marginRight: 4 }} />
            <SkeletonBox width={60} height={22} style={{ borderRadius: 4, marginRight: 4 }} />
            <SkeletonBox width={60} height={22} style={{ borderRadius: 4 }} />
          </HStack>
        </VStack>

        {/* Book Button */}
        <SkeletonBox width="100%" height={40} style={{ borderRadius: 8 }} />
      </Box>
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