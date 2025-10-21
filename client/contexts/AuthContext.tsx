import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, clearAuthStorage } from '../config/supabase';
import { router, useSegments } from 'expo-router';
import { getRoleBasedRedirect } from '../config/routes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Complete the WebBrowser session on component unmount
WebBrowser.maybeCompleteAuthSession();

// Role hierarchy based on backend schema
export type UserRole = 'guest' | 'registered_user' | 'verified_lawyer' | 'admin' | 'superadmin';

export interface User {
  session: any;
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
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
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
  isSigningOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const segments = useSegments();
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    supabaseUser: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [initialAuthCheck, setInitialAuthCheck] = useState(false);
  const [hasRedirectedToStatus, setHasRedirectedToStatus] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);


  const checkLawyerApplicationStatus = React.useCallback(async (): Promise<any> => {
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
    } catch {
      return null;
    }
  }, [authState.session?.access_token]);

  const handleAuthStateChange = React.useCallback(async (session: Session, shouldNavigate = false) => {
    try {
      // Store access token in AsyncStorage for services that need it
      if (session?.access_token) {
        await AsyncStorage.setItem('access_token', session.access_token);
      }
      
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
            // Only redirect to loading if not already on a lawyer route
            const currentPath = `/${segments.join('/')}`;
            const isOnLawyerRoute = currentPath.startsWith('/lawyer');
            
            if (!isOnLawyerRoute) {
              // Show loading screen while fetching status
              router.replace('/loading' as any);
            }
          } else if (redirectPath && redirectPath.includes('/lawyer-status/')) {
            router.replace(redirectPath as any);
          } else if (redirectPath) {
            router.replace(redirectPath as any);
          }
        } else {
          // User doesn't have pending lawyer status, redirect normally
          const redirectPath = getRoleBasedRedirect(profile.role, profile.is_verified, false);
          router.replace(redirectPath as any);
        }
      }
    } catch (error) {
      console.error('Error handling auth state change:', error);
    }
  }, [checkLawyerApplicationStatus, segments]);

  useEffect(() => {
    // Initialize auth state and listen for auth changes
    const initialize = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error.message);
          // Clear session on error and redirect to login
          await clearAuthStorage();
          setAuthState({ session: null, user: null, supabaseUser: null });
          setIsLoading(false);
          setInitialAuthCheck(true);
          return;
        }
        
        if (initialSession) {
          await handleAuthStateChange(initialSession, false);
        } else {
          setAuthState({ session: null, user: null, supabaseUser: null });
          setIsLoading(false);
        }
        
        setInitialAuthCheck(true);

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: string, session: any) => {
            if (event === 'SIGNED_IN' && session) {
              await handleAuthStateChange(session, true);
            } else if (event === 'TOKEN_REFRESHED' && session) {
              await handleAuthStateChange(session, false);
            } else if (event === 'SIGNED_OUT') {
              setAuthState({ session: null, user: null, supabaseUser: null });
              setHasRedirectedToStatus(false);
              router.replace('/login');
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle OAuth callback URLs
  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      console.log('📱 Received URL:', event.url);
      
      // Check if this is an OAuth callback
      if (event.url.includes('#access_token=') || event.url.includes('?access_token=')) {
        console.log('🔐 Processing OAuth callback...');
        
        // Extract the URL fragment/query
        const url = event.url;
        const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
        
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        
        if (access_token && refresh_token) {
          console.log('✅ Tokens found in URL, setting session...');
          
          // Set the session in Supabase
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          
          if (error) {
            console.error('❌ Error setting session:', error.message);
          } else if (data.session) {
            console.log('✅ Session set successfully');
            await handleAuthStateChange(data.session, true);
          }
        }
      }
    };

    // Listen for URL events
    const subscription = Linking.addEventListener('url', handleUrl);

    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleAuthStateChange]);


  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setHasRedirectedToStatus(false);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error.message);
        
        // Map Supabase errors to user-friendly messages
        let errorMessage = 'Invalid email or password';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection';
        }
        
        // Don't call handleAuthStateChange on error - let the listener handle it
        return { success: false, error: errorMessage };
      }

      if (data.session) {
        // The onAuthStateChange listener will handle navigation
        // We just need to wait for it to complete
        await handleAuthStateChange(data.session, true);
        return { success: true };
      }

      return { success: false, error: 'Login failed. Please try again' };
    } catch (error: any) {
      console.error('Sign in catch:', error);
      return { success: false, error: 'Network error. Please check your connection' };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      setHasRedirectedToStatus(false);

      console.log('🔐 Starting Supabase Google OAuth flow...');

      // Create redirect URL for OAuth callback
      const redirectTo = 'ai-ttorney://';
      console.log('🔗 Redirect URL:', redirectTo);

      // Step 1: Initiate Supabase Google OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('❌ OAuth initiation failed:', error.message);
        return {
          success: false,
          error: 'Failed to start Google Sign-In. Please try again.',
        };
      }

      if (!data.url) {
        console.error('❌ OAuth URL not generated');
        return {
          success: false,
          error: 'Failed to generate sign-in URL. Please try again.',
        };
      }

      console.log('✅ OAuth URL generated');

      // Step 2: Open browser for OAuth
      console.log('🌐 Opening browser for authentication...');
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      console.log('📱 Browser result:', result.type);

      if (result.type === 'cancel') {
        console.log('ℹ️ User cancelled sign-in');
        return {
          success: false,
          error: 'Sign-in was cancelled',
        };
      }

      if (result.type !== 'success') {
        console.error('❌ OAuth flow failed:', result.type);
        return {
          success: false,
          error: 'Sign-in failed. Please try again.',
        };
      }

      // Step 3: Process OAuth callback
      console.log('🔄 Processing OAuth callback...');
      
      // Supabase will automatically handle the session via the auth state listener
      // Just wait a moment for it to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('✅ Google Sign-In completed successfully');
      return { success: true };

    } catch (error: any) {
      console.error('❌ Unexpected error during Google Sign-In:', error);
      
      // Handle unexpected errors gracefully
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message?.includes('cancelled')) {
        errorMessage = 'Sign-in was cancelled';
      }
      
      return { 
        success: false, 
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsSigningOut(true);
    
    try {
      // Clear auth state immediately to prevent further API calls
      setAuthState({ session: null, user: null, supabaseUser: null });
      setHasRedirectedToStatus(false);
      
      // Clear access token from AsyncStorage
      await AsyncStorage.removeItem('access_token');
      
      // Clear local storage first
      await clearAuthStorage();
      
      // Then sign out from Supabase Auth
      await supabase.auth.signOut({ scope: 'local' });
      
      // Navigate to login
      router.replace('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      // Force clear state on error
      setAuthState({ session: null, user: null, supabaseUser: null });
      router.replace('/login');
    } finally {
      setIsSigningOut(false);
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



  const value: AuthContextType = React.useMemo(() => ({
    user: authState.user,
    session: authState.session,
    isLoading,
    isAuthenticated: !!authState.session && !!authState.user,
    signIn,
    signInWithGoogle,
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
    isSigningOut,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [authState.user, authState.session, isLoading, hasRedirectedToStatus, isSigningOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
