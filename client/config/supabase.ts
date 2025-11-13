import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/StorageKeys';

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
      storageKey: STORAGE_KEYS.AUTH,
      // Disable automatic email confirmation - we use custom OTP system
      flowType: 'pkce',
    },
  });

  return supabaseInstance;
};

// Export singleton instance - this ensures only one client is created
export const supabase = createSupabaseClient();

// Industry-grade auth storage cleanup (Facebook/Google pattern)
const AUTH_KEYWORDS = ['auth', 'supabase', 'session', 'profile', 'token', 'user'];
const WEB_KEYS = [STORAGE_KEYS.AUTH, STORAGE_KEYS.USER_SESSION, STORAGE_KEYS.USER_PROFILE, STORAGE_KEYS.SUPABASE_TOKEN, 'sb-access-token', 'sb-refresh-token'];

export const clearAuthStorage = async () => {
  try {
    console.log('🧹 Clearing auth storage...');
    
    if (Platform.OS !== 'web') {
      const allKeys = await AsyncStorage.getAllKeys();
      const authKeys = allKeys.filter(key => AUTH_KEYWORDS.some(kw => key.includes(kw)));
      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
        console.log(`✅ Cleared ${authKeys.length} keys`);
      }
    } else {
      WEB_KEYS.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      console.log('✅ Cleared web storage');
    }
  } catch (error) {
    console.error('❌ Storage cleanup failed:', error);
  }
};

// Force reset Supabase client (nuclear option)
export const resetSupabaseClient = async () => {
  try {
    console.log('🔄 Resetting client...');
    if (supabaseInstance) await supabaseInstance.auth.signOut({ scope: 'global' });
    await clearAuthStorage();
    supabaseInstance = null;
    console.log('✅ Reset complete');
  } catch (error) {
    console.error('❌ Reset failed:', error);
  }
};
