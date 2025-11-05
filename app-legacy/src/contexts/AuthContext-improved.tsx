import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
  role: 'admin' | 'user';
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  activeTimelineId: string | null;
  isInitialized: boolean; // NEU: Flag für App-Initialisierung
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: User }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_ACTIVE_TIMELINE'; payload: string | null }
  | { type: 'SET_INITIALIZED' }; // NEU: Initialisierung abgeschlossen

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,
  activeTimelineId: localStorage.getItem('activeTimelineId'),
  isInitialized: false, // NEU
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
        isInitialized: true,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
        user: null,
        token: null,
        isInitialized: true,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        error: null,
        activeTimelineId: null,
        isInitialized: true,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_ACTIVE_TIMELINE':
      return {
        ...state,
        activeTimelineId: action.payload,
      };
    case 'SET_INITIALIZED':
      return {
        ...state,
        isInitialized: true,
        loading: false,
      };
    default:
      return state;
  }
};

interface AuthContextType {
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, company?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setActiveTimeline: (timelineId: string | null) => void;
  validateToken: () => Promise<boolean>; // NEU: Manuelle Token-Validierung
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Token-Utilities
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true;
  }
};

const getTokenExpirationTime = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch (error) {
    console.error('Error parsing token expiration:', error);
    return null;
  }
};

// Configure axios
const API_BASE_URL = process.env.REACT_APP_API_URL || '';
axios.defaults.baseURL = API_BASE_URL;

// Request interceptor to add auth token
axios.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('token');
    if (token && !isTokenExpired(token)) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
    } else if (token && isTokenExpired(token)) {
      // Token ist abgelaufen, entferne es
      localStorage.removeItem('token');
      console.warn('Token expired, removing from localStorage');
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Response interceptor to handle auth errors
axios.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('activeTimelineId');
      // Nur umleiten wenn wir nicht bereits auf der Login-Seite sind
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/app/login';
      }
    }
    return Promise.reject(error);
  }
);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Token-Validierung
  const validateToken = async (): Promise<boolean> => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      dispatch({ type: 'SET_INITIALIZED' });
      return false;
    }

    // Prüfe Token-Ablauf lokal
    if (isTokenExpired(token)) {
      console.warn('Token expired locally, removing');
      localStorage.removeItem('token');
      localStorage.removeItem('activeTimelineId');
      dispatch({ type: 'LOGOUT' });
      return false;
    }

    try {
      // Validiere Token bei Server
      const response = await axios.get('/v2/user/profile');
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.data.data,
          token: token,
        },
      });
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('activeTimelineId');
      dispatch({ type: 'LOGOUT' });
      return false;
    }
  };

  // App-Initialisierung beim Mount
  useEffect(() => {
    validateToken();
  }, []);

  // Automatische Token-Refresh vor Ablauf
  useEffect(() => {
    if (!state.token) return;

    const expirationTime = getTokenExpirationTime(state.token);
    if (!expirationTime) return;

    const timeUntilExpiry = expirationTime - Date.now();
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0); // 5 Minuten vor Ablauf

    const timeoutId = setTimeout(() => {
      console.log('Token expires soon, validating...');
      validateToken();
    }, refreshTime);

    return () => clearTimeout(timeoutId);
  }, [state.token]);

  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { user, token } = response.data.data;
      
      // Prüfe Token-Gültigkeit vor Speicherung
      if (isTokenExpired(token)) {
        throw new Error('Received expired token from server');
      }
      
      localStorage.setItem('token', token);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Login failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      throw new Error(errorMessage);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    company?: string
  ): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await axios.post('/auth/register', {
        email,
        password,
        name,
        company,
      });
      
      const { user, token } = response.data.data;
      
      // Prüfe Token-Gültigkeit vor Speicherung
      if (isTokenExpired(token)) {
        throw new Error('Received expired token from server');
      }
      
      localStorage.setItem('token', token);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Registration failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      throw new Error(errorMessage);
    }
  };

  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeTimelineId');
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  // Timeline-Management
  const setActiveTimeline = (timelineId: string | null) => {
    if (timelineId) {
      localStorage.setItem('activeTimelineId', timelineId);
    } else {
      localStorage.removeItem('activeTimelineId');
    }
    dispatch({ type: 'SET_ACTIVE_TIMELINE', payload: timelineId });
  };

  const value = {
    state,
    dispatch,
    login,
    register,
    logout,
    clearError,
    setActiveTimeline,
    validateToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
