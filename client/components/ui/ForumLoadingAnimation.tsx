import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, ScrollView } from 'react-native';
import Colors from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface ForumLoadingAnimationProps {
  visible: boolean;
}

const ForumLoadingAnimation: React.FC<ForumLoadingAnimationProps> = ({ visible }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade in the loading screen
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Shimmer animation
      const shimmerAnimation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );

      shimmerAnimation.start();

      return () => {
        shimmerAnimation.stop();
      };
    } else {
      // Fade out the loading screen
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim, shimmerAnim]);

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  if (!visible && (fadeAnim as any)._value === 0) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: fadeAnim,
          pointerEvents: visible ? 'auto' : 'none'
        }
      ]}
    >
      {/* Loading Posts Skeleton */}
      <ScrollView 
        style={styles.postsContainer}
        contentContainerStyle={styles.postsContent}
        showsVerticalScrollIndicator={false}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
          <View key={index} style={styles.postSkeleton}>
            {/* User Avatar */}
            <View style={styles.avatarSkeleton} />
            
            {/* Post Content */}
            <View style={styles.postContent}>
              {/* User Name */}
              <View style={styles.userNameSkeleton} />
              
              {/* Post Text Lines */}
              <View style={styles.textLine} />
              <View style={[styles.textLine, styles.textLineShort]} />
              <View style={[styles.textLine, styles.textLineMedium]} />
              
              {/* Category Badge */}
              <View style={styles.categoryBadge} />
            </View>

            {/* Shimmer Overlay */}
            <Animated.View
              style={[
                styles.shimmerOverlay,
                {
                  transform: [{ translateX: shimmerTranslateX }],
                },
              ]}
            />
          </View>
        ))}
      </ScrollView>

      {/* Loading Dots */}
      <View style={styles.loadingDots}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                opacity: shimmerAnim.interpolate({
                  inputRange: [0, 0.33, 0.66, 1],
                  outputRange: index === 0 ? [1, 0.3, 0.3, 1] : 
                             index === 1 ? [0.3, 1, 0.3, 0.3] : 
                             [0.3, 0.3, 1, 0.3],
                }),
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = {
  container: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background.primary,
    zIndex: 1000,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  postsContainer: {
    flex: 1,
  },
  postsContent: {
    paddingBottom: 20,
  },
  postSkeleton: {
    flexDirection: 'row' as const,
    padding: 16,
    marginBottom: 12,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    ...Colors.shadow.light,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  avatarSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.tertiary,
    marginRight: 12,
  },
  postContent: {
    flex: 1,
  },
  userNameSkeleton: {
    width: 120,
    height: 16,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 8,
    marginBottom: 8,
  },
  textLine: {
    height: 14,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 7,
    marginBottom: 6,
  },
  textLineShort: {
    width: '60%' as any,
  },
  textLineMedium: {
    width: '80%' as any,
  },
  categoryBadge: {
    width: 80,
    height: 20,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 10,
    marginTop: 8,
  },
  shimmerOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 100,
  },
  loadingDots: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary.blue,
    marginHorizontal: 4,
  },
};

export default React.memo(ForumLoadingAnimation);
