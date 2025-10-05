import { useMemo, useCallback } from 'react';
import { ListRenderItem, ViewToken } from 'react-native';

interface UseOptimizedListProps<T> {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
  windowSize?: number;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  removeClippedSubviews?: boolean;
}

interface UseOptimizedListReturn<T> {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
  getItemLayout?: (data: ArrayLike<T> | null | undefined, index: number) => {
    length: number;
    offset: number;
    index: number;
  };
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void;
  viewabilityConfig?: {
    itemVisiblePercentThreshold: number;
    minimumViewTime: number;
  };
  windowSize: number;
  initialNumToRender: number;
  maxToRenderPerBatch: number;
  updateCellsBatchingPeriod: number;
  removeClippedSubviews: boolean;
}

/**
 * Hook for optimizing FlatList performance with sensible defaults
 */
export function useOptimizedList<T>({
  data,
  keyExtractor,
  renderItem,
  windowSize = 10,
  initialNumToRender = 10,
  maxToRenderPerBatch = 5,
  updateCellsBatchingPeriod = 50,
  removeClippedSubviews = true,
}: UseOptimizedListProps<T>): UseOptimizedListReturn<T> {
  // Memoize the data to prevent unnecessary re-renders
  const memoizedData = useMemo(() => data, [data]);

  // Memoize the key extractor
  const memoizedKeyExtractor = useCallback(
    (item: T, index: number) => keyExtractor(item, index),
    [keyExtractor]
  );

  // Memoize the render item function
  const memoizedRenderItem = useCallback(
    renderItem,
    [renderItem]
  );

  // Viewability configuration for better performance
  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 300,
    }),
    []
  );

  // Optional: Track viewable items for analytics or lazy loading
  const onViewableItemsChanged = useCallback(
    (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
      // You can implement custom logic here for tracking visible items
      // console.log('Viewable items changed:', info.viewableItems.length);
    },
    []
  );

  return {
    data: memoizedData,
    keyExtractor: memoizedKeyExtractor,
    renderItem: memoizedRenderItem,
    onViewableItemsChanged,
    viewabilityConfig,
    windowSize,
    initialNumToRender,
    maxToRenderPerBatch,
    updateCellsBatchingPeriod,
    removeClippedSubviews,
  };
}

/**
 * Hook for optimizing list with known item heights
 */
export function useOptimizedListWithItemHeight<T>(
  props: UseOptimizedListProps<T> & { itemHeight: number }
) {
  const optimizedList = useOptimizedList(props);

  const getItemLayout = useCallback(
    (data: ArrayLike<T> | null | undefined, index: number) => ({
      length: props.itemHeight,
      offset: props.itemHeight * index,
      index,
    }),
    [props.itemHeight]
  );

  return {
    ...optimizedList,
    getItemLayout,
  };
}
