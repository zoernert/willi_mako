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
      timeout: 60000, // 60 seconds for complex analysis operations
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
        const token = localStorage.getItem('token');
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
        
        return Promise.reject(this.formatError(error));
      }
    );
  }

  public getBaseURL(): string {
    return this.client.defaults.baseURL || '';
  }

  private formatError(error: AxiosError<ApiResponse>): Error {
    if (error.response?.data?.error) {
      return new Error(typeof error.response.data.error === 'string' ? error.response.data.error : JSON.stringify(error.response.data.error));
    }
    
    if (error.response?.data?.message) {
      return new Error(typeof error.response.data.message === 'string' ? error.response.data.message : JSON.stringify(error.response.data.message));
    }
    
    if (error.response?.data) {
      return new Error(`API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
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
  }

  initializeAuth() {
    const token = localStorage.getItem('authToken');
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
}

// Singleton Instance
const apiClient = new ApiClient();

// Initialize auth on startup
apiClient.initializeAuth();

export default apiClient;
