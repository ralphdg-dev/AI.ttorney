import { useState, useCallback, useRef, useEffect } from 'react';
import ForumSearchService, { ForumSearchResult } from '../services/forumSearchService';
import { useAuth } from '../contexts/AuthContext';
import { useForumCache } from '../contexts/ForumCacheContext';

interface UseForumSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  autoSearch?: boolean;
}

interface UseForumSearchReturn {
  // State
  query: string;
  results: ForumSearchResult[];
  isSearching: boolean;
  isSearchVisible: boolean;
  hasSearched: boolean;
  total: number;
  error: string | null;
  
  // Actions
  setQuery: (query: string) => void;
  search: (query?: string) => Promise<void>;
  clearSearch: () => void;
  showSearch: () => void;
  hideSearch: () => void;
  toggleSearch: () => void;
}

export const useForumSearch = (options: UseForumSearchOptions = {}): UseForumSearchReturn => {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    autoSearch = true
  } = options;

  const { session } = useAuth();
  const { getCachedPosts } = useForumCache();
  
  // State
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<ForumSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastQueryRef = useRef('');

  // Debounced search function
  const debouncedSearch = useCallback(
    ForumSearchService.debounce(async (searchQuery: string) => {
      if (searchQuery.trim().length < minQueryLength) {
        setResults([]);
        setTotal(0);
        setHasSearched(false);
        setError(null);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const cachedPosts = getCachedPosts();
        const response = await ForumSearchService.searchPosts(searchQuery, {
          limit: 50,
          session,
          cachedPosts: cachedPosts || []
        });

        if (response.success) {
          setResults(response.data);
          setTotal(response.total);
          setHasSearched(true);
          setError(null);
        } else {
          setError(response.message || 'Search failed');
          setResults([]);
          setTotal(0);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setTotal(0);
      } finally {
        setIsSearching(false);
      }
    }, debounceMs),
    [session, minQueryLength, debounceMs]
  );

  // Set query with optional auto-search
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    lastQueryRef.current = newQuery;

    if (autoSearch) {
      debouncedSearch(newQuery);
    }
  }, [autoSearch, debouncedSearch]);

  // Manual search function
  const search = useCallback(async (searchQuery?: string) => {
    const queryToSearch = searchQuery ?? query;
    
    if (__DEV__) {
      console.log('🔍 useForumSearch: Manual search triggered for:', queryToSearch);
    }
    
    if (queryToSearch.trim().length < minQueryLength) {
      if (__DEV__) {
        console.log('⚠️ useForumSearch: Query too short, clearing results');
      }
      setResults([]);
      setTotal(0);
      setHasSearched(false);
      setError(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const cachedPosts = getCachedPosts();
      const response = await ForumSearchService.searchPosts(queryToSearch, {
        limit: 50,
        session,
        cachedPosts: cachedPosts || []
      });

      if (response.success) {
        if (__DEV__) {
          console.log('✅ useForumSearch: Search successful, found:', response.data.length, 'results');
        }
        setResults(response.data);
        setTotal(response.total);
        setHasSearched(true);
        setError(null);
      } else {
        if (__DEV__) {
          console.log('❌ useForumSearch: Search failed:', response.message);
        }
        setError(response.message || 'Search failed');
        setResults([]);
        setTotal(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setTotal(0);
    } finally {
      setIsSearching(false);
    }
  }, [query, session, minQueryLength]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQueryState('');
    setResults([]);
    setTotal(0);
    setHasSearched(false);
    setError(null);
    setIsSearching(false);
    lastQueryRef.current = '';
    
    // Clear any pending debounced search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

  // Show/hide search
  const showSearch = useCallback(() => {
    setIsSearchVisible(true);
  }, []);

  const hideSearch = useCallback(() => {
    setIsSearchVisible(false);
    clearSearch();
  }, [clearSearch]);

  const toggleSearch = useCallback(() => {
    if (isSearchVisible) {
      hideSearch();
    } else {
      showSearch();
    }
  }, [isSearchVisible, hideSearch, showSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    query,
    results,
    isSearching,
    isSearchVisible,
    hasSearched,
    total,
    error,
    
    // Actions
    setQuery,
    search,
    clearSearch,
    showSearch,
    hideSearch,
    toggleSearch,
  };
};
