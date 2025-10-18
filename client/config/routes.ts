import { UserRole } from '../contexts/AuthContext';

export interface RouteConfig {
  path: string;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  redirectTo?: string;
  isPublic?: boolean;
  serverValidation?: boolean; // New: Enable server-side validation
  fallbackRoute?: string; // New: Fallback route for errors
  errorBoundary?: boolean; // New: Enable error boundary
}

// Centralized route configuration
export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  // Public routes (no authentication required)
  '/': { path: '/', isPublic: true },
  '/index': { path: '/index', isPublic: true },
  '/unauthorized': { path: '/unauthorized', isPublic: true },

  // Auth routes (redirect authenticated users)
  '/login': { 
    path: '/login', 
    isPublic: true,
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/onboarding/registration': {
    path: '/onboarding/registration',
    isPublic: true,
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/role-selection': { 
    path: '/role-selection', 
    allowedRoles: ['guest', 'registered_user'],
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/onboarding/onboarding': { 
    path: '/onboarding/onboarding', 
    isPublic: true,
    redirectTo: 'role-based'
  },

  // Lawyer routes (all require verified_lawyer role)
  '/lawyer': { 
    path: '/lawyer/index', 
    requiredRole: 'verified_lawyer',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true,
    fallbackRoute: '/role-selection'
  },
  '/lawyer/chatbot': {
    path: '/lawyer/chatbot',
    requiredRole: 'verified_lawyer',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/lawyer/consult': {
    path: '/lawyer/consult',
    requiredRole: 'verified_lawyer',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/lawyer/forum': {
    path: '/lawyer/forum',
    requiredRole: 'verified_lawyer',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/lawyer/profile': {
    path: '/lawyer/profile',
    requiredRole: 'verified_lawyer',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },

  // User routes (require registered_user role)
  '/home': { 
    path: '/home', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true,
    fallbackRoute: '/role-selection'
  },
  '*': {
    path: '*',
    requiredRole: 'registered_user',
    redirectTo: 'role-based',
    fallbackRoute: '/home'
  },
  '/directory': { 
    path: '/directory', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/guides': { 
    path: '/guides', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/glossary': { 
    path: '/glossary', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/article': { 
    path: '/article', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/chatbot': { 
    path: '/chatbot', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/booklawyer': { 
    path: '/booklawyer', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/profile': { 
    path: '/profile', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/profile/edit': { 
    path: '/profile/edit', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },

  // Settings routes
  '/settings': { 
    path: '/settings', 
    allowedRoles: ['registered_user', 'verified_lawyer'],
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/settings/change-password': { 
    path: '/settings/change-password', 
    allowedRoles: ['registered_user', 'verified_lawyer'],
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/settings/privacy-policy': { 
    path: '/settings/privacy-policy', 
    allowedRoles: ['registered_user', 'verified_lawyer'],
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/settings/terms': { 
    path: '/settings/terms', 
    allowedRoles: ['registered_user', 'verified_lawyer'],
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/settings/about-us': { 
    path: '/settings/about-us', 
    allowedRoles: ['registered_user', 'verified_lawyer'],
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },

  // Lawyer onboarding routes (for authenticated users during verification process)
  '/onboarding/lawyer': {
    path: '/onboarding/lawyer',
    allowedRoles: ['guest', 'registered_user'],
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/documents-success': { 
    path: '/documents-success', 
    allowedRoles: ['guest', 'registered_user'],
    redirectTo: 'role-based',
    errorBoundary: true
  },

  // Admin routes
  '/admin': { 
    path: '/admin', 
    requiredRole: 'admin',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true,
    fallbackRoute: '/role-selection'
  },

  // Additional onboarding routes
  '/onboarding/otp-success': {
    path: '/onboarding/otp-success',
    allowedRoles: ['guest', 'registered_user'],
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/onboarding/verify-otp': {
    path: '/onboarding/verify-otp',
    isPublic: true,
    redirectTo: 'role-based',
    errorBoundary: true
  },

  // Lawyer onboarding flow
  '/onboarding/lawyer/documents-success': {
    path: '/onboarding/lawyer/documents-success',
    allowedRoles: ['guest', 'registered_user'],
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/onboarding/lawyer/lawyer-face-verification': {
    path: '/onboarding/lawyer/lawyer-face-verification',
    allowedRoles: ['guest', 'registered_user'],
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/onboarding/lawyer/lawyer-terms': {
    path: '/onboarding/lawyer/lawyer-terms',
    allowedRoles: ['guest', 'registered_user'],
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/onboarding/lawyer/rejected': {
    path: '/onboarding/lawyer/rejected',
    allowedRoles: ['guest', 'registered_user'],
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/onboarding/lawyer/resubmission': {
    path: '/onboarding/lawyer/resubmission',
    allowedRoles: ['guest', 'registered_user'],
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/onboarding/lawyer/upload-documents': {
    path: '/onboarding/lawyer/upload-documents',
    allowedRoles: ['guest', 'registered_user'],
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/onboarding/lawyer/verification-instructions': {
    path: '/onboarding/lawyer/verification-instructions',
    allowedRoles: ['guest', 'registered_user'],
    redirectTo: 'role-based',
    errorBoundary: true
  },
  
  // Lawyer status screens
  '/onboarding/lawyer/lawyer-status/resubmission': {
    path: '/onboarding/lawyer/lawyer-status/resubmission',
    allowedRoles: ['registered_user'],
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/onboarding/lawyer/lawyer-status/rejected': {
    path: '/onboarding/lawyer/lawyer-status/rejected',
    allowedRoles: ['registered_user'],
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/onboarding/lawyer/lawyer-status/accepted': {
    path: '/onboarding/lawyer/lawyer-status/accepted',
    allowedRoles: ['registered_user', 'verified_lawyer'],
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/onboarding/lawyer/lawyer-status/pending': {
    path: '/onboarding/lawyer/lawyer-status/pending',
    allowedRoles: ['registered_user', 'verified_lawyer'],
    redirectTo: 'role-based',
    errorBoundary: true
  }
};

// Get role-based redirect path with pending lawyer application check
export const getRoleBasedRedirect = (role: UserRole, isVerified?: boolean, pendingLawyer?: boolean, applicationStatus?: string): string => {
  // If user has pending lawyer application, redirect to appropriate status screen
  if (pendingLawyer) {
    if (applicationStatus) {
      switch (applicationStatus) {
        case 'pending':
          return '/onboarding/lawyer/lawyer-status/pending';
        case 'resubmission':
          return '/onboarding/lawyer/lawyer-status/resubmission';
        case 'rejected':
          return '/onboarding/lawyer/lawyer-status/rejected';
        case 'accepted':
          return '/onboarding/lawyer/lawyer-status/accepted';
        default:
          return '/onboarding/lawyer/lawyer-status/pending';
      }
    } else {
      // If pending_lawyer is true but no application status, show loading
      return 'loading';
    }
  }

  switch (role) {
    case 'verified_lawyer':
      return '/lawyer';
    case 'admin':
    case 'superadmin':
      return '/admin';
    case 'registered_user':
      return '/home';
    case 'guest':
      return isVerified ? '/role-selection' : '/login';
    default:
      return '/home';
  }
};

// Check if user has required permissions for route
export const hasRoutePermission = (
  route: RouteConfig,
  userRole: UserRole | null
): boolean => {
  if (route.isPublic) return true;
  if (!userRole) return false;

  // Check specific role requirement (exact match)
  if (route.requiredRole) {
    return userRole === route.requiredRole;
  }

  // Check allowed roles list
  if (route.allowedRoles) {
    return route.allowedRoles.includes(userRole);
  }

  // Default: require authentication for any authenticated user
  return userRole !== 'guest';
};

// Server-side route validation
export const validateRouteOnServer = async (
  path: string,
  userToken: string
): Promise<{ valid: boolean; redirectTo?: string; error?: string }> => {
  try {
    const response = await fetch('/api/validate-route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ path })
    });

    if (!response.ok) {
      throw new Error(`Server validation failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Server route validation error:', error);
    return {
      valid: false,
      error: 'Server validation unavailable',
      redirectTo: '/login'
    };
  }
};

// Enhanced route access validation with server-side check
export const validateRouteAccess = async (
  route: RouteConfig,
  user: any,
  userToken?: string
): Promise<{ allowed: boolean; redirectTo?: string; reason?: string }> => {
  // Client-side permission check first
  if (!hasRoutePermission(route, user?.role)) {
    return {
      allowed: false,
      redirectTo: route.fallbackRoute || getRoleBasedRedirect(user?.role, user?.is_verified),
      reason: 'Insufficient permissions'
    };
  }

  // Server-side validation for sensitive routes
  if (route.serverValidation && userToken) {
    try {
      const serverResult = await validateRouteOnServer(route.path, userToken);
      if (!serverResult.valid) {
        return {
          allowed: false,
          redirectTo: serverResult.redirectTo || route.fallbackRoute || '/login',
          reason: serverResult.error || 'Server validation failed'
        };
      }
    } catch (error) {
      console.error('Server validation error:', error);
      // Continue with client-side validation if server fails
    }
  }

  return { allowed: true };
};

// Audit logging for route access
export const logRouteAccess = (
  path: string,
  user: any,
  result: 'granted' | 'denied',
  reason?: string
): void => {
  const logData = {
    timestamp: new Date().toISOString(),
    path,
    user: user?.email || 'anonymous',
    userId: user?.id || null,
    role: user?.role || 'guest',
    result,
    reason,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
  };

  // Send to server for audit trail (in production)
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/audit/route-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    }).catch(error => console.error('Failed to log route access:', error));
  }
};

// Get route config for a given path
export const getRouteConfig = (path: string): RouteConfig | null => {
  // Direct match
  if (ROUTE_CONFIG[path]) {
    return ROUTE_CONFIG[path];
  }

  // Pattern matching for nested routes
  for (const [configPath, config] of Object.entries(ROUTE_CONFIG)) {
    if (path.startsWith(configPath) && configPath !== '/') {
      return config;
    }
  }

  // Default: protected route requiring authentication
  return {
    path,
    requiredRole: 'registered_user',
    redirectTo: '/login',
    fallbackRoute: '/home',
    errorBoundary: true
  };
};
