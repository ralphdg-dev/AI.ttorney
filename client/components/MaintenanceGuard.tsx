import React, { useEffect, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LoadingWithTrivia } from './LoadingWithTrivia';
import { NetworkConfig } from '../utils/networkConfig';
import { getRoleBasedRedirect, getRouteConfig } from '../config/routes';

interface MaintenanceStatus {
  is_active: boolean;
  message: string;
  allow_admin: boolean;
  start_time: string | null;
  end_time: string | null;
}

export const MaintenanceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, isAdmin, isSigningOut, initialAuthCheck } = useAuth();
  const pathname = usePathname();
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const currentPath = pathname || '/';
  const routeConfig = getRouteConfig(currentPath);
  const isPublicRoute = !!routeConfig?.isPublic;

  useEffect(() => {
    if (!initialAuthCheck) {
      return;
    }

    const fetchStatus = async () => {
      try {
        setIsChecking(true);
        const apiUrl = await NetworkConfig.getBestApiUrl();
        const response = await fetch(`${apiUrl}/api/maintenance/status`);

        if (response.ok) {
          const data = await response.json();
          setStatus({
            is_active: !!data.is_active,
            message: data.message || '',
            allow_admin: data.allow_admin !== false,
            start_time: data.start_time || null,
            end_time: data.end_time || null,
          });
        } else {
          setStatus({
            is_active: false,
            message: '',
            allow_admin: true,
            start_time: null,
            end_time: null,
          });
        }
      } catch (error) {
        setStatus({
          is_active: false,
          message: '',
          allow_admin: true,
          start_time: null,
          end_time: null,
        });
      } finally {
        setIsChecking(false);
        setHasChecked(true);
      }
    };

    if (!hasChecked && !isChecking) {
      fetchStatus();
    }
  }, [initialAuthCheck, hasChecked, isChecking]);

  useEffect(() => {
    if (!status || isSigningOut) {
      return;
    }

    const isMaintenancePage = pathname === '/maintenance';

    if (!status.is_active) {
      if (isMaintenancePage) {
        if (user && session) {
          const redirectPath = getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer);
          router.replace(redirectPath as any);
        } else {
          router.replace('/login' as any);
        }
      }
      return;
    }

    const adminBypass = status.allow_admin && isAdmin();

    if (adminBypass) {
      if (isMaintenancePage) {
        if (user && session) {
          const redirectPath = getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer);
          router.replace(redirectPath as any);
        } else {
          router.replace('/login' as any);
        }
      }
      return;
    }

    if (!isMaintenancePage) {
      router.replace('/maintenance' as any);
    }
  }, [status, pathname, isSigningOut, user, session, isAdmin]);

  // Never block UI during sign out - allow AuthGuard/AuthContext to navigate
  if (isSigningOut) {
    return <>{children}</>;
  }

  if (!initialAuthCheck) {
    // Do not block public routes while auth initializes
    if (isPublicRoute) return <>{children}</>;
    return <LoadingWithTrivia />;
  }

  if (isChecking || !hasChecked) {
    // Run check in background for public routes to avoid UI blink
    if (isPublicRoute) return <>{children}</>;
    return <LoadingWithTrivia />;
  }

  return <>{children}</>;
};

export default MaintenanceGuard;
