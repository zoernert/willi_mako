/**
 * API Client mit verbesserter Token-Verwaltung
 */
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { TokenService } from './TokenService';

// Base URL konfigurieren
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Axios-Instanz erstellen
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 Sekunden Timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor - Token automatisch hinzufügen
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = TokenService.getToken();
    
    if (token) {
      // Prüfe Token-Gültigkeit vor jeder Anfrage
      if (TokenService.isTokenExpired(token)) {
        console.warn('Token expired, removing from storage');
        TokenService.clearAuthData();
        
        // Umleitung zur Login-Seite
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/app/login';
        }
        
        return Promise.reject(new Error('Token expired'));
      }

      // Warnung bei bald ablaufendem Token
      if (TokenService.isTokenExpiringSoon(token)) {
        console.warn('Token expires soon:', TokenService.formatTimeUntilExpiry());
      }

      // Token zu Headers hinzufügen
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor - Auth-Fehler behandeln
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // 401 Unauthorized - Token ungültig oder abgelaufen
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized - clearing auth data');
      TokenService.clearAuthData();
      
      // Nur umleiten wenn nicht bereits auf Login-Seite
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/app/login';
      }
    }

    // 403 Forbidden - Unzureichende Berechtigungen
    if (error.response?.status === 403) {
      console.warn('403 Forbidden - insufficient permissions');
    }

    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
      console.error('Network error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Utility-Funktionen für API-Calls
export const apiUtils = {
  /**
   * GET-Request mit automatischer Fehlerbehandlung
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await apiClient.get<T>(url, config);
      return response.data;
    } catch (error) {
      console.error(`GET ${url} failed:`, error);
      throw error;
    }
  },

  /**
   * POST-Request mit automatischer Fehlerbehandlung
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await apiClient.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`POST ${url} failed:`, error);
      throw error;
    }
  },

  /**
   * PUT-Request mit automatischer Fehlerbehandlung
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await apiClient.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`PUT ${url} failed:`, error);
      throw error;
    }
  },

  /**
   * DELETE-Request mit automatischer Fehlerbehandlung
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await apiClient.delete<T>(url, config);
      return response.data;
    } catch (error) {
      console.error(`DELETE ${url} failed:`, error);
      throw error;
    }
  },

  /**
   * Prüft ob API verfügbar ist
   */
  async healthCheck(): Promise<boolean> {
    try {
      await apiClient.get('/health');
      return true;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  },

  /**
   * Authentifizierung prüfen
   */
  async validateToken(): Promise<boolean> {
    try {
      await apiClient.get('/v2/user/profile');
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  },
};

// Token-spezifische API-Calls
export const authApi = {
  /**
   * Login
   */
  async login(email: string, password: string): Promise<{ user: any; token: string }> {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data.data;
  },

  /**
   * Registrierung
   */
  async register(email: string, password: string, name: string, company?: string): Promise<{ user: any; token: string }> {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      name,
      company,
    });
    return response.data.data;
  },

  /**
   * Passwort zurücksetzen anfordern
   */
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  },

  /**
   * Passwort zurücksetzen
   */
  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, password });
  },

  /**
   * Benutzerprofil abrufen
   */
  async getProfile(): Promise<any> {
    const response = await apiClient.get('/v2/user/profile');
    return response.data.data;
  },

  /**
   * Benutzerprofil aktualisieren
   */
  async updateProfile(data: any): Promise<any> {
    const response = await apiClient.put('/v2/user/profile', data);
    return response.data.data;
  },
};

export default apiClient;
