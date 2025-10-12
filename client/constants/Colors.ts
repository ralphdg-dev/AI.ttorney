/**
 * Comprehensive design system colors for consistent UI across the app.
 * Includes semantic colors, gradients, and accessibility-compliant color combinations.
 */

const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
  primary: {
    blue: '#023D7B',
    lightBlue: '#93C5FD',
    darkBlue: '#1E3A8A',
  },
  secondary: {
    gray: '#6B7280',
    lightGray: '#F3F4F6',
    darkGray: '#374151',
  },
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    head: '#313131',
    sub: '#373737',
    body: '#4B5563',
    white: '#FFFFFF',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  category: {
    family: {
      bg: '#FDF2F8',
      border: '#FECACA',
      text: '#BE185D',
    },
    labor: {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1D4ED8',
    },
    civil: {
      bg: '#F5F3FF',
      border: '#C4B5FD',
      text: '#7C3AED',
    },
    criminal: {
      bg: '#FEF3C7',
      border: '#FCD34D',
      text: '#D97706',
    },
    consumer: {
      bg: '#ECFDF5',
      border: '#A7F3D0',
      text: '#059669',
    },
    others: {
      bg: '#F3F4F6',
      border: '#D1D5DB',
      text: '#6B7280',
    },
  },
  // Shadow utilities moved to shadowUtils.ts for cross-platform compatibility
  // Use: import { shadowPresets, createShadowStyle } from '../utils/shadowUtils';
};
