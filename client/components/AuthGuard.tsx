import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { 
  getRouteConfig, 
  hasRoutePermission,
  logRouteAccess,
  getRoleBasedRedirect 
} from '../config/routes';
import { LoadingWithTrivia } from './LoadingWithTrivia';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, session, isLoading, isAuthenticated, isGuestMode, isSigningOut, initialAuthCheck } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // ⚡ OPTIMIZATION: Skip checks during sign out for immediate redirect
    if (isSigningOut) return;
    
    // ⚡ OPTIMIZATION: Don't block on loading for public routes (login, register)
    const currentPath = `/${segments.join('/')}`;
    const routeConfig = getRouteConfig(currentPath);
    
    if (!routeConfig) return;

    // Skip checks for lawyer status screens to prevent redirect loops
    if (currentPath.includes('/lawyer-status/')) {
      return;
    }

    // Wait for initial auth check to complete (prevents race condition on hard refresh)
    if (!initialAuthCheck) {
      return; // Block ALL routes until we know if user is guest/authenticated/unauthenticated
    }

    // ⚡ OPTIMIZATION: Allow public routes to render immediately after initial check
    if (isLoading && routeConfig.isPublic) {
      return; // Let public routes render without waiting for full auth load
    }

    // Wait for auth to finish loading before checking protected routes
    if (isLoading) return;

    // Handle authenticated users - check both session and user exist
    if (isAuthenticated && user && session) {
      // Check if authenticated user is trying to access login/registration pages
      const isLoginPage = currentPath === '/login';
      const isRegistrationPage = currentPath === '/onboarding/registration';
      
      if (isLoginPage || isRegistrationPage) {
        // Only redirect if user has a valid role (not guest without verification)
        if (user.role === 'guest' && !user.is_verified) {
          return;
        }
        
        // Redirect authenticated users away from login/registration
        const redirectPath = getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer);
        logRouteAccess(currentPath, user, 'denied', 'Already authenticated');
        router.replace(redirectPath as any);
        return;
      }

      // Check route permissions
      if (!hasRoutePermission(routeConfig, user.role)) {
        // Allow users with pending_lawyer to access most routes
        if (user.pending_lawyer) {
          logRouteAccess(currentPath, user, 'granted', 'Pending lawyer access');
          return;
        }
        
        const redirectPath = routeConfig.fallbackRoute || getRoleBasedRedirect(user.role, user.is_verified, false);
        logRouteAccess(currentPath, user, 'denied', 'Insufficient permissions');
        router.replace(redirectPath as any);
        return;
      }

      // Log successful access
      logRouteAccess(currentPath, user, 'granted');
    } else if (isGuestMode) {
      // Handle guest mode users - only allow public routes
      if (!routeConfig.isPublic) {
        const redirectPath = '/chatbot'; // Redirect to chatbot (guest index page)
        logRouteAccess(currentPath, null, 'denied', 'Guest mode restricted');
        router.replace(redirectPath as any);
        return;
      }

      // Log public access
      logRouteAccess(currentPath, null, 'granted', 'Public route in guest mode');
    } else {
      // Handle unauthenticated users - check if route is public
      if (!routeConfig.isPublic) {
        const redirectPath = '/login';
        logRouteAccess(currentPath, null, 'denied', 'Authentication required');
        router.replace(redirectPath as any);
        return;
      }

      // Log public access
      logRouteAccess(currentPath, null, 'granted', 'Public route');
    }
  }, [isAuthenticated, user, isLoading, isSigningOut, initialAuthCheck, isGuestMode, session, router, segments]);

  // CRITICAL: Show loading until initial auth check completes
  // This prevents race condition where UI renders before we know if user is guest/authenticated
  if (!initialAuthCheck) {
    return <LoadingWithTrivia />;
  }

  // Show loading screen while checking authentication (but NOT during sign out)
  // During sign out, we want immediate redirect without loading screen
  if (isLoading && !isSigningOut) {
    return <LoadingWithTrivia />;
  }

  return <>{children}</>;
};

export default AuthGuard;
