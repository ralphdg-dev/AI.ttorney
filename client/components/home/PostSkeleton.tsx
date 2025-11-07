import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { shouldUseNativeDriver } from '@/utils/animations';

export default function PostSkeleton() {
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
      style={{
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 20,
        marginVertical: 0,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Animated.View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#E5E7EB',
            opacity: pulseAnim,
          }}
        />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Animated.View
            style={{
              height: 14,
              width: '50%',
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              marginBottom: 6,
              opacity: pulseAnim,
            }}
          />
          <Animated.View
            style={{
              height: 12,
              width: '30%',
              backgroundColor: '#E5E7EB',
              borderRadius: 4,
              opacity: pulseAnim,
            }}
          />
        </View>
        <Animated.View
          style={{
            width: 60,
            height: 24,
            backgroundColor: '#E5E7EB',
            borderRadius: 12,
            opacity: pulseAnim,
          }}
        />
      </View>

      {/* Content */}
      <View style={{ marginBottom: 12 }}>
        <Animated.View
          style={{
            height: 14,
            width: '100%',
            backgroundColor: '#E5E7EB',
            borderRadius: 4,
            marginBottom: 6,
            opacity: pulseAnim,
          }}
        />
        <Animated.View
          style={{
            height: 14,
            width: '90%',
            backgroundColor: '#E5E7EB',
            borderRadius: 4,
            marginBottom: 6,
            opacity: pulseAnim,
          }}
        />
        <Animated.View
          style={{
            height: 14,
            width: '70%',
            backgroundColor: '#E5E7EB',
            borderRadius: 4,
            opacity: pulseAnim,
          }}
        />
      </View>

      {/* Footer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Animated.View
          style={{
            height: 12,
            width: 80,
            backgroundColor: '#E5E7EB',
            borderRadius: 4,
            opacity: pulseAnim,
          }}
        />
      </View>
    </View>
  );
}

export function PostSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <PostSkeleton key={index} />
      ))}
    </>
  );
}
