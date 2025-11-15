import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
// Temporarily comment out BannedScreen to debug import issues
// import BannedScreen from '../banned/BannedScreen';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [isBanned, setIsBanned] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);

  useEffect(() => {
    // Get current path from segments (expo-router way)
    const currentPath = '/' + segments.join('/');
    
    // Only redirect if auth check is complete and user is not already on the correct page
    if (isLoading || !segments) return;
    
    console.log('🔍 AuthGuard: Checking redirect', { account_status: user?.account_status, currentPath, segments });
    
    if (user?.account_status === 'banned' && currentPath !== '/banned') {
      setIsBanned(true);
      setIsDeactivated(false);
      console.log('🚫 AuthGuard: Banned user detected, redirecting to banned screen');
      router.replace('/banned');
    } else if (user?.account_status === 'deactivated' && currentPath !== '/deactivated') {
      setIsDeactivated(true);
      setIsBanned(false);
      console.log('⏸️ AuthGuard: Deactivated user detected, redirecting to deactivated screen');
      router.replace('/deactivated');
    } else {
      setIsBanned(false);
      setIsDeactivated(false);
      console.log('✅ AuthGuard: No redirect needed', { account_status: user?.account_status, currentPath });
    }
  }, [user, isLoading, segments]); // Use segments in dependency array

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If user is banned, show banned screen instead of app content
  // This ensures COMPLETE blocking of all app functionality
  if (isBanned || user?.account_status === 'banned') {
    // Temporary fallback to prevent crashing
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

  // Otherwise, show the normal app content
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
