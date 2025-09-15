import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vmlbrckrlgwlobhnpstx.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbGJyY2tybGd3bG9iaG5wc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5NzI2NjQsImV4cCI6MjA0NjU0ODY2NH0.Vqpk8vZYmHJOcjKQRdKJhxPJvCJqJlGhXz';

// Singleton pattern to prevent multiple instances
let supabaseInstance: SupabaseClient | null = null;

const createSupabaseClient = (): SupabaseClient => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

// For immediate use, create with basic config and update later
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true, // Re-enable session persistence for proper login
    detectSessionInUrl: false,
    storage: Platform.OS === 'web' ? undefined : undefined, // Let it use default storage but we'll clear it manually
  },
});

// Initialize proper storage when available
if (Platform.OS !== 'web') {
  import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
    supabase.auth.setSession = supabase.auth.setSession.bind(supabase.auth);
    // Update the storage after import
    (supabase.auth as any).storage = AsyncStorage;
  });

  return supabaseInstance;
};

export const supabase = createSupabaseClient();
