import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/components/ui/toast';
import { createSafeAreaToastRenderer } from '@/components/ui/SafeAreaToast';
import { NetworkConfig } from '@/utils/networkConfig';
import { useAuth } from './AuthContext';
import { AppState, AppStateStatus } from 'react-native';

interface BookmarksContextType {
  bookmarkedGuideIds: Set<string>;
  toggleBookmark: (guideId: string, guideTitle?: string) => Promise<void>;
  isBookmarked: (guideId: string) => boolean;
  loadBookmarks: () => Promise<void>;
}

interface BookmarksProviderProps {
  children: ReactNode;
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined);

export const BookmarksProvider: React.FC<BookmarksProviderProps> = ({ children }) => {
  const [bookmarkedGuideIds, setBookmarkedGuideIds] = useState<Set<string>>(new Set());
  const { session } = useAuth();
  const toast = useToast();

  const loadBookmarks = useCallback(async () => {
    if (!session?.access_token) {
      setBookmarkedGuideIds(new Set());
      return;
    }

    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/user/favorites/guides`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const ids = new Set<string>(data.map((bookmark: any) => bookmark.article_id));
        setBookmarkedGuideIds(ids);
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  }, [session?.access_token]);

  const toggleBookmark = useCallback(async (guideId: string, guideTitle?: string) => {
    try {
      if (!session?.access_token) {
        toast.show({
          placement: 'top',
          duration: 2000,
          render: createSafeAreaToastRenderer('top', 'muted', 'outline', 'Login required'),
        });
        return;
      }

      const isCurrentlyBookmarked = bookmarkedGuideIds.has(guideId);
      
      // Optimistic update
      if (isCurrentlyBookmarked) {
        setBookmarkedGuideIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(guideId);
          return newSet;
        });
      } else {
        setBookmarkedGuideIds(prev => new Set([...prev, guideId]));
      }
      
      // API call
      const apiUrl = await NetworkConfig.getBestApiUrl();
      if (isCurrentlyBookmarked) {
        const response = await fetch(`${apiUrl}/api/user/favorites/guides/${guideId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (!response.ok) {
          setBookmarkedGuideIds(prev => new Set([...prev, guideId]));
          toast.show({
            placement: 'top',
            duration: 2000,
            render: createSafeAreaToastRenderer('top', 'error', 'outline', 'Failed to remove'),
          });
        }
      } else {
        const response = await fetch(`${apiUrl}/api/user/favorites/guides`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ article_id: guideId }),
        });

        if (!response.ok && response.status !== 409) {
          setBookmarkedGuideIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(guideId);
            return newSet;
          });
          toast.show({
            placement: 'top',
            duration: 2000,
            render: createSafeAreaToastRenderer('top', 'error', 'outline', 'Failed to add'),
          });
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  }, [bookmarkedGuideIds, session, toast]);

  const isBookmarked = useCallback((guideId: string): boolean => {
    return bookmarkedGuideIds.has(guideId);
  }, [bookmarkedGuideIds]);

  useEffect(() => {
    loadBookmarks();

    // App state listener - refresh when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 BookmarksContext: App came to foreground, refreshing guide bookmarks');
        loadBookmarks();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Periodic refresh to prevent stale counts (every 2 minutes)
    const periodicRefresh = setInterval(() => {
      console.log("⏰ BookmarksContext: Periodic refresh to prevent stale guide bookmarks");
      loadBookmarks();
    }, 2 * 60 * 1000); // 2 minutes

    return () => {
      appStateSubscription?.remove();
      clearInterval(periodicRefresh);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const value: BookmarksContextType = React.useMemo(() => ({
    bookmarkedGuideIds,
    toggleBookmark,
    isBookmarked,
    loadBookmarks,
  }), [bookmarkedGuideIds, toggleBookmark, isBookmarked, loadBookmarks]);

  return (
    <BookmarksContext.Provider value={value}>
      {children}
    </BookmarksContext.Provider>
  );
};

export const useBookmarks = (): BookmarksContextType => {
  const context = useContext(BookmarksContext);
  if (context === undefined) {
    throw new Error('useBookmarks must be used within a BookmarksProvider');
  }
  return context;
};
