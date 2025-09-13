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
      // PRIORITY: Check for pending lawyer applications first - but only redirect on initial login
      // Allow users to navigate away from status screens to use the app
      const isStatusScreen = currentPath.startsWith('/onboarding/lawyer/lawyer-status/');
      const isHomePage = currentPath === '/home';
      
      if (user.pending_lawyer && !isStatusScreen && !isHomePage && currentPath !== '/role-selection') {
        console.log('User has pending_lawyer flag, fetching actual application status...');
        
        // Fetch actual application status from API
        fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api/lawyer-applications/me`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        })
        .then(response => response.json())
        .then(data => {
          if (data && data.has_application && data.application) {
            const actualStatus = data.application.status;
            const redirectPath = getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer, actualStatus);
            console.log(`Redirecting to ${actualStatus} status screen: ${redirectPath}`);
            router.replace(redirectPath as any);
          } else {
            // No application found, default to pending
            const redirectPath = getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer, 'pending');
            router.replace(redirectPath as any);
          }
        })
        .catch(error => {
          console.error('Error fetching application status:', error);
          // Fallback to pending on error
          const redirectPath = getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer, 'pending');
          router.replace(redirectPath as any);
        });
        
        return;
      }

      // Check if authenticated user is trying to access auth/onboarding routes
      // Exceptions: 
      // 1. Allow lawyer onboarding routes for authenticated users during verification process
      // 2. Allow role-selection for users who haven't completed role selection yet
      const isLawyerOnboardingRoute = currentPath.startsWith('/onboarding/lawyer/');
      const isRoleSelectionRoute = currentPath === '/role-selection';
      
      if (routeConfig.redirectTo === 'role-based' && (routeConfig.isPublic || routeConfig.allowedRoles?.includes('guest')) && !isLawyerOnboardingRoute && !isRoleSelectionRoute) {
        const redirectPath = getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer);
        console.log(`Authenticated user accessing auth/onboarding route ${currentPath}, redirecting to ${redirectPath}`);
        logRouteAccess(currentPath, user, 'denied', 'Already authenticated');
        router.replace(redirectPath as any);
        return;
      }

      // Check route permissions using restored route config
      if (!hasRoutePermission(routeConfig, user.role)) {
        const redirectPath = routeConfig.fallbackRoute || getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer);
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
