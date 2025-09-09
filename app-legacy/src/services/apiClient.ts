import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * Standardisierter API-Client für konsistente HTTP-Kommunikation
 */

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
  timestamp: string;
}

class ApiClient {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || '/api',
      timeout: 60000, // 60 seconds default timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request Interceptor - Add Auth Token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response Interceptor - Handle Errors
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response;
      },
      (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          this.clearAuth();
          window.location.href = '/login';
        }
        if (error.response?.status === 403) {
          try {
            const data: any = error.response.data as any;
            const code = (data as any)?.code || (data as any)?.error?.code || (data as any)?.data?.code;
            if (code === 'AI_KEY_REQUIRED') {
              // Redirect to profile AI key section in legacy app
              const current = window.location.pathname + window.location.search;
              window.sessionStorage.setItem('post_ai_key_redirect', current);
              window.location.href = '/app/profile#ai-key';
            }
          } catch {}
        }
        
        return Promise.reject(this.formatError(error));
      }
    );
  }

  public getBaseURL(): string {
    return this.client.defaults.baseURL || '';
  }

  private formatError(error: AxiosError<ApiResponse>): Error {
    if (error.response?.data?.error) {
      const errorData = error.response.data.error;
      if (typeof errorData === 'string') {
        return new Error(errorData);
      } else {
        // Safely stringify object error data
        try {
          return new Error(JSON.stringify(errorData));
        } catch (stringifyError) {
          return new Error('Error occurred but could not be formatted');
        }
      }
    }
    
    if (error.response?.data?.message) {
      const messageData = error.response.data.message;
      if (typeof messageData === 'string') {
        return new Error(messageData);
      } else {
        // Safely stringify object message data
        try {
          return new Error(JSON.stringify(messageData));
        } catch (stringifyError) {
          return new Error('Error occurred but could not be formatted');
        }
      }
    }
    
    if (error.response?.data) {
      // Safely stringify the entire response data
      try {
        return new Error(`API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      } catch (stringifyError) {
        return new Error(`API Error (${error.response.status}): Unable to format error data`);
      }
    }
    
    if (error.message) {
      return new Error(error.message);
    }
    
    return new Error('An unexpected error occurred');
  }

  // Auth Management
  setAuthToken(token: string) {
    this.authToken = token;
    localStorage.setItem('authToken', token);
  }

  clearAuth() {
    this.authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
  }

  initializeAuth() {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      this.authToken = token;
    }
  }

  // HTTP Methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T | ApiResponse<T>>(url, config);
    // Handle both wrapped and unwrapped responses
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return (response.data as ApiResponse<T>).data as T;
    }
    return response.data as T;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T | ApiResponse<T>>(url, data, config);
    // Handle both wrapped and unwrapped responses
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return (response.data as ApiResponse<T>).data as T;
    }
    return response.data as T;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T | ApiResponse<T>>(url, data, config);
    // Handle both wrapped and unwrapped responses
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return (response.data as ApiResponse<T>).data as T;
    }
    return response.data as T;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T | ApiResponse<T>>(url, data, config);
    // Handle both wrapped and unwrapped responses
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return (response.data as ApiResponse<T>).data as T;
    }
    return response.data as T;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T | ApiResponse<T>>(url, config);
    // Handle both wrapped and unwrapped responses
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return (response.data as ApiResponse<T>).data as T;
    }
    return response.data as T;
  }

  // File Upload
  async uploadFile<T>(url: string, file: File, onUploadProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(progress);
        }
      },
    };

    const response = await this.client.post<ApiResponse<T>>(url, formData, config);
    return response.data.data as T;
  }

  // HTTP Methods with custom timeouts
  async postWithTimeout<T>(url: string, data?: any, timeoutMs?: number, config?: AxiosRequestConfig): Promise<T> {
    const customConfig = {
      ...config,
      timeout: timeoutMs || this.client.defaults.timeout
    };
    
    const response = await this.client.post<T | ApiResponse<T>>(url, data, customConfig);
    // Handle both wrapped and unwrapped responses
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return (response.data as ApiResponse<T>).data as T;
    }
    return response.data as T;
  }

  // Multipart form data upload - let browser set Content-Type with boundary
  async postMultipart<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    // Don't set Content-Type header for multipart - browser will set it with boundary
    const customConfig = {
      ...config,
      headers: {
        ...config?.headers,
        // Remove any Content-Type that might be set by default interceptors
      }
    };
    
    // Explicitly remove Content-Type to let browser set it
    if (customConfig.headers && 'Content-Type' in customConfig.headers) {
      delete (customConfig.headers as any)['Content-Type'];
    }
    
    const response = await this.client.post<T | ApiResponse<T>>(url, formData, customConfig);
    // Handle both wrapped and unwrapped responses
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return (response.data as ApiResponse<T>).data as T;
    }
    return response.data as T;
  }
}

// Singleton Instance
const apiClient = new ApiClient();

// Initialize auth on startup
apiClient.initializeAuth();

export { apiClient };
export default apiClient;
