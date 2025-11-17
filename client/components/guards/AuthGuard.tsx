import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import Colors from '../../constants/Colors';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: string[];
  redirectTo?: string;
}

/**
 * Authentication Guard Component
 * 
 * Protects routes by checking authentication status and user roles.
 * Redirects unauthenticated users to login page.
 * 
 * @param requireAuth - If true, user must be authenticated (default: true)
 * @param allowedRoles - Array of allowed user roles (optional)
 * @param redirectTo - Custom redirect path (default: '/login')
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requireAuth = true,
  allowedRoles,
  redirectTo = '/login'
}) => {
  const { user, isLoading, isAuthenticated, initialAuthCheck, isSigningOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Skip checks during sign out process
    if (isSigningOut) {
      return;
    }

    // Wait for initial auth check to complete
    if (!initialAuthCheck || isLoading) {
      return;
    }

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      console.log('🚫 AuthGuard: User not authenticated, redirecting to', redirectTo);
      router.replace(redirectTo as any);
      return;
    }

    // Check role requirements
    if (allowedRoles && allowedRoles.length > 0 && user) {
      if (!allowedRoles.includes(user.role)) {
        console.log('🚫 AuthGuard: User role not allowed:', user.role);
        router.replace('/unauthorized' as any);
        return;
      }
    }
  }, [user, isLoading, isAuthenticated, initialAuthCheck, requireAuth, allowedRoles, redirectTo, router, isSigningOut]);

  // Show loading state while checking auth
  if (!initialAuthCheck || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary }}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
      </View>
    );
  }

  // Don't render protected content if not authenticated
  if (requireAuth && !isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary }}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
      </View>
    );
  }

  // Don't render if role check fails
  if (allowedRoles && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary }}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
      </View>
    );
  }

  // Render protected content
  return <>{children}</>;
};
