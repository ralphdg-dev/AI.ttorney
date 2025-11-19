import React, { useState, useEffect } from "react";
import { Animated, Dimensions } from "react-native";
import tw from "tailwind-react-native-classnames";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { shouldUseNativeDriver } from "../../../utils/animations";

const { width: screenWidth } = Dimensions.get("window");

interface ConsultationSkeletonProps {
  isFirst?: boolean;
}

export default function ConsultationSkeleton({ isFirst = false }: ConsultationSkeletonProps) {
  const pulseAnim = useState(new Animated.Value(0.3))[0];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: shouldUseNativeDriver('opacity'),
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: shouldUseNativeDriver('opacity'),
        }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box 
      className="bg-white rounded-lg p-3 md:p-4"
      style={{
        marginBottom: 12,
        marginTop: 0,
        borderWidth: 1,
        borderColor: '#E5E7EB',
      }}
    >
      <HStack className="justify-between items-start mb-3">
        <VStack className="flex-1 mr-2" space="xs">
          {/* Lawyer name skeleton */}
          <Animated.View
            style={[
              tw`rounded`,
              {
                height: screenWidth < 768 ? 18 : 20,
                width: "70%",
                backgroundColor: "#E5E7EB",
                opacity: pulseAnim,
              },
            ]}
          />
          {/* Specialization skeleton */}
          <Animated.View
            style={[
              tw`rounded mt-1`,
              {
                height: screenWidth < 768 ? 14 : 16,
                width: "50%",
                backgroundColor: "#E5E7EB",
                opacity: pulseAnim,
              },
            ]}
          />
        </VStack>

        {/* Status badge skeleton */}
        <Animated.View
          style={[
            tw`rounded-full`,
            {
              height: screenWidth < 768 ? 24 : 28,
              width: 80,
              backgroundColor: "#E5E7EB",
              opacity: pulseAnim,
            },
          ]}
        />
      </HStack>

      {/* Message skeleton */}
      <VStack className="mb-3" space="xs">
        <Animated.View
          style={[
            tw`rounded`,
            {
              height: screenWidth < 768 ? 14 : 16,
              width: "90%",
              backgroundColor: "#E5E7EB",
              opacity: pulseAnim,
            },
          ]}
        />
        <Animated.View
          style={[
            tw`rounded`,
            {
              height: screenWidth < 768 ? 14 : 16,
              width: "60%",
              backgroundColor: "#E5E7EB",
              opacity: pulseAnim,
            },
          ]}
        />
      </VStack>

      {/* Date and time skeleton */}
      <VStack className="mb-3" space="sm">
        <HStack className="items-center">
          <Animated.View
            style={[
              tw`rounded`,
              {
                height: screenWidth < 768 ? 16 : 18,
                width: 16,
                backgroundColor: "#E5E7EB",
                opacity: pulseAnim,
              },
            ]}
          />
          <Animated.View
            style={[
              tw`rounded ml-2`,
              {
                height: screenWidth < 768 ? 14 : 16,
                width: 100,
                backgroundColor: "#E5E7EB",
                opacity: pulseAnim,
              },
            ]}
          />
        </HStack>

        <HStack className="items-center">
          <Animated.View
            style={[
              tw`rounded`,
              {
                height: screenWidth < 768 ? 16 : 18,
                width: 16,
                backgroundColor: "#E5E7EB",
                opacity: pulseAnim,
              },
            ]}
          />
          <Animated.View
            style={[
              tw`rounded ml-2`,
              {
                height: screenWidth < 768 ? 14 : 16,
                width: 80,
                backgroundColor: "#E5E7EB",
                opacity: pulseAnim,
              },
            ]}
          />
        </HStack>
      </VStack>

      {/* Button skeleton */}
      <Animated.View
        style={[
          tw`rounded-lg`,
          {
            height: screenWidth < 768 ? 36 : 42,
            width: "100%",
            backgroundColor: "#E5E7EB",
            opacity: pulseAnim,
          },
        ]}
      />
    </Box>
  );
}
