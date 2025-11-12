import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, clearAuthStorage, resetSupabaseClient } from '../config/supabase';
import { router } from 'expo-router';
import { getRoleBasedRedirect } from '../config/routes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GUEST_SESSION_STORAGE_KEY, validateGuestSession, isSessionExpired } from '../config/guestConfig';
import { useToast, Toast, ToastTitle, ToastDescription } from '../components/ui/toast';

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
  birthdate?: string;
  profile_photo?: string;
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
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; suppressToast?: boolean }>;
  signUp: (email: string, password: string, metadata: { username: string; first_name: string; last_name: string; birthdate: string }) => Promise<{ success: boolean; error?: string; user?: any }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  setUser: (user: User | null) => void;
  refreshUserData: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isLawyer: () => boolean;
  isAdmin: () => boolean;
  checkLawyerApplicationStatus: () => Promise<any>;
  checkSuspensionStatus: () => Promise<{ isSuspended: boolean; suspensionCount: number; suspensionEnd: string | null; needsLiftedAcknowledgment: boolean } | null>;
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
  const [isGuestMode, setIsGuestMode] = useState(false);
  const toast = useToast();
  const adminToastShownAtRef = React.useRef<number>(0);
  const adminBlockInProgressRef = React.useRef<boolean>(false);


  const checkSuspensionStatus = React.useCallback(async (): Promise<{ isSuspended: boolean; suspensionCount: number; suspensionEnd: string | null; needsLiftedAcknowledgment: boolean } | null> => {
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
        
        // Check if user needs to acknowledge suspension lifted
        // This happens when:
        // 1. Account status is NOT suspended (suspension has ended or been lifted)
        // 2. There is a most recent suspension
        // 3. lifted_acknowledged is false or null
        const needsLiftedAcknowledgment = 
          data.account_status !== 'suspended' && 
          data.most_recent_suspension_id && 
          (data.lifted_acknowledged === false || data.lifted_acknowledged === null);
        
        return {
          isSuspended: data.account_status === 'suspended',
          suspensionCount: data.suspension_count || 0,
          suspensionEnd: data.suspension_end || null,
          needsLiftedAcknowledgment,
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

  const handleAuthStateChange = React.useCallback(async (session: Session, shouldNavigate = false): Promise<boolean> => {
    try {
      console.log('🔐 handleAuthStateChange called:', { shouldNavigate, userId: session.user.id, isSigningOut });
      
      // Skip processing if we're in the middle of signing out
      if (isSigningOut) {
        console.log('🚫 Skipping auth state change during sign out');
        return false;
      }
      
      // ⚡ FAANG OPTIMIZATION: Run ALL API calls in PARALLEL + Cache profile data
      // This reduces login time from ~3-5 seconds to ~1 second
      const [profileResult, suspensionResult, lawyerStatusResult] = await Promise.allSettled([
        // 1. Fetch FULL user profile (including birthdate, profile_photo)
        supabase.from('users').select('id,email,username,full_name,role,is_verified,pending_lawyer,birthdate,profile_photo,created_at,updated_at').eq('id', session.user.id).single(),
        // 2. Check suspension status (only if we have a token)
        session?.access_token ? checkSuspensionStatus() : Promise.resolve(null),
        // 3. Pre-fetch lawyer status (we'll use it if needed)
        session?.access_token ? checkLawyerApplicationStatus() : Promise.resolve(null)
      ]);

      // Handle profile fetch result with better error recovery
      if (profileResult.status === 'rejected') {
        console.error('❌ Profile fetch rejected:', profileResult.reason);
        setIsLoading(false);
        return false;
      }
      
      if (profileResult.status === 'fulfilled' && profileResult.value.error) {
        console.error('❌ Profile fetch error:', profileResult.value.error);
        setIsLoading(false);
        return false;
      }

      const profile = profileResult.value.data;
      if (!profile) {
        console.error('❌ No profile data returned');
        setIsLoading(false);
        return false;
      }

      console.log('✅ Profile loaded:', { username: profile.username, role: profile.role });

      if (profile.role === 'admin' || profile.role === 'superadmin') {
        if (adminBlockInProgressRef.current) {
          // Already handled this attempt; avoid duplicate toasts/actions
          setIsLoading(false);
          return false;
        }
        adminBlockInProgressRef.current = true;
        // Do not show toast here; caller (login screen) will display a single toast
        try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
        try { await clearAuthStorage(); } catch {}
        setAuthState({ session: null, user: null, supabaseUser: null });
        setHasRedirectedToStatus(false);
        setIsGuestMode(false);
        setIsLoading(false);
        // Reset guard after short delay to allow future attempts
        setTimeout(() => { adminBlockInProgressRef.current = false; }, 2000);
        return false;
      }

      // ⚡ FAANG OPTIMIZATION: Cache profile data in AsyncStorage for instant loads
      try {
        await AsyncStorage.setItem(
          `profile_cache_${session.user.id}`,
          JSON.stringify({
            profile,
            cachedAt: Date.now(),
          })
        );
      } catch (error) {
        console.warn('Failed to cache profile:', error);
      }

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
        
        // Check if user is currently suspended
        if (suspensionStatus && suspensionStatus.isSuspended) {
          console.log('🚫 User is suspended, redirecting to suspended screen');
          setIsLoading(false);
          router.replace('/suspended' as any);
          return true;
        }
        
        // Check if user needs to acknowledge suspension lifted
        if (suspensionStatus && suspensionStatus.needsLiftedAcknowledgment) {
          console.log('✅ User suspension lifted, redirecting to suspension-lifted screen');
          setIsLoading(false);
          router.replace('/suspension-lifted' as any);
          return true;
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
          
          // Special handling for accepted status - show approval modal
          if (applicationStatus === 'accepted') {
            console.log('🎉 Application accepted! Redirecting to acceptance page');
            setIsLoading(false);
            router.replace('/onboarding/lawyer/lawyer-status/accepted' as any);
            return true;
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
          return true;
        } else {
          // User doesn't have pending lawyer status, redirect normally
          const redirectPath = getRoleBasedRedirect(profile.role, profile.is_verified, false);
          console.log('🔄 Redirecting user to:', redirectPath);
          setIsLoading(false);
          router.replace(redirectPath as any);
          return true;
        }
      } else {
        // Not navigating, just set loading to false
        setIsLoading(false);
        return true;
      }
    } catch (error) {
      console.error('❌ Error handling auth state change:', error);
      setIsLoading(false);
      return false;
    }
  }, [checkLawyerApplicationStatus, checkSuspensionStatus, isSigningOut]);

  useEffect(() => {
    // Initialize auth state and listen for auth changes
    const initialize = async () => {
      try {
        // Check for guest session first (before Supabase auth)
        const guestSessionData = await AsyncStorage.getItem(GUEST_SESSION_STORAGE_KEY);
        if (guestSessionData) {
          const guestSession = JSON.parse(guestSessionData);
          
          // Validate session integrity (security check)
          if (!validateGuestSession(guestSession)) {
            console.warn('⚠️ Invalid guest session detected on app load, clearing...');
            await AsyncStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
            setIsGuestMode(false);
            setAuthState({ session: null, user: null, supabaseUser: null });
            setIsLoading(false);
            setInitialAuthCheck(true);
            return;
          }
          
          // Check if guest session is still valid
          if (!isSessionExpired(guestSession.expiresAt)) {
            console.log('👤 Valid guest session found on app load');
            console.log('   Session ID:', guestSession.id);
            console.log('   Prompts used:', guestSession.promptCount, '/ 15');
            setIsGuestMode(true);
            setAuthState({ session: null, user: null, supabaseUser: null });
            setIsLoading(false);
            setInitialAuthCheck(true);
            return; // Skip Supabase auth check
          } else {
            console.log('⏰ Guest session expired, clearing and redirecting to login...');
            await AsyncStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
            setIsGuestMode(false);
            setAuthState({ session: null, user: null, supabaseUser: null });
            setIsLoading(false);
            setInitialAuthCheck(true);
            // Redirect will happen in index.tsx since no auth and no guest mode
            return;
          }
        }

        // Check for existing session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error.message);
          await clearAuthStorage();
          setAuthState({ session: null, user: null, supabaseUser: null });
          setIsLoading(false);
          setInitialAuthCheck(true);
          return;
        }
        
        if (initialSession) {
          console.log('✅ Existing session found');
          await handleAuthStateChange(initialSession, false);
        } else {
          setAuthState({ session: null, user: null, supabaseUser: null });
          setIsLoading(false);
        }
        
        setInitialAuthCheck(true);

        // Auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: string, session: any) => {
            console.log('🔔 Auth event:', event, { hasSession: !!session, isSigningOut });
            
            // Ignore events during sign out (prevent race conditions)
            if (isSigningOut) {
              console.log('🚫 Ignoring auth event during sign out');
              return;
            }
            
            if (event === 'SIGNED_IN' && session) {
              console.log('✅ Processing SIGNED_IN event');
              await handleAuthStateChange(session, false);
            } else if (event === 'TOKEN_REFRESHED' && session) {
              console.log('🔄 Processing TOKEN_REFRESHED event');
              await handleAuthStateChange(session, false);
            } else if (event === 'SIGNED_OUT') {
              console.log('🚪 Processing SIGNED_OUT event');
              // Only update state if we're not already in the process of signing out
              if (!isSigningOut) {
                setAuthState({ session: null, user: null, supabaseUser: null });
                setHasRedirectedToStatus(false);
                setIsGuestMode(false);
                setIsLoading(false);
              }
            }
            
            // Ensure loading is turned off for all events except SIGNED_OUT (unless we're signing out)
            if (event !== 'SIGNED_OUT' || !isSigningOut) {
              setIsLoading(false);
            }
          }
        );

        setIsLoading(false);

        // Cleanup subscription on unmount
        return () => {
          console.log('🧹 Cleaning up auth listener');
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        setIsLoading(false);
      }
    };

    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Signing in:', email);
      setIsLoading(true);
      setHasRedirectedToStatus(false);
      setIsSigningOut(false); // Ensure we're not in signing out state
      
      // Clear stale data before login
      try {
        await clearAuthStorage();
        const guestSession = await AsyncStorage.getItem(GUEST_SESSION_STORAGE_KEY);
        if (guestSession) {
          await AsyncStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
          setIsGuestMode(false);
        }
        
        // Clear any cached profile data from previous sessions
        const allKeys = await AsyncStorage.getAllKeys();
        const profileKeys = allKeys.filter(key => key.startsWith('profile_cache_'));
        if (profileKeys.length > 0) await AsyncStorage.multiRemove(profileKeys);
        
      } catch (cleanupError) {
        console.warn('⚠️ Pre-login cleanup error (non-critical):', cleanupError);
      }
      
      // Reset auth state before login attempt
      setAuthState({ session: null, user: null, supabaseUser: null });
      
      // Fresh login attempt
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        console.error('❌ Login error:', error.message);
        setIsLoading(false);
        
        // Map errors to user-friendly messages
        const errorMap: Record<string, string> = {
          'Invalid login credentials': 'Invalid email or password',
          'Email not confirmed': 'Please verify your email address',
          'email_not_confirmed': 'Please verify your email address',
          'network': 'Network error. Please check your connection',
          'fetch': 'Network error. Please check your connection',
          'rate_limit': 'Too many attempts. Please try again later',
        };
        
        const errorMessage = Object.entries(errorMap).find(([key]) => 
          error.message.includes(key)
        )?.[1] || 'Invalid email or password';
        
        return { success: false, error: errorMessage };
      }

      if (data.session) {
        console.log('✅ Login successful, processing auth state...');
        const allowed = await handleAuthStateChange(data.session, true);
        if (!allowed) {
          return { success: false, error: 'Access denied', suppressToast: false };
        }
        return { success: true };
      }

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
      
      // CRITICAL: Clear any existing guest session before signup
      // This prevents guest mode from persisting after successful registration
      const guestSessionData = await AsyncStorage.getItem(GUEST_SESSION_STORAGE_KEY);
      if (guestSessionData) {
        console.log('🗑️ Clearing guest session before signup');
        await AsyncStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
        setIsGuestMode(false);
      }
      
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
      console.log('🚪 Signing out...');
      setIsSigningOut(true);
      setIsLoading(true); // Show loading during logout process
      
      // Perform cleanup first (synchronously)
      try {
        // Clear all cached profile data
        const allKeys = await AsyncStorage.getAllKeys();
        const profileKeys = allKeys.filter(key => key.startsWith('profile_cache_'));
        if (profileKeys.length > 0) await AsyncStorage.multiRemove(profileKeys);
        
        // Clear guest session if any
        await AsyncStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
        
        // Clear auth storage
        await clearAuthStorage();
        
        // Sign out from Supabase
        await supabase.auth.signOut({ scope: 'global' });
        
        console.log('✅ Cleanup complete');
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup error (non-critical):', cleanupError);
      }
      
      // Reset all auth state
      setAuthState({ session: null, user: null, supabaseUser: null });
      setHasRedirectedToStatus(false);
      setIsGuestMode(false);
      setIsLoading(false);
      setIsSigningOut(false);
      
      // Navigate to login
      router.replace('/login');
      
      console.log('✅ Logout complete');
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Nuclear fallback - force reset everything
      try {
        await resetSupabaseClient();
      } catch {}
      
      setAuthState({ session: null, user: null, supabaseUser: null });
      setHasRedirectedToStatus(false);
      setIsGuestMode(false);
      setIsLoading(false);
      setIsSigningOut(false);
      router.replace('/login');
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

  // ⚡ FAANG OPTIMIZATION: Lightweight profile refresh for profile page
  const refreshProfile = React.useCallback(async () => {
    const userId = authState.session?.user?.id;
    if (!userId) return;

    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('id,email,username,full_name,role,is_verified,pending_lawyer,birthdate,profile_photo,created_at,updated_at')
        .eq('id', userId)
        .single();

      if (!error && profile) {
        await AsyncStorage.setItem(
          `profile_cache_${userId}`,
          JSON.stringify({ profile, cachedAt: Date.now() })
        );

        setAuthState(prev => ({ ...prev, user: profile }));
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  }, [authState.session?.user?.id]);

  const hasRole = (role: UserRole): boolean => {
    return authState.user?.role === role;
  };

  const isLawyer = (): boolean => {
    return hasRole('verified_lawyer');
  };

  const isAdmin = (): boolean => {
    return hasRole('admin') || hasRole('superadmin');
  };

  const continueAsGuest = () => {
    console.log('👤 Continuing as guest');
    setIsGuestMode(true);
    setIsLoading(false);
    router.replace('/chatbot');
  };

  const value: AuthContextType = React.useMemo(() => ({
    user: authState.user,
    session: authState.session,
    isLoading,
    isAuthenticated: !!authState.session && !!authState.user,
    isGuestMode,
    signIn,
    signUp,
    signOut,
    continueAsGuest,
    setUser: setUserData,
    refreshUserData,
    refreshProfile,
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
  }), [authState.user, authState.session, isLoading, isGuestMode, hasRedirectedToStatus, isSigningOut, checkLawyerApplicationStatus, checkSuspensionStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
