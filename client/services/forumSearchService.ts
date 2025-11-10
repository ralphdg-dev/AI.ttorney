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
          
          // The new API returns properly structured data
          return {
            success: data.success || true,
            data: data.data || [],
            total: data.total || 0,
            query: data.query || query.trim(),
            message: data.message || `Found ${data.data?.length || 0} posts`
          };
        } else {
          console.log(`Search API returned ${response.status}, falling back to client-side search`);
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

      // Client-side filtering
      const queryLower = query.trim().toLowerCase();
      let filteredPosts = allPosts.filter((post: any) => {
        const body = (post.body || '').toLowerCase();
        const username = (post.users?.username || '').toLowerCase();
        const fullName = (post.users?.full_name || '').toLowerCase();
        const postCategory = (post.category || '').toLowerCase();

        // Check different search types
        if (query.startsWith('@')) {
          const searchTerm = queryLower.slice(1);
          return username.includes(searchTerm) || fullName.includes(searchTerm);
        } else if (category) {
          return postCategory === category.toLowerCase() && body.includes(queryLower);
        } else {
          return body.includes(queryLower) || 
                 postCategory.includes(queryLower) ||
                 username.includes(queryLower) ||
                 fullName.includes(queryLower);
        }
      });

      // Sort results
      if (sortBy === 'relevance') {
        filteredPosts.sort((a: any, b: any) => {
          const aBody = (a.body || '').toLowerCase();
          const bBody = (b.body || '').toLowerCase();
          const aScore = aBody.indexOf(queryLower);
          const bScore = bBody.indexOf(queryLower);
          
          if (aScore === -1 && bScore === -1) return 0;
          if (aScore === -1) return 1;
          if (bScore === -1) return -1;
          return aScore - bScore;
        });
      } else if (sortBy === 'date') {
        filteredPosts.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }

      // Limit results
      filteredPosts = filteredPosts.slice(0, limit);
      
      return {
        success: true,
        data: filteredPosts,
        total: filteredPosts.length,
        query: query.trim(),
        message: `Found ${filteredPosts.length} posts (client-side search)`
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
        }
      } catch (suggestionsError) {
        console.log('Suggestions API not available, using fallback');
      }

      // Fallback suggestions
      const fallbackSuggestions = [];
      const queryLower = query.toLowerCase();
      
      // Category suggestions
      const categories = ["Family Law", "Labor Law", "Civil Law", "Consumer Law", "Criminal Law", "Others"];
      const categoryMatches = categories.filter(cat => cat.toLowerCase().includes(queryLower));
      fallbackSuggestions.push(...categoryMatches);
      
      // Also suggest short category names
      const shortCategories = ["Family", "Labor", "Civil", "Consumer", "Criminal", "Other"];
      const shortMatches = shortCategories.filter(cat => cat.toLowerCase().includes(queryLower));
      fallbackSuggestions.push(...shortMatches);
      
      // Common legal terms
      const legalTerms = [
        "contract", "breach of contract", "employment law", "divorce", "custody",
        "inheritance", "property law", "criminal defense", "small claims",
        "illegal dismissal", "labor dispute", "family court", "civil case"
      ];
      const termMatches = legalTerms.filter(term => term.includes(queryLower));
      fallbackSuggestions.push(...termMatches);
      
      return fallbackSuggestions.slice(0, 10);
      
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
