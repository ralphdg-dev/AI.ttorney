import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

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
  // Full post data for individual post view
  body?: string;
  domain?: string;
  created_at?: string;
  user_id?: string;
  is_anonymous?: boolean;
  is_flagged?: boolean;
  users?: any;
}

interface Reply {
  id: string;
  body: string;
  created_at: string | null;
  updated_at?: string | null;
  user_id?: string | null;
  is_anonymous?: boolean | null;
  is_flagged?: boolean | null;
  user?: {
    name: string;
    username: string;
    avatar: string;
    isLawyer?: boolean;
    lawyerBadge?: string;
  };
  timestamp?: string;
  content?: string;
}

interface PostWithComments extends PostData {
  replies: Reply[];
  commentsLoaded: boolean;
  commentsTimestamp?: number;
}

interface CacheData {
  posts: PostData[];
  timestamp: number;
  lastFetchTime: number;
}

interface PostCacheData {
  post: PostWithComments;
  timestamp: number;
}

interface ForumCacheContextType {
  getCachedPosts: () => PostData[] | null;
  setCachedPosts: (posts: PostData[]) => void;
  isCacheValid: () => boolean;
  clearCache: () => void;
  updatePostBookmark: (postId: string, isBookmarked: boolean) => void;
  getLastFetchTime: () => number;
  setLastFetchTime: (time: number) => void;
  // Individual post caching
  getCachedPost: (postId: string) => PostWithComments | null;
  setCachedPost: (postId: string, post: PostWithComments) => void;
  getCachedPostFromForum: (postId: string) => PostData | null;
  updatePostComments: (postId: string, replies: Reply[]) => void;
  isPostCacheValid: (postId: string) => boolean;
  prefetchPost: (postId: string) => Promise<void>;
}

const ForumCacheContext = createContext<ForumCacheContextType | undefined>(undefined);

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache duration - reduced for fresher data
const POST_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for individual posts
const COMMENTS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for comments

export const ForumCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cacheData, setCacheData] = useState<CacheData | null>(null);
  const [postCache, setPostCache] = useState<Map<string, PostCacheData>>(new Map());
  const lastFetchTimeRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the provider
  React.useEffect(() => {
    try {
      setIsInitialized(true);
      if (__DEV__) {
        console.log('📦 ForumCacheProvider initialized');
      }
    } catch (error) {
      console.error('❌ ForumCacheProvider initialization error:', error);
    }
  }, []);

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

  // Individual post caching functions
  const getCachedPost = useCallback((postId: string): PostWithComments | null => {
    const cached = postCache.get(postId);
    if (!cached) return null;
    
    const now = Date.now();
    const age = now - cached.timestamp;
    
    if (age > POST_CACHE_DURATION) {
      // Remove expired cache
      setPostCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(postId);
        return newCache;
      });
      return null;
    }
    
    return cached.post;
  }, [postCache]);

  const setCachedPost = useCallback((postId: string, post: PostWithComments) => {
    const now = Date.now();
    setPostCache(prev => {
      const newCache = new Map(prev);
      newCache.set(postId, {
        post: { ...post, commentsTimestamp: now },
        timestamp: now
      });
      return newCache;
    });
  }, []);

  const getCachedPostFromForum = useCallback((postId: string): PostData | null => {
    if (!cacheData) return null;
    
    return cacheData.posts.find(post => post.id === postId) || null;
  }, [cacheData]);

  const updatePostComments = useCallback((postId: string, replies: Reply[]) => {
    setPostCache(prev => {
      const newCache = new Map(prev);
      const existing = newCache.get(postId);
      
      if (existing) {
        const updatedPost = {
          ...existing.post,
          replies,
          commentsLoaded: true,
          commentsTimestamp: Date.now()
        };
        
        newCache.set(postId, {
          ...existing,
          post: updatedPost
        });
      }
      
      return newCache;
    });
  }, []);

  const isPostCacheValid = useCallback((postId: string): boolean => {
    const cached = postCache.get(postId);
    if (!cached) return false;
    
    const now = Date.now();
    const age = now - cached.timestamp;
    
    return age < POST_CACHE_DURATION;
  }, [postCache]);

  const prefetchPost = useCallback(async (postId: string): Promise<void> => {
    // Check if already cached and valid
    if (isPostCacheValid(postId)) {
      return;
    }

    // Check if we have basic post data from forum cache
    const forumPost = getCachedPostFromForum(postId);
    if (!forumPost) {
      return; // Can't prefetch without basic post data
    }

    try {
      // Create post with comments structure from forum data
      const postWithComments: PostWithComments = {
        ...forumPost,
        replies: [],
        commentsLoaded: false,
        body: forumPost.content,
        domain: forumPost.category as any
      };

      // Cache the basic post structure
      setCachedPost(postId, postWithComments);
      
      if (__DEV__) {
        console.log(`📦 Prefetched post ${postId} from forum cache`);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn(`Failed to prefetch post ${postId}:`, error);
      }
    }
  }, [isPostCacheValid, getCachedPostFromForum, setCachedPost]);

  const value: ForumCacheContextType = React.useMemo(() => {
    if (!isInitialized) {
      // Return safe defaults while initializing
      return {
        getCachedPosts: () => null,
        setCachedPosts: () => {},
        isCacheValid: () => false,
        clearCache: () => {},
        updatePostBookmark: () => {},
        getLastFetchTime: () => 0,
        setLastFetchTime: () => {},
        getCachedPost: () => null,
        setCachedPost: () => {},
        getCachedPostFromForum: () => null,
        updatePostComments: () => {},
        prefetchPost: async () => {},
        isPostCacheValid: () => false
      };
    }

    return {
      getCachedPosts,
      setCachedPosts,
      isCacheValid,
      clearCache,
      updatePostBookmark,
      getLastFetchTime,
      setLastFetchTime,
      getCachedPost,
      setCachedPost,
      getCachedPostFromForum,
      updatePostComments,
      isPostCacheValid,
      prefetchPost,
    };
  }, [isInitialized, getCachedPosts, setCachedPosts, isCacheValid, clearCache, updatePostBookmark, getLastFetchTime, setLastFetchTime, getCachedPost, setCachedPost, getCachedPostFromForum, updatePostComments, isPostCacheValid, prefetchPost]);

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
