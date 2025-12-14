import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { BookmarkService } from '../services/bookmarkService';
import { AppState, AppStateStatus } from 'react-native';

interface PostBookmarksContextType {
  bookmarkedPostIds: Set<string>;
  toggleBookmark: (postId: string) => Promise<void>;
  isBookmarked: (postId: string) => boolean;
  loadBookmarks: () => Promise<void>;
}

interface PostBookmarksProviderProps {
  children: ReactNode;
}

const PostBookmarksContext = createContext<PostBookmarksContextType | undefined>(undefined);

export const PostBookmarksProvider: React.FC<PostBookmarksProviderProps> = ({ children }) => {
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<Set<string>>(new Set());
  const { session, isAuthenticated, user } = useAuth();

  const loadBookmarks = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setBookmarkedPostIds(new Set());
      return;
    }

    try {
      const result = await BookmarkService.getUserBookmarks(user.id, session);
      
      if (result.success && result.data) {
        const ids = new Set<string>(result.data.map((bookmark: any) => String(bookmark.id)));
        setBookmarkedPostIds(ids);
      }
    } catch (error) {
      console.error('Error loading post bookmarks:', error);
    }
  }, [isAuthenticated, user?.id, session]);

  const toggleBookmark = useCallback(async (postId: string) => {
    if (!isAuthenticated || !user?.id) return;

    const isCurrentlyBookmarked = bookmarkedPostIds.has(postId);
    
    // Optimistic update
    setBookmarkedPostIds(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyBookmarked) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
    
    try {
      const result = await BookmarkService.toggleBookmark(postId, user.id, session);
      if (!result.success) throw new Error('Toggle failed');
    } catch {
      // Rollback
      setBookmarkedPostIds(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyBookmarked) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });
    }
  }, [bookmarkedPostIds, isAuthenticated, user?.id, session]);

  const isBookmarked = useCallback((postId: string): boolean => {
    return bookmarkedPostIds.has(postId);
  }, [bookmarkedPostIds]);

  useEffect(() => {
    loadBookmarks();

    // App state listener - refresh when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 PostBookmarksContext: App came to foreground, refreshing post bookmarks');
        loadBookmarks();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Periodic refresh to prevent stale counts (every 2 minutes)
    const periodicRefresh = setInterval(() => {
      console.log("⏰ PostBookmarksContext: Periodic refresh to prevent stale post bookmarks");
      loadBookmarks();
    }, 2 * 60 * 1000); // 2 minutes

    return () => {
      appStateSubscription?.remove();
      clearInterval(periodicRefresh);
    };
  }, [isAuthenticated, user?.id, session, loadBookmarks]);

  const value: PostBookmarksContextType = React.useMemo(() => ({
    bookmarkedPostIds,
    toggleBookmark,
    isBookmarked,
    loadBookmarks,
  }), [bookmarkedPostIds, toggleBookmark, isBookmarked, loadBookmarks]);

  return (
    <PostBookmarksContext.Provider value={value}>
      {children}
    </PostBookmarksContext.Provider>
  );
};

export const usePostBookmarks = (): PostBookmarksContextType => {
  const context = useContext(PostBookmarksContext);
  if (context === undefined) {
    throw new Error('usePostBookmarks must be used within a PostBookmarksProvider');
  }
  return context;
};
