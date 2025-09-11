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
  const { user, session, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const currentPath = `/${segments.join('/')}`;
    const routeConfig = getRouteConfig(currentPath);
    
    console.log(`AuthGuard: currentPath=${currentPath}, isAuthenticated=${isAuthenticated}, user=${user?.role}, session=${!!session}`);

    if (!routeConfig) return;

    // Handle authenticated users
    if (isAuthenticated && user) {
      // Check if authenticated user is trying to access auth/onboarding routes
      // Exception: Allow lawyer onboarding routes for authenticated users during verification process
      const isLawyerOnboardingRoute = currentPath.startsWith('/onboarding/lawyer/');
      
      if (routeConfig.redirectTo === 'role-based' && (routeConfig.isPublic || routeConfig.allowedRoles?.includes('guest')) && !isLawyerOnboardingRoute) {
        const redirectPath = getRoleBasedRedirect(user.role, user.is_verified);
        console.log(`Authenticated user accessing auth/onboarding route ${currentPath}, redirecting to ${redirectPath}`);
        logRouteAccess(currentPath, user, 'denied', 'Already authenticated');
        router.replace(redirectPath as any);
        return;
      }

      // Check route permissions using restored route config
      if (!hasRoutePermission(routeConfig, user.role)) {
        const redirectPath = routeConfig.fallbackRoute || getRoleBasedRedirect(user.role, user.is_verified);
        console.log(`User lacks permission for ${currentPath}, redirecting to ${redirectPath}`);
        logRouteAccess(currentPath, user, 'denied', 'Insufficient permissions');
        
        // Use replace for role-based redirects to prevent back navigation
        if (routeConfig.redirectTo === 'role-based') {
          router.replace(redirectPath as any);
        } else {
          router.replace(redirectPath as any);
        }
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
        router.push(redirectPath as any);
        return;
      }

      // Log public access
      logRouteAccess(currentPath, null, 'granted', 'Public route');
    }
  }, [isAuthenticated, user, session, isLoading, segments, router]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#023D7B" />
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
    backgroundColor: '#F9FAFB',
  },
});

export default AuthGuard;
