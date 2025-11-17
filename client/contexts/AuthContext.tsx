import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, clearAuthStorage } from '../config/supabase';
import { router } from 'expo-router';
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
  account_status?: 'active' | 'suspended' | 'banned' | 'deactivated';
  profile_photo?: string;
  pending_lawyer?: boolean;
  birthdate?: string;
  created_at?: string;
  updated_at?: string;
  onboard?: boolean;
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
  refreshUserData: () => Promise<User | null>;
  hasRole: (role: UserRole) => boolean;
  isLawyer: () => boolean;
  isAdmin: () => boolean;
  checkLawyerApplicationStatus: () => Promise<any>;
  checkSuspensionStatus: () => Promise<{ isSuspended: boolean; suspensionCount: number; suspensionEnd: string | null } | null>;
  hasRedirectedToStatus: boolean;
  setHasRedirectedToStatus: (value: boolean) => void;
  initialAuthCheck: boolean;
  isSigningOut: boolean;
  profileFetchError: boolean;
  retryProfileFetch: () => Promise<void>;
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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileFetchError, setProfileFetchError] = useState(false);


  const checkSuspensionStatus = React.useCallback(async (): Promise<{ isSuspended: boolean; suspensionCount: number; suspensionEnd: string | null } | null> => {
    try {
      if (!authState.session?.access_token) {
        return null;
      }

      const { NetworkConfig } = await import('../utils/networkConfig');
      const apiUrl = await NetworkConfig.getBestApiUrl();

      // Add a soft timeout so this check can never block login/navigation forever
      const response: any = await Promise.race([
        fetch(`${apiUrl}/api/user/moderation-status`, {
          headers: {
            'Authorization': `Bearer ${authState.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }),
        new Promise(resolve => setTimeout(() => resolve('timeout'), 6000)),
      ]);

      if (response === 'timeout') {
        console.warn('⚠️ Suspension status check timed out, proceeding without suspension data');
        return null;
      }

      if (response.ok) {
        const data = await response.json();
        return {
          isSuspended: data.account_status === 'suspended',
          suspensionCount: data.suspension_count || 0,
          suspensionEnd: data.suspension_end || null,
        };
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Suspension status check failed, proceeding without suspension data', error);
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

      const response: any = await Promise.race([
        fetch(`${apiUrl}/api/lawyer-applications/me`, {
          headers: {
            'Authorization': `Bearer ${authState.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }),
        new Promise(resolve => setTimeout(() => resolve('timeout'), 7000)),
      ]);

      if (response === 'timeout') {
        console.warn('⚠️ Lawyer application status check timed out, proceeding without application data');
        return null;
      }

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Lawyer application status check failed, proceeding without application data', error);
      return null;
    }
  }, [authState.session?.access_token]);

  // Fetch user profile with retry logic
  const fetchUserProfile = React.useCallback(async (userId: string, retryCount = 0): Promise<any> => {
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 5000; // Reduced from 10s to 5s
    
    try {
      console.log(`🔐 Fetching user profile (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
      
      const profileResult: any = await Promise.race([
        supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single(),
        new Promise(resolve => 
          setTimeout(() => resolve({ 
            data: null, 
            error: { message: `Profile fetch timeout after ${TIMEOUT_MS/1000}s`, code: 'TIMEOUT' } 
          }), TIMEOUT_MS)
        ),
      ]);

      const { data: profileData, error } = profileResult;

      if (error) {
        // If timeout or network error, retry
        if ((error.code === 'TIMEOUT' || error.message?.includes('network')) && retryCount < MAX_RETRIES) {
          console.warn(`⚠️ Profile fetch failed (${error.message}), retrying in ${(retryCount + 1) * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
          return fetchUserProfile(userId, retryCount + 1);
        }
        
        console.error('❌ Profile fetch failed after retries:', error.message);
        return { data: null, error };
      }

      console.log('✅ Profile fetched successfully');
      return { data: profileData, error: null };
    } catch (err) {
      console.error('❌ Profile fetch exception:', err);
      return { data: null, error: err };
    }
  }, []);

  const handleAuthStateChange = React.useCallback(async (session: any, shouldNavigate: boolean = true) => {
    console.log('🔐 handleAuthStateChange called:', { session: !!session, shouldNavigate });
    
    // Add timeout protection to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('🚨 Auth state change timeout - forcing isLoading to false');
      setIsLoading(false);
    }, 15000); // 15 second total timeout (allows for retries)
    
    try {
      if (!session) {
        console.log('🔐 No session, clearing auth state');
        setAuthState({ session: null, user: null, supabaseUser: null });
        setIsLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      // Get user profile from database with retry logic
      console.log('🔐 Fetching user profile for ID:', session.user.id);
      
      const { data: profile, error } = await fetchUserProfile(session.user.id);

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        console.error('❌ This usually means:');
        console.error('   1. Missing RLS policy: Run /server/database/migrations/010_fix_users_table_rls.sql');
        console.error('   2. Supabase connection is slow or blocked');
        console.error('   3. User row does not exist in database');
        
        // For timeout errors, show a user-friendly error
        if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
          console.error('🚨 TIMEOUT: Check Supabase RLS policies and network connection');
        }
        
        // Set error state to show error screen
        setProfileFetchError(true);
        
        // Clear state and stop - don't try to proceed with incomplete data
        setAuthState({
          session,
          user: null,
          supabaseUser: session.user,
        });
        setIsLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      // Clear error state on successful fetch
      setProfileFetchError(false);

      if (!profile) {
        console.error('❌ No profile data returned');
        setAuthState({
          session,
          user: null,
          supabaseUser: session.user,
        });
        setIsLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      console.log('🔐 User profile fetched:', { role: profile.role, account_status: profile.account_status });
      setAuthState({
        session,
        user: profile,
        supabaseUser: session.user,
      });

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
  }, [fetchUserProfile, checkLawyerApplicationStatus, checkSuspensionStatus]);

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
        
        setIsLoading(false);
        return { success: false, error: errorMessage };
      }

      if (data.session) {
        console.log('🔑 Sign in successful, session created');
        // The onAuthStateChange listener + handleAuthStateChange will
        // fetch the profile, run checks, and navigate. We do not await
        // that work here so the login button can stop showing
        // "Signing In..." as soon as Supabase auth succeeds.
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Login failed. Please try again' };
    } catch (error: any) {
      console.error('Sign in catch:', error);
      setIsLoading(false);
      return { success: false, error: 'Network error. Please check your connection' };
    }
    // Note: on successful sign-in, handleAuthStateChange manages isLoading
  };

  const signOut = async () => {
    try {
      // Set signing out flag FIRST so guards know to skip checks
      setIsSigningOut(true);
      
      // Clear auth state IMMEDIATELY
      setAuthState({ session: null, user: null, supabaseUser: null });
      setHasRedirectedToStatus(false);
      setIsLoading(false);
      setProfileFetchError(false);
      
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
      setProfileFetchError(false);
      router.replace('/login');
      setTimeout(() => setIsSigningOut(false), 100);
    }
  };

  const retryProfileFetch = async () => {
    console.log('🔄 Retrying profile fetch...');
    setIsLoading(true);
    setProfileFetchError(false);
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        await handleAuthStateChange(currentSession, false);
      } else {
        console.error('❌ No session found for retry');
        setIsLoading(false);
        setProfileFetchError(true);
      }
    } catch (error) {
      console.error('❌ Retry failed:', error);
      setIsLoading(false);
      setProfileFetchError(true);
    }
  };

  const setUserData = (userData: User | null) => {
    setAuthState(prev => ({
      ...prev,
      user: userData,
    }));
  };

  const refreshUserData = async (): Promise<User | null> => {
    try {
      console.log('🔄 refreshUserData called');
      if (authState.session?.user?.id) {
        // Fetch updated user profile from database
        console.log('📡 Fetching user profile from database...');
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authState.session.user.id)
          .single();

        if (!error && profile) {
          console.log('✅ Profile fetched successfully:', { role: profile.role, account_status: profile.account_status });
          
          // Update state immediately
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
          
          // Return the profile for immediate use by caller
          return profile;
        } else {
          console.error('❌ Error fetching profile:', error);
          return null;
        }
      } else {
        console.warn('⚠️ No session user ID available for refresh');
        return null;
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
      return null;
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
    profileFetchError,
    retryProfileFetch,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [authState.user, authState.session, isLoading, hasRedirectedToStatus, isSigningOut, profileFetchError, checkLawyerApplicationStatus, checkSuspensionStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
