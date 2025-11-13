import React, { useEffect, useRef } from 'react';
import { router, usePathname } from 'expo-router';
import { maintenanceService } from '../services/maintenanceService';

// Redirects all users to /maintenance when is_active is true
export const MaintenanceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const status = await maintenanceService.getStatus();
        const isMaintenance = !!status?.is_active;
        const isMaintenancePage = pathname === '/maintenance';
        if (isMaintenance && !isMaintenancePage) {
          // Remember last path to optionally restore later
          lastPathRef.current = pathname || '/';
          router.replace('/maintenance' as any);
          return;
        }
        if (!isMaintenance && isMaintenancePage) {
          router.replace((lastPathRef.current || '/') as any);
        }
      } catch (_) {
        // fail-open: do nothing
      }
    };

    check();
    const id = setInterval(check, 30000); // poll every 30s
    return () => clearInterval(id);
  }, [pathname]);

  return <>{children}</>;
};
