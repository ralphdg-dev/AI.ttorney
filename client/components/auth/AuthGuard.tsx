import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
// Temporarily comment out BannedScreen to debug import issues
// import BannedScreen from '../banned/BannedScreen';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    // Check for banned status and redirect if needed
    if (!isLoading && user?.account_status === 'banned') {
      setIsBanned(true);
      // Use router.replace directly without checking pathname
      console.log('🚫 AuthGuard: Banned user detected, redirecting to banned screen');
      router.replace('/banned');
    } else {
      setIsBanned(false);
    }
  }, [user, isLoading, router]);

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
});

export default AuthGuard;
