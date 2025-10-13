import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface PostData {
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
  isBookmarked?: boolean;
}

interface CacheData {
  posts: PostData[];
  timestamp: number;
  lastFetchTime: number;
}

interface ForumCacheContextType {
  getCachedPosts: () => PostData[] | null;
  setCachedPosts: (posts: PostData[]) => void;
  isCacheValid: () => boolean;
  clearCache: () => void;
  updatePostBookmark: (postId: string, isBookmarked: boolean) => void;
  getLastFetchTime: () => number;
  setLastFetchTime: (time: number) => void;
}

const ForumCacheContext = createContext<ForumCacheContextType | undefined>(undefined);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

export const ForumCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cacheData, setCacheData] = useState<CacheData | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  const getCachedPosts = useCallback((): PostData[] | null => {
    if (!cacheData) return null;
    
    const now = Date.now();
    const age = now - cacheData.timestamp;
    
    if (age > CACHE_DURATION) {
      // Cache expired
      setCacheData(null);
      return null;
    }
    
    return cacheData.posts;
  }, [cacheData]);

  const setCachedPosts = useCallback((posts: PostData[]) => {
    const now = Date.now();
    setCacheData({
      posts,
      timestamp: now,
      lastFetchTime: now,
    });
    lastFetchTimeRef.current = now;
  }, []);

  const isCacheValid = useCallback((): boolean => {
    if (!cacheData) return false;
    
    const now = Date.now();
    const age = now - cacheData.timestamp;
    
    return age < CACHE_DURATION;
  }, [cacheData]);

  const clearCache = useCallback(() => {
    setCacheData(null);
    lastFetchTimeRef.current = 0;
  }, []);

  const updatePostBookmark = useCallback((postId: string, isBookmarked: boolean) => {
    if (!cacheData) return;
    
    const updatedPosts = cacheData.posts.map(post =>
      post.id === postId ? { ...post, isBookmarked } : post
    );
    
    setCacheData({
      ...cacheData,
      posts: updatedPosts,
    });
  }, [cacheData]);

  const getLastFetchTime = useCallback(() => {
    return lastFetchTimeRef.current;
  }, []);

  const setLastFetchTime = useCallback((time: number) => {
    lastFetchTimeRef.current = time;
  }, []);

  const value: ForumCacheContextType = {
    getCachedPosts,
    setCachedPosts,
    isCacheValid,
    clearCache,
    updatePostBookmark,
    getLastFetchTime,
    setLastFetchTime,
  };

  return (
    <ForumCacheContext.Provider value={value}>
      {children}
    </ForumCacheContext.Provider>
  );
};

export const useForumCache = (): ForumCacheContextType => {
  const context = useContext(ForumCacheContext);
  if (!context) {
    throw new Error('useForumCache must be used within a ForumCacheProvider');
  }
  return context;
};
