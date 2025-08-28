import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, onAuthStateChange } from './supabase';
import { apiClient } from './api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role?: string;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string, username: string, full_name?: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ data: any; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    try {
      const response = await apiClient.getMe();
      if (response.data?.profile) {
        setProfile(response.data.profile);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await AsyncStorage.setItem('access_token', session.access_token);
        await loadUserProfile(session.user.id);
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await AsyncStorage.setItem('access_token', session.access_token);
        await loadUserProfile(session.user.id);
      } else {
        await AsyncStorage.removeItem('access_token');
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    profile,
    loading,
    signIn: async (email: string, password: string) => {
      try {
        // Use server API for sign in
        const response = await apiClient.signIn({ email, password });
        if (response.error) {
          return { data: null, error: { message: response.error } };
        }
        
        // Also sign in with Supabase for session management
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { data, error };
      } catch {
        return { data: null, error: { message: 'Sign in failed' } };
      }
    },
    signUp: async (email: string, password: string, username: string, full_name?: string) => {
      try {
        // Use server API for sign up
        const response = await apiClient.signUp({
          email,
          password,
          username,
          full_name,
          role: 'registered_user'
        });
        
        if (response.error) {
          return { data: null, error: { message: response.error } };
        }
        
        // Also sign up with Supabase for session management
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { username, full_name }
          }
        });
        return { data, error };
      } catch {
        return { data: null, error: { message: 'Sign up failed' } };
      }
    },
    signOut: async () => {
      try {
        // Sign out from server
        await apiClient.signOut();
        
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();
        
        // Clear local storage
        await AsyncStorage.removeItem('access_token');
        setProfile(null);
        
        return { error };
      } catch {
        return { error: { message: 'Sign out failed' } };
      }
    },
    resetPassword: async (email: string) => {
      try {
        const response = await apiClient.resetPassword(email);
        if (response.error) {
          return { data: null, error: { message: response.error } };
        }
        
        // Also use Supabase for password reset
        const { data, error } = await supabase.auth.resetPasswordForEmail(email);
        return { data, error };
      } catch {
        return { data: null, error: { message: 'Password reset failed' } };
      }
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 