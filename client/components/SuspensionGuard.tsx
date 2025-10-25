import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { router, usePathname } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * SuspensionGuard Component
 * 
 * Protects routes from suspended users by checking their suspension status
 * and redirecting them to the suspended screen if they're suspended.
 * 
 * This guard runs on every route change to ensure suspended users cannot
 * access any part of the app except the suspended screen and login.
 */
export const SuspensionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, isLoading, checkSuspensionStatus, isSigningOut } = useAuth();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkSuspension = async () => {
      // Skip check if:
      // 1. Already on suspended screen
      // 2. On login/register screens
      // 3. No user session
      // 4. Already checking
      // 5. User is signing out (IMPORTANT: prevents infinite loading)
      const publicRoutes = ['/login', '/register', '/suspended', '/forgot-password'];
      const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));
      
      if (isPublicRoute || !user || !session || isChecking || isLoading || isSigningOut) {
        setHasChecked(true);
        return;
      }

      try {
        setIsChecking(true);
        const suspensionStatus = await checkSuspensionStatus();
        
        if (suspensionStatus && suspensionStatus.isSuspended) {
          console.log('🚫 User is suspended, redirecting to suspended screen from guard');
          // User is suspended, redirect to suspended screen
          router.replace('/suspended');
        } else {
          // User is not suspended, allow access
          setHasChecked(true);
        }
      } catch (error) {
        console.error('Error checking suspension status:', error);
        // On error, allow access (fail-open for better UX)
        setHasChecked(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkSuspension();
  }, [pathname, user, session, isLoading, isSigningOut]);

  // Don't show loading if user is signing out
  if (isSigningOut) {
    return <>{children}</>;
  }

  // Show loading indicator while checking suspension status
  if ((isChecking || !hasChecked) && user && session && pathname !== '/suspended') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
