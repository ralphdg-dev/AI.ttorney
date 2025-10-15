import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text } from 'react-native';
import Colors from '../../constants/Colors';


interface PerformanceTrackerProps {
  componentName: string;
  enabled?: boolean;
  threshold?: number; // Log if render time exceeds this (ms)
  children: React.ReactNode;
  showDebugInfo?: boolean;
}

const PerformanceTracker: React.FC<PerformanceTrackerProps> = React.memo(({
  componentName,
  enabled = __DEV__,
  threshold = 16, // 60fps = ~16ms per frame
  children,
  showDebugInfo = false,
}) => {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const totalRenderTime = useRef<number>(0);
  const lastRenderTime = useRef<number>(0);

  // Start timing before render
  const startTiming = useCallback(() => {
    if (!enabled) return;
    renderStartTime.current = performance.now();
  }, [enabled]);

  // End timing after render
  const endTiming = useCallback(() => {
    if (!enabled || renderStartTime.current === 0) return;
    
    const renderTime = performance.now() - renderStartTime.current;
    renderCount.current += 1;
    totalRenderTime.current += renderTime;
    lastRenderTime.current = renderTime;
    
    const averageRenderTime = totalRenderTime.current / renderCount.current;

    // Log slow renders
    if (renderTime > threshold) {
      console.warn(`🐌 Slow render in ${componentName}:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        threshold: `${threshold}ms`,
        renderCount: renderCount.current,
        averageRenderTime: `${averageRenderTime.toFixed(2)}ms`,
      });
    }

    // Log performance metrics every 50 renders
    if (renderCount.current % 50 === 0) {
      console.log(`📊 Performance metrics for ${componentName}:`, {
        totalRenders: renderCount.current,
        averageRenderTime: `${averageRenderTime.toFixed(2)}ms`,
        lastRenderTime: `${renderTime.toFixed(2)}ms`,
        totalRenderTime: `${totalRenderTime.current.toFixed(2)}ms`,
      });
    }

    renderStartTime.current = 0;
  }, [enabled, threshold, componentName]);

  // Start timing on every render
  useEffect(() => {
    startTiming();
    return endTiming;
  });

  if (showDebugInfo && enabled && renderCount.current > 0) {
    const averageRenderTime = totalRenderTime.current / renderCount.current;
    
    return (
      <View>
        {children}
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            {componentName}: {renderCount.current} renders, 
            avg: {averageRenderTime.toFixed(1)}ms, 
            last: {lastRenderTime.current.toFixed(1)}ms
          </Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
});

const styles = {
  debugInfo: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    backgroundColor: Colors.background.overlay,
    padding: 4,
    borderRadius: 4,
    zIndex: 1000,
  },
  debugText: {
    fontSize: 10,
    color: Colors.text.white,
    fontFamily: 'monospace',
  },
};

PerformanceTracker.displayName = 'PerformanceTracker';

export default PerformanceTracker;
