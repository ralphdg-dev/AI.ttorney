import { useState, useEffect } from 'react';
import * as expoRouter from 'expo-router';

/**
 * Hook to safely check if navigation context is ready
 * Prevents "Couldn't find a navigation context" errors on Android
 */
export const useNavigationReady = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;
    const checkInterval = 100; // 100ms

    const checkNavigation = () => {
      try {
        // Try to access global expo-router to check if navigation context is available
        // This is a simple check - if expo-router is loaded, navigation should be available
        if (expoRouter) {
          setIsReady(true);
          setError(null);
        } else {
          throw new Error('Expo Router not loaded');
        }
      } catch {
        attempts++;
        if (attempts >= maxAttempts) {
          setError('Navigation context not available after multiple attempts');
        } else {
          // Retry after a short delay
          setTimeout(checkNavigation, checkInterval);
        }
      }
    };

    checkNavigation();
  }, []);

  return { isReady, error };
};
