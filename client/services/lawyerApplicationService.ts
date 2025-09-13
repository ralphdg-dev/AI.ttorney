import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface FileUploadResponse {
  success: boolean;
  file_path?: string;
  message: string;
  error?: string;
}

interface LawyerApplicationStatus {
  has_application: boolean;
  application?: {
    id: string;
    user_id: string;
    full_name?: string;
    roll_signing_date?: string;
    ibp_id?: string;
    roll_number?: string;
    selfie?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'resubmission';
    reviewed_by?: string;
    reviewed_at?: string;
    admin_notes?: string;
    matched_roll_id?: number;
    matched_at?: string;
    submitted_at: string;
    updated_at: string;
  };
  can_apply: boolean;
  reject_count: number;
  is_blocked: boolean;
  last_rejected_at?: string;
}

interface SubmitApplicationResponse {
  success: boolean;
  message: string;
  application_id?: string;
  data?: {
    redirect_path: string;
  };
}

class LawyerApplicationService {
  private statusCache: { data: LawyerApplicationStatus | null; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 300000; // 5 minutes
  private readonly REQUEST_TIMEOUT = 5000; // 5 seconds
  private pendingRequests = new Map<string, Promise<any>>();

  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('access_token');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAuthToken();
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async uploadIbpIdCard(file: { uri: string; name: string; type?: string } | File): Promise<FileUploadResponse> {
    try {
      // Validate file type - no GIFs allowed
      const fileType = file instanceof File ? file.type : file.type;
      const fileName = file instanceof File ? file.name : file.name;
      
      if (fileType === 'image/gif' || fileName?.toLowerCase().endsWith('.gif')) {
        return {
          success: false,
          message: 'Upload failed',
          error: 'GIF files are not allowed. Please upload a JPEG or PNG image.',
        };
      }
      
      // Only allow JPEG and PNG
      if (fileType && !['image/jpeg', 'image/jpg', 'image/png'].includes(fileType)) {
        return {
          success: false,
          message: 'Upload failed',
          error: 'Only JPEG and PNG images are allowed.',
        };
      }
      
      const formData = new FormData();
      
      // Handle File object directly (web platform)
      if (file instanceof File) {
        formData.append('file', file);
      } else {
        // Handle URI-based file (native platforms)
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.type || 'image/jpeg',
        } as any);
      }

      let response;
      let data;
      
      try {
        response = await this.makeRequest('/api/lawyer-applications/upload/ibp-id', {
          method: 'POST',
          body: formData,
        });
      } catch (requestError) {
        throw new Error(`Network request failed: ${requestError instanceof Error ? requestError.message : 'Unknown network error'}`);
      }
      
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error(`Invalid response format: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        
        if (data?.detail) {
          if (Array.isArray(data.detail)) {
            // Handle FastAPI validation errors (array of error objects)
            errorMsg = data.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join(', ');
          } else {
            errorMsg = data.detail;
          }
        } else if (data?.message) {
          errorMsg = data.message;
        }
        
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = `Unexpected error: ${JSON.stringify(error)}`;
      }
      
      return {
        success: false,
        message: 'Upload failed',
        error: errorMessage,
      };
    }
  }

  async uploadSelfie(file: { uri: string; name: string; type?: string } | File): Promise<FileUploadResponse> {
    try {
      // Validate file type - no GIFs allowed
      const fileType = file instanceof File ? file.type : file.type;
      const fileName = file instanceof File ? file.name : file.name;
      
      if (fileType === 'image/gif' || fileName?.toLowerCase().endsWith('.gif')) {
        return {
          success: false,
          message: 'Upload failed',
          error: 'GIF files are not allowed. Please upload a JPEG or PNG image.',
        };
      }
      
      // Only allow JPEG and PNG
      if (fileType && !['image/jpeg', 'image/jpg', 'image/png'].includes(fileType)) {
        return {
          success: false,
          message: 'Upload failed',
          error: 'Only JPEG and PNG images are allowed.',
        };
      }
      
      const formData = new FormData();
      
      // Handle File object directly (web platform)
      if (file instanceof File) {
        formData.append('file', file);
      } else {
        // Handle URI-based file (native platforms)
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.type || 'image/jpeg',
        } as any);
      }

      let response;
      let data;
      
      try {
        response = await this.makeRequest('/api/lawyer-applications/upload/selfie', {
          method: 'POST',
          body: formData,
        });
      } catch (requestError) {
        throw new Error(`Network request failed: ${requestError instanceof Error ? requestError.message : 'Unknown network error'}`);
      }
      
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error(`Invalid response format: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        
        if (data?.detail) {
          if (Array.isArray(data.detail)) {
            // Handle FastAPI validation errors (array of error objects)
            errorMsg = data.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join(', ');
          } else {
            errorMsg = data.detail;
          }
        } else if (data?.message) {
          errorMsg = data.message;
        }
        
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Upload failed',
        error: error instanceof Error ? error.message : JSON.stringify(error),
      };
    }
  }

  async submitApplication(applicationData: {
    full_name: string;
    roll_signing_date: string;
    ibp_id: string;
    roll_number: string;
    selfie: string;
  }): Promise<SubmitApplicationResponse> {
    try {
      // Convert date string to YYYY-MM-DD format for backend
      const dateObj = new Date(applicationData.roll_signing_date);
      const formattedDate = dateObj.toISOString().split('T')[0];
      
      const formData = new FormData();
      formData.append('full_name', applicationData.full_name);
      formData.append('roll_signing_date', formattedDate);
      formData.append('ibp_id', applicationData.ibp_id || '');
      formData.append('roll_number', applicationData.roll_number);
      formData.append('selfie', applicationData.selfie || '');

      const response = await this.makeRequest('/api/lawyer-applications/submit', {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error(`Server error ${response.status}: ${response.statusText}`);
      }
      
      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      
        if (data?.detail) {
          if (Array.isArray(data.detail)) {
            // Handle FastAPI validation errors (array of error objects)
            errorMsg = data.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join(', ');
          } else {
            errorMsg = data.detail;
          }
        } else if (data?.message) {
          errorMsg = data.message;
        }
      
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Submission failed',
      };
    }
  }

  async getApplicationStatus(): Promise<LawyerApplicationStatus | null> {
    const cacheKey = 'lawyer-application-status';
    
    // Check memory cache first
    if (this.statusCache && (Date.now() - this.statusCache.timestamp) < this.CACHE_DURATION) {
      return this.statusCache.data;
    }

    // Check persistent cache
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if ((Date.now() - parsed.timestamp) < this.CACHE_DURATION) {
          this.statusCache = parsed;
          return parsed.data;
        }
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }

    // Deduplicate requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this.fetchApplicationStatus();
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const data = await requestPromise;
      
      // Cache in memory and storage
      const cacheData = { data, timestamp: Date.now() };
      this.statusCache = cacheData;
      
      try {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (error) {
        console.error('Cache write error:', error);
      }

      return data;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async fetchApplicationStatus(): Promise<LawyerApplicationStatus | null> {
    try {
      const response = await this.makeRequest('/api/lawyer-applications/me');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get application status');
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      return null;
    }
  }

  // Clear cache when status might change (after submission, etc.)
  clearStatusCache(): void {
    this.statusCache = null;
    AsyncStorage.removeItem('lawyer-application-status').catch(console.error);
  }

  // Prefetch status in background
  async prefetchApplicationStatus(): Promise<void> {
    try {
      await this.getApplicationStatus();
    } catch (error) {
      // Silent fail for background prefetch
    }
  }

  // Clear pending_lawyer flag when user completes accepted flow
  async clearPendingLawyerStatus(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest('/api/lawyer-applications/clear-pending', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to clear pending lawyer status');
      }

      const data = await response.json();
      
      // Clear cache since user status has changed
      this.clearStatusCache();
      
      return {
        success: true,
        message: data.message || 'Pending lawyer status cleared successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to clear pending lawyer status'
      };
    }
  }
}

export const lawyerApplicationService = new LawyerApplicationService();
export type { FileUploadResponse, LawyerApplicationStatus, SubmitApplicationResponse };
