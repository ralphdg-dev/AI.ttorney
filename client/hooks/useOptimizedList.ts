import { useMemo, useCallback } from 'react';
import { ListRenderItem } from 'react-native';

interface UseListProps<T> {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
}

interface UseListReturn<T> {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
}

/**
 * Simple hook for basic FlatList memoization without complex optimizations
 */
export function useList<T>({
  data,
  keyExtractor,
  renderItem,
}: UseListProps<T>): UseListReturn<T> {
  // Basic memoization only
  const memoizedData = useMemo(() => data, [data]);
  const memoizedKeyExtractor = useCallback(keyExtractor, [keyExtractor]);
  const memoizedRenderItem = useCallback(renderItem, [renderItem]);

  return {
    data: memoizedData,
    keyExtractor: memoizedKeyExtractor,
    renderItem: memoizedRenderItem,
  };
}

// Keep the old function for backward compatibility but mark as deprecated
/**
 * @deprecated Use useList instead for simpler implementation
 */
export function useOptimizedList<T>({
  data,
  keyExtractor,
  renderItem,
}: UseListProps<T>): UseListReturn<T> {
  return useList({ data, keyExtractor, renderItem });
}
