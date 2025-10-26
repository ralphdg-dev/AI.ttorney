import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { router, usePathname } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LoadingWithTrivia } from './LoadingWithTrivia';

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

  // Reset hasChecked when user changes (login/logout)
  React.useEffect(() => {
    setHasChecked(false);
  }, [user?.id]);

  useEffect(() => {
    const checkSuspension = async () => {
      // CRITICAL: Skip check if user is signing out to prevent infinite loading after logout
      if (isSigningOut) {
        return;
      }

      // Skip check if:
      // 1. Already on suspended screen
      // 2. On login/register screens
      // 3. No user session (CRITICAL: prevents check after logout when user/session are null)
      // 4. Already checking
      // 5. Auth is still loading
      // 6. Already checked for this user
      const publicRoutes = ['/login', '/register', '/suspended', '/forgot-password', '/onboarding'];
      const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));
      
      if (isPublicRoute || !user || !session || isChecking || isLoading || hasChecked) {
        if (!hasChecked && !isPublicRoute && user && session && !isLoading) {
          // Only set hasChecked if we have a valid user session
          setHasChecked(true);
        }
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
  }, [pathname, user?.id]);

  // Don't show loading if user is signing out
  if (isSigningOut) {
    return <>{children}</>;
  }

  // Show loading indicator while checking suspension status
  // CRITICAL: Never show loading on login page to prevent infinite loading after logout
  const isLoginPage = pathname === '/login';
  if ((isChecking || !hasChecked) && user && session && pathname !== '/suspended' && !isLoginPage) {
    return <LoadingWithTrivia />;
  }

  return <>{children}</>;
};
