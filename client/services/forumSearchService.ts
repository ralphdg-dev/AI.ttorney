import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkConfig } from '../utils/networkConfig';

export interface ForumSearchResult {
  id: string;
  body: string;
  category: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  is_anonymous: boolean;
  is_flagged: boolean;
  user?: {
    id: string;
    username: string;
    full_name: string;
    role: string;
    is_verified: boolean;
  };
  reply_count: number;
  relevance_score?: number;
}

export interface ForumSearchResponse {
  success: boolean;
  data: ForumSearchResult[];
  total: number;
  query: string;
  message?: string;
}

class ForumSearchService {
  private static async getAuthHeaders(session?: any): Promise<HeadersInit> {
    try {
      // First try AuthContext session token
      if (session?.access_token) {
        if (__DEV__) {
          console.log('🔐 ForumSearchService: Using session token');
        }
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };
      }
      
      // Fallback to AsyncStorage
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        if (__DEV__) {
          console.log('🔐 ForumSearchService: Using AsyncStorage token');
        }
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
      }
      
      if (__DEV__) {
        console.log('⚠️ ForumSearchService: No authentication token available');
      }
      return { 'Content-Type': 'application/json' };
    } catch (error) {
      console.error('ForumSearchService: Error getting auth headers:', error);
      return { 'Content-Type': 'application/json' };
    }
  }

  /**
   * Search forum posts by query - Fallback to recent posts with client-side filtering
   */
  static async searchPosts(
    query: string, 
    options: {
      limit?: number;
      category?: string;
      sortBy?: 'relevance' | 'date' | 'replies';
      session?: any;
    } = {}
  ): Promise<ForumSearchResponse> {
    try {
      const { limit = 20, category, sortBy = 'relevance', session } = options;
      
      if (__DEV__) {
        console.log('🔍 ForumSearchService: Starting search for:', query.trim());
      }
      
      if (!query.trim()) {
        return {
          success: true,
          data: [],
          total: 0,
          query: '',
          message: 'Please enter a search query'
        };
      }

      const headers = await this.getAuthHeaders(session);
      const apiUrl = await NetworkConfig.getBestApiUrl();
      
      // Try the dedicated search API first
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          limit: limit.toString(),
          sort: sortBy,
        });
        
        if (category) {
          params.append('category', category);
        }

        const response = await fetch(`${apiUrl}/api/forum/search?${params}`, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          
          if (__DEV__) {
            console.log('✅ ForumSearchService: API search successful, found:', data.data?.length || 0, 'posts');
          }
          
          // The new API returns properly structured data
          return {
            success: data.success || true,
            data: data.data || [],
            total: data.total || 0,
            query: data.query || query.trim(),
            message: data.message || `Found ${data.data?.length || 0} posts`
          };
        } else {
          if (__DEV__) {
            console.log(`⚠️ ForumSearchService: Search API returned ${response.status}, falling back to client-side search`);
          }
        }
      } catch (searchError) {
        console.log('Search API not available, falling back to client-side search:', searchError);
      }

      // Fallback: Get recent posts and filter client-side
      const recentResponse = await fetch(`${apiUrl}/api/forum/posts/recent?limit=100`, {
        method: 'GET',
        headers,
      });

      if (!recentResponse.ok) {
        throw new Error(`Failed to fetch posts: ${recentResponse.status}`);
      }

      const recentData = await recentResponse.json();
      const allPosts = recentData.data || [];

      // Client-side filtering with strict matching
      const queryLower = query.trim().toLowerCase();
      let filteredPosts = allPosts.filter((post: any) => {
        const body = (post.body || '').toLowerCase();
        const username = (post.users?.username || '').toLowerCase();
        const fullName = (post.users?.full_name || '').toLowerCase();
        const postCategory = (post.category || '').toLowerCase();

        if (__DEV__) {
          console.log('🔍 Checking post:', {
            body: body.substring(0, 50) + '...',
            username,
            fullName,
            category: postCategory,
            query: queryLower
          });
        }

        // Check different search types with strict matching
        if (query.startsWith('@')) {
          // User search: @username
          const searchTerm = queryLower.slice(1);
          const userMatch = username.includes(searchTerm) || fullName.includes(searchTerm);
          if (__DEV__ && userMatch) {
            console.log('✅ User match found:', username, fullName);
          }
          return userMatch;
        } else if (query.startsWith('#')) {
          // Category search: #category
          const searchTerm = queryLower.slice(1);
          const categoryMatch = postCategory.includes(searchTerm);
          if (__DEV__ && categoryMatch) {
            console.log('✅ Category match found:', postCategory);
          }
          return categoryMatch;
        } else if (category) {
          // Specific category filter with content search
          const categoryMatch = postCategory === category.toLowerCase();
          const contentMatch = body.includes(queryLower);
          return categoryMatch && contentMatch;
        } else {
          // General search - check content, username, and category
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
      });

      // Sort results by relevance
      if (sortBy === 'relevance') {
        filteredPosts.sort((a: any, b: any) => {
          const aBody = (a.body || '').toLowerCase();
          const bBody = (b.body || '').toLowerCase();
          const aUsername = (a.users?.username || '').toLowerCase();
          const bUsername = (b.users?.username || '').toLowerCase();
          const aFullName = (a.users?.full_name || '').toLowerCase();
          const bFullName = (b.users?.full_name || '').toLowerCase();
          
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
      
      return {
        success: true,
        data: filteredPosts,
        total: filteredPosts.length,
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
   * Get popular search terms
   */
  static async getPopularSearches(session?: any): Promise<string[]> {
    try {
      const headers = await this.getAuthHeaders(session);
      const apiUrl = await NetworkConfig.getBestApiUrl();
      
      const response = await fetch(`${apiUrl}/api/forum/search/popular`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.popular || [];
    } catch (error) {
      console.error('ForumSearchService: Popular searches error:', error);
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
export { ForumSearchService };
