/**
 * Font loading utility with timeout handling
 * Prevents uncaught errors from fontfaceobserver timeouts
 */

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';

export interface FontLoadingState {
  fontsLoaded: boolean;
  fontError: Error | null;
  isReady: boolean;
}

/**
 * Custom hook for loading fonts with robust error handling
 * Falls back to system fonts if loading fails or times out
 */
export function useRobustFonts(): FontLoadingState {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Set a safety timeout to prevent indefinite waiting
    const safetyTimeout = setTimeout(() => {
      if (!isReady) {
        console.warn('Font loading timeout - falling back to system fonts');
        setIsReady(true);
      }
    }, 8000); // 8 seconds safety timeout (longer than fontfaceobserver's 6s)

    if (fontsLoaded || fontError) {
      setIsReady(true);
      clearTimeout(safetyTimeout);
      
      if (fontError) {
        console.warn('Font loading error:', fontError);
      }
    }

    return () => clearTimeout(safetyTimeout);
  }, [fontsLoaded, fontError, isReady]);

  return {
    fontsLoaded,
    fontError,
    isReady,
  };
}

export { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold };
