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

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, session, isLoading, isAuthenticated, hasRedirectedToStatus } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const currentPath = `/${segments.join('/')}`;
    const routeConfig = getRouteConfig(currentPath);
    
    console.log(`AuthGuard: currentPath=${currentPath}, isAuthenticated=${isAuthenticated}, user=${user?.role}, pending_lawyer=${user?.pending_lawyer}, hasRedirectedToStatus=${hasRedirectedToStatus}, session=${!!session}`);

    if (!routeConfig) return;

    // Handle authenticated users - check both session and user exist
    if (isAuthenticated && user && session) {
      // Check if authenticated user is trying to access login/registration pages
      const isLoginPage = currentPath === '/login';
      const isRegistrationPage = currentPath === '/onboarding/registration';
      
      if (isLoginPage || isRegistrationPage) {
        // Redirect authenticated users away from login/registration
        const redirectPath = getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer);
        console.log(`Authenticated user accessing ${currentPath}, redirecting to ${redirectPath}`);
        logRouteAccess(currentPath, user, 'denied', 'Already authenticated');
        router.replace(redirectPath as any);
        return;
      }

      // Check route permissions
      if (!hasRoutePermission(routeConfig, user.role)) {
        // Allow users with pending_lawyer to access most routes
        if (user.pending_lawyer) {
          console.log(`Pending lawyer user accessing ${currentPath}, allowing access`);
          logRouteAccess(currentPath, user, 'granted', 'Pending lawyer access');
          return;
        }
        
        const redirectPath = routeConfig.fallbackRoute || getRoleBasedRedirect(user.role, user.is_verified, false);
        console.log(`User lacks permission for ${currentPath}, redirecting to ${redirectPath}`);
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
        console.log(`Unauthenticated user accessing protected route ${currentPath}, redirecting to ${redirectPath}`);
        logRouteAccess(currentPath, null, 'denied', 'Authentication required');
        router.replace(redirectPath as any); // Use replace instead of push for faster redirect
        return;
      }

      // Log public access
      logRouteAccess(currentPath, null, 'granted', 'Public route');
    }
  }, [isAuthenticated, user, session, isLoading, segments, router]);

  // Show loading screen while checking authentication OR if we need to redirect
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#023D7B" />
      </View>
    );
  }

  // Only block rendering for a brief moment to prevent flash, then let redirect handle it
  const currentPath = `/${segments.join('/')}`;
  const routeConfig = getRouteConfig(currentPath);
  
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
