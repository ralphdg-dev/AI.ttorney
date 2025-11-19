import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StatusBar, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import Colors from '../constants/Colors';
import { NetworkConfig } from '../utils/networkConfig';
import Post from '../components/home/Post';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';
import { useForumCache } from '../contexts/ForumCacheContext';

const SearchScreen: React.FC = () => {
  const router = useRouter();
  const { query: initialQueryParam } = useLocalSearchParams<{ query?: string }>();
  const { session } = useAuth();
  const { prefetchPost } = useForumCache();

  const [query, setQuery] = useState<string>(typeof initialQueryParam === 'string' ? initialQueryParam : '');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle post press - reuse Timeline logic
  const handlePostPress = useCallback((postId: string) => {
    // Prefetch the post before navigation for instant loading
    prefetchPost(postId);
    
    // Navigate to ViewPost with search context so back button returns to search
    router.push(`/home/ViewPost?postId=${postId}&from=search&query=${encodeURIComponent(query)}` as any);
  }, [router, prefetchPost, query]);

  // Menu handlers - copied from Timeline
  const handleCommentPress = useCallback((postId: string) => {
    router.push(`/home/ViewPost?postId=${postId}&from=search&query=${encodeURIComponent(query)}` as any);
  }, [router, query]);

  const handleBookmarkPress = useCallback((postId: string) => {
    // The Post component handles the actual bookmark logic
  }, []);

  const handleBookmarkStatusChange = useCallback((postId: string, isBookmarked: boolean) => {
    // Update the post in the search results array
    setSearchResults(prev => prev.map(post => 
      post.id === postId ? { ...post, isBookmarked } : post
    ));
  }, []);

  const handleReportPress = useCallback((postId: string) => {
    // The Post component handles the actual report logic
  }, []);

  const handleMenuToggle = useCallback((postId: string) => {
    setOpenMenuPostId(prev => prev === postId ? null : postId);
  }, []);

  // Auth headers helper (exact copy from Timeline)
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    try {
      // First try to get token from AuthContext session
      if (session?.access_token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };
      }

      // Fallback to AsyncStorage
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
      }

      if (__DEV__) console.warn('Search: No authentication token available');
      return { 'Content-Type': 'application/json' };
    } catch (error) {
      if (__DEV__) console.error('Search auth error:', error);
      return { 'Content-Type': 'application/json' };
    }
  };

  // Fetch API (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query?.trim()) {
      setSearchResults([]);
      setLoading(false);
      setError(null);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      (async () => {
        try {
          setLoading(true);
          setError(null);
          setHasSearched(true);
          const apiUrl = await NetworkConfig.getBestApiUrl();
          const headers = await getAuthHeaders();

          // Get all posts first, then filter client-side since backend doesn't support search yet
          try {
            const res = await fetch(`${apiUrl}/api/forum/posts/recent`, {
              method: 'GET',
              headers,
            });
            
            if (res.ok) {
              const data = await res.json();
              let allPosts = [];
              
              if (Array.isArray(data)) {
                allPosts = data;
              } else if (Array.isArray(data?.data)) {
                allPosts = data.data;
              }
              
              // Filter posts that contain the search query
              const filteredPosts = allPosts.filter((post: any) => {
                const content = (post.content || post.body || '').toLowerCase();
                const category = (post.category || '').toLowerCase();
                const userName = (post.users?.full_name || post.users?.username || '').toLowerCase();
                const searchTerm = query.toLowerCase();
                
                return content.includes(searchTerm) || 
                       category.includes(searchTerm) || 
                       userName.includes(searchTerm);
              });
              
              setSearchResults(filteredPosts);
            } else {
              const errorText = await res.text();
              setError(`API Error: ${res.status} ${res.statusText}`);
              setSearchResults([]);
            }
          } catch (fetchError) {
            setError('Network error occurred');
            setSearchResults([]);
          }
        } catch (e: any) {
          setError('Failed to fetch search results');
          setSearchResults([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 350); // debounce 350ms

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const EmptyState = (
    <View className="flex-1 justify-center items-center px-8 py-12">
      <Search size={64} color="#D1D5DB" />
      <Text className="text-gray-500 text-lg font-medium mt-4 text-center">
        No discussions found
      </Text>
      <Text className="text-gray-400 text-sm text-center mt-2">
        {query ? `No results for "${query}"` : 'Type a keyword to search'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

      <Header 
        showBackButton={true}
        onBackPress={() => router.push('/home' as any)}
        backgroundColor={Colors.background.primary}
      />

      {/* Content */}
      <View className="flex-1 bg-gray-50">
        {/* Search Results Header */}
        {query && (
          <View className="bg-white border-b border-gray-200 px-4 py-3">
            <Text className="text-lg font-semibold text-gray-900">Search Results</Text>
            <Text className="text-sm text-gray-500 mt-1">Results for "{query}"</Text>
          </View>
        )}

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={Colors.primary.blue} />
            <Text className="text-gray-500 text-base mt-3">Searching discussions…</Text>
          </View>
        ) : error ? (
          <View className="flex-1 justify-center items-center px-8">
            <Text className="text-red-500 text-lg font-medium text-center">Search Error</Text>
            <Text className="text-gray-500 text-sm text-center mt-2">{error}</Text>
          </View>
        ) : searchResults.length === 0 && hasSearched ? (
          EmptyState
        ) : searchResults.length > 0 ? (
          <View style={{ flex: 1, backgroundColor: Colors.background.secondary }}>
            {/* Create a custom filtered timeline using Post components */}
            <FlatList
              data={searchResults}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item, index }: { item: any; index: number }) => {
                const isAnon = !!item?.is_anonymous;
                const userData = item?.users || {};
                
                const postData = {
                  id: item.id,
                  user: isAnon
                    ? { 
                        name: 'Anonymous User', 
                        username: 'anonymous', 
                        avatar: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' // Detective icon for anonymous
                      }
                    : {
                        name: userData?.full_name || userData?.username || 'User',
                        username: userData?.username || 'user',
                        avatar: userData?.photo_url || userData?.profile_photo || undefined,
                        isLawyer: userData?.role === 'verified_lawyer',
                        lawyerBadge: userData?.role === 'verified_lawyer' ? 'Verified' : undefined,
                        account_status: userData?.account_status,
                      },
                  timestamp: item.created_at,
                  created_at: item.created_at,
                  category: item.category || 'General',
                  content: item.content || item.body || '',
                  comments: 0,
                  is_anonymous: isAnon,
                  is_flagged: !!item?.is_flagged,
                };

                return (
                  <Post
                    {...postData}
                    index={index}
                    onCommentPress={() => handleCommentPress(item.id)}
                    onBookmarkPress={() => handleBookmarkPress(item.id)}
                    onReportPress={() => handleReportPress(item.id)}
                    onPostPress={() => handlePostPress(item.id)}
                    isMenuOpen={openMenuPostId === item.id}
                    onMenuToggle={handleMenuToggle}
                    isBookmarked={item.isBookmarked || false}
                    onBookmarkStatusChange={handleBookmarkStatusChange}
                  />
                );
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default SearchScreen;
