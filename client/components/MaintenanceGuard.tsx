import React, { useEffect, useRef, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LoadingWithTrivia } from './LoadingWithTrivia';
import { NetworkConfig } from '../utils/networkConfig';
import { getRoleBasedRedirect, getRouteConfig } from '../config/routes';
import { normalizePath } from '../utils/path';

interface MaintenanceStatus {
  is_active: boolean;
  message: string;
  allow_admin: boolean;
  start_time: string | null;
  end_time: string | null;
}

/**
 * MaintenanceGuard - Minimal, bulletproof maintenance mode protection
 * 
 * Key design:
 * - Single ref-based state machine to prevent re-entrancy
 * - No callbacks in effect deps
 * - Async fetch with proper cleanup
 * - Direct router.replace (no NavigationHelper)
 */
export const MaintenanceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, isAdmin, isSigningOut, initialAuthCheck } = useAuth();
  const pathname = usePathname();
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentPath = normalizePath(pathname || '/');
  const routeConfig = getRouteConfig(currentPath);
  const isPublicRoute = !!routeConfig?.isPublic;
  
  // Refs to prevent re-entrancy and redundant redirects
  const statusFetchedRef = useRef(false);
  const lastRedirectRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch maintenance status once
  useEffect(() => {
    if (!initialAuthCheck || statusFetchedRef.current) return;

    statusFetchedRef.current = true;

    (async () => {
      try {
        const apiUrl = await NetworkConfig.getBestApiUrl();
        const response = await fetch(`${apiUrl}/api/maintenance/status`);
        
        if (!isMountedRef.current) return;

        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        } else {
          setStatus({
            is_active: false,
            message: '',
            allow_admin: true,
            start_time: null,
            end_time: null,
          });
        }
      } catch {
        if (isMountedRef.current) {
          setStatus({
            is_active: false,
            message: '',
            allow_admin: true,
            start_time: null,
            end_time: null,
          });
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    })();
  }, [initialAuthCheck]);

  // Poll every 5 seconds
  useEffect(() => {
    if (!initialAuthCheck || !status) return;

    const interval = setInterval(async () => {
      try {
        const apiUrl = await NetworkConfig.getBestApiUrl();
        const response = await fetch(`${apiUrl}/api/maintenance/status`);
        
        if (isMountedRef.current && response.ok) {
          setStatus(await response.json());
        }
      } catch {
        // Silently fail, keep last known status
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [initialAuthCheck, status]);

  // Handle redirects
  useEffect(() => {
    if (!status || isSigningOut || isLoading) return;

    const isMaintenancePage = currentPath === '/maintenance';
    const adminBypass = status.allow_admin && isAdmin();

    let targetPath: string | null = null;

    // Determine redirect target
    if (!status.is_active && isMaintenancePage) {
      // Maintenance ended, redirect away
      targetPath = user && session 
        ? getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer)
        : '/login';
    } else if (status.is_active && !adminBypass && !isMaintenancePage) {
      // Maintenance active, non-admin, not on maintenance page
      targetPath = '/maintenance';
    } else if (status.is_active && adminBypass && isMaintenancePage) {
      // Admin bypass, redirect away from maintenance
      targetPath = user && session
        ? getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer)
        : '/login';
    }

    // Execute redirect only if needed
    if (targetPath && lastRedirectRef.current !== targetPath && currentPath !== targetPath) {
      lastRedirectRef.current = targetPath;
      router.replace(targetPath as any);
    }
  }, [status, currentPath, isSigningOut, user, session, isAdmin, isLoading]);

  // Never block UI during sign out - allow AuthGuard/AuthContext to navigate
  if (isSigningOut) {
    return <>{children}</>;
  }

  if (!initialAuthCheck) {
    // Do not block public routes while auth initializes
    if (isPublicRoute) return <>{children}</>;
    return <LoadingWithTrivia />;
  }

  if (isLoading) {
    // Run check in background for public routes to avoid UI blink
    if (isPublicRoute) return <>{children}</>;
    return <LoadingWithTrivia />;
  }

  return <>{children}</>;
};

export default MaintenanceGuard;
