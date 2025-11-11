import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkConfig } from '../utils/networkConfig';

export interface ForumSearchResult {
  id: string;
  body: string;
  category: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  users?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface SearchResponse {
  success: boolean;
  data: ForumSearchResult[];
  total: number;
  query: string;
  message: string;
}

export class ForumSearchService {
  /**
   * Get authentication headers for API requests
   */
  static async getAuthHeaders(session?: any): Promise<HeadersInit> {
    try {
      let token = null;

      // Try to get token from session first
      if (session?.access_token) {
        token = session.access_token;
      } else {
        // Fallback to AsyncStorage
        token = await AsyncStorage.getItem('access_token');
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return headers;
    } catch (error) {
      console.error('ForumSearchService: Error getting auth headers:', error);
      return {
        'Content-Type': 'application/json',
      };
    }
  }

  /**
   * Search forum posts with improved filtering
   */
  static async searchPosts(
    query: string,
    options: {
      category?: string;
      sortBy?: 'relevance' | 'date';
      limit?: number;
      session?: any;
      cachedPosts?: any[];
    } = {}
  ): Promise<SearchResponse> {
    try {
      const { category, sortBy = 'relevance', limit = 50, session, cachedPosts } = options;
      
      if (!query.trim()) {
        return {
          success: false,
          data: [],
          total: 0,
          query: '',
          message: 'Search query cannot be empty'
        };
      }

      if (__DEV__) {
        console.log('🔍 ForumSearchService: Searching for:', query);
        console.log('🔍 ForumSearchService: Search options:', options);
      }

      const headers = await this.getAuthHeaders(session);
      const apiUrl = await NetworkConfig.getBestApiUrl();
      
      // Try server-side search first
      try {
        const searchParams = new URLSearchParams({
          q: query.trim(),
          sort: sortBy,
          limit: limit.toString(),
          ...(category && { category })
        });

        const response = await fetch(`${apiUrl}/api/forum/search?${searchParams}`, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          if (__DEV__) {
            console.log('✅ ForumSearchService: Server search successful, found:', (data.data || data.posts || []).length, 'posts');
            console.log('📊 ForumSearchService: Server response:', data);
          }
          return {
            success: true,
            data: data.data || data.posts || [],
            total: data.total || 0,
            query: query.trim(),
            message: data.message || `Found ${(data.data || data.posts || []).length} posts`
          };
        } else {
          const errorText = await response.text();
          if (__DEV__) {
            console.log(`❌ ForumSearchService: Server search failed with ${response.status}:`, errorText);
          }
          if (response.status === 401) {
            console.log('ForumSearchService: Authentication required for server search, falling back to client-side');
          } else {
            console.log(`ForumSearchService: Server search returned ${response.status}, falling back to client-side`);
          }
        }
      } catch (serverError) {
        console.log('ForumSearchService: Server search failed, falling back to client-side:', serverError);
      }

      // Client-side search fallback
      if (__DEV__) {
        console.log('🔄 ForumSearchService: Using client-side search');
      }

      // Get cached posts for client-side search
      const availablePosts = await this.getCachedPosts(cachedPosts);
      if (__DEV__) {
        console.log('📦 ForumSearchService: Available cached posts:', availablePosts?.length || 0);
        if (availablePosts && availablePosts.length > 0) {
          console.log('📦 ForumSearchService: Sample cached post:', availablePosts[0]);
        }
      }
      if (!availablePosts || availablePosts.length === 0) {
        return {
          success: true,
          data: [],
          total: 0,
          query: query.trim(),
          message: 'No cached posts available for search'
        };
      }

      // Client-side filtering with improved matching
      const queryLower = query.toLowerCase();
      let filteredPosts = availablePosts.filter((post: any) => {
        // Handle both API format (body, users.username) and cached format (content, user.username)
        const body = (post.body || post.content || '').toLowerCase();
        const username = (post.users?.username || post.user?.username || '').toLowerCase();
        const fullName = (post.users?.full_name || post.user?.name || '').toLowerCase();
        const postCategory = (post.category || '').toLowerCase();

        if (__DEV__) {
          console.log('🔍 Checking post:', {
            body: body.substring(0, 50) + '...',
            username,
            fullName,
            category: postCategory,
            categoryRaw: post.category,
            query: queryLower
          });
        }

        // Check different search types with improved matching
        if (query.startsWith('@')) {
          // User search: @username
          const searchTerm = queryLower.slice(1);
          const userMatch = username.includes(searchTerm) || fullName.includes(searchTerm);
          if (__DEV__ && userMatch) {
            console.log('✅ User match found:', username, fullName);
          }
          return userMatch;
        } else if (query.startsWith('#')) {
          // Category search: #category - exact matching only
          const searchTerm = queryLower.slice(1);
          
          // Map search terms to exact category names (match server format)
          const categoryMapping: { [key: string]: string } = {
            'family': 'Family Law',
            'labor': 'Labor Law', 
            'labour': 'Labor Law',
            'civil': 'Civil Law',
            'consumer': 'Consumer Law',
            'criminal': 'Criminal Law',
            'other': 'Others',
            'others': 'Others'
          };
          
          const expectedCategory = categoryMapping[searchTerm] || searchTerm;
          const categoryMatch = postCategory.toLowerCase() === expectedCategory.toLowerCase();
          
          if (__DEV__) {
            console.log('🔍 Category search:', {
              searchTerm,
              expectedCategory,
              postCategory,
              match: categoryMatch
            });
          }
          
          return categoryMatch;
        } else if (category) {
          // Specific category filter with content search
          const categoryMatch = postCategory === category.toLowerCase();
          const contentMatch = body.includes(queryLower);
          return categoryMatch && contentMatch;
        } else {
          // General search - check if it's a category search first, then content/username
          const categoryMapping: { [key: string]: string } = {
            'family': 'Family Law',
            'labor': 'Labor Law', 
            'labour': 'Labor Law',
            'civil': 'Civil Law',
            'consumer': 'Consumer Law',
            'criminal': 'Criminal Law',
            'other': 'Others',
            'others': 'Others'
          };
          
          // Check if query is a category name (exact match)
          const expectedCategory = categoryMapping[queryLower] || queryLower;
          const isCategorySearch = Object.keys(categoryMapping).includes(queryLower) || 
                                  queryLower.endsWith(' law') || 
                                  queryLower === 'others';
          
          if (isCategorySearch) {
            // Pure category search - only match posts from this category
            const categoryMatch = postCategory.toLowerCase() === expectedCategory.toLowerCase();
            if (__DEV__) {
              console.log('🔍 Category search debug:', {
                query: queryLower,
                expectedCategory,
                postCategory: postCategory.toLowerCase(),
                match: categoryMatch
              });
            }
            return categoryMatch;
          } else {
            // Regular content/user search
            const contentMatch = body.includes(queryLower);
            const userMatch = username.includes(queryLower) || fullName.includes(queryLower);
            const categoryMatch = postCategory.includes(queryLower);
          
            const hasMatch = contentMatch || userMatch || categoryMatch;
            if (__DEV__ && hasMatch) {
              if (contentMatch) console.log('✅ Content match found in:', body.substring(0, 100) + '...');
              if (userMatch) console.log('✅ User match found:', username, fullName);
              if (categoryMatch) console.log('✅ Category match found:', postCategory);
            }
            return hasMatch;
          }
        }
      });

      // Sort results by relevance
      if (sortBy === 'relevance') {
        filteredPosts.sort((a: any, b: any) => {
          const aBody = (a.body || a.content || '').toLowerCase();
          const bBody = (b.body || b.content || '').toLowerCase();
          const aUsername = (a.users?.username || a.user?.username || '').toLowerCase();
          const bUsername = (b.users?.username || b.user?.username || '').toLowerCase();
          const aFullName = (a.users?.full_name || a.user?.name || '').toLowerCase();
          const bFullName = (b.users?.full_name || b.user?.name || '').toLowerCase();
          
          // Priority scoring: user matches get higher priority than content matches
          const getUserScore = (username: string, fullName: string) => {
            if (username.includes(queryLower) || fullName.includes(queryLower)) {
              return 1000; // High priority for user matches
            }
            return 0;
          };
          
          const getContentScore = (body: string) => {
            const index = body.indexOf(queryLower);
            if (index === -1) return 0;
            return 100 - index; // Earlier matches get higher scores
          };
          
          const aUserScore = getUserScore(aUsername, aFullName);
          const bUserScore = getUserScore(bUsername, bFullName);
          const aContentScore = getContentScore(aBody);
          const bContentScore = getContentScore(bBody);
          
          const aTotalScore = aUserScore + aContentScore;
          const bTotalScore = bUserScore + bContentScore;
          
          return bTotalScore - aTotalScore; // Higher scores first
        });
      } else if (sortBy === 'date') {
        filteredPosts.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }

      // Limit results
      filteredPosts = filteredPosts.slice(0, limit);
      
      if (__DEV__) {
        console.log('✅ ForumSearchService: Client-side search completed, found:', filteredPosts.length, 'posts');
      }
      
      // Provide helpful message based on results
      let message = `Found ${filteredPosts.length} posts`;
      if (filteredPosts.length === 0) {
        if (query.startsWith('@')) {
          message = `No posts found from user "${query}". Try searching without @ or check the username.`;
        } else if (query.startsWith('#')) {
          message = `No posts found in category "${query}". Try: #family, #labor, #civil, #consumer, #criminal`;
        } else {
          message = `No posts found containing "${query}". Try different keywords or search for users with @username`;
        }
      } else {
        message += ` containing "${query}"`;
      }
      
      // Convert cached posts back to API format for Timeline compatibility
      const apiFormatPosts = filteredPosts.map((post: any) => ({
        id: post.id,
        body: post.body || post.content,
        category: post.category,
        created_at: post.created_at,
        updated_at: post.updated_at,
        user_id: post.user_id,
        is_anonymous: post.is_anonymous,
        is_flagged: post.is_flagged,
        is_bookmarked: post.isBookmarked,
        users: post.users || (post.user ? {
          id: post.user_id,
          username: post.user.username,
          full_name: post.user.name,
          role: post.user.isLawyer ? 'verified_lawyer' : 'user'
        } : null)
      }));
      
      return {
        success: true,
        data: apiFormatPosts,
        total: apiFormatPosts.length,
        query: query.trim(),
        message: message
      };
      
    } catch (error) {
      console.error('ForumSearchService: Search error:', error);
      return {
        success: false,
        data: [],
        total: 0,
        query: query.trim(),
        message: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  /**
   * Get cached posts for client-side search
   * Note: This method should be called with posts from ForumCache context
   */
  static async getCachedPosts(cachedPosts?: any[]): Promise<any[]> {
    try {
      // If posts are provided directly (from ForumCache), use them
      if (cachedPosts && cachedPosts.length > 0) {
        return cachedPosts;
      }

      // Fallback to AsyncStorage (legacy support)
      const cachedData = await AsyncStorage.getItem('forum_posts_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        return parsed.posts || [];
      }
      return [];
    } catch (error) {
      console.error('ForumSearchService: Error getting cached posts:', error);
      return [];
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  static async getSearchSuggestions(
    query: string,
    session?: any
  ): Promise<string[]> {
    try {
      if (!query.trim() || query.length < 2) {
        return [];
      }

      const headers = await this.getAuthHeaders(session);
      const apiUrl = await NetworkConfig.getBestApiUrl();
      
      // Try the new dedicated suggestions API
      try {
        const response = await fetch(`${apiUrl}/api/forum/search/suggestions?q=${encodeURIComponent(query.trim())}`, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          return data.suggestions || [];
        } else if (response.status === 401) {
          console.log('Suggestions API requires authentication, using fallback');
        } else {
          console.log(`Suggestions API returned ${response.status}, using fallback`);
        }
      } catch (suggestionsError) {
        console.log('Suggestions API not available, using fallback:', suggestionsError);
      }

      // Fallback suggestions with search tips
      const fallbackSuggestions = [];
      const queryLower = query.toLowerCase();
      
      // Add search tips based on query
      if (query.startsWith('@')) {
        // For @ searches, don't show placeholder suggestions - let API handle it
        return [];
      } else if (query.startsWith('#')) {
        // For # searches, show category suggestions
        fallbackSuggestions.push('#family', '#labor', '#civil', '#consumer', '#criminal');
      } else {
        // For regular searches, show category suggestions and legal terms
        const categories = ["family law", "labor law", "civil law", "consumer law", "criminal law"];
        const categoryMatches = categories.filter(cat => cat.includes(queryLower));
        fallbackSuggestions.push(...categoryMatches);
        
        // Common legal terms
        const legalTerms = [
          "contract", "employment", "divorce", "custody", "inheritance", 
          "property", "criminal", "dismissal", "dispute", "court"
        ];
        const termMatches = legalTerms.filter(term => term.includes(queryLower));
        fallbackSuggestions.push(...termMatches);
      }
      
      return fallbackSuggestions.slice(0, 8);
      
    } catch (error) {
      console.error('ForumSearchService: Suggestions error:', error);
      return [];
    }
  }

  /**
   * Debounced search function
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
}

export default ForumSearchService;
