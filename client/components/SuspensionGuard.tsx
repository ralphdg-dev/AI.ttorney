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
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  // Reset hasChecked when user changes (login/logout)
  React.useEffect(() => {
    if (user?.id !== lastUserId) {
      setHasChecked(false);
      setLastUserId(user?.id || null);
    }
  }, [user?.id, lastUserId]);

  useEffect(() => {
    const checkSuspension = async () => {
      // CRITICAL: Skip check if user is signing out to prevent infinite loading after logout
      if (isSigningOut) {
        return;
      }

      // Skip check if:
      // 1. Already on suspended screen or suspension-lifted screen
      // 2. On login/register screens
      // 3. No user session (CRITICAL: prevents check after logout when user/session are null)
      // 4. Already checking
      // 5. Auth is still loading
      // 6. Already checked for this user
      // 7. On lawyer status pages (they have their own guard)
      const publicRoutes = ['/login', '/register', '/suspended', '/suspension-lifted', '/forgot-password', '/onboarding'];
      const isLawyerStatusPage = pathname?.includes('/lawyer-status/');
      const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route)) || isLawyerStatusPage;
      
      // CRITICAL: Always skip check if on suspension-lifted page to prevent infinite loops
      if (pathname === '/suspension-lifted') {
        if (!hasChecked) {
          setHasChecked(true);
        }
        return;
      }
      
      console.log('🛡️ SuspensionGuard: Check conditions', { 
        pathname, 
        isLawyerStatusPage, 
        isPublicRoute,
        hasUser: !!user,
        hasSession: !!session,
        isChecking,
        isLoading,
        hasChecked
      });
      
      // CRITICAL: Mark as checked immediately for lawyer status pages
      if (isLawyerStatusPage && !hasChecked) {
        console.log('🛡️ SuspensionGuard: Lawyer status page detected, marking as checked');
        setHasChecked(true);
        return;
      }
      
      if (isPublicRoute || !user || !session || isChecking || isLoading || hasChecked) {
        // ⚡ OPTIMIZATION: Mark as checked immediately on public routes or when auth is loading
        // This prevents redundant checks since AuthContext already handles suspension on login
        if (!hasChecked && !isPublicRoute && user && session && !isLoading) {
          setHasChecked(true);
        }
        return;
      }

      try {
        setIsChecking(true);
        const suspensionStatus = await checkSuspensionStatus();
        
        if (suspensionStatus && suspensionStatus.isSuspended) {
          console.log('🚫 User is suspended, redirecting to suspended screen from guard');
          router.replace('/suspended');
        } else if (suspensionStatus && suspensionStatus.needsLiftedAcknowledgment) {
          console.log('✅ User suspension lifted, redirecting to suspension-lifted screen from guard');
          router.replace('/suspension-lifted');
        } else {
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
  }, [pathname, user?.id, hasChecked, isLoading, isSigningOut]);

  // Don't show loading if user is signing out
  if (isSigningOut) {
    return <>{children}</>;
  }

  // Do not block UI with a full-screen loader; perform checks in background
  // This prevents a visible blink for non-suspended users right after login
  // If suspended, we still redirect immediately when the check resolves

  return <>{children}</>;
};
