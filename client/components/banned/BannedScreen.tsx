import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

const BannedScreen: React.FC = () => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Account Permanently Banned</Text>
        <Text style={styles.message}>
          Your account has been permanently banned. Please contact support if you believe this is a mistake.
        </Text>
        <Button 
          title="Logout"
          onPress={handleLogout}
          style={styles.logoutButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  logoutButton: {
    minWidth: 120,
  },
});

export default BannedScreen;
