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
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
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
    try {
      const response = await this.makeRequest('/api/lawyer-applications/me');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get application status');
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }
}

export const lawyerApplicationService = new LawyerApplicationService();
export type { FileUploadResponse, LawyerApplicationStatus, SubmitApplicationResponse };
