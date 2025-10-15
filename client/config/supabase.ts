import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vmlbrckrlgwlobhnpstx.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbGJyY2tybGd3bG9iaG5wc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDI5MDksImV4cCI6MjA2OTM3ODkwOX0.ucK9BXmRg7wYaamFBkTKWTkOavlp7SzNrZwDvNmKsK8';

// Singleton pattern to prevent multiple Supabase client instances
let supabaseInstance: any = null;

const createSupabaseClient = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      // Add storage key to prevent conflicts between multiple instances
      storageKey: 'ai-ttorney-auth',
    },
  });

  return supabaseInstance;
};

// Export singleton instance - this ensures only one client is created
export const supabase = createSupabaseClient();

// Simple helper to clear auth storage when needed
export const clearAuthStorage = async () => {
  try {
    if (Platform.OS !== 'web') {
      await AsyncStorage.removeItem('supabase.auth.token');
    }
    await supabase.auth.signOut({ scope: 'global' });
  } catch (error) {
    console.error('Error clearing auth storage:', error);
  }
};
