import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, clearAuthStorage } from '../config/supabase';
import { router, useSegments } from 'expo-router';
import { getRoleBasedRedirect } from '../config/routes';
import { useToast } from '@/components/ui/toast';
import { createSafeAreaToastRenderer } from '@/components/ui/SafeAreaToast';
import { NetworkConfig } from '../utils/networkConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GUEST_SESSION_STORAGE_KEY } from '../config/guestConfig';

// Role hierarchy based on backend schema
export type UserRole = 'guest' | 'registered_user' | 'authenticated' | 'verified_lawyer' | 'admin' | 'superadmin';

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
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; data?: any }>;
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
  const segments = useSegments();

  // React Native compatible route detection
  const getCurrentRoute = React.useCallback(() => {
    return '/' + segments.join('/');
  }, [segments]);

  // Clear guest session when user authenticates to prevent lingering sessions
  const clearGuestSessionOnAuth = React.useCallback(async () => {
    try {
      await AsyncStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
      console.log('🗑️ Guest session cleared on authentication');
    } catch (error) {
      console.warn('❌ Error clearing guest session on auth:', error);
    }
  }, []);


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

  // Add a flag to prevent multiple simultaneous auth state changes
  const [isProcessingAuth, setIsProcessingAuth] = React.useState(false);

  const handleAuthStateChange = React.useCallback(async (session: any, shouldNavigate: boolean = true) => {
    const currentPath = getCurrentRoute();
    console.log(`🔄 handleAuthStateChange called - shouldNavigate: ${shouldNavigate}, current path: ${currentPath}`);
    
    // Prevent multiple simultaneous auth processing
    if (isProcessingAuth) {
      console.log('🔄 Auth processing already in progress, skipping...');
      return;
    }
    
    setIsProcessingAuth(true);
    
    const authTimeoutId = setTimeout(() => {
      console.warn('Auth timeout');
      toast.show({
        placement: 'top',
        render: createSafeAreaToastRenderer(
          'top', 
          'warning', 
          'solid', 
          'Authentication Timeout',
          'Sign in is taking longer than expected. Please check your connection and try again.'
        ),
      });
      setIsLoading(false);
    }, 30000);
    
    try {
      if (!session) {
        setAuthState({ session: null, user: null, supabaseUser: null });
        setIsLoading(false);
        clearTimeout(authTimeoutId);
        return;
      }

      // Get user profile - use server API to bypass RLS issues
      let profile = null;
      const startTime = Date.now();
      
      try {
        console.log('🔍 Fetching profile for user:', session.user.id);
        
        // Fetch profile through server API with fallback (bypasses RLS, faster for lawyers)
        const API_URL = await NetworkConfig.getBestApiUrl();
        const controller = new AbortController();
        const fetchTimeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const profileFetchPromise = fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }).then(async (response) => {
          clearTimeout(fetchTimeoutId);
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Profile fetch failed:', response.status, errorText);
            
            // If server is down (502, 503, 504), fall back to Supabase direct
            if (response.status >= 502 && response.status <= 504) {
              console.log('🔄 Server unavailable, falling back to Supabase direct fetch');
              const { data: profileData, error: profileError } = await supabase.auth.getUser();
              if (profileError) throw profileError;
              return { success: true, user: { user: profileData.user, profile: profileData.user } };
            }
            
            throw new Error(`Profile fetch failed: ${response.status}`);
          }
          const data = await response.json();
          console.log('Profile data received:', data);
          // The endpoint returns {success: true, user: {user: {...}, profile: {...}}}
          // We want the profile data
          const profileData = data.user?.profile || data.user;
          return { data: profileData, error: null };
        }).catch(async (error) => {
          clearTimeout(fetchTimeoutId);
          console.error('Profile fetch network error:', error);
          
          // Handle network errors with fallback to Supabase
          if (error.name === 'AbortError' || error.message.includes('fetch') || error.message.includes('network')) {
            console.log('🔄 Network error, falling back to Supabase direct fetch');
            try {
              const { data: profileData, error: profileError } = await supabase.auth.getUser();
              if (profileError) throw profileError;
              return { data: profileData.user, error: null };
            } catch (fallbackError) {
              console.error('Supabase fallback also failed:', fallbackError);
              throw error; // Throw original error
            }
          }
          throw error;
        });
        
        const { data: profileData, error } = await profileFetchPromise;
        
        const fetchTime = Date.now() - startTime;
        console.log(`✅ Profile fetch completed in ${fetchTime}ms`);

        if (error) {
          console.error('❌ Profile fetch failed:', error);
          const errorObj = error as any;
          console.error('Error details:', {
            message: errorObj?.message || String(error),
            name: errorObj?.name || 'Unknown',
            stack: errorObj?.stack,
            apiUrl: API_URL,
            userId: session.user.id,
            timestamp: new Date().toISOString()
          });
          
          // Force complete sign out with storage clearing
          await clearAuthStorage();
          await supabase.auth.signOut({ scope: 'local' });
          setAuthState({ session: null, user: null, supabaseUser: null });
          setIsLoading(false);
          clearTimeout(authTimeoutId);
          router.replace('/login');
          return;
        }

        profile = profileData;
        
        // Clear guest session when user successfully authenticates
        await clearGuestSessionOnAuth();
        
        setAuthState({
          session,
          user: profile,
          supabaseUser: session.user,
        });
        
        // Reset processing flag on success
        setIsProcessingAuth(false);

      } catch (dbError: any) {
        const fetchTime = Date.now() - startTime;
        console.error('❌ Profile fetch exception after', fetchTime, 'ms:', dbError);
        console.error('Exception details:', {
          message: dbError?.message || String(dbError),
          name: dbError?.name || 'Unknown',
          stack: dbError?.stack,
          timestamp: new Date().toISOString()
        });
        
        // Clear timeout if it exists
        if (typeof authTimeoutId !== 'undefined') {
          clearTimeout(authTimeoutId);
        }
        
        // Force complete sign out on error
        await clearAuthStorage();
        await supabase.auth.signOut({ scope: 'local' });
        setAuthState({ session: null, user: null, supabaseUser: null });
        setIsLoading(false);
        
        // Reset processing flag on error
        setIsProcessingAuth(false);
        
        // Only redirect if not already on login page to prevent loops
        const currentRoute = getCurrentRoute();
        if (currentRoute !== '/login') {
          router.replace('/login');
        }
        return;
      }


      // Check account status (banned/deactivated) - only redirect on initial sign-in
      if (profile && shouldNavigate) {
        const currentRoute = getCurrentRoute();
        
        // Skip redirects if user is already on a valid page (chatbot, guides, etc.) or in onboarding flow
        const validPages = ['/chatbot', '/guides', '/glossary', '/article', '/help', '/about', '/settings', '/onboarding'];
        const isValidPage = validPages.some(page => currentRoute.includes(page));
        
        // Only skip redirects for token refreshes (shouldNavigate=false) or when already on valid pages
        if (isValidPage && currentRoute !== '/login' && currentRoute !== '/' && !shouldNavigate) {
          console.log('🔐 User is on a valid page and this is a token refresh, skipping redirect:', currentRoute);
          console.log('   shouldNavigate:', shouldNavigate);
          console.log('   isValidPage:', isValidPage);
          setIsLoading(false);
          clearTimeout(authTimeoutId);
          return;
        }
        
        // Log routing decisions for debugging
        if (shouldNavigate) {
          console.log('🚀 AuthContext routing decision - shouldNavigate:', shouldNavigate);
          console.log('   Current route:', currentRoute);
          console.log('   User role:', profile?.role);
          console.log('   Is verified:', profile?.is_verified);
        }
        
        // ALWAYS check if user is deactivated - this takes priority over everything
        if (profile.account_status === 'deactivated') {
          console.log('🔐 User is deactivated, checking current route');
          // Only redirect if not already on deactivated page to prevent infinite loops
          if (!currentRoute.includes('/deactivated')) {
            console.log('🔐 Redirecting to deactivated page');
            setIsLoading(false);
            clearTimeout(authTimeoutId);
            router.replace('/deactivated' as any);
          } else {
            console.log('🔐 Already on deactivated page, not redirecting');
            setIsLoading(false);
            clearTimeout(authTimeoutId);
          }
          return;
        }

        // Check if user is banned FIRST - this takes priority over everything
        if (profile.account_status === 'banned') {
          const currentRoute = getCurrentRoute();
          if (!currentRoute.includes('/banned')) {
            setIsLoading(false);
            clearTimeout(authTimeoutId);
            router.replace('/banned' as any);
          } else {
            setIsLoading(false);
            clearTimeout(authTimeoutId);
          }
          return;
        }
      }

      // Only navigate on initial sign-in, not on token refresh
      if (shouldNavigate && profile) {
        const suspensionStatus = await checkSuspensionStatus();
        if (suspensionStatus && suspensionStatus.isSuspended) {
          setIsLoading(false);
          clearTimeout(authTimeoutId);
          try {
            router.replace('/suspended' as any);
          } catch (routerError) {
            console.warn('Router not ready during suspension redirect:', routerError);
          }
          return;
        }
        
        let applicationStatus = null;
        if (profile.role === 'lawyer' || profile.pending_lawyer) {
          applicationStatus = await checkLawyerApplicationStatus();
        }
        
        if (profile.pending_lawyer && applicationStatus === 'accepted') {
          // Only auto-redirect to status page if application is accepted
          const redirectPath = `/onboarding/lawyer/lawyer-status/accepted`;
          console.log(`🚀 Navigating to: ${redirectPath} (accepted lawyer)`);
          setIsLoading(false);
          clearTimeout(authTimeoutId);
          try {
            router.replace(redirectPath as any);
          } catch (routerError) {
            console.warn('Router not ready during lawyer redirect:', routerError);
          }
        } else {
          // For unverified users (guest role + is_verified=false), redirect to OTP verification
          // For others, use normal role-based redirect
          let redirectPath: string;
          if (profile.role === 'guest' && !profile.is_verified) {
            // Pass email as parameter for OTP verification
            const email = profile.email || '';
            redirectPath = `/onboarding/verify-otp?email=${encodeURIComponent(email)}`;
            console.log(`🚀 Navigating to: ${redirectPath} (unverified user - needs OTP verification)`);
          } else {
            redirectPath = getRoleBasedRedirect(profile.role, profile.is_verified, false);
            console.log(`🚀 Navigating to: ${redirectPath} (role: ${profile.role}, verified: ${profile.is_verified})`);
          }
          
          setIsLoading(false);
          clearTimeout(authTimeoutId);
          try {
            router.replace(redirectPath as any);
          } catch (routerError) {
            console.warn('Router not ready during role redirect:', routerError);
          }
        }
      } else {
        // Token refresh - just update state, don't navigate
        console.log('🔄 Token refreshed, keeping user on current page');
        setIsLoading(false);
        clearTimeout(authTimeoutId);
      }
    } catch (error) {
      console.error('Error handling auth state change:', error);
      setAuthState({ session: null, user: null, supabaseUser: null });
      setIsLoading(false);
      setIsProcessingAuth(false);
      clearTimeout(authTimeoutId);
    }
  }, [checkLawyerApplicationStatus, checkSuspensionStatus, getCurrentRoute, toast, isProcessingAuth]);

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
            const currentPath = getCurrentRoute();
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
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection';
        } else if (error.message.includes('Email not confirmed')) {
          // Bypass Supabase email confirmation check - we use custom OTP verification
          // Allow login to proceed and let server handle verification redirect
          console.log('📧 Supabase email not confirmed, but allowing login for custom verification');
          // Don't return error, proceed with login flow
        } else {
          errorMessage = error.message;
          setIsLoading(false);
          return { success: false, error: errorMessage };
        }
        
        // Only return error if it's not the email confirmation case
        if (!error.message.includes('Email not confirmed')) {
          setIsLoading(false);
          return { success: false, error: errorMessage };
        }
      }

      if (data.session && data.user) {
        // Fetch profile to check verification status
        try {
          const { data: profileData } = await supabase
            .from('users')
            .select('is_verified, role, full_name, email')
            .eq('id', data.user.id)
            .single();
          
          const requiresVerification = profileData?.role === 'guest' && !profileData?.is_verified;
          let otpSent = false;
          
          // Send OTP for unverified users
          if (requiresVerification && profileData?.email) {
            try {
              const API_URL = await NetworkConfig.getBestApiUrl();
              const otpResponse = await fetch(`${API_URL}/auth/send-otp`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: profileData.email,
                  otp_type: 'email_verification',
                  user_name: profileData.full_name || 'User'
                }),
              });
              
              if (otpResponse.ok) {
                otpSent = true;
                console.log('✅ Verification OTP sent to unverified user');
              } else {
                console.warn('⚠️ Failed to send verification OTP');
              }
            } catch (otpError) {
              console.warn('⚠️ Error sending verification OTP:', otpError);
            }
          }
          
          // Return success with verification status
          return { 
            success: true, 
            data: {
              requires_verification: requiresVerification,
              otp_sent: otpSent,
              is_verified: profileData?.is_verified || false
            }
          };
        } catch (profileError) {
          console.warn('Could not fetch profile during sign-in:', profileError);
          return { success: true };
        }
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
            const currentRoute = getCurrentRoute();
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
