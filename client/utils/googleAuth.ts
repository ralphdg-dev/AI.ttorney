import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// =====================================================
// Industry-Grade Error Handling
// Following best practices from Slack, Discord, Notion
// =====================================================

export interface GoogleSignInResult {
  success: boolean;
  userInfo?: any;
  idToken?: string;
  accessToken?: string;
  error?: string;
  errorCode?: string;
  shouldRetry?: boolean;
  requiresUserAction?: boolean;
}

// Comprehensive error codes for analytics and debugging
export enum GoogleAuthErrorCode {
  SIGN_IN_CANCELLED = 'SIGN_IN_CANCELLED',
  IN_PROGRESS = 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE = 'PLAY_SERVICES_NOT_AVAILABLE',
  PLAY_SERVICES_OUTDATED = 'PLAY_SERVICES_OUTDATED',
  DEVELOPER_ERROR = 'DEVELOPER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  TOKEN_RETRIEVAL_FAILED = 'TOKEN_RETRIEVAL_FAILED',
  SIGN_OUT_FAILED = 'SIGN_OUT_FAILED',
}

// User-friendly error messages (can be localized)
const ERROR_MESSAGES: Record<GoogleAuthErrorCode, string> = {
  [GoogleAuthErrorCode.SIGN_IN_CANCELLED]: 'Sign in was cancelled. Please try again.',
  [GoogleAuthErrorCode.IN_PROGRESS]: 'Sign in is already in progress. Please wait.',
  [GoogleAuthErrorCode.PLAY_SERVICES_NOT_AVAILABLE]: 'Google Play Services is not available on this device.',
  [GoogleAuthErrorCode.PLAY_SERVICES_OUTDATED]: 'Please update Google Play Services to continue.',
  [GoogleAuthErrorCode.DEVELOPER_ERROR]: 'Configuration error. Please contact support.',
  [GoogleAuthErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [GoogleAuthErrorCode.CONFIGURATION_ERROR]: 'Google Sign-In is not properly configured.',
  [GoogleAuthErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  [GoogleAuthErrorCode.TOKEN_RETRIEVAL_FAILED]: 'Failed to retrieve authentication token. Please try again.',
  [GoogleAuthErrorCode.SIGN_OUT_FAILED]: 'Failed to sign out. Please try again.',
};

/**
 * Configure Google Sign-In
 * Must be called before using Google authentication
 */
/**
 * Configure Google Sign-In with comprehensive error handling
 * Industry best practice: Validate configuration before use
 */
export const configureGoogleSignIn = (): { success: boolean; error?: string } => {
  try {
    const webClientId = Constants.expoConfig?.extra?.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    
    // Validation: Ensure webClientId is present
    if (!webClientId) {
      console.error('❌ Google Sign-In configuration error: webClientId is missing');
      return {
        success: false,
        error: 'Google Sign-In is not properly configured. Please contact support.',
      };
    }
    
    // Validation: Check webClientId format
    if (!webClientId.includes('.apps.googleusercontent.com')) {
      console.error('❌ Invalid webClientId format:', webClientId);
      return {
        success: false,
        error: 'Invalid Google Sign-In configuration.',
      };
    }
    
    console.log('🔧 Configuring Google Sign-In...');
    console.log('📱 Platform:', Platform.OS);
    console.log('🔑 Web Client ID:', webClientId.substring(0, 20) + '...');
    
    GoogleSignin.configure({
      webClientId: webClientId,
      offlineAccess: true, // Required for refresh tokens
      forceCodeForRefreshToken: true, // Ensures we get refresh token
      // iOS specific
      iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
    });
    
    console.log('✅ Google Sign-In configured successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error configuring Google Sign-In:', error);
    return {
      success: false,
      error: 'Failed to configure Google Sign-In. Please restart the app.',
    };
  }
};

/**
 * Sign in with Google - Industry-grade implementation
 * Follows error handling patterns from Slack, Discord, Notion
 * 
 * Features:
 * - Comprehensive error handling with specific error codes
 * - User-friendly error messages
 * - Retry suggestions
 * - Detailed logging for debugging
 * - Graceful degradation
 * 
 * @returns GoogleSignInResult with success status, user data, or error details
 */
export const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting Google Sign-In flow...');
    
    // Step 1: Check Play Services availability (Android only)
    if (Platform.OS === 'android') {
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        console.log('✅ Google Play Services available');
      } catch (playServicesError: any) {
        console.error('❌ Play Services error:', playServicesError);
        
        if (playServicesError.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          return {
            success: false,
            error: ERROR_MESSAGES[GoogleAuthErrorCode.PLAY_SERVICES_NOT_AVAILABLE],
            errorCode: GoogleAuthErrorCode.PLAY_SERVICES_NOT_AVAILABLE,
            shouldRetry: false,
            requiresUserAction: true,
          };
        }
        
        // Play Services needs update
        return {
          success: false,
          error: ERROR_MESSAGES[GoogleAuthErrorCode.PLAY_SERVICES_OUTDATED],
          errorCode: GoogleAuthErrorCode.PLAY_SERVICES_OUTDATED,
          shouldRetry: false,
          requiresUserAction: true,
        };
      }
    }
    
    // Step 2: Initiate sign-in
    console.log('📝 Requesting user sign-in...');
    const userInfo = await GoogleSignin.signIn();
    console.log('✅ User signed in:', userInfo.data?.user?.email);
    
    // Step 3: Get authentication tokens with retry logic
    console.log('🔑 Retrieving authentication tokens...');
    let tokens: { idToken: string; accessToken?: string } | undefined;
    
    // Retry up to 3 times with exponential backoff (industry best practice)
    const maxRetries = 3;
    const baseDelay = 500; // Start with 500ms
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Token retrieval attempt ${attempt}/${maxRetries}...`);
        tokens = await GoogleSignin.getTokens();
        console.log('✅ Tokens retrieved successfully');
        break; // Success - exit retry loop
      } catch (tokenError: any) {
        console.error(`❌ Token retrieval attempt ${attempt} failed:`, tokenError.message);
        
        // If this was the last attempt, give up
        if (attempt === maxRetries) {
          console.error('❌ All token retrieval attempts failed');
          
          // Sign out to clean up state
          try {
            await GoogleSignin.signOut();
            console.log('🧹 Cleaned up Google session');
          } catch (signOutError) {
            console.error('Failed to sign out after token error:', signOutError);
          }
          
          return {
            success: false,
            error: ERROR_MESSAGES[GoogleAuthErrorCode.TOKEN_RETRIEVAL_FAILED],
            errorCode: GoogleAuthErrorCode.TOKEN_RETRIEVAL_FAILED,
            shouldRetry: true,
          };
        }
        
        // Wait before retrying (exponential backoff: 500ms, 1000ms, 2000ms)
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Step 4: Validate tokens
    if (!tokens || !tokens.idToken) {
      console.error('❌ ID token is missing');
      return {
        success: false,
        error: ERROR_MESSAGES[GoogleAuthErrorCode.TOKEN_RETRIEVAL_FAILED],
        errorCode: GoogleAuthErrorCode.TOKEN_RETRIEVAL_FAILED,
        shouldRetry: true,
      };
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Google Sign-In completed successfully in ${duration}ms`);
    
    return {
      success: true,
      userInfo: userInfo.data,
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Google Sign-In failed after ${duration}ms:`, error);
    
    // Detailed error logging for debugging
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    
    // Handle specific error codes with appropriate responses
    switch (error.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return {
          success: false,
          error: ERROR_MESSAGES[GoogleAuthErrorCode.SIGN_IN_CANCELLED],
          errorCode: GoogleAuthErrorCode.SIGN_IN_CANCELLED,
          shouldRetry: true,
          requiresUserAction: true,
        };
      
      case statusCodes.IN_PROGRESS:
        return {
          success: false,
          error: ERROR_MESSAGES[GoogleAuthErrorCode.IN_PROGRESS],
          errorCode: GoogleAuthErrorCode.IN_PROGRESS,
          shouldRetry: false,
        };
      
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return {
          success: false,
          error: ERROR_MESSAGES[GoogleAuthErrorCode.PLAY_SERVICES_NOT_AVAILABLE],
          errorCode: GoogleAuthErrorCode.PLAY_SERVICES_NOT_AVAILABLE,
          shouldRetry: false,
          requiresUserAction: true,
        };
      
      // DEVELOPER_ERROR - Configuration issue
      case '10': // Android error code 10
      case 'DEVELOPER_ERROR':
        console.error('🔴 DEVELOPER_ERROR: Check Google Cloud Console configuration');
        console.error('Verify: 1) Android OAuth Client exists, 2) SHA-1 matches, 3) Package name correct');
        return {
          success: false,
          error: ERROR_MESSAGES[GoogleAuthErrorCode.DEVELOPER_ERROR],
          errorCode: GoogleAuthErrorCode.DEVELOPER_ERROR,
          shouldRetry: false,
          requiresUserAction: false,
        };
      
      // Network errors
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
        return {
          success: false,
          error: ERROR_MESSAGES[GoogleAuthErrorCode.NETWORK_ERROR],
          errorCode: GoogleAuthErrorCode.NETWORK_ERROR,
          shouldRetry: true,
        };
      
      default:
        // Unknown error - provide generic message but log details
        console.error('🔴 Unknown error code:', error.code);
        return {
          success: false,
          error: error.message || ERROR_MESSAGES[GoogleAuthErrorCode.UNKNOWN_ERROR],
          errorCode: GoogleAuthErrorCode.UNKNOWN_ERROR,
          shouldRetry: true,
        };
    }
  }
};

/**
 * Sign out from Google with comprehensive error handling
 */
export const signOutFromGoogle = async (): Promise<GoogleSignInResult> => {
  try {
    console.log('🚪 Signing out from Google...');
    await GoogleSignin.signOut();
    console.log('✅ Signed out successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Google Sign-Out Error:', error);
    return {
      success: false,
      error: ERROR_MESSAGES[GoogleAuthErrorCode.SIGN_OUT_FAILED],
      errorCode: GoogleAuthErrorCode.SIGN_OUT_FAILED,
      shouldRetry: true,
    };
  }
};

/**
 * Check if user is signed in to Google
 * @returns boolean indicating sign-in status
 */
export const isSignedInToGoogle = async (): Promise<boolean> => {
  try {
    const currentUser = await GoogleSignin.getCurrentUser();
    const isSignedIn = currentUser !== null;
    console.log('🔍 Google sign-in status:', isSignedIn);
    return isSignedIn;
  } catch (error) {
    console.error('❌ Error checking Google sign-in status:', error);
    return false;
  }
};

/**
 * Get current Google user info (silent sign-in)
 * Useful for checking existing session without showing UI
 */
export const getCurrentGoogleUser = async (): Promise<GoogleSignInResult> => {
  try {
    console.log('🔄 Attempting silent sign-in...');
    const userInfo = await GoogleSignin.signInSilently();
    console.log('✅ Silent sign-in successful');
    return {
      success: true,
      userInfo: userInfo.data,
    };
  } catch {
    console.log('ℹ️ No existing Google session found');
    return {
      success: false,
      error: 'No user signed in',
      errorCode: GoogleAuthErrorCode.UNKNOWN_ERROR,
    };
  }
};

/**
 * Revoke Google access (complete sign-out)
 * This removes all tokens and requires re-authentication
 */
export const revokeGoogleAccess = async (): Promise<GoogleSignInResult> => {
  try {
    console.log('🔒 Revoking Google access...');
    await GoogleSignin.revokeAccess();
    console.log('✅ Google access revoked');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to revoke Google access:', error);
    return {
      success: false,
      error: 'Failed to revoke access',
      errorCode: GoogleAuthErrorCode.SIGN_OUT_FAILED,
    };
  }
};
