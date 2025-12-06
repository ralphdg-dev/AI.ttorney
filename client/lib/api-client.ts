import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkConfig } from '../utils/networkConfig';

interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  locked_out?: boolean;
  retry_after?: number;
  attempts_remaining?: number;
  passwordResetToken?: string;
  success?: boolean;
}

class ApiClient {
  private retryCount = 0;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  private async getBaseUrl(): Promise<string> {
    // Use unified network configuration for both dev and prod
    // NetworkConfig will choose the correct URL based on environment
    return await NetworkConfig.getBestApiUrl();
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryAttempt: number = 0
  ): Promise<ApiResponse<T>> {
    try {
      const baseUrl = await this.getBaseUrl();
      const headers = await this.getAuthHeaders();
      const fullUrl = `${baseUrl}${endpoint}`;
      
      if (retryAttempt === 0) {
        console.log(`🌐 API Request: ${options.method || 'GET'} ${fullUrl}`);
        console.log(`🔗 Base URL: ${baseUrl}`);
      } else {
        console.log(`🔄 Retry attempt ${retryAttempt}/${this.maxRetries}: ${options.method || 'GET'} ${fullUrl}`);
      }

      const fetchPromise = fetch(fullUrl, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const response = await fetchPromise;

      let data: any = null;
      let text: string | null = null;
      try {
        // First try to get the response as text
        text = await response.text();
        
        // Then try to parse it as JSON if it's not empty
        if (text && text.trim()) {
          try {
            data = JSON.parse(text);
          } catch (jsonError) {
            console.log('🔍 DEBUG: Response text:', text);
            console.log('🔍 DEBUG: JSON parse error:', jsonError);
            // Keep text as is if JSON parsing fails
          }
        } else {
          console.log('🔍 DEBUG: Response text: null');
        }
      } catch (responseError) {
        console.log('🔍 DEBUG: Error reading response:', responseError);
      }

      if (!response.ok) {
        const errorMessage = (data && (data.detail || data.message)) || text || `Request failed (${response.status})`;
        
        // COMPREHENSIVE ERROR LOGGING
        console.error('❌❌❌ CLIENT: API Error Response');
        console.error('❌ CLIENT: Response status:', response.status);
        console.error('❌ CLIENT: Response statusText:', response.statusText);
        console.error('❌ CLIENT: Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
        console.error('❌ CLIENT: Response data:', JSON.stringify(data, null, 2));
        console.error('❌ CLIENT: Response text:', text);
        console.error('❌ CLIENT: Error message:', errorMessage);
        console.error('❌ CLIENT: Data type:', typeof data);
        console.error('❌ CLIENT: Data keys:', data ? Object.keys(data) : 'null');
        
        if (data && data.detail) {
          console.error('❌ CLIENT: Error detail:', data.detail);
          console.error('❌ CLIENT: Error detail type:', typeof data.detail);
          
          // Check if it's a validation error
          if (Array.isArray(data.detail)) {
            console.error('❌ CLIENT: VALIDATION ERROR ARRAY:', JSON.stringify(data.detail, null, 2));
            data.detail.forEach((err: any, index: number) => {
              console.error(`❌ CLIENT: Validation error ${index}:`, JSON.stringify(err, null, 2));
            });
          }
        }
        
        const errorResponse: ApiResponse = {
          success: false,
          error: errorMessage,
        };

        // Surface OTP-specific fields when backend returns them
        if (data && typeof data === 'object') {
          if (Object.prototype.hasOwnProperty.call(data, 'locked_out')) {
            (errorResponse as any).locked_out = data.locked_out;
          }
          if (Object.prototype.hasOwnProperty.call(data, 'retry_after')) {
            (errorResponse as any).retry_after = data.retry_after;
          }
          if (Object.prototype.hasOwnProperty.call(data, 'attempts_remaining')) {
            (errorResponse as any).attempts_remaining = data.attempts_remaining;
          }
        }

        return errorResponse;
      }

      const successResponse: ApiResponse<T> = { data, success: true };
      if (data && typeof data === 'object' && typeof (data as any).message === 'string') {
        successResponse.message = (data as any).message;
      }
      if (__DEV__) {
        console.log('🔍 DEBUG: API Success Response');
        console.log('🔍 DEBUG: Response data:', data);
        console.log('🔍 DEBUG: Success response:', successResponse);
      }
      return successResponse;
    } catch (error) {
      const isNetworkError = error instanceof Error && (
        error.message.includes('Network request failed') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('timeout') ||
        error.name === 'TypeError'
      );

      // Retry logic for network errors
      // IMPORTANT: Never retry OTP requests as each retry generates a new OTP
      if (isNetworkError && retryAttempt < this.maxRetries && !endpoint.includes('/auth/send-otp')) {
        console.warn(`⚠️ Network error on attempt ${retryAttempt + 1}, retrying in ${this.retryDelay}ms...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryAttempt + 1)));
        
        // Clear network cache and try again
        NetworkConfig.clearCache();
        return this.request<T>(endpoint, options, retryAttempt + 1);
      }

      console.error('🚨 API request failed:', error);
      console.error('🚨 Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        retryAttempt,
        endpoint,
      });
      
      let errorMessage = 'Network request failed';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = retryAttempt > 0 
            ? `Request timed out after ${retryAttempt + 1} attempts. Please check your internet connection.`
            : 'Request timed out. Please check your internet connection.';
        } else if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
          errorMessage = retryAttempt > 0
            ? `Cannot connect to server after ${retryAttempt + 1} attempts. Please check if the server is running and your network connection.`
            : 'Cannot connect to server. Please check if the server is running and your network connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Add network diagnostics for debugging
      if (__DEV__ && isNetworkError) {
        console.log('🔍 Network Diagnostics:', NetworkConfig.getNetworkInfo());
      }
      
      return { error: errorMessage, success: false };
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

  // Forgot Password endpoints
  async sendPasswordResetOTP(email: string): Promise<ApiResponse> {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyResetOTP(email: string, otpCode: string): Promise<ApiResponse> {
    return this.request('/api/auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode }),
    });
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<ApiResponse> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ passwordResetToken: token, newPassword }),
    });
  }

  async checkEmailExists(email: string): Promise<ApiResponse> {
    return this.request('/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ value: email }),
    });
  }

  async checkEmailExistsForPasswordReset(email: string): Promise<ApiResponse> {
    return this.request('/auth/check-email-exists', {
      method: 'POST',
      body: JSON.stringify({ email }),
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
  }

  // OTP endpoints
  async sendOTP(data: {
    email: string;
    otp_type: 'email_verification' | 'password_reset';
    user_name?: string;
  }): Promise<ApiResponse> {
    console.log('🚀🚀🚀 CLIENT: sendOTP called with:', JSON.stringify(data, null, 2));
    
    const payload: any = {
      email: data.email,
      otp_type: data.otp_type,
    };
    if (data.user_name) {
      payload.user_name = data.user_name;
    }
    
    console.log('📦 CLIENT: Request payload:', JSON.stringify(payload, null, 2));
    console.log('📦 CLIENT: Payload keys:', Object.keys(payload));
    console.log('📦 CLIENT: Payload values:', Object.values(payload));
    console.log('📦 CLIENT: email type:', typeof payload.email);
    console.log('📦 CLIENT: otp_type type:', typeof payload.otp_type);
    console.log('📦 CLIENT: user_name type:', typeof payload.user_name);
    console.log('📦 CLIENT: user_name value:', payload.user_name);
    
    try {
      const baseUrl = await this.getBaseUrl();
      console.log('🔗 CLIENT: Base URL:', baseUrl);
      console.log('🔗 CLIENT: Full endpoint: /auth/send-otp');
      console.log('🔗 CLIENT: Full URL:', baseUrl + '/auth/send-otp');
      
      console.log('📤 CLIENT: Sending request...');
      const response = await this.request('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      console.log('📥 CLIENT: Response received:', JSON.stringify(response, null, 2));
      console.log('📥 CLIENT: Response type:', typeof response);
      console.log('📥 CLIENT: Response keys:', Object.keys(response));
      console.log('📥 CLIENT: Response.success:', response.success);
      console.log('📥 CLIENT: Response.error:', response.error);
      console.log('📥 CLIENT: Response.message:', response.message);
      
      // If the email was sent but we got an error response, log it
      if (response.error) {
        console.error('❌ CLIENT: API returned error:', response.error);
        console.error('❌ CLIENT: Full error response:', JSON.stringify(response, null, 2));
      }
      
      if (response.success) {
        console.log('✅ CLIENT: OTP request successful!');
      }
      
      return response;
    } catch (error) {
      console.error('🚨🚨🚨 CLIENT: Send OTP exception:', error);
      console.error('🚨 CLIENT: Error type:', typeof error);
      console.error('🚨 CLIENT: Error instanceof Error:', error instanceof Error);
      if (error instanceof Error) {
        console.error('🚨 CLIENT: Error message:', error.message);
        console.error('🚨 CLIENT: Error stack:', error.stack);
      }
      // Return a structured error response
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send OTP'
      };
    }
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

  // Network diagnostics and testing
  async testNetworkConnection(): Promise<ApiResponse> {
    try {
      console.log('🔍 Starting network diagnostics...');
      const networkTest = await NetworkConfig.testConnection();
      
      if (networkTest.success) {
        console.log('✅ Network test passed');
        return {
          success: true,
          message: 'Network connection is working',
          data: networkTest
        };
      } else {
        console.log('❌ Network test failed:', networkTest.error);
        return {
          success: false,
          error: `Network test failed: ${networkTest.error}`,
          data: networkTest
        };
      }
    } catch (error) {
      console.error('🚨 Network diagnostics failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network diagnostics failed'
      };
    }
  }

  // Force refresh network connection
  async refreshNetworkConnection(): Promise<string> {
    console.log('🔄 Refreshing network connection...');
    return await NetworkConfig.refreshConnection();
  }

  // Forum endpoints
  async createForumPost(data: {
    body: string;
    category?: string | null;
    is_anonymous?: boolean;
  }): Promise<ApiResponse> {
    return this.request('/api/forum/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRecentForumPosts(page: number = 1, limit: number = 15): Promise<ApiResponse> {
    return this.request(`/api/forum/posts/recent?page=${page}&limit=${limit}`);
  }

  async getForumPostById(postId: string): Promise<ApiResponse> {
    return this.request(`/api/forum/posts/${postId}`);
  }

  async getForumReplies(postId: string): Promise<ApiResponse> {
    return this.request(`/api/forum/posts/${postId}/replies`);
  }

  async createForumReply(postId: string, data: { body: string; is_anonymous?: boolean }): Promise<ApiResponse> {
    return this.request(`/api/forum/posts/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;