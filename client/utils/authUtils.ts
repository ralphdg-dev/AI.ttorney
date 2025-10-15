import { Alert } from 'react-native';
import { router } from 'expo-router';
import { clearAuthStorage } from '../config/supabase';

/**
 * Checks if the user is authenticated and prompts to login if not
 * @returns boolean indicating if the user is authenticated
 */
export const checkAuthentication = (): boolean => {
  const isAuthenticated = !!global.session?.access_token;
  
  if (!isAuthenticated) {
    // Show alert about authentication required
    Alert.alert(
      "Authentication Required",
      "Please log in to continue.",
      [{ 
        text: "Login", 
        onPress: () => router.replace('/login')
      }]
    );
    return false;
  }
  
  return true;
};

/**
 * Handles API response for authentication errors (401 Unauthorized)
 * Redirects to login page with an alert if session has timed out
 * @param response The fetch API response object
 * @returns boolean indicating if a session timeout was handled
 */
export const handleSessionTimeout = async (response: Response): Promise<boolean> => {
  if (response.status === 401 || response.status === 403) {
    // Clear auth storage to ensure clean login
    await clearAuthStorage();
    
    // Show alert about session timeout
    Alert.alert(
      "Session Expired",
      "Your session has timed out. Please log in again.",
      [{ 
        text: "Login", 
        onPress: () => router.replace('/login')
      }]
    );
    
    return true;
  }
  
  return false;
};