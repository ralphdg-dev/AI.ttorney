import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { shouldUseNativeDriver } from '@/utils/animations';

interface ArticleCardSkeletonProps {
  containerStyle?: any;
}

export default function ArticleCardSkeleton({ containerStyle }: ArticleCardSkeletonProps) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: shouldUseNativeDriver('opacity'),
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: shouldUseNativeDriver('opacity'),
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <Box
      className="mb-3 bg-white rounded-xl border overflow-hidden"
      style={[{ borderColor: '#E5E7EB' }, containerStyle]}
    >
      {/* Image skeleton */}
      <Animated.View
        style={{
          height: 160,
          width: '100%',
          backgroundColor: '#E5E7EB',
          opacity: pulseAnim,
        }}
      />

      {/* Content skeleton */}
      <VStack space="sm" className="p-4">
        {/* Category badge skeleton */}
        <Animated.View
          style={{
            height: 20,
            width: 80,
            backgroundColor: '#E5E7EB',
            borderRadius: 10,
            opacity: pulseAnim,
          }}
        />

        {/* Title skeleton - 2 lines */}
        <VStack space="xs">
          <Animated.View
            style={{
              height: 18,
              width: '100%',
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              opacity: pulseAnim,
            }}
          />
          <Animated.View
            style={{
              height: 18,
              width: '70%',
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              opacity: pulseAnim,
            }}
          />
        </VStack>

        {/* Description skeleton - 2 lines */}
        <VStack space="xs">
          <Animated.View
            style={{
              height: 14,
              width: '100%',
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              opacity: pulseAnim,
            }}
          />
          <Animated.View
            style={{
              height: 14,
              width: '85%',
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              opacity: pulseAnim,
            }}
          />
        </VStack>

        {/* Footer with icon skeleton */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Animated.View
            style={{
              height: 16,
              width: 16,
              backgroundColor: '#E5E7EB',
              borderRadius: 8,
              opacity: pulseAnim,
            }}
          />
        </View>
      </VStack>
    </Box>
  );
}

export function ArticleCardSkeletonList({ count = 3, containerStyle }: { count?: number; containerStyle?: any }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <ArticleCardSkeleton key={index} containerStyle={containerStyle} />
      ))}
    </>
  );
}
