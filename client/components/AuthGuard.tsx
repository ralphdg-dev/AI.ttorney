import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getRouteConfig, hasRoutePermission, getRoleBasedRedirect } from '../config/routes';

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
    
    console.log(`AuthGuard: currentPath=${currentPath}, isAuthenticated=${isAuthenticated}, user=${user?.role}, session=${!!session}, routeConfig=`, routeConfig);

    if (!routeConfig) return;

    // Handle authenticated users
    if (isAuthenticated && user) {
      // Check if this is an auth route that should redirect authenticated users
      if (routeConfig.redirectTo === 'role-based' && routeConfig.isPublic) {
        const redirectPath = getRoleBasedRedirect(user.role, user.is_verified);
        console.log(`Authenticated user on auth route ${currentPath}, redirecting to ${redirectPath}`);
        router.replace(redirectPath as any);
        return;
      }

      // Check if user has permission for this route
      if (!hasRoutePermission(routeConfig, user.role)) {
        // For authenticated users with insufficient permissions, redirect to their role-appropriate dashboard
        const redirectPath = routeConfig.redirectTo === 'role-based' 
          ? getRoleBasedRedirect(user.role, user.is_verified)
          : routeConfig.redirectTo || getRoleBasedRedirect(user.role, user.is_verified);
        console.log(`User lacks permission for ${currentPath}, redirecting to ${redirectPath}`);
        router.replace(redirectPath as any);
        return;
      }
    } else {
      // Handle unauthenticated users
      if (!routeConfig.isPublic) {
        // For unauthenticated users, always redirect to login regardless of redirectTo configuration
        const redirectPath = '/login';
        console.log(`Unauthenticated user accessing protected route ${currentPath}, redirecting to ${redirectPath}`);
        router.replace(redirectPath as any);
        return;
      }
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
