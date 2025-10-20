import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';

/**
 * Configure Google Sign-In
 * Must be called before using Google authentication
 */
export const configureGoogleSignIn = () => {
  try {
    GoogleSignin.configure({
      webClientId: Constants.expoConfig?.extra?.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
    console.log('Google Sign-In configured successfully');
  } catch (error) {
    console.error('Error configuring Google Sign-In:', error);
  }
};

/**
 * Sign in with Google
 * @returns User info and ID token
 */
export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    // Get ID token for backend verification
    const tokens = await GoogleSignin.getTokens();
    
    return {
      success: true,
      userInfo: userInfo.data,
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    
    // Handle specific error codes
    if (error.code === 'SIGN_IN_CANCELLED') {
      return {
        success: false,
        error: 'Sign in was cancelled',
      };
    } else if (error.code === 'IN_PROGRESS') {
      return {
        success: false,
        error: 'Sign in is already in progress',
      };
    } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      return {
        success: false,
        error: 'Google Play Services not available',
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to sign in with Google',
    };
  }
};

/**
 * Sign out from Google
 */
export const signOutFromGoogle = async () => {
  try {
    await GoogleSignin.signOut();
    return { success: true };
  } catch (error: any) {
    console.error('Google Sign-Out Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign out from Google',
    };
  }
};

/**
 * Check if user is signed in to Google
 */
export const isSignedInToGoogle = async () => {
  try {
    const isSignedIn = await GoogleSignin.getCurrentUser();
    return isSignedIn !== null;
  } catch (error) {
    console.error('Error checking Google sign-in status:', error);
    return false;
  }
};

/**
 * Get current Google user info
 */
export const getCurrentGoogleUser = async () => {
  try {
    const userInfo = await GoogleSignin.signInSilently();
    return {
      success: true,
      userInfo: userInfo.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'No user signed in',
    };
  }
};
