import { UserRole } from '../contexts/AuthContext';
import { isPublicRoute, isSensitivePublicRoute } from './publicRoutesSecurity';

export interface RouteConfig {
  path: string;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  redirectTo?: string;
  isPublic?: boolean;
  requiresGuestSession?: boolean;
  serverValidation?: boolean;
  fallbackRoute?: string;
  errorBoundary?: boolean;
}

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  '/': { path: '/', isPublic: true },
  '/index': { path: '/index', isPublic: true },
  '/unauthorized': { path: '/unauthorized', isPublic: true },

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
  '/auth/forgot-password': {
    path: '/auth/forgot-password',
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
  '/deactivated': { 
    path: '/deactivated', 
    isPublic: true,
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/onboarding/onboarding': { 
    path: '/onboarding/onboarding', 
    isPublic: true,
    redirectTo: 'role-based'
  },
  '/onboarding/registered-tutorial': {
    path: '/onboarding/registered-tutorial',
    allowedRoles: ['registered_user', 'verified_lawyer'],
    redirectTo: 'role-based',
    errorBoundary: true
  },
  '/guest-onboarding': { 
    path: '/guest-onboarding', 
    isPublic: true,
    errorBoundary: true
  },

  '/lawyer': { 
    path: '/lawyer/index', 
    requiredRole: 'verified_lawyer',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true,
    fallbackRoute: '/role-selection'
  },
  '/lawyer/chatbot': {
    path: '/chatbot',
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
    redirectTo: '/login',
    errorBoundary: true
  },
  '/glossary': { 
    path: '/glossary', 
    isPublic: true,
    requiresGuestSession: true,
    errorBoundary: true
  },
  '/chatbot': { 
    path: '/chatbot', 
    isPublic: true,
    requiresGuestSession: true,
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

  '/bookmarked-posts': { 
    path: '/bookmarked-posts', 
    allowedRoles: ['registered_user', 'verified_lawyer'],
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/favorite-terms': { 
    path: '/favorite-terms', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/bookmarked-guides': { 
    path: '/bookmarked-guides', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/consultations': { 
    path: '/consultations', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },
  '/notifications': { 
    path: '/notifications', 
    allowedRoles: ['registered_user', 'verified_lawyer'],
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true
  },

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
    isPublic: true,
    requiresGuestSession: true,
    errorBoundary: true
  },
  '/settings/terms': { 
    path: '/settings/terms', 
    isPublic: true,
    requiresGuestSession: true,
    errorBoundary: true
  },
  '/settings/about-us': { 
    path: '/settings/about-us', 
    isPublic: true,
    requiresGuestSession: true,
    errorBoundary: true
  },
  '/help': { 
    path: '/help', 
    isPublic: true,
    requiresGuestSession: true,
    errorBoundary: true
  },
  '/about': { 
    path: '/about', 
    isPublic: true,
    requiresGuestSession: true,
    errorBoundary: true
  },

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

  '/admin': { 
    path: '/admin', 
    requiredRole: 'admin',
    redirectTo: 'role-based',
    serverValidation: true,
    errorBoundary: true,
    fallbackRoute: '/role-selection'
  },

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

export const getRoleBasedRedirect = (role: UserRole, isVerified?: boolean, pendingLawyer?: boolean, applicationStatus?: string): string => {
  // Pending lawyers are treated as regular users unless explicitly navigating to status pages
  // They only get auto-redirected to status pages in specific cases (handled in AuthContext)

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

export const hasRoutePermission = (
  route: RouteConfig,
  userRole: UserRole | null
): boolean => {
  if (route.isPublic) return true;
  if (!userRole) return false;

  if (route.requiredRole) {
    return userRole === route.requiredRole;
  }

  if (route.allowedRoles) {
    return route.allowedRoles.includes(userRole);
  }

  return userRole !== 'guest';
};

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

export const validateRouteAccess = async (
  route: RouteConfig,
  user: any,
  userToken?: string
): Promise<{ allowed: boolean; redirectTo?: string; reason?: string }> => {
  if (!hasRoutePermission(route, user?.role)) {
    return {
      allowed: false,
      redirectTo: route.fallbackRoute || getRoleBasedRedirect(user?.role, user?.is_verified),
      reason: 'Insufficient permissions'
    };
  }

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
    }
  }

  return { allowed: true };
};

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

  if (process.env.NODE_ENV === 'production') {
    fetch('/api/audit/route-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    }).catch(error => console.error('Failed to log route access:', error));
  }
};

export const getRouteConfig = (path: string): RouteConfig | null => {
  if (ROUTE_CONFIG[path]) {
    return ROUTE_CONFIG[path];
  }

  for (const [configPath, config] of Object.entries(ROUTE_CONFIG)) {
    if (path.startsWith(configPath) && configPath !== '/') {
      return config;
    }
  }

  if (isPublicRoute(path)) {
    return {
      path,
      isPublic: true,
      redirectTo: 'role-based',
      serverValidation: false,
      errorBoundary: true
    };
  }

  return {
    path,
    requiredRole: 'registered_user',
    redirectTo: '/login',
    fallbackRoute: '/home',
    errorBoundary: true
  };
};

export const requiresRateLimiting = (path: string): boolean => {
  return isSensitivePublicRoute(path);
};
