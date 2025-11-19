import { StyleProp, TextStyle, ViewStyle } from 'react-native';

// Type for category colors
export interface CategoryColors {
  bg: string;
  border: string;
  text: string;
}

// Category type with all possible category values
type CategoryType = 'family' | 'labor' | 'civil' | 'criminal' | 'consumer' | 'others';

// Color palette for categories (matches design system)
const CATEGORY_COLORS: Record<CategoryType, CategoryColors> = {
  family: { bg: '#FEF2F2', border: '#FECACA', text: '#BE123C' },
  labor: { bg: '#FEF3C7', border: '#FDE68A', text: '#D97706' },
  civil: { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' },
  criminal: { bg: '#F3E8FF', border: '#C4B5FD', text: '#7C3AED' },
  consumer: { bg: '#ECFDF5', border: '#BBF7D0', text: '#059669' },
  others: { bg: '#F3F4F6', border: '#D1D5DB', text: '#6B7280' },
} as const;

/**
 * Normalizes a category string to match our known categories
 */
const normalizeCategory = (category: string | undefined | null): CategoryType => {
  if (!category) return 'others';
  
  const cleanCategory = category.trim().toLowerCase();
  
  // Handle common variations
  if (['family', 'family law', 'family-law'].includes(cleanCategory)) return 'family';
  if (['labor', 'labor law', 'employment', 'employment law'].includes(cleanCategory)) return 'labor';
  if (['civil', 'civil law'].includes(cleanCategory)) return 'civil';
  if (['criminal', 'criminal law'].includes(cleanCategory)) return 'criminal';
  if (['consumer', 'consumer protection', 'consumer law'].includes(cleanCategory)) return 'consumer';
  
  // Check if the category is a direct match
  if (Object.keys(CATEGORY_COLORS).includes(cleanCategory)) {
    return cleanCategory as CategoryType;
  }
  
  return 'others';
};

/**
 * Gets the display text for a category
 */
export const getCategoryDisplayText = (category: string | undefined | null): string => {
  if (!category) return 'Others';
  
  const normalized = normalizeCategory(category);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

/**
 * Gets the colors for a category
 */
export const getCategoryColors = (category: string | undefined | null): CategoryColors => {
  const normalized = normalizeCategory(category);
  return CATEGORY_COLORS[normalized];
};

/**
 * Gets the style objects for a category badge
 */
export const getCategoryStyles = (category: string | undefined | null): {
  container: StyleProp<ViewStyle>;
  text: StyleProp<TextStyle>;
} => {
  const colors = getCategoryColors(category);
  
  return {
    container: {
      backgroundColor: colors.bg,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    text: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
  };
};

export default {
  getCategoryColors,
  getCategoryDisplayText,
  getCategoryStyles,
  normalizeCategory,
};
