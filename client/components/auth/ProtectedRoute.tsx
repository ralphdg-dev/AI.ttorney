import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth, UserRole } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  minimumRole?: UserRole;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  minimumRole,
  allowedRoles,
  redirectTo = '/auth/signin',
}) => {
  const { user, isLoading, isAuthenticated, hasRole, hasMinimumRole } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#023D7B" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return <Redirect href={redirectTo as any} />;
  }

  // Check specific role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return <Redirect href={"/unauthorized" as any} />;
  }

  // Check minimum role requirement
  if (minimumRole && !hasMinimumRole(minimumRole)) {
    return <Redirect href={"/unauthorized" as any} />;
  }

  // Check allowed roles list
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect href={"/unauthorized" as any} />;
  }

  // All checks passed, render children
  return <>{children}</>;
};

// Specific route protectors for common use cases
export const LawyerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="verified_lawyer" redirectTo="/unauthorized">
    {children}
  </ProtectedRoute>
);

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute minimumRole="admin" redirectTo="/unauthorized">
    {children}
  </ProtectedRoute>
);

export const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute minimumRole="registered_user">
    {children}
  </ProtectedRoute>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});

export default ProtectedRoute;
