import React from 'react';
import { useSegments } from 'expo-router';
import { ErrorBoundary } from './ErrorBoundary';
import { getRouteConfig } from '../config/routes';

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

export const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({ children }) => {
  const segments = useSegments();
  const currentPath = `/${segments.join('/')}`;
  const routeConfig = getRouteConfig(currentPath);

  // Only wrap with error boundary if the route config specifies it
  if (!routeConfig?.errorBoundary) {
    return <>{children}</>;
  }

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log route-specific error information
    console.error(`Route Error in ${currentPath}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      route: currentPath,
      routeConfig
    });

    // Send route error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/errors/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route: currentPath,
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          routeConfig: {
            requiredRole: routeConfig.requiredRole,
            allowedRoles: routeConfig.allowedRoles,
            isPublic: routeConfig.isPublic,
            serverValidation: routeConfig.serverValidation
          }
        })
      }).catch(logError => console.error('Failed to log route error:', logError));
    }
  };

  return (
    <ErrorBoundary 
      fallbackRoute={routeConfig.fallbackRoute}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default RouteErrorBoundary;
