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
import { normalizePath } from '../utils/path';
import { NavigationHelper } from '../utils/navigationHelper';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, session, isLoading, isAuthenticated, isGuestMode, isSigningOut, initialAuthCheck } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  // Compute route info for render-time gating
  const currentPathRender = `/${segments.join('/')}`;
  const routeConfigRender = getRouteConfig(currentPathRender);
  const isPublicRouteRender = !!routeConfigRender?.isPublic;
  const [showDelayedLoader, setShowDelayedLoader] = React.useState(false);
  // Prevent redundant redirects that can cause navigation loops
  const lastRedirectRef = React.useRef<string | null>(null);
  const redirectInProgressRef = React.useRef<boolean>(false);
  
  const redirectIfNeeded = (targetPath: string) => {
    if (!targetPath) return;
    // Only redirect if target differs and we didn't just redirect to it
    const currentPath = normalizePath(`/${segments.join('/')}`);
    const target = normalizePath(targetPath);
    if (redirectInProgressRef.current) return;
    if (target !== currentPath && lastRedirectRef.current !== target) {
      redirectInProgressRef.current = true;
      NavigationHelper.replaceIfDifferent(router, currentPath, target, lastRedirectRef);
    }
  };

  // Clear last redirect marker when path actually changes to avoid locking
  React.useEffect(() => {
    const path = normalizePath(`/${segments.join('/')}`);
    if (lastRedirectRef.current === path) {
      lastRedirectRef.current = null;
    }
    // Clear re-entrancy lock once URL updates
    if (redirectInProgressRef.current) {
      redirectInProgressRef.current = false;
    }
  }, [segments]);

  // Avoid flash-of-loader by delaying loader display on protected routes
  useEffect(() => {
    if (isLoading && !isSigningOut && !isPublicRouteRender) {
      const t = setTimeout(() => setShowDelayedLoader(true), 250);
      return () => {
        clearTimeout(t);
        setShowDelayedLoader(false);
      };
    }
    setShowDelayedLoader(false);
  }, [isLoading, isSigningOut, isPublicRouteRender, segments]);

  useEffect(() => {
    // Skip logic while a redirect we initiated is still pending
    if (redirectInProgressRef.current) return;
    // Compute path/config once per effect run
    const currentPath = normalizePath(`/${segments.join('/')}`);
    const routeConfig = getRouteConfig(currentPath);
    // Do not interfere with maintenance route; MaintenanceGuard manages it
    if (currentPath === '/maintenance') {
      return;
    }

    // During sign out: proactively force redirect to /login if current route is protected
    if (isSigningOut) {
      const isPublic = !!routeConfig?.isPublic;
      if (!isPublic && currentPath !== '/login' && currentPath !== '/maintenance') {
        redirectIfNeeded('/login');
      }
      return;
    }

    // Wait for initial auth check to complete (prevents race condition on hard refresh)
    if (!initialAuthCheck) {
      return; // Block ALL routes until we know if user is guest/authenticated/unauthenticated
    }

    // ⚡ OPTIMIZATION: Don't block on loading for public routes (login, register)
    if (!routeConfig) return;

    // Skip permission checks for lawyer status screens to prevent redirect loops
    // But still render the children (LawyerStatusGuard will handle access control)
    if (currentPath.includes('/lawyer-status/')) {
      return;
    }

    // ⚡ OPTIMIZATION: Allow public routes to render immediately after initial check
    // But add timeout protection to prevent infinite loading on login page
    if (isLoading && routeConfig.isPublic) {
      // For login page specifically, add a timeout to prevent infinite loading
      if (currentPath === '/login') {
        const timeoutId = setTimeout(() => {
          console.warn('⚠️ Login page loading timeout - forcing render');
        }, 5000); // 5 second timeout
        return () => clearTimeout(timeoutId);
      }
      return; // Let other public routes render without waiting for full auth load
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
        redirectIfNeeded(redirectPath);
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
        if (redirectPath) redirectIfNeeded(redirectPath);
        return;
      }

      // Log successful access
      logRouteAccess(currentPath, user, 'granted');
    } else if (isGuestMode) {
      // Handle guest mode users - only allow public routes
      if (!routeConfig.isPublic) {
        const redirectPath = '/chatbot'; // Redirect to chatbot (guest index page)
        logRouteAccess(currentPath, null, 'denied', 'Guest mode restricted');
        redirectIfNeeded(redirectPath);
        return;
      }

      // Log public access
      logRouteAccess(currentPath, null, 'granted', 'Public route in guest mode');
    } else {
      // Handle unauthenticated users - check if route is public
      if (!routeConfig.isPublic) {
        const redirectPath = '/login';
        logRouteAccess(currentPath, null, 'denied', 'Authentication required');
        redirectIfNeeded(redirectPath);
        return;
      }

      // Log public access
      logRouteAccess(currentPath, null, 'granted', 'Public route');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, isLoading, isSigningOut, initialAuthCheck, isGuestMode, session, router, segments]);

  // CRITICAL: For protected routes, block UI until initial auth check completes
  // For public routes (e.g., /login), render immediately to avoid initial blink
  if (!initialAuthCheck && !isPublicRouteRender) {
    return <LoadingWithTrivia />;
  }

  // Show loading screen while checking authentication for PROTECTED routes only
  // For public routes (e.g., /login, /onboarding/registration), render children to avoid blinking
  const isPublicRoute = isPublicRouteRender;

  // During sign out, we want immediate redirect without loading screen
  if (showDelayedLoader && !isSigningOut && !isPublicRoute && !isAuthenticated) {
    return <LoadingWithTrivia />;
  }

  return <>{children}</>;
};

export default AuthGuard;
