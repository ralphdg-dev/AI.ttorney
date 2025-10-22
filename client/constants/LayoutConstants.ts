import { Platform } from 'react-native';

/**
 * Design System - Layout Constants
 * Single source of truth for all layout dimensions
 * Following Material Design & iOS Human Interface Guidelines
 * 
 * @see https://m3.material.io/foundations/layout/understanding-layout/spacing
 * @see https://developer.apple.com/design/human-interface-guidelines/layout
 */

/**
 * Core layout dimensions (in dp/pt)
 * Based on Material Design 3 and iOS HIG standards
 */
export const LAYOUT = {
  /**
   * Header height - 56dp (Material Design standard)
   * Consistent across iOS and Android for unified experience
   */
  HEADER_HEIGHT: 56,

  /**
   * Bottom navigation bar height - 56dp (Material Design standard)
   * Matches iOS tab bar height for consistency
   */
  NAVBAR_HEIGHT: 56,

  /**
   * Minimum touch target size for accessibility
   * iOS: 44pt (HIG standard)
   * Android: 48dp (Material Design standard)
   * Web: 44px (WCAG AAA compliance)
   */
  MIN_TOUCH_TARGET: Platform.select({ 
    ios: 44, 
    android: 48, 
    default: 44 
  }) as number,

  /**
   * Icon button size (circular)
   * Provides comfortable touch target with visual balance
   */
  ICON_BUTTON_SIZE: 40,

  /**
   * Spacing scale based on 8dp grid system
   * Ensures consistent spacing throughout the app
   */
  SPACING: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  /**
   * Border radius scale
   * Creates consistent rounded corners
   */
  RADIUS: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  /**
   * Responsive breakpoints (in px)
   * Mobile-first approach
   */
  BREAKPOINTS: {
    mobile: 0,
    mobileLarge: 375,
    tablet: 768,
    desktop: 1024,
    desktopLarge: 1440,
  },

  /**
   * Z-index scale
   * Prevents z-index conflicts
   */
  Z_INDEX: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
  },
} as const;

/**
 * Type-safe helper functions
 */

/**
 * Get the standard header height
 * @returns Header height in dp/pt
 */
export const getHeaderHeight = (): number => LAYOUT.HEADER_HEIGHT;

/**
 * Get the standard navbar height
 * @returns Navbar height in dp/pt
 */
export const getNavbarHeight = (): number => LAYOUT.NAVBAR_HEIGHT;

/**
 * Calculate total UI height (navbar + safe area insets)
 * Used for positioning fixed elements above the navbar
 * 
 * @param safeAreaBottom - Bottom safe area inset from useSafeAreaInsets()
 * @returns Total height in dp/pt
 */
export const getTotalUIHeight = (safeAreaBottom: number): number => 
  LAYOUT.NAVBAR_HEIGHT + safeAreaBottom;

/**
 * Calculate content bottom padding to prevent navbar overlap
 * Includes breathing room for better UX
 * 
 * @param safeAreaBottom - Bottom safe area inset from useSafeAreaInsets()
 * @param breathingRoom - Additional spacing (default: 20dp)
 * @returns Total padding in dp/pt
 */
export const getContentBottomPadding = (
  safeAreaBottom: number, 
  breathingRoom: number = 20
): number => 
  LAYOUT.NAVBAR_HEIGHT + safeAreaBottom + breathingRoom;

/**
 * Check if screen width is mobile size
 * @param width - Screen width from useWindowDimensions()
 * @returns True if mobile size
 */
export const isMobile = (width: number): boolean => 
  width < LAYOUT.BREAKPOINTS.tablet;

/**
 * Check if screen width is tablet size
 * @param width - Screen width from useWindowDimensions()
 * @returns True if tablet size
 */
export const isTablet = (width: number): boolean => 
  width >= LAYOUT.BREAKPOINTS.tablet && width < LAYOUT.BREAKPOINTS.desktop;

/**
 * Check if screen width is desktop size
 * @param width - Screen width from useWindowDimensions()
 * @returns True if desktop size
 */
export const isDesktop = (width: number): boolean => 
  width >= LAYOUT.BREAKPOINTS.desktop;

/**
 * Get responsive value based on screen width
 * @param width - Screen width from useWindowDimensions()
 * @param mobile - Value for mobile screens
 * @param tablet - Value for tablet screens (optional, defaults to desktop)
 * @param desktop - Value for desktop screens
 * @returns Appropriate value for current screen size
 */
export const getResponsiveValue = <T,>(
  width: number,
  mobile: T,
  tablet: T | undefined,
  desktop: T
): T => {
  if (isDesktop(width)) return desktop;
  if (isTablet(width)) return tablet ?? desktop;
  return mobile;
};

/**
 * Type exports for TypeScript
 */
export type LayoutSpacing = keyof typeof LAYOUT.SPACING;
export type LayoutRadius = keyof typeof LAYOUT.RADIUS;
export type LayoutBreakpoint = keyof typeof LAYOUT.BREAKPOINTS;
export type LayoutZIndex = keyof typeof LAYOUT.Z_INDEX;
