import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
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
  const { user, session, isLoading, isAuthenticated, isSigningOut } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Don't run route checks while loading (but allow during sign out for immediate redirect)
    if (isLoading) return;
    
    // During sign out, skip all checks and allow navigation to login
    if (isSigningOut) return;

    const currentPath = `/${segments.join('/')}`;
    const routeConfig = getRouteConfig(currentPath);
    
    if (!routeConfig) return;

    // Skip checks for lawyer status screens to prevent redirect loops
    if (currentPath.includes('/lawyer-status/')) {
      return;
    }

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
    } else {
      // Handle unauthenticated users - check if route is public
      if (!routeConfig.isPublic) {
        const redirectPath = '/login';
        logRouteAccess(currentPath, null, 'denied', 'Authentication required');
        router.replace(redirectPath as any); // Use replace instead of push for faster redirect
        return;
      }

      // Log public access
      logRouteAccess(currentPath, null, 'granted', 'Public route');
    }
  }, [isAuthenticated, user?.id, user?.role, isLoading, isSigningOut, segments.join('/')]);

  // Show loading screen while checking authentication (but NOT during sign out)
  // During sign out, we want immediate redirect without loading screen
  if (isLoading && !isSigningOut) {
    return <LoadingWithTrivia />;
  }

  // Don't block rendering on login page - let it show immediately
  const currentPath = `/${segments.join('/')}`;
  const routeConfig = getRouteConfig(currentPath);
  
  // Never block login page rendering
  if (currentPath === '/login') {
    return <>{children}</>;
  }
  
  // Only show loading for protected routes when we're clearly unauthenticated
  if (routeConfig && !routeConfig.isPublic && !isAuthenticated && !user && !session) {
    // Use a minimal delay to prevent flash but allow quick redirect
    return null; // Return null instead of loading spinner for faster redirect
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});

export default AuthGuard;
