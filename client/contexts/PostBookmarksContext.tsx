import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { BookmarkService } from '../services/bookmarkService';

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
    try {
      if (!isAuthenticated || !user?.id) {
        return;
      }

      const isCurrentlyBookmarked = bookmarkedPostIds.has(postId);
      
      // Optimistic update
      if (isCurrentlyBookmarked) {
        setBookmarkedPostIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        setBookmarkedPostIds(prev => new Set([...prev, postId]));
      }
      
      // API call
      const result = await BookmarkService.toggleBookmark(postId, user.id, session);
      
      if (!result.success) {
        // Revert on failure
        if (isCurrentlyBookmarked) {
          setBookmarkedPostIds(prev => new Set([...prev, postId]));
        } else {
          setBookmarkedPostIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(postId);
            return newSet;
          });
        }
      } else {
        // Sync with server state
        if (result.isBookmarked !== !isCurrentlyBookmarked) {
          setBookmarkedPostIds(prev => {
            const newSet = new Set(prev);
            if (result.isBookmarked) {
              newSet.add(postId);
            } else {
              newSet.delete(postId);
            }
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error('Error toggling post bookmark:', error);
      // Revert optimistic update on error
      loadBookmarks();
    }
  }, [bookmarkedPostIds, isAuthenticated, user?.id, session, loadBookmarks]);

  const isBookmarked = useCallback((postId: string): boolean => {
    return bookmarkedPostIds.has(postId);
  }, [bookmarkedPostIds]);

  useEffect(() => {
    loadBookmarks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

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
