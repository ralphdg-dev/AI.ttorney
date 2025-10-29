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
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, metadata: { username: string; first_name: string; last_name: string; birthdate: string }) => Promise<{ success: boolean; error?: string; user?: any }>;
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

  const handleAuthStateChange = React.useCallback(async (session: Session, shouldNavigate = false) => {
    try {
      console.log('🔐 handleAuthStateChange called:', { shouldNavigate, userId: session.user.id });
      
      // ⚡ OPTIMIZATION: Run ALL API calls in PARALLEL instead of sequentially
      // This reduces login time from ~3-5 seconds to ~1 second
      const [profileResult, suspensionResult, lawyerStatusResult] = await Promise.allSettled([
        // 1. Fetch user profile
        supabase.from('users').select('*').eq('id', session.user.id).single(),
        // 2. Check suspension status (only if we have a token)
        session?.access_token ? checkSuspensionStatus() : Promise.resolve(null),
        // 3. Pre-fetch lawyer status (we'll use it if needed)
        session?.access_token ? checkLawyerApplicationStatus() : Promise.resolve(null)
      ]);

      // Handle profile fetch result with better error recovery
      if (profileResult.status === 'rejected') {
        console.error('❌ Profile fetch rejected:', profileResult.reason);
        setIsLoading(false);
        return;
      }
      
      if (profileResult.status === 'fulfilled' && profileResult.value.error) {
        console.error('❌ Profile fetch error:', profileResult.value.error);
        setIsLoading(false);
        return;
      }

      const profile = profileResult.value.data;
      if (!profile) {
        console.error('❌ No profile data returned');
        setIsLoading(false);
        return;
      }

      console.log('✅ Profile loaded:', { username: profile.username, role: profile.role });

      // Update auth state immediately
      setAuthState({
        session,
        user: profile,
        supabaseUser: session.user,
      });

      // Only handle navigation on explicit login attempts
      if (shouldNavigate && profile) {
        // Check suspension status (already fetched in parallel)
        const suspensionStatus = suspensionResult.status === 'fulfilled' ? suspensionResult.value : null;
        if (suspensionStatus && suspensionStatus.isSuspended) {
          console.log('🚫 User is suspended, redirecting to suspended screen');
          setIsLoading(false);
          router.replace('/suspended' as any);
          return;
        }
        
        let applicationStatus = null;
        
        // Check lawyer application status if user has pending_lawyer flag
        if (profile.pending_lawyer) {
          setHasRedirectedToStatus(true);
          
          // Use pre-fetched lawyer status data
          const statusData = lawyerStatusResult.status === 'fulfilled' ? lawyerStatusResult.value : null;
          if (statusData && statusData.has_application && statusData.application) {
            applicationStatus = statusData.application.status;
          } else {
            applicationStatus = 'pending';
          }
          
          const redirectPath = getRoleBasedRedirect(
            profile.role, 
            profile.is_verified, 
            profile.pending_lawyer, 
            applicationStatus || 'pending'
          );
          
          console.log('🔄 Redirecting pending lawyer to:', redirectPath);
          setIsLoading(false);
          router.replace(redirectPath as any);
        } else {
          // User doesn't have pending lawyer status, redirect normally
          const redirectPath = getRoleBasedRedirect(profile.role, profile.is_verified, false);
          console.log('🔄 Redirecting user to:', redirectPath);
          setIsLoading(false);
          router.replace(redirectPath as any);
        }
      } else {
        // Not navigating, just set loading to false
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Error handling auth state change:', error);
      setIsLoading(false);
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
    try {
      console.log('🔐 signIn called for:', email);
      setIsLoading(true);
      setHasRedirectedToStatus(false);
      
      // Supabase best practice: Use signInWithPassword for email/password auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        console.error('❌ Supabase signIn error:', error.message);
        
        // Map Supabase errors to user-friendly messages (industry standard)
        let errorMessage = 'Invalid email or password';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address';
        } else if (error.message.includes('email_not_confirmed')) {
          errorMessage = 'Please verify your email address';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection';
        } else if (error.message.includes('rate_limit')) {
          errorMessage = 'Too many attempts. Please try again later';
        }
        
        setIsLoading(false);
        return { success: false, error: errorMessage };
      }

      if (data.session) {
        console.log('✅ Supabase session created, handling auth state...');
        // handleAuthStateChange will set isLoading to false
        await handleAuthStateChange(data.session, true);
        return { success: true };
      }

      console.error('❌ No session returned from Supabase');
      setIsLoading(false);
      return { success: false, error: 'Login failed. Please try again' };
    } catch (error: any) {
      console.error('❌ signIn exception:', error);
      setIsLoading(false);
      return { success: false, error: 'Network error. Please check your connection' };
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    metadata: { username: string; first_name: string; last_name: string; birthdate: string }
  ) => {
    try {
      console.log('📝 signUp called for:', email);
      setIsLoading(true);
      
      // Supabase best practice: Use signUp with email confirmation
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            username: metadata.username,
            first_name: metadata.first_name,
            last_name: metadata.last_name,
            full_name: `${metadata.first_name} ${metadata.last_name}`,
            birthdate: metadata.birthdate,
          },
          emailRedirectTo: undefined, // We handle verification via OTP
        },
      });

      if (error) {
        console.error('❌ Supabase signUp error:', error.message);
        
        // Map Supabase errors to user-friendly messages
        let errorMessage = 'Registration failed. Please try again';
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          errorMessage = 'Email already registered. Please sign in instead';
        } else if (error.message.includes('rate_limit')) {
          errorMessage = 'Too many attempts. Please try again later';
        } else if (error.message.includes('password')) {
          errorMessage = 'Password does not meet requirements';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection';
        }
        
        setIsLoading(false);
        return { success: false, error: errorMessage };
      }

      if (data.user) {
        console.log('✅ User created:', data.user.id);
        setIsLoading(false);
        return { success: true, user: data.user };
      }

      console.error('❌ No user returned from Supabase');
      setIsLoading(false);
      return { success: false, error: 'Registration failed. Please try again' };
    } catch (error: any) {
      console.error('❌ signUp exception:', error);
      setIsLoading(false);
      return { success: false, error: 'Network error. Please check your connection' };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 signOut called');
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
      console.error('❌ signOut error:', error);
      
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
    signUp,
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
