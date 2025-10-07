import React, { createContext, useContext, useReducer, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Auth context
const AuthContext = createContext();

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        admin: action.payload.admin,
        token: action.payload.token,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        admin: null,
        token: null,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        admin: null,
        token: null,
        error: null
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    case 'RESTORE_SESSION':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        admin: action.payload.admin,
        token: action.payload.token
      };
    default:
      return state;
  }
};

// Initial state
const initialState = {
  isAuthenticated: false,
  admin: null,
  token: null,
  loading: true,
  error: null
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on app load
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        if (!token) {
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        // Verify token with backend
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          dispatch({
            type: 'RESTORE_SESSION',
            payload: {
              admin: data.admin,
              token: token
            }
          });
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('admin_token');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Session check error:', error);
        localStorage.removeItem('admin_token');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkExistingSession();
  }, []);

  // Login function
  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store token in localStorage
        localStorage.setItem('admin_token', data.token);
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            admin: data.admin,
            token: data.token
          }
        });

        return { success: true };
      } else {
        dispatch({
          type: 'LOGIN_FAILURE',
          payload: data.error || 'Login failed'
        });
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = 'Network error. Please check your connection.';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (token) {
        // Call logout endpoint
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage and state
      localStorage.removeItem('admin_token');
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('admin_token', data.token);
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            admin: data.admin,
            token: data.token
          }
        });
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return false;
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Check if admin has specific role
  const hasRole = (role) => {
    if (!state.admin) return false;
    if (role === 'admin') return ['admin', 'superadmin'].includes(state.admin.role);
    if (role === 'superadmin') return state.admin.role === 'superadmin';
    return false;
  };

  // Get authorization header
  const getAuthHeader = () => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const value = {
    ...state,
    login,
    logout,
    refreshToken,
    clearError,
    hasRole,
    getAuthHeader
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
