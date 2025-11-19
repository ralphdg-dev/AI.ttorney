import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, clearAuthStorage } from '../config/supabase';
import { router } from 'expo-router';
import { getRoleBasedRedirect } from '../config/routes';
import { useToast, Toast, ToastTitle, ToastDescription } from '../components/ui/toast';
import { NetworkConfig } from '../utils/networkConfig';

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
  const toast = useToast();


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

  const handleAuthStateChange = React.useCallback(async (session: any, shouldNavigate: boolean = true) => {
    console.log(`🔄 handleAuthStateChange called - shouldNavigate: ${shouldNavigate}, current path: ${window.location.pathname}`);
    
    const timeoutId = setTimeout(() => {
      console.warn('Auth timeout');
      toast.show({
        placement: 'top',
        render: ({ id }) => {
          return (
            <Toast nativeID={id} action="warning" variant="solid">
              <ToastTitle>Authentication Timeout</ToastTitle>
              <ToastDescription>
                Sign in is taking longer than expected. Please check your connection and try again.
              </ToastDescription>
            </Toast>
          );
        },
      });
      setIsLoading(false);
    }, 15000);
    
    try {
      if (!session) {
        setAuthState({ session: null, user: null, supabaseUser: null });
        setIsLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      // Get user profile - use server API to bypass RLS issues
      let profile = null;
      const startTime = Date.now();
      
      try {
        console.log('🔍 Fetching profile for user:', session.user.id);
        
        // Fetch profile through server API (bypasses RLS, faster for lawyers)
        const API_URL = await NetworkConfig.getBestApiUrl();
        const profileFetchPromise = fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }).then(async (response) => {
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Profile fetch HTTP error:', response.status, errorText);
            throw new Error(`Profile fetch failed: ${response.status}`);
          }
          const data = await response.json();
          console.log('Profile data received:', data);
          // The endpoint returns {success: true, user: {user: {...}, profile: {...}}}
          // We want the profile data
          const profileData = data.user?.profile || data.user;
          return { data: profileData, error: null };
        }).catch((error) => {
          console.error('Profile fetch network error:', error);
          throw error;
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 10000) // 10 second timeout
        );
        
        const { data: profileData, error } = await Promise.race([
          profileFetchPromise,
          timeoutPromise
        ]) as any;
        
        const fetchTime = Date.now() - startTime;
        console.log(`✅ Profile fetch completed in ${fetchTime}ms`);

        if (error) {
          console.error('❌ Profile fetch failed:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          
          // Force complete sign out with storage clearing
          await clearAuthStorage();
          await supabase.auth.signOut({ scope: 'local' });
          setAuthState({ session: null, user: null, supabaseUser: null });
          setIsLoading(false);
          clearTimeout(timeoutId);
          router.replace('/login');
          return;
        }

        profile = profileData;
        setAuthState({
          session,
          user: profile,
          supabaseUser: session.user,
        });

      } catch (dbError: any) {
        const fetchTime = Date.now() - startTime;
        console.error('❌ Profile fetch exception after', fetchTime, 'ms:', dbError);
        console.error('Exception details:', JSON.stringify(dbError, null, 2));
        
        // Force complete sign out on timeout
        await clearAuthStorage();
        await supabase.auth.signOut({ scope: 'local' });
        setAuthState({ session: null, user: null, supabaseUser: null });
        setIsLoading(false);
        clearTimeout(timeoutId);
        router.replace('/login');
        return;
      }


      // Check account status (banned/deactivated) - only redirect on initial sign-in
      if (profile && shouldNavigate) {
        // ALWAYS check if user is deactivated - this takes priority over everything
        if (profile.account_status === 'deactivated') {
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
          const currentRoute = window.location.pathname || '';
          if (!currentRoute.includes('/banned')) {
            setIsLoading(false);
            clearTimeout(timeoutId);
            router.replace('/banned' as any);
          } else {
            setIsLoading(false);
            clearTimeout(timeoutId);
          }
          return;
        }
      }

      // Only navigate on initial sign-in, not on token refresh
      if (shouldNavigate && profile) {
        const suspensionStatus = await checkSuspensionStatus();
        if (suspensionStatus && suspensionStatus.isSuspended) {
          setIsLoading(false);
          clearTimeout(timeoutId);
          router.replace('/suspended' as any);
          return;
        }
        
        let applicationStatus = null;
        if (profile.role === 'lawyer' || profile.pending_lawyer) {
          applicationStatus = await checkLawyerApplicationStatus();
        }
        
        if (profile.pending_lawyer) {
          const redirectPath = `/lawyer-status/${applicationStatus || 'pending'}`;
          console.log(`🚀 Navigating to: ${redirectPath} (pending lawyer)`);
          setIsLoading(false);
          clearTimeout(timeoutId);
          router.replace(redirectPath as any);
        } else {
          const redirectPath = getRoleBasedRedirect(profile.role, profile.is_verified, false);
          console.log(`🚀 Navigating to: ${redirectPath} (role: ${profile.role})`);
          setIsLoading(false);
          clearTimeout(timeoutId);
          router.replace(redirectPath as any);
        }
      } else {
        // Token refresh - just update state, don't navigate
        console.log('🔄 Token refreshed, keeping user on current page');
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
            const currentPath = window.location.pathname || '';
            console.log(`🎯 Auth event: ${event}, current path: ${currentPath}`);

            if (event === 'SIGNED_IN' && session) {
              // Auto-navigate after sign-in when user is on login, root, or OTP verification pages
              const isOnLoginPage = currentPath === '/login' || currentPath === '/';
              const isOnOTPPage = currentPath.includes('/onboarding/verify-otp') || currentPath.includes('/onboarding/otp-success');
              const shouldNavigate = isOnLoginPage || isOnOTPPage;
              console.log(`📍 SIGNED_IN event - shouldNavigate: ${shouldNavigate} (login: ${isOnLoginPage}, otp: ${isOnOTPPage})`);
              await handleAuthStateChange(session, shouldNavigate);
            } else if (event === 'TOKEN_REFRESHED' && session) {
              console.log('📍 TOKEN_REFRESHED event - will NOT navigate');
              await handleAuthStateChange(session, false);
            } else if (event === 'SIGNED_OUT') {
              console.log('📍 SIGNED_OUT event');
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
      setIsLoading(true);
      setHasRedirectedToStatus(false);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
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
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Login failed. Please try again' };
    } catch (error: any) {
      console.error('Sign in error:', error);
      setIsLoading(false);
      return { success: false, error: 'Network error. Please check your connection' };
    }
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

  const refreshUserData = async (): Promise<User | null> => {
    try {
      if (authState.session?.user?.id) {
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
          
          if (profile.account_status === 'deactivated') {
            const currentRoute = window.location.pathname || '';
            if (!currentRoute.includes('/deactivated')) {
              router.replace('/deactivated' as any);
            }
          }
          
          return profile;
        } else {
          console.error('Profile refresh error:', error);
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('Profile refresh failed:', error);
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
