import React, { useCallback, useMemo } from 'react';
import { FlatList, View, RefreshControl, ListRenderItem } from 'react-native';
import { useOptimizedList } from '@/hooks/useOptimizedList';
import OptimizedPost from './OptimizedPost';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import Colors from '@/constants/Colors';

interface Post {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
  };
  timestamp: string;
  category: string;
  content: string;
  comments: number;
}

interface OptimizedTimelineProps {
  posts: Post[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onPostPress?: (post: Post) => void;
  onCommentPress?: (post: Post) => void;
  onBookmarkPress?: (post: Post) => void;
  onReportPress?: (post: Post) => void;
}

const OptimizedTimeline: React.FC<OptimizedTimelineProps> = React.memo(({
  posts,
  loading = false,
  refreshing = false,
  onRefresh,
  onLoadMore,
  onPostPress,
  onCommentPress,
  onBookmarkPress,
  onReportPress,
}) => {
  // Memoized key extractor
  const keyExtractor = useCallback((item: Post) => item.id, []);

  // Memoized render item
  const renderItem: ListRenderItem<Post> = useCallback(({ item, index }) => (
    <OptimizedPost
      {...item}
      index={index}
      onPostPress={() => onPostPress?.(item)}
      onCommentPress={() => onCommentPress?.(item)}
      onBookmarkPress={() => onBookmarkPress?.(item)}
      onReportPress={() => onReportPress?.(item)}
    />
  ), [onPostPress, onCommentPress, onBookmarkPress, onReportPress]);

  // Use optimized list hook
  const optimizedListProps = useOptimizedList({
    data: posts,
    keyExtractor,
    renderItem,
    windowSize: 10,
    initialNumToRender: 5,
    maxToRenderPerBatch: 3,
    updateCellsBatchingPeriod: 50,
    removeClippedSubviews: true,
  });

  // Memoized refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[Colors.primary.blue]}
      tintColor={Colors.primary.blue}
    />
  ), [refreshing, onRefresh]);

  // Handle end reached for pagination
  const handleEndReached = useCallback(() => {
    if (!loading && onLoadMore) {
      onLoadMore();
    }
  }, [loading, onLoadMore]);

  // Loading skeleton
  if (loading && posts.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background.primary, paddingHorizontal: 16 }}>
        <SkeletonList itemCount={5} itemHeight={200} spacing={12} />
      </View>
    );
  }

  return (
    <FlatList
      {...optimizedListProps}
      style={{ flex: 1, backgroundColor: Colors.background.primary }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 100, // Account for bottom navigation
      }}
      refreshControl={refreshControl}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={null}
    />
  );
});

OptimizedTimeline.displayName = 'OptimizedTimeline';

export default OptimizedTimeline;
