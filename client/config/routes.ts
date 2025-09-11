import { UserRole } from '../contexts/AuthContext';

export interface RouteConfig {
  path: string;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  redirectTo?: string;
  isPublic?: boolean;
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
    redirectTo: 'role-based' // Special flag for role-based redirect
  },
  '/onboarding': { 
    path: '/onboarding', 
    isPublic: true,
    redirectTo: 'role-based'
  },
  '/role-selection': { 
    path: '/role-selection', 
    allowedRoles: ['guest'],
    redirectTo: 'role-based'
  },
  '/nonlaw-reg': { 
    path: '/nonlaw-reg', 
    isPublic: true,
    redirectTo: 'role-based'
  },
  '/verifyotp-reg': { 
    path: '/verifyotp-reg', 
    isPublic: true,
    redirectTo: 'role-based'
  },
  '/lawyer-starting-page': { 
    path: '/lawyer-starting-page', 
    isPublic: true,
    redirectTo: 'role-based'
  },

  // Lawyer routes (all require verified_lawyer role)
  '/lawyer': { 
    path: '/lawyer', 
    requiredRole: 'verified_lawyer',
    redirectTo: 'role-based'
  },
  '/lawyer/chatbot': {
    path: '/lawyer/chatbot',
    requiredRole: 'verified_lawyer',
    redirectTo: 'role-based'
  },
  '/lawyer/consult': {
    path: '/lawyer/consult',
    requiredRole: 'verified_lawyer',
    redirectTo: 'role-based'
  },
  '/lawyer/forum': {
    path: '/lawyer/forum',
    requiredRole: 'verified_lawyer',
    redirectTo: 'role-based'
  },
  '/lawyer/profile': {
    path: '/lawyer/profile',
    requiredRole: 'verified_lawyer',
    redirectTo: 'role-based'
  },

  // User routes (require registered_user role)
  '/home': { 
    path: '/home', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based'
  },
  '*': {
    path: '*',
    requiredRole: 'registered_user',
    redirectTo: 'role-based'
  },
  '/directory': { 
    path: '/directory', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based'
  },
  '/guides': { 
    path: '/guides', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based'
  },
  '/glossary': { 
    path: '/glossary', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based'
  },
  '/article': { 
    path: '/article', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based'
  },
  '/chatbot': { 
    path: '/chatbot', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based'
  },
  '/booklawyer': { 
    path: '/booklawyer', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based'
  },

  // Lawyer onboarding routes (public during onboarding process)
  '/onboarding/lawyer': {
    path: '/onboarding/lawyer',
    isPublic: true,
    redirectTo: 'role-based'
  },
  '/documents-success': { 
    path: '/documents-success', 
    requiredRole: 'registered_user',
    redirectTo: 'role-based'
  },

  // Admin routes
  '/admin': { 
    path: '/admin', 
    requiredRole: 'admin',
    redirectTo: 'role-based'
  },

  // Additional onboarding routes
  '/onboarding/onboarding': {
    path: '/onboarding/onboarding',
    isPublic: true,
    redirectTo: 'role-based'
  },
  '/onboarding/otp-success': {
    path: '/onboarding/otp-success',
    isPublic: true,
    redirectTo: 'role-based'
  },
  '/onboarding/verify-otp': {
    path: '/onboarding/verify-otp',
    isPublic: true,
    redirectTo: 'role-based'
  },

  // Lawyer onboarding flow (public during registration)
  '/onboarding/lawyer/documents-success': {
    path: '/onboarding/lawyer/documents-success',
    isPublic: true,
    redirectTo: 'role-based'
  },
  '/onboarding/lawyer/lawyer-face-verification': {
    path: '/onboarding/lawyer/lawyer-face-verification',
    isPublic: true,
    redirectTo: 'role-based'
  },
  '/onboarding/lawyer/lawyer-terms': {
    path: '/onboarding/lawyer/lawyer-terms',
    isPublic: true,
    redirectTo: 'role-based'
  },
  '/onboarding/lawyer/rejected': {
    path: '/onboarding/lawyer/rejected',
    isPublic: true,
    redirectTo: 'role-based'
  },
  '/onboarding/lawyer/resubmission': {
    path: '/onboarding/lawyer/resubmission',
    isPublic: true,
    redirectTo: 'role-based'
  },
  '/onboarding/lawyer/upload-documents': {
    path: '/onboarding/lawyer/upload-documents',
    isPublic: true,
    redirectTo: 'role-based'
  },
  '/onboarding/lawyer/verification-instructions': {
    path: '/onboarding/lawyer/verification-instructions',
    isPublic: true,
    redirectTo: 'role-based'
  },

  // Nested routes that inherit parent permissions
  '/home/CreatePost': {
    path: '/home/CreatePost',
    requiredRole: 'registered_user',
    redirectTo: 'role-based'
  },
  '/home/ViewPost': {
    path: '/home/ViewPost',
    requiredRole: 'registered_user',
    redirectTo: 'role-based'
  },
};


// Get role-based redirect path
export const getRoleBasedRedirect = (role: UserRole, isVerified?: boolean): string => {
  switch (role) {
    case 'verified_lawyer':
      return '/lawyer';
    case 'admin':
    case 'superadmin':
      return '/admin';
    case 'registered_user':
      return '/home';
    case 'guest':
      // Only verified guests should go to role-selection, unverified guests go to login
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
    redirectTo: '/login'
  };
};
