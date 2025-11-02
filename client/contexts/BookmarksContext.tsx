import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { NetworkConfig } from '@/utils/networkConfig';
import { useToast, Toast, ToastTitle } from '@/components/ui/toast';

const API_BASE_URL = NetworkConfig.getApiUrl();

interface BookmarksContextType {
  bookmarkedGuideIds: Set<string>;
  toggleBookmark: (guideId: string, guideTitle?: string) => Promise<void>;
  isBookmarked: (guideId: string) => boolean;
  getBookmarkCount: () => number;
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
      const response = await fetch(`${API_BASE_URL}/api/user/favorites/guides`, {
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
          render: ({ id }) => (
            <Toast nativeID={id} action="muted" variant="outline">
              <ToastTitle>Login required</ToastTitle>
            </Toast>
          ),
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
      if (isCurrentlyBookmarked) {
        const response = await fetch(`${API_BASE_URL}/api/user/favorites/guides/${guideId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (!response.ok) {
          setBookmarkedGuideIds(prev => new Set([...prev, guideId]));
          toast.show({
            placement: 'top',
            duration: 2000,
            render: ({ id }) => (
              <Toast nativeID={id} action="error" variant="outline">
                <ToastTitle>Failed to remove</ToastTitle>
              </Toast>
            ),
          });
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/api/user/favorites/guides`, {
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
            render: ({ id }) => (
              <Toast nativeID={id} action="error" variant="outline">
                <ToastTitle>Failed to add</ToastTitle>
              </Toast>
            ),
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

  const getBookmarkCount = useCallback((): number => {
    return bookmarkedGuideIds.size;
  }, [bookmarkedGuideIds]);

  useEffect(() => {
    loadBookmarks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const value: BookmarksContextType = React.useMemo(() => ({
    bookmarkedGuideIds,
    toggleBookmark,
    isBookmarked,
    getBookmarkCount,
    loadBookmarks,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [bookmarkedGuideIds, toggleBookmark, isBookmarked, getBookmarkCount]);

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
