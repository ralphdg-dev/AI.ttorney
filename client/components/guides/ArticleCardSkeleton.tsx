import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
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
    <View
      style={[
        {
          marginBottom: 12,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          overflow: 'hidden',
        },
        containerStyle,
      ]}
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
      <View style={{ padding: 16 }}>
        {/* Category badge skeleton */}
        <Animated.View
          style={{
            height: 20,
            width: 80,
            backgroundColor: '#E5E7EB',
            borderRadius: 10,
            opacity: pulseAnim,
            marginBottom: 8,
          }}
        />

        {/* Title skeleton - 2 lines */}
        <View style={{ marginBottom: 8 }}>
          <Animated.View
            style={{
              height: 18,
              width: '100%',
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              opacity: pulseAnim,
              marginBottom: 4,
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
        </View>

        {/* Description skeleton - 2 lines */}
        <View style={{ marginBottom: 8 }}>
          <Animated.View
            style={{
              height: 14,
              width: '100%',
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              opacity: pulseAnim,
              marginBottom: 4,
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
        </View>

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
      </View>
    </View>
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
