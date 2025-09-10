import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Role hierarchy based on backend schema
export type UserRole = 'guest' | 'registered_user' | 'verified_lawyer' | 'admin' | 'superadmin';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  hasRole: (role: UserRole) => boolean;
  hasMinimumRole: (minimumRole: UserRole) => boolean;
  isLawyer: () => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest: 0,
  registered_user: 1,
  verified_lawyer: 2,
  admin: 3,
  superadmin: 4,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Initialize auth state - check for stored session
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check for stored session and profile data
      const [sessionData, profileData] = await Promise.all([
        AsyncStorage.getItem('userSession'),
        AsyncStorage.getItem('userProfile')
      ]);

      if (sessionData && profileData) {
        const session = JSON.parse(sessionData);
        const profile = JSON.parse(profileData);
        
        // Verify session is still valid (check expiration if needed)
        if (session && profile) {
          setUser(profile);
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear potentially corrupted data
      await AsyncStorage.multiRemove(['userSession', 'userProfile']);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.profile);
        
        // Role-based navigation
        const redirectPath = getRedirectPathForRole(data.profile.role);
        router.replace(redirectPath as any);
        
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch {
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Clear stored session data
      await AsyncStorage.multiRemove(['userSession', 'userProfile', 'user_email']);
      setUser(null);
      router.replace('/login' as any);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const setUserData = (userData: User | null) => {
    setUser(userData);
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasMinimumRole = (minimumRole: UserRole): boolean => {
    if (!user) return false;
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minimumRole];
  };

  const isLawyer = (): boolean => {
    return hasMinimumRole('verified_lawyer');
  };

  const isAdmin = (): boolean => {
    return hasMinimumRole('admin');
  };

  const getRedirectPathForRole = (role: UserRole): string => {
    switch (role) {
      case 'verified_lawyer':
        return '/lawyer';
      case 'admin':
      case 'superadmin':
        return '/admin';
      case 'registered_user':
        return '/home';
      case 'guest':
        return '/role-selection';
      default:
        return '/home';
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    setUser: setUserData,
    hasRole,
    hasMinimumRole,
    isLawyer,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
