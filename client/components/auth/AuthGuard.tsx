import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useSegments, usePathname } from 'expo-router';
import { getRouteConfig, hasRoutePermission } from '../../config/routes';
import Colors from '../../constants/Colors';
import { useGuest } from '../../contexts/GuestContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, isLoading, isAuthenticated, initialAuthCheck, isSigningOut } = useAuth();
  const { isGuestMode, guestSession } = useGuest();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  const hasActiveSession = guestSession !== null;

  useEffect(() => {
    if (isSigningOut || !initialAuthCheck || isLoading) return;

    const currentPath = pathname || '/' + segments.join('/');
    const routeConfig = getRouteConfig(currentPath);
    
    if (['/banned', '/deactivated', '/suspended', '/unauthorized', '/login', '/'].includes(currentPath)) {
      return;
    }

    if (user?.account_status === 'banned' && currentPath !== '/banned') {
      router.replace('/banned');
      return;
    }
    if (user?.account_status === 'deactivated' && currentPath !== '/deactivated') {
      router.replace('/deactivated');
      return;
    }
    if (user?.account_status === 'suspended' && currentPath !== '/suspended') {
      router.replace('/suspended');
      return;
    }

    if (routeConfig?.isPublic) {
      if (routeConfig.requiresGuestSession && isGuestMode && !hasActiveSession) {
        router.replace('/login');
      }
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (routeConfig && !hasRoutePermission(routeConfig, user?.role || null)) {
      router.replace('/unauthorized');
      return;
    }
  }, [user, isAuthenticated, isGuestMode, hasActiveSession, initialAuthCheck, isLoading, isSigningOut, pathname, segments, router]);

  if (!initialAuthCheck || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background.primary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
      </View>
    );
  }

  return <>{children}</>;
};


export default AuthGuard;
