/**
 * Navigation Helper Utility
 * 
 * FAANG-level navigation management following DRY principles and clean code standards.
 * Handles intelligent back navigation with guest mode awareness and fallback routes.
 * 
 * @module navigationHelper
 * @author AI.ttorney Engineering Team
 */

import { Router } from 'expo-router';
import { normalizePath } from './path';

/**
 * Navigation context for determining appropriate fallback routes
 */
export interface NavigationContext {
  isGuestMode: boolean;
  isAuthenticated: boolean;
  userRole?: string;
  currentPath?: string;
}

/**
 * Guest-accessible routes that serve as safe fallback destinations
 * Following DRY principle - single source of truth for guest routes
 */
const GUEST_SAFE_ROUTES = [
  '/guides',
  '/glossary',
  '/chatbot',
  '/article',
] as const;

/**
 * Authenticated user safe routes
 */
const AUTH_SAFE_ROUTES = [
  '/home',
  '/lawyer',
] as const;

/**
 * Public safe routes (accessible by anyone)
 */
const PUBLIC_SAFE_ROUTES = [
  '/login',
  ...GUEST_SAFE_ROUTES,
] as const;

/**
 * Determines the appropriate fallback route based on navigation context
 * 
 * @param context - Navigation context including auth state and user role
 * @returns Safe fallback route path
 * 
 * @example
 * ```typescript
 * const fallback = getFallbackRoute({ isGuestMode: true, isAuthenticated: false });
 * // Returns: '/guides'
 * ```
 */
export const getFallbackRoute = (context: NavigationContext): string => {
  const { isGuestMode, isAuthenticated, userRole, currentPath } = context;

  // Guest mode: Prioritize guides as primary landing page
  if (isGuestMode || !isAuthenticated) {
    // If already on a guest route, go to guides (main guest hub)
    if (currentPath && GUEST_SAFE_ROUTES.some(route => currentPath.startsWith(route))) {
      return '/guides';
    }
    return '/guides';
  }

  // Authenticated users: Role-based fallback
  if (userRole === 'verified_lawyer') {
    return '/lawyer';
  }

  // Default: Home for registered users
  return '/home';
};

/**
 * Checks if the router has navigation history
 * 
 * @param router - Expo router instance
 * @returns True if back navigation is possible
 */
export const canGoBack = (router: Router): boolean => {
  try {
    // Type assertion for canGoBack method (may not exist in all expo-router versions)
    const routerWithCanGoBack = router as any;
    
    if (typeof routerWithCanGoBack.canGoBack === 'function') {
      return routerWithCanGoBack.canGoBack();
    }
    
    // Fallback: Assume can't go back if method doesn't exist
    return false;
  } catch (error) {
    console.warn('⚠️ Error checking navigation history:', error);
    return false;
  }
};

/**
 * Intelligent back navigation with automatic fallback handling
 * 
 * This is the MAIN function to use throughout the app for back navigation.
 * It automatically handles edge cases like:
 * - No navigation history (direct URL access)
 * - Guest mode restrictions
 * - Invalid back routes
 * 
 * @param router - Expo router instance
 * @param context - Navigation context for fallback determination
 * @param customFallback - Optional custom fallback route (overrides default logic)
 * 
 * @example
 * ```typescript
 * // In a component
 * const { isGuestMode, isAuthenticated, user } = useAuth();
 * const router = useRouter();
 * 
 * const handleBack = () => {
 *   safeGoBack(router, {
 *     isGuestMode,
 *     isAuthenticated,
 *     userRole: user?.role,
 *     currentPath: '/article/123'
 *   });
 * };
 * ```
 */
export const safeGoBack = (
  router: Router,
  context: NavigationContext,
  customFallback?: string
): void => {
  try {
    // Check if we can safely go back
    if (canGoBack(router)) {
      console.log('✅ Navigation history exists, going back');
      router.back();
      return;
    }

    // No history: Use fallback route
    const fallbackRoute = customFallback || getFallbackRoute(context);
    console.log(`📍 No navigation history, redirecting to fallback: ${fallbackRoute}`);
    router.replace(fallbackRoute as any);
  } catch (error) {
    console.error('❌ Error in safeGoBack:', error);
    
    // Emergency fallback: Always go to a safe route
    const emergencyFallback = context.isGuestMode ? '/guides' : '/home';
    console.log(`🚨 Emergency fallback to: ${emergencyFallback}`);
    router.replace(emergencyFallback as any);
  }
};

/**
 * Creates a back button handler with context pre-configured
 * 
 * This is a convenience function for creating reusable back handlers.
 * Follows React best practices by returning a memoizable function.
 * 
 * @param router - Expo router instance
 * @param context - Navigation context
 * @param customFallback - Optional custom fallback route
 * @returns Back button handler function
 * 
 * @example
 * ```typescript
 * const { isGuestMode, isAuthenticated, user } = useAuth();
 * const router = useRouter();
 * 
 * const handleBack = useCallback(
 *   createBackHandler(router, {
 *     isGuestMode,
 *     isAuthenticated,
 *     userRole: user?.role,
 *     currentPath: pathname
 *   }),
 *   [router, isGuestMode, isAuthenticated, user?.role, pathname]
 * );
 * ```
 */
export const createBackHandler = (
  router: Router,
  context: NavigationContext,
  customFallback?: string
) => {
  return () => safeGoBack(router, context, customFallback);
};

/**
 * Validates if a route is safe for the current user context
 * 
 * @param route - Route path to validate
 * @param context - Navigation context
 * @returns True if route is accessible
 */
export const isRouteSafe = (route: string, context: NavigationContext): boolean => {
  const { isGuestMode, isAuthenticated, userRole } = context;

  // Public routes are always safe
  if (PUBLIC_SAFE_ROUTES.some(publicRoute => route.startsWith(publicRoute))) {
    return true;
  }

  // Guest mode: Only guest-safe routes
  if (isGuestMode || !isAuthenticated) {
    return GUEST_SAFE_ROUTES.some(guestRoute => route.startsWith(guestRoute));
  }

  // Authenticated: Check role-specific routes
  if (userRole === 'verified_lawyer' && route.startsWith('/lawyer')) {
    return true;
  }

  if (userRole === 'registered_user' && AUTH_SAFE_ROUTES.some(authRoute => route.startsWith(authRoute))) {
    return true;
  }

  return false;
};

/**
 * Gets the appropriate "home" route for the current user
 * 
 * @param context - Navigation context
 * @returns Home route path
 */
export const getHomeRoute = (context: NavigationContext): string => {
  const { isGuestMode, isAuthenticated, userRole } = context;

  if (isGuestMode || !isAuthenticated) {
    return '/guides';
  }

  if (userRole === 'verified_lawyer') {
    return '/lawyer';
  }

  return '/home';
};

/**
 * Type-safe route paths (for better IDE autocomplete)
 */
export type SafeRoute = 
  | '/guides'
  | '/glossary'
  | '/chatbot'
  | '/article'
  | '/home'
  | '/lawyer'
  | '/login';

/**
 * Navigation helper for common patterns
 */
export const NavigationHelper = {
  safeGoBack,
  createBackHandler,
  getFallbackRoute,
  canGoBack,
  isRouteSafe,
  getHomeRoute,
  GUEST_SAFE_ROUTES,
  AUTH_SAFE_ROUTES,
  PUBLIC_SAFE_ROUTES,
  /**
   * Replace only when path actually differs after normalization.
   * Optionally provide a ref to avoid repeated redirects on the same target.
   */
  replaceIfDifferent:
    (
      router: Router,
      currentPathRaw: string | undefined | null,
      targetPath: string,
      lastRedirectRef?: { current: string | null }
    ) => {
      if (!targetPath) return;
      const current = normalizePath(currentPathRaw || '/');
      const target = normalizePath(targetPath);
      if (target !== current && (!lastRedirectRef || lastRedirectRef.current !== target)) {
        if (lastRedirectRef) lastRedirectRef.current = target;
        router.replace(target as any);
      }
    }
} as const;

export default NavigationHelper;
