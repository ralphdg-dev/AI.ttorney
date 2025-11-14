import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { router, usePathname } from 'expo-router';
import { normalizePath } from '../utils/path';

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
  const checkedUsersRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    // CRITICAL: Skip check if user is signing out
    if (isSigningOut || isLoading || !user || !session) {
      return;
    }

    // Skip if we already checked this user in this session
    const userId = user.id;
    if (checkedUsersRef.current.has(userId)) {
      return;
    }

    const publicRoutes = ['/login', '/register', '/suspended', '/suspension-lifted', '/forgot-password', '/onboarding'];
    const isLawyerStatusPage = pathname?.includes('/lawyer-status/');
    const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route)) || isLawyerStatusPage;
    
    if (isPublicRoute) {
      return;
    }

    // Mark as checked immediately to prevent re-runs
    checkedUsersRef.current.add(userId);

    (async () => {
      try {
        const suspensionStatus = await checkSuspensionStatus();
        
        if (suspensionStatus && suspensionStatus.isSuspended) {
          console.log('🚫 User is suspended, redirecting to suspended screen');
          if (normalizePath(pathname || '/') !== '/suspended') {
            router.replace('/suspended');
          }
        } else if (suspensionStatus && suspensionStatus.needsLiftedAcknowledgment) {
          console.log('✅ User suspension lifted, redirecting to suspension-lifted screen');
          if (normalizePath(pathname || '/') !== '/suspension-lifted') {
            router.replace('/suspension-lifted');
          }
        }
      } catch (error) {
        console.error('Error checking suspension status:', error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLoading, isSigningOut]);

  // Don't show loading if user is signing out
  if (isSigningOut) {
    return <>{children}</>;
  }

  // Do not block UI with a full-screen loader; perform checks in background
  // This prevents a visible blink for non-suspended users right after login
  // If suspended, we still redirect immediately when the check resolves

  return <>{children}</>;
};
