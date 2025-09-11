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
  hasRole: (role: UserRole) => boolean;
  isLawyer: () => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    supabaseUser: null,
  });
  const [isLoading, setIsLoading] = useState(true);

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

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              if (session) {
                await handleAuthStateChange(session);
              }
            } else if (event === 'SIGNED_OUT') {
              setAuthState({
                session: null,
                user: null,
                supabaseUser: null,
              });
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

      // Handle navigation after login if requested
      if (shouldNavigate && profile) {
        const redirectPath = getRoleBasedRedirect(profile.role, profile.is_verified);
        console.log('AuthContext: Navigating to', redirectPath, 'for role', profile.role);
        router.replace(redirectPath as any);
      }
    } catch (error) {
      console.error('Error handling auth state change:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      // Auth state change will be handled by the listener
      router.replace('/login' as any);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const setUserData = (userData: User | null) => {
    setAuthState(prev => ({
      ...prev,
      user: userData,
    }));
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


  const value: AuthContextType = {
    user: authState.user,
    session: authState.session,
    isLoading,
    isAuthenticated: !!authState.session && !!authState.user,
    signIn,
    signOut,
    setUser: setUserData,
    hasRole,
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
