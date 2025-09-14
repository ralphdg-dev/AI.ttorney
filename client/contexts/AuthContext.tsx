import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { router } from 'expo-router';
import { getRoleBasedRedirect } from '../config/routes';

// Role hierarchy based on backend schema
export type UserRole = 'guest' | 'registered_user' | 'verified_lawyer' | 'admin' | 'superadmin';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_verified: boolean;
  pending_lawyer?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  supabaseUser: SupabaseUser | null;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUserData: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isLawyer: () => boolean;
  isAdmin: () => boolean;
  checkLawyerApplicationStatus: () => Promise<any>;
  hasRedirectedToStatus: boolean;
  setHasRedirectedToStatus: (value: boolean) => void;
  initialAuthCheck: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    supabaseUser: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [initialAuthCheck, setInitialAuthCheck] = useState(false);
  const [hasRedirectedToStatus, setHasRedirectedToStatus] = useState(false);

  useEffect(() => {
    // Initialize auth state and listen for auth changes
    const initialize = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          await handleAuthStateChange(session);
        }
        
        setInitialAuthCheck(true);

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            
            if (event === 'SIGNED_IN') {
              if (session) {
                // Only navigate on explicit sign in, not token refresh
                await handleAuthStateChange(session, true);
              }
            } else if (event === 'TOKEN_REFRESHED') {
              if (session) {
                // Don't navigate on token refresh, just update auth state
                await handleAuthStateChange(session, false);
              }
            } else if (event === 'SIGNED_OUT') {
              setAuthState({
                session: null,
                user: null,
                supabaseUser: null,
              });
              setHasRedirectedToStatus(false);
            }
            
            setIsLoading(false);
          }
        );

        setIsLoading(false);

        // Cleanup subscription on unmount
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        setIsLoading(false);
      }
    };

    initialize();
  }, []);


  const handleAuthStateChange = async (session: Session, shouldNavigate = false) => {
    try {
      // Fetch user profile from your custom users table
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();


      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setAuthState({
        session,
        user: profile,
        supabaseUser: session.user,
      });

      // Only handle navigation on explicit login attempts
      if (shouldNavigate && profile) {
        let applicationStatus = null;
        
        // Check lawyer application status if user has pending_lawyer flag
        if (profile.pending_lawyer) {
          // Set redirect flag only for pending lawyer users to prevent future status redirects
          setHasRedirectedToStatus(true);
          
          const statusData = await checkLawyerApplicationStatus();
          if (statusData && statusData.has_application && statusData.application) {
            applicationStatus = statusData.application.status;
          }
          
          const redirectPath = getRoleBasedRedirect(profile.role, profile.is_verified, profile.pending_lawyer, applicationStatus || undefined);
          
          // Handle different redirect scenarios
          if (redirectPath === 'loading') {
            // Show loading screen while fetching status
            router.push('/loading-status' as any);
          } else if (redirectPath && redirectPath.includes('/lawyer-status/')) {
            router.push(redirectPath as any);
          } else if (redirectPath) {
            router.push(redirectPath as any);
          }
        } else {
          // User doesn't have pending lawyer status, redirect normally
          const redirectPath = getRoleBasedRedirect(profile.role, profile.is_verified, false);
          router.push(redirectPath as any);
        }
      }
    } catch (error) {
      console.error('Error handling auth state change:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      // Reset redirect flag on new login
      setHasRedirectedToStatus(false);
      
      // Use Supabase Auth for sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        // Handle auth state change with navigation
        await handleAuthStateChange(data.session, true);
        return { success: true };
      }

      return { success: false, error: 'No session created' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting sign out process...');
      
      // Reset redirect flag on sign out
      setHasRedirectedToStatus(false);
      
      // Clear all application state immediately
      setAuthState({
        session: null,
        user: null,
        supabaseUser: null,
      });
      
      // Clear Supabase session with scope 'global' to remove from all storage
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear all browser storage manually - be more aggressive
      if (typeof window !== 'undefined') {
        // Clear ALL localStorage
        localStorage.clear();
        
        // Clear ALL sessionStorage
        sessionStorage.clear();
        
        // Clear cookies if possible
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
      }
      
      // Clear AsyncStorage data
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.default.clear(); // Clear everything
      } catch (storageError) {
        console.warn('AsyncStorage clear error:', storageError);
      }
      
      // Clear lawyer application service cache
      try {
        const { lawyerApplicationService } = await import('../services/lawyerApplicationService');
        lawyerApplicationService.clearCache();
        lawyerApplicationService.stopStatusPolling();
      } catch (serviceError) {
        console.warn('Service cleanup error:', serviceError);
      }
      
      console.log('Sign out complete, forcing page reload...');
      
      // Force a hard page reload to completely reset the app state
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      } else {
        router.replace('/login' as any);
      }
      
    } catch (error) {
      console.error('Sign out error:', error);
      // Force clear state even if there's an error
      setAuthState({
        session: null,
        user: null,
        supabaseUser: null,
      });
      setHasRedirectedToStatus(false);
      
      // Force clear storage even on error
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      } else {
        router.replace('/login' as any);
      }
    }
  };

  const setUserData = (userData: User | null) => {
    setAuthState(prev => ({
      ...prev,
      user: userData,
    }));
  };

  const refreshUserData = async () => {
    try {
      if (authState.session?.user?.id) {
        // Fetch updated user profile from database
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authState.session.user.id)
          .single();

        if (!error && profile) {
          setAuthState(prev => ({
            ...prev,
            user: profile,
          }));
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return authState.user?.role === role;
  };

  const isLawyer = (): boolean => {
    return hasRole('verified_lawyer');
  };

  const isAdmin = (): boolean => {
    return hasRole('admin') || hasRole('superadmin');
  };

  const checkLawyerApplicationStatus = async (): Promise<any> => {
    try {
      if (!authState.session?.access_token) {
        return null;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/lawyer-applications/me`, {
        headers: {
          'Authorization': `Bearer ${authState.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };


  const value: AuthContextType = {
    user: authState.user,
    session: authState.session,
    isLoading,
    isAuthenticated: !!authState.session && !!authState.user,
    signIn,
    signOut,
    setUser: setUserData,
    refreshUserData,
    hasRole,
    isLawyer,
    isAdmin,
    checkLawyerApplicationStatus,
    hasRedirectedToStatus,
    setHasRedirectedToStatus,
    initialAuthCheck,
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
