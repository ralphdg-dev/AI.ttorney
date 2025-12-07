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

      const response: any = await fetch(`${apiUrl}/api/user/moderation-status`, {
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

      const response: any = await fetch(`${apiUrl}/api/lawyer-applications/me`, {
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
        
        const profileFetchPromise = fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }).then(async (response) => {
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
        
        // Don't auto-redirect to status screens on login
        // Users should access status screens manually via sidebar "Apply to be a Lawyer"
        // Just proceed with normal role-based redirect
        {
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
      console.log('🔐 [AUTH] Starting AuthContext signIn...');
      console.log('🔍 [AUTH] Email:', email);
      console.log('🔍 [AUTH] Password length:', password.length);
      
      setIsLoading(true);
      setHasRedirectedToStatus(false);
      
      console.log('🔍 [AUTH] Calling supabase.auth.signInWithPassword...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('🔍 [AUTH] Supabase auth response:');
      console.log('  - Error:', error);
      console.log('  - Data session:', !!data.session);
      console.log('  - Data user:', !!data.user);
      console.log('  - User ID:', data.user?.id);
      console.log('  - User email:', data.user?.email);

      if (error) {
        console.error('❌ [AUTH] Supabase auth error:', error);
        console.error('❌ [AUTH] Error message:', error.message);
        console.error('❌ [AUTH] Error status:', error.status);
        console.error('❌ [AUTH] Full error object:', JSON.stringify(error, null, 2));
        
        let errorMessage = 'Invalid email or password';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection';
        } else if (error.message.includes('Email not confirmed')) {
          // Bypass Supabase email confirmation check - we use custom OTP verification
          // Allow login to proceed and let server handle verification redirect
          console.log('📧 [AUTH] Supabase email not confirmed, but proceeding with custom verification system');
          console.log('📧 [AUTH] We will check our custom is_verified field instead');
          // Don't return error, proceed with login flow even without Supabase email confirmation
        } else if (error.message.includes('verification') || error.message.includes('confirm')) {
          // Handle any other verification-related errors from Supabase
          console.log('📧 [AUTH] Supabase verification issue, proceeding with custom verification system');
          // Don't return error, proceed with login flow
          // Don't return error, proceed with login flow
        } else {
          errorMessage = error.message;
          console.error('❌ [AUTH] Returning error:', errorMessage);
          setIsLoading(false);
          return { success: false, error: errorMessage };
        }
        
        // Only return error if it's not an email confirmation or verification case
        if (!error.message.includes('Email not confirmed') && 
            !error.message.includes('verification') && 
            !error.message.includes('confirm')) {
          console.error('❌ [AUTH] Returning error (not verification related):', errorMessage);
          setIsLoading(false);
          return { success: false, error: errorMessage };
        }
      }

      console.log('🔍 [AUTH] Checking session and user data...');
      console.log('🔍 [AUTH] Session exists:', !!data.session);
      console.log('🔍 [AUTH] User exists:', !!data.user);
      console.log('🔍 [AUTH] Error exists:', !!error);
      
      // If there's a verification error but we have user data, proceed anyway
      const hasVerificationError = error && (
        error.message.includes('Email not confirmed') || 
        error.message.includes('verification') || 
        error.message.includes('confirm')
      );
      
      if (hasVerificationError) {
        console.log('📧 [AUTH] Has verification error, attempting to get user data directly...');
        
        // For email_not_confirmed errors, we need to get user data differently
        // Try to get user by email from our users table directly
        try {
          console.log('🔍 [AUTH] Querying users table directly by email...');
          
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('id, is_verified, role, full_name, email')
            .eq('email', email)
            .single();
          
          console.log('� [AUTH] Direct profile query result:', profileData);
          console.log('🔍 [AUTH] Direct profile query error:', profileError);
          
          if (profileData) {
            console.log('✅ [AUTH] Found user profile directly, proceeding with custom verification...');
            
            const requiresVerification = profileData?.role === 'guest' && !profileData?.is_verified;
            let otpSent = false;
            
            console.log('🔍 [AUTH] Verification check (direct):');
            console.log('  - Role:', profileData?.role);
            console.log('  - Is verified:', profileData?.is_verified);
            console.log('  - Requires verification:', requiresVerification);
            
            // Send OTP for unverified users
            if (requiresVerification && profileData?.email) {
              console.log('📧 [AUTH] User requires verification, sending OTP...');
              try {
                const API_URL = await NetworkConfig.getBestApiUrl();
                console.log('🔍 [AUTH] API URL:', API_URL);
                console.log('🔍 [AUTH] Sending OTP request to:', `${API_URL}/auth/send-otp`);
                
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
                
                console.log('🔍 [AUTH] OTP response status:', otpResponse.status);
                
                if (otpResponse.ok) {
                  otpSent = true;
                  console.log('✅ [AUTH] Verification OTP sent to unverified user');
                } else {
                  console.warn('⚠️ [AUTH] Failed to send verification OTP, status:', otpResponse.status);
                  const errorText = await otpResponse.text();
                  console.warn('⚠️ [AUTH] OTP error response:', errorText);
                }
              } catch (otpError) {
                console.warn('⚠️ [AUTH] Error sending verification OTP:', otpError);
              }
            }
            
            console.log('🔍 [AUTH] Final verification status (direct):');
            console.log('  - Requires verification:', requiresVerification);
            console.log('  - OTP sent:', otpSent);
            console.log('  - Is verified:', profileData?.is_verified || false);
            
            // Return success with verification status
            console.log('✅ [AUTH] Returning success with verification data (direct)');
            
            // Since we bypassed Supabase Auth, we need to manually update auth state
            // Create a mock session-like object for our custom verification system
            const mockUser = {
              id: profileData.id,
              email: profileData.email,
              user_metadata: {
                full_name: profileData.full_name
              },
              app_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString()
            } as SupabaseUser;
            
            // Create a mock session so AuthGuard recognizes user as authenticated
            // We need to create a session that can be used for API calls
            const mockSession = {
              access_token: `bypassed_auth_${profileData.id}`, // Use user ID in token for API recognition
              refresh_token: 'mock_refresh_token',
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              token_type: 'bearer',
              user: mockUser
            } as Session;
            
            console.log('🔄 [AUTH] Manually updating auth state for bypassed user...');
            
            // Update the auth state manually since Supabase auth was bypassed
            setAuthState({
              session: mockSession, // Provide mock session so isAuthenticated returns true
              user: profileData, // Use our profile data as user
              supabaseUser: mockUser // Mock supabase user for compatibility
            });
            
            console.log('✅ [AUTH] Auth state updated - user should now be authenticated');
            
            // Determine redirect path based on role
            let redirectPath: string = '/home'; // Use /home instead of /home/index
            if (profileData.role === 'verified_lawyer') {
              redirectPath = '/lawyer'; // Use /lawyer instead of /lawyer/index
            } else if (profileData.role === 'registered_user') {
              redirectPath = '/home'; // Use /home instead of /home/index
            } else if (profileData.role === 'guest' && profileData.is_verified) {
              redirectPath = '/role-selection';
            }
            
            console.log('🔄 [AUTH] Determined redirect path:', redirectPath);
            
            // Set loading to false first
            setIsLoading(false);
            
            // Return success immediately - let the login component handle navigation
            const result = { 
              success: true, 
              data: {
                requires_verification: requiresVerification,
                otp_sent: otpSent,
                is_verified: profileData?.is_verified || false,
                profile: profileData,
                redirect_path: redirectPath
              }
            };
            
            console.log('✅ [AUTH] Returning success - login component will handle navigation');
            return result;
          } else {
            console.error('❌ [AUTH] No profile found for email:', email);
            setIsLoading(false);
            return { success: false, error: 'User account not found. Please register first.' };
          }
        } catch (directProfileError) {
          console.error('❌ [AUTH] Error querying profile directly:', directProfileError);
          setIsLoading(false);
          return { success: false, error: 'Failed to verify user account.' };
        }
      } else if (!data.session && !data.user && !error) {
        console.error('❌ [AUTH] No session, no user, and no error - this means the user likely doesn\'t exist in Supabase Auth');
        console.error('❌ [AUTH] This happens when you manually add users to the users table but they don\'t exist in Supabase Auth');
        console.error('❌ [AUTH] Solution: The user needs to register first, or be created in Supabase Auth');
        setIsLoading(false);
        return { success: false, error: 'User account not found. Please register first.' };
      }
      
      console.log('🔍 [AUTH] Session object:', data.session);
      console.log('🔍 [AUTH] User object:', data.user);

      if (data.user) { // Changed from (data.session && data.user) to just data.user
        console.log('✅ [AUTH] Supabase auth successful, fetching profile...');
        
        // Fetch profile to check verification status
        try {
          console.log('🔍 [AUTH] Querying users table for profile...');
          
          const { data: profileData } = await supabase
            .from('users')
            .select('is_verified, role, full_name, email')
            .eq('id', data.user.id)
            .single();
          
          console.log('🔍 [AUTH] Profile data from users table:', profileData);
          
          const requiresVerification = profileData?.role === 'guest' && !profileData?.is_verified;
          let otpSent = false;
          
          console.log('🔍 [AUTH] Verification check:');
          console.log('  - Role:', profileData?.role);
          console.log('  - Is verified:', profileData?.is_verified);
          console.log('  - Requires verification:', requiresVerification);
          
          // Send OTP for unverified users
          if (requiresVerification && profileData?.email) {
            console.log('📧 [AUTH] User requires verification, sending OTP...');
            try {
              const API_URL = await NetworkConfig.getBestApiUrl();
              console.log('🔍 [AUTH] API URL:', API_URL);
              console.log('🔍 [AUTH] Sending OTP request to:', `${API_URL}/auth/send-otp`);
              
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
              
              console.log('🔍 [AUTH] OTP response status:', otpResponse.status);
              
              if (otpResponse.ok) {
                otpSent = true;
                console.log('✅ [AUTH] Verification OTP sent to unverified user');
              } else {
                console.warn('⚠️ [AUTH] Failed to send verification OTP, status:', otpResponse.status);
                const errorText = await otpResponse.text();
                console.warn('⚠️ [AUTH] OTP error response:', errorText);
              }
            } catch (otpError) {
              console.warn('⚠️ [AUTH] Error sending verification OTP:', otpError);
            }
          }
          
          console.log('🔍 [AUTH] Final verification status:');
          console.log('  - Requires verification:', requiresVerification);
          console.log('  - OTP sent:', otpSent);
          console.log('  - Is verified:', profileData?.is_verified || false);
          
          // Return success with verification status
          console.log('✅ [AUTH] Returning success with verification data');
          return { 
            success: true, 
            data: {
              requires_verification: requiresVerification,
              otp_sent: otpSent,
              is_verified: profileData?.is_verified || false,
              profile: profileData
            }
          };
        } catch (profileError) {
          console.warn('⚠️ [AUTH] Could not fetch profile during sign-in:', profileError);
          console.log('✅ [AUTH] Returning basic success (profile fetch failed)');
          return { success: true };
        }
      }

      console.error('❌ [AUTH] No session or user data from Supabase');
      setIsLoading(false);
      return { success: false, error: 'Login failed. Please try again' };
    } catch (error: any) {
      console.error('❌ [AUTH] Sign in exception:', error);
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
