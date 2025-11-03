import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bookmark, Filter, SortAsc } from 'lucide-react-native';
import UnifiedSearchBar from '@/components/common/UnifiedSearchBar';
import { PostSkeletonList } from '@/components/home/PostSkeleton';
import Post from '../components/home/Post';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import { SidebarWrapper } from '../components/AppSidebar';
import { useAuth } from '../contexts/AuthContext';
import { usePostBookmarks } from '../contexts/PostBookmarksContext';
import { BookmarkService } from '../services/bookmarkService';
import Colors from '../constants/Colors';
import { GlobalStyles } from '../constants/GlobalStyles';

interface PostData {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
    isLawyer?: boolean;
    lawyerBadge?: string;
  };
  timestamp: string;
  category: string;
  content: string;
  comments: number;
  isBookmarked?: boolean;
  body?: string;
  domain?: string;
  created_at?: string;
  user_id?: string;
  is_anonymous?: boolean;
  is_flagged?: boolean;
  users?: any;
}

// Styles defined before component (FAANG best practice - hoisting)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary, // Match header
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.text.sub,
    ...GlobalStyles.text,
  },
  listContent: {
    paddingVertical: 10,
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsText: {
    fontSize: 14,
    color: Colors.text.sub,
    ...GlobalStyles.text,
  },
  sortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 12,
    color: Colors.text.sub,
    ...GlobalStyles.text,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 18,
    color: Colors.text.head,
    marginTop: 16,
    marginBottom: 8,
    ...GlobalStyles.textSemiBold,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.sub,
    textAlign: 'center',
    marginBottom: 24,
    ...GlobalStyles.text,
  },
  browseButton: {
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    ...GlobalStyles.textSemiBold,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: Colors.background.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.head,
    marginLeft: 12,
    ...GlobalStyles.text,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default function BookmarkedPostsScreen() {
  const router = useRouter();
  const { session, isAuthenticated, user: currentUser } = useAuth();
  const { loadBookmarks: refreshBookmarkContext } = usePostBookmarks();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const formatTimeAgo = useCallback((isoDate?: string): string => {
    if (!isoDate) return '';
    const hasTz = /Z|[+-]\d{2}:?\d{2}$/.test(isoDate);
    const normalized = hasTz ? isoDate : `${isoDate}Z`;
    const createdMs = new Date(normalized).getTime();
    if (Number.isNaN(createdMs)) return '';
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - createdMs) / 1000));
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d`;
    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 4) return `${diffWeek}w`;
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth}mo`;
    const diffYear = Math.floor(diffDay / 365);
    return `${diffYear}y`;
  }, []);

  const mapApiToPost = useCallback((row: any): PostData => {
    const isAnon = !!row?.is_anonymous;
    const created = row?.created_at || '';
    const userData = row?.users || {};
    
    return {
      id: String(row?.id ?? ''),
      user: isAnon
        ? { name: 'Anonymous User', username: 'anonymous', avatar: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' }
        : { 
            name: userData?.full_name || userData?.username || 'User', 
            username: userData?.username || 'user', 
            avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
            isLawyer: userData?.role === 'verified_lawyer',
            lawyerBadge: userData?.role === 'verified_lawyer' ? 'Verified' : undefined,
          },
      timestamp: formatTimeAgo(created),
      category: row?.category || 'Others',
      content: row?.body || '',
      comments: row?.replies?.length || 0,
      isBookmarked: true,
      body: row?.body || '',
      domain: row?.category || 'others',
      created_at: row?.created_at || null,
      user_id: row?.user_id || null,
      is_anonymous: isAnon,
      is_flagged: !!row?.is_flagged,
      users: userData,
    };
  }, [formatTimeAgo]);

  const loadBookmarkedPosts = useCallback(async (showRefreshing = false) => {
    if (!isAuthenticated || !currentUser?.id) {
      setPosts([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await BookmarkService.getUserBookmarks(currentUser.id, session);
      
      if (result.success && result.data) {
        const mappedPosts = result.data.map(mapApiToPost);
        setPosts(mappedPosts);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Failed to load bookmarked posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, currentUser?.id, session, mapApiToPost]);

  useEffect(() => {
    loadBookmarkedPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUser?.id]); // Only re-run when auth state changes

  const handleRefresh = useCallback(() => {
    loadBookmarkedPosts(true);
  }, [loadBookmarkedPosts]);

  const handleCommentPress = useCallback((postId: string) => {
    router.push(`/home/ViewPost?postId=${postId}` as any);
  }, [router]);

  const handlePostPress = useCallback((postId: string) => {
    router.push(`/home/ViewPost?postId=${postId}` as any);
  }, [router]);

  const handleBookmarkPress = useCallback(() => {
    // The Post component handles the actual bookmark logic
  }, []);

  const handleBookmarkStatusChange = useCallback((postId: string, isBookmarked: boolean) => {
    if (!isBookmarked) {
      setPosts(prev => prev.filter(post => post.id !== postId));
      // Refresh the context to update sidebar badge count
      setTimeout(() => refreshBookmarkContext(), 100);
    }
  }, [refreshBookmarkContext]);

  const handleReportPress = useCallback((postId: string) => {
    // The Post component handles the actual report logic
  }, []);

  const handleMenuToggle = useCallback((postId: string) => {
    setOpenMenuPostId(prev => prev === postId ? null : postId);
  }, []);

  // Filter posts by search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    
    const query = searchQuery.toLowerCase();
    return posts.filter(post => 
      post.content.toLowerCase().includes(query) ||
      post.category.toLowerCase().includes(query) ||
      post.user.name.toLowerCase().includes(query) ||
      post.user.username.toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Bookmark size={48} color={Colors.text.sub} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>No Bookmarked Posts Yet</Text>
      <Text style={styles.emptySubtitle}>
        Save interesting forum posts to access them quickly here.
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => router.push('/home')}
        activeOpacity={0.8}
      >
        <Text style={styles.browseButtonText}>Browse Forum</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <UnifiedSearchBar
      value={searchQuery}
      onChangeText={setSearchQuery}
      placeholder="Search bookmarked posts..."
      loading={loading}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
          {searchQuery && ` for "${searchQuery}"`}
        </Text>
        {filteredPosts.length > 1 && (
          <View style={styles.sortBadge}>
            <SortAsc size={14} color={Colors.text.sub} />
            <Text style={styles.sortText}>Recent</Text>
          </View>
        )}
      </View>
    </View>
  );

  const keyExtractor = useCallback((item: PostData) => item.id, []);

  const renderItem = useCallback(({ item, index }: { item: PostData; index: number }) => (
    <Post
      key={item.id}
      id={item.id}
      user={item.user}
      timestamp={item.timestamp}
      category={item.category}
      content={item.content}
      comments={item.comments}
      onCommentPress={() => handleCommentPress(item.id)}
      onBookmarkPress={handleBookmarkPress}
      onReportPress={() => handleReportPress(item.id)}
      onPostPress={() => handlePostPress(item.id)}
      index={index}
      isBookmarked={true}
      isMenuOpen={openMenuPostId === item.id}
      onMenuToggle={handleMenuToggle}
      onBookmarkStatusChange={handleBookmarkStatusChange}
    />
  ), [handleCommentPress, handleBookmarkPress, handleReportPress, handlePostPress, handleMenuToggle, openMenuPostId, handleBookmarkStatusChange]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header title="Bookmarked Posts" showMenu={true} />

      {loading ? (
        <PostSkeletonList count={3} />
      ) : posts.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {renderSearchBar()}
          {filteredPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Filter size={48} color={Colors.text.sub} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No Posts Found</Text>
              <Text style={styles.emptySubtitle}>
                No bookmarked posts match your search &quot;{searchQuery}&quot;
              </Text>
              <TouchableOpacity 
                style={styles.browseButton}
                onPress={clearSearch}
                activeOpacity={0.8}
              >
                <Text style={styles.browseButtonText}>Clear Search</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredPosts}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onScroll={() => setOpenMenuPostId(null)}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[Colors.primary.blue]}
                  tintColor={Colors.primary.blue}
                />
              }
            />
          )}
        </>
      )}

      <Navbar />
      <SidebarWrapper />
    </SafeAreaView>
  );
}
