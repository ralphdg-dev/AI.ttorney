import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import Colors from '../../constants/Colors';
import ProfileFetchError from './ProfileFetchError';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: string[];
  redirectTo?: string;
}

/**
 * Authentication Guard Component
 * 
 * Protects routes by checking authentication status, user roles, and account status.
 * Handles banned/deactivated users and redirects unauthenticated users to login.
 * 
 * @param requireAuth - If true, user must be authenticated (default: true)
 * @param allowedRoles - Array of allowed user roles (optional)
 * @param redirectTo - Custom redirect path for unauthenticated users (default: '/login')
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requireAuth = true,
  allowedRoles,
  redirectTo = '/login'
}) => {
  const { user, isLoading, isAuthenticated, initialAuthCheck, isSigningOut, profileFetchError, retryProfileFetch, signOut } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [isBanned, setIsBanned] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);

  useEffect(() => {
    // Skip checks during sign out process
    if (isSigningOut) {
      return;
    }

    // Wait for initial auth check to complete
    if (!initialAuthCheck || isLoading) {
      return;
    }

    // Get current path from segments (expo-router way)
    const currentPath = segments && segments.length > 0 ? '/' + segments.join('/') : '/';
    
    console.log('🔍 AuthGuard: Checking redirect', { 
      account_status: user?.account_status, 
      currentPath,
      requireAuth,
      isAuthenticated,
      allowedRoles 
    });
    
    // Check banned status first (highest priority)
    if (user?.account_status === 'banned' && currentPath !== '/banned') {
      setIsBanned(true);
      setIsDeactivated(false);
      console.log('🚫 AuthGuard: Banned user detected, redirecting to banned screen');
      router.replace('/banned');
      return;
    }
    
    // Check deactivated status
    if (user?.account_status === 'deactivated' && currentPath !== '/deactivated') {
      setIsDeactivated(true);
      setIsBanned(false);
      console.log('⏸️ AuthGuard: Deactivated user detected, redirecting to deactivated screen');
      router.replace('/deactivated');
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
        console.log('🚫 AuthGuard: User role not allowed:', user.role, 'Required:', allowedRoles);
        router.replace('/unauthorized' as any);
        return;
      }
    }
    
    // All checks passed
    setIsBanned(false);
    setIsDeactivated(false);
    console.log('✅ AuthGuard: All checks passed', { account_status: user?.account_status, currentPath });
  }, [user, isLoading, isAuthenticated, initialAuthCheck, requireAuth, allowedRoles, redirectTo, router, isSigningOut, segments])

  // Show profile fetch error screen if profile fetch failed
  if (profileFetchError && !isLoading) {
    return (
      <ProfileFetchError 
        onRetry={retryProfileFetch}
        onLogout={signOut}
      />
    );
  }

  // Show loading state while checking auth
  if (!initialAuthCheck || isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors.background.primary }]}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
      </View>
    );
  }

  // Don't render protected content if not authenticated (when auth is required)
  if (requireAuth && !isAuthenticated) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors.background.primary }]}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
      </View>
    );
  }

  // Don't render if role check fails
  if (allowedRoles && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors.background.primary }]}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
      </View>
    );
  }

  // If user is banned, show banned screen instead of app content
  // This ensures COMPLETE blocking of all app functionality
  if (isBanned || user?.account_status === 'banned') {
    return (
      <View style={styles.bannedContainer}>
        <Text style={styles.bannedTitle}>Account Permanently Banned</Text>
        <Text style={styles.bannedMessage}>
          Your account has been permanently banned. Please contact support if you believe this is a mistake.
        </Text>
      </View>
    );
  }

  // If user is deactivated, allow the deactivated screen to render normally
  // The routing system will handle showing the appropriate deactivated.tsx screen
  // No need for AuthGuard fallback since deactivated users can access their screen

  // Render protected content
  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  bannedContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  bannedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  bannedMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  deactivatedContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  deactivatedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 16,
    textAlign: 'center',
  },
  deactivatedMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default AuthGuard;
