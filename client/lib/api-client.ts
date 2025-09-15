import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000' 
  : 'https://your-production-api.com';

interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  locked_out?: boolean;
  retry_after?: number;
  attempts_remaining?: number;
  success?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Request failed');
      }

      return { data, success: true };
    } catch (error) {
      console.error('API request failed:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  }

  // Auth endpoints
  async signUp(userData: {
    email: string;
    password: string;
    username: string;
    first_name: string;
    last_name: string;
    birthdate: string;
    role?: string;
  }): Promise<ApiResponse> {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async signIn(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse> {
    return this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signOut(): Promise<ApiResponse> {
    return this.request('/auth/signout', {
      method: 'POST',
    });
  }

  async getMe(): Promise<ApiResponse> {
    return this.request('/auth/me');
  }

  async resetPassword(data: { email: string }): Promise<ApiResponse> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async checkEmailExists(email: string): Promise<ApiResponse> {
    return this.request('/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ value: email }),
    });
  }

  async checkUsernameExists(username: string): Promise<ApiResponse> {
    return this.request('/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ value: username }),
    });
  }

  async verifyToken(): Promise<ApiResponse> {
    return this.request('/auth/verify-token');
  }

  // Legal Articles endpoints
  async getLegalArticles(params?: {
    category?: string;
    domain?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.domain) searchParams.append('domain', params.domain);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    
    const queryString = searchParams.toString();
    return this.request(`/api/legal/articles${queryString ? `?${queryString}` : ''}`);
  }

  async searchLegalArticles(params: {
    q: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('q', params.q);
    if (params.category) searchParams.append('category', params.category);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());
    
    const queryString = searchParams.toString();
    return this.request(`/api/legal/search?${queryString}`);
  }

  async getLegalArticle(id: string): Promise<ApiResponse> {
    return this.request(`/api/legal/articles/${id}`);
  }

  async getLegalArticleCategories(): Promise<ApiResponse> {
    return this.request('/api/legal/categories');
  // OTP endpoints
  async sendOTP(data: {
    email: string;
    otp_type: 'email_verification' | 'password_reset';
  }): Promise<ApiResponse> {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyOTP(data: {
    email: string;
    otp_code: string;
    otp_type: 'email_verification' | 'password_reset';
  }): Promise<ApiResponse> {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async selectRole(data: {
    email: string;
    selected_role: string;
  }): Promise<ApiResponse> {
    return this.request('/auth/select-role', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }
}

export const apiClient = new ApiClient();
export default apiClient;
