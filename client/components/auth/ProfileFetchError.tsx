import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../../constants/Colors';

interface ProfileFetchErrorProps {
  onRetry: () => void;
  onLogout: () => void;
}

/**
 * Error screen shown when user profile cannot be fetched from database
 * Provides options to retry or logout
 */
const ProfileFetchError: React.FC<ProfileFetchErrorProps> = ({ onRetry, onLogout }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Connection Issue</Text>
        <Text style={styles.message}>
          We're having trouble loading your profile. This could be due to:
        </Text>
        <View style={styles.reasonsList}>
          <Text style={styles.reason}>• Slow network connection</Text>
          <Text style={styles.reason}>• Database configuration issue</Text>
          <Text style={styles.reason}>• Temporary service disruption</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.button, styles.retryButton]} 
          onPress={onRetry}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.logoutButton]} 
          onPress={onLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
        
        <Text style={styles.helpText}>
          If this problem persists, please contact support
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  reasonsList: {
    alignSelf: 'stretch',
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  reason: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: Colors.primary.blue,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  logoutButtonText: {
    color: Colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default ProfileFetchError;
