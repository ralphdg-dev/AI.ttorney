import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';
import Colors from '@/constants/Colors';
import { createPulseAnimation } from '@/utils/animations';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  children,
}) => {
  const pulseValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = createPulseAnimation(pulseValue, 0.3, 0.7, 1200);
    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulseValue]);

  if (children) {
    return (
      <Animated.View
        style={[
          {
            opacity: pulseValue,
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        {
          width: typeof width === 'string' ? width as any : width,
          height,
          backgroundColor: Colors.background.tertiary,
          borderRadius,
          opacity: pulseValue,
        },
        style,
      ]}
    />
  );
};

// Pre-built skeleton components for common use cases
export const SkeletonText: React.FC<{
  lines?: number;
  lineHeight?: number;
  spacing?: number;
  style?: ViewStyle;
}> = ({ lines = 3, lineHeight = 16, spacing = 8, style }) => {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLoader
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? '70%' : '100%'}
          style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
        />
      ))}
    </View>
  );
};

export const SkeletonCard: React.FC<{
  style?: ViewStyle;
}> = ({ style }) => {
  return (
    <View
      style={[
        {
          padding: 16,
          backgroundColor: Colors.background.primary,
          borderRadius: 12,
          ...Colors.shadow.light,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <SkeletonLoader height={16} width="60%" style={{ marginBottom: 4 }} />
          <SkeletonLoader height={12} width="40%" />
        </View>
      </View>
      <SkeletonText lines={3} lineHeight={14} spacing={6} />
    </View>
  );
};

export const SkeletonList: React.FC<{
  itemCount?: number;
  itemHeight?: number;
  spacing?: number;
  style?: ViewStyle;
}> = ({ itemCount = 5, itemHeight = 80, spacing = 12, style }) => {
  return (
    <View style={style}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <SkeletonCard
          key={index}
          style={{
            height: itemHeight,
            marginBottom: index < itemCount - 1 ? spacing : 0,
          }}
        />
      ))}
    </View>
  );
};

export default React.memo(SkeletonLoader);
