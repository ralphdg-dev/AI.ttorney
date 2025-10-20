import { supabase } from '../config/supabase';

/**
 * Google Sign-In for Web Platform
 * Uses Supabase's built-in OAuth flow
 */
export const signInWithGoogleWeb = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to sign in with Google',
    };
  }
};
