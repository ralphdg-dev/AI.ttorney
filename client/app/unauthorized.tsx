import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Shield, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import Colors from '../constants/Colors';
import { safeGoBack } from '../utils/navigationHelper';

const UnauthorizedPage: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut, isAuthenticated } = useAuth();

  const handleGoBack = () => {
    safeGoBack(router, {
      isGuestMode: false,
      isAuthenticated,
      userRole: user?.role,
      currentPath: pathname,
    });
  };

  const handleGoHome = () => {
    if (user?.role === 'verified_lawyer') {
      router.push('/lawyer' as any);
    } else {
      router.push('/home');
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Shield size={64} color="#DC2626" />
        </View>
        
        <Text style={styles.title}>Access Denied</Text>
        <Text style={styles.message}>
          You don&apos;t have permission to access this page. This area is restricted to verified lawyers only.
        </Text>
        
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userText}>Signed in as: {user.full_name}</Text>
            <Text style={styles.roleText}>Role: {user.role.replace('_', ' ').toUpperCase()}</Text>
          </View>
        )}
        
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGoHome}>
            <Text style={styles.primaryButtonText}>Go to Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoBack}>
            <ArrowLeft size={16} color={Colors.primary.blue} />
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.textButton} onPress={handleSignOut}>
            <Text style={styles.textButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  userInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 32,
    width: '100%',
    alignItems: 'center',
  },
  userText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary.blue,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  secondaryButtonText: {
    color: Colors.primary.blue,
    fontSize: 16,
    fontWeight: '500',
  },
  textButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  textButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default UnauthorizedPage;
