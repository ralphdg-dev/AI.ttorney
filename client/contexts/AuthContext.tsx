import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, clearAuthStorage } from '../config/supabase';
import { router, useSegments } from 'expo-router';
import { getRoleBasedRedirect } from '../config/routes';

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
  isGuestMode: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUserData: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isLawyer: () => boolean;
  isAdmin: () => boolean;
  checkLawyerApplicationStatus: () => Promise<any>;
  checkSuspensionStatus: () => Promise<{ isSuspended: boolean; suspensionCount: number; suspensionEnd: string | null } | null>;
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


  const checkSuspensionStatus = React.useCallback(async (): Promise<{ isSuspended: boolean; suspensionCount: number; suspensionEnd: string | null } | null> => {
    try {
      if (!authState.session?.access_token) {
        return null;
      }

      const { NetworkConfig } = await import('../utils/networkConfig');
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/user/moderation-status`, {
        headers: {
          'Authorization': `Bearer ${authState.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          isSuspended: data.account_status === 'suspended',
          suspensionCount: data.suspension_count || 0,
          suspensionEnd: data.suspension_end || null,
        };
      }
      
      return null;
    } catch {
      return null;
    }
  }, [authState.session?.access_token]);

  const checkLawyerApplicationStatus = React.useCallback(async (): Promise<any> => {
    try {
      if (!authState.session?.access_token) {
        return null;
      }

      const { NetworkConfig } = await import('../utils/networkConfig');
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/lawyer-applications/me`, {
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

  const handleAuthStateChange = React.useCallback(async (session: any, shouldNavigate: boolean = true) => {
    console.log('🔐 handleAuthStateChange called:', { session: !!session, shouldNavigate });
    
    // Add timeout protection to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('🚨 Auth state change timeout - forcing isLoading to false');
      setIsLoading(false);
    }, 10000); // 10 second timeout
    
    try {
      if (!session) {
        console.log('🔐 No session, clearing auth state');
        setAuthState({ session: null, user: null, supabaseUser: null });
        setIsLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      // Get user profile from database
      console.log('🔐 Fetching user profile for ID:', session.user.id);
      
      let profile = null;
      
      try {
        const { data: profileData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        console.log('🔐 Supabase query result:', { profile: !!profileData, error: error?.message });

        if (error) {
          console.error('Error fetching user profile:', error);
          setAuthState({
            session,
            user: null,
            supabaseUser: session.user,
          });
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        profile = profileData;
        console.log('🔐 User profile fetched:', { role: profile.role, account_status: profile.account_status });
        setAuthState({
          session,
          user: profile,
          supabaseUser: session.user,
        });

      } catch (dbError) {
        console.error('Database query error:', dbError);
        setAuthState({
          session,
          user: null,
          supabaseUser: session.user,
        });
        setIsLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      console.log('🔐 Profile fetch completed, checking account status...');

      // ALWAYS check if user is deactivated - this takes priority over everything
      if (profile && profile.account_status === 'deactivated') {
        console.log('🔐 User is deactivated, checking current route');
        // Only redirect if not already on deactivated page to prevent infinite loops
        const currentRoute = window.location.pathname || '';
        if (!currentRoute.includes('/deactivated')) {
          console.log('🔐 Redirecting to deactivated page');
          setIsLoading(false);
          clearTimeout(timeoutId);
          router.replace('/deactivated' as any);
        } else {
          console.log('🔐 Already on deactivated page, not redirecting');
          setIsLoading(false);
          clearTimeout(timeoutId);
        }
        return;
      }

      // Check if user is banned FIRST - this takes priority over everything
      if (profile.account_status === 'banned') {
        console.log('🚫 User is banned, checking current route');
        // Only redirect if not already on banned page to prevent infinite loops
        const currentRoute = window.location.pathname || '';
        if (!currentRoute.includes('/banned')) {
          console.log('🚫 Redirecting to banned screen');
          setIsLoading(false);
          clearTimeout(timeoutId);
          router.replace('/banned' as any);
        } else {
          console.log('🚫 Already on banned page, not redirecting');
          setIsLoading(false);
          clearTimeout(timeoutId);
        }
        return;
      }

      // Only handle navigation on explicit login attempts
      if (shouldNavigate && profile) {
        console.log('🔐 Handling navigation for login');
        
        // Check if user is suspended - this takes priority over everything
        const suspensionStatus = await checkSuspensionStatus();
        if (suspensionStatus && suspensionStatus.isSuspended) {
          console.log('🚫 User is suspended, redirecting to suspended screen');
          setIsLoading(false);
          clearTimeout(timeoutId);
          router.replace('/suspended' as any);
          return;
        }
        
        let applicationStatus = null;
        if (profile.role === 'lawyer' || profile.pending_lawyer) {
          console.log('🔐 Checking lawyer application status');
          applicationStatus = await checkLawyerApplicationStatus();
        }
        
        if (profile.pending_lawyer) {
          // Redirect pending lawyers to application status screen
          const redirectPath = `/lawyer-status/${
            applicationStatus || 'pending'
          }`;
          
          console.log('🔄 Redirecting pending lawyer to:', redirectPath);
          setIsLoading(false);
          clearTimeout(timeoutId);
          router.replace(redirectPath as any);
        } else {
          // User doesn't have pending lawyer status, redirect normally
          const redirectPath = getRoleBasedRedirect(profile.role, profile.is_verified, false);
          console.log('🔄 Redirecting normal user to:', redirectPath);
          setIsLoading(false);
          clearTimeout(timeoutId);
          router.replace(redirectPath as any);
        }
      } else {
        // Not navigating, just set loading to false
        console.log('🔐 Not navigating, setting loading to false. shouldNavigate:', shouldNavigate, 'profile exists:', !!profile);
        setIsLoading(false);
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error handling auth state change:', error);
      setAuthState({ session: null, user: null, supabaseUser: null });
      setIsLoading(false);
      clearTimeout(timeoutId);
    }
  }, [checkLawyerApplicationStatus, checkSuspensionStatus]);

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
              // Clear auth state and redirect flag
              setAuthState({ session: null, user: null, supabaseUser: null });
              setHasRedirectedToStatus(false);
              setIsLoading(false);
              setIsSigningOut(false);
              
              // Navigation is already handled by signOut function
              // This event handler just ensures state is cleared
            }
            
            // Ensure loading is always set to false after auth state changes
            if (event !== 'SIGNED_OUT') {
              setIsLoading(false);
            }
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


  const signIn = async (email: string, password: string) => {
    console.log('🔑 signIn called:', { email });
    
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
        
        setIsLoading(false); // Ensure loading is set to false on error
        return { success: false, error: errorMessage };
      }

      if (data.session) {
        console.log('🔑 Sign in successful, session created');
        // The onAuthStateChange listener will handle navigation
        // But we also call handleAuthStateChange directly for immediate response
        await handleAuthStateChange(data.session, true);
        return { success: true };
      }

      setIsLoading(false); // Ensure loading is set to false if no session
      return { success: false, error: 'Login failed. Please try again' };
    } catch (error: any) {
      console.error('Sign in catch:', error);
      setIsLoading(false); // Ensure loading is set to false on catch
      return { success: false, error: 'Network error. Please check your connection' };
    }
    // Note: Don't set isLoading(false) here since handleAuthStateChange manages it
  };

  const signOut = async () => {
    try {
      // Set signing out flag FIRST so guards know to skip checks
      setIsSigningOut(true);
      
      // Clear auth state IMMEDIATELY
      setAuthState({ session: null, user: null, supabaseUser: null });
      setHasRedirectedToStatus(false);
      setIsLoading(false);
      
      // Redirect to login IMMEDIATELY - don't wait for anything
      router.replace('/login');
      
      // Clear signing out flag after a tiny delay to ensure navigation completes
      setTimeout(() => setIsSigningOut(false), 100);
      
      // Clear storage and sign out in background (non-blocking)
      clearAuthStorage().catch(() => {});
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } catch (error) {
      console.error('Sign out error:', error);
      
      // Force clear ALL states and redirect immediately
      setIsSigningOut(true);
      setAuthState({ session: null, user: null, supabaseUser: null });
      setHasRedirectedToStatus(false);
      setIsLoading(false);
      router.replace('/login');
      setTimeout(() => setIsSigningOut(false), 100);
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
          
          // Check if account became deactivated and redirect immediately
          if (profile.account_status === 'deactivated') {
            // Only redirect if not already on deactivated page to prevent infinite loops
            const currentRoute = window.location.pathname || '';
            if (!currentRoute.includes('/deactivated')) {
              router.replace('/deactivated' as any);
            }
          }
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
    isGuestMode: !authState.session || !authState.user,
    signIn,
    signOut,
    setUser: setUserData,
    refreshUserData,
    hasRole,
    isLawyer,
    isAdmin,
    checkLawyerApplicationStatus,
    checkSuspensionStatus,
    hasRedirectedToStatus,
    setHasRedirectedToStatus,
    initialAuthCheck,
    isSigningOut,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [authState.user, authState.session, isLoading, hasRedirectedToStatus, isSigningOut, checkLawyerApplicationStatus, checkSuspensionStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
