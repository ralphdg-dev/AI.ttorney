import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import Colors from "@/constants/Colors";
import { LAYOUT } from "@/constants/LayoutConstants";
import { LEGAL_CATEGORIES, LegalCategory } from "@/constants/categories";
import {
  Library,
  Users,
  Briefcase,
  ScrollText,
  Gavel,
  ShoppingCart,
  Tag,
} from "lucide-react-native";

interface CategoryScrollerProps {
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  includeAllOption?: boolean;
}

const composeCategories = (includeAll: boolean) =>
  (includeAll
    ? ([{ id: "all", label: "All" }, ...LEGAL_CATEGORIES] as (LegalCategory | { id: string; label: string })[])
    : (LEGAL_CATEGORIES as (LegalCategory | { id: string; label: string })[])
  );

export default function CategoryScroller({ activeCategory, onCategoryChange, includeAllOption = true }: CategoryScrollerProps) {
  // Memoize categories to prevent re-renders
  const categories = useMemo(() => composeCategories(includeAllOption), [includeAllOption]);

  // Memoize category icons to prevent re-creation
  const categoryIcons = useMemo(() => ({
    all: Library,
    family: Users,
    work: Briefcase,
    civil: ScrollText,
    criminal: Gavel,
    consumer: ShoppingCart,
    others: Tag,
  }), []);

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.categoriesRow}>
          {categories.map((c) => {
            const isActive = activeCategory === c.id;
            const Icon = categoryIcons[c.id as keyof typeof categoryIcons];
            
            return (
              <TouchableOpacity
                key={c.id}
                style={styles.categoryButton}
                onPress={() => onCategoryChange(c.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.iconContainer,
                    isActive ? styles.iconContainerActive : styles.iconContainerInactive
                  ]}
                >
                  {Icon ? (
                    <Icon 
                      size={24} 
                      className="sm:w-7 sm:h-7 lg:w-8 lg:h-8"
                      color={isActive ? Colors.primary.blue : "#9CA3AF"} 
                      strokeWidth={2} 
                    />
                  ) : (
                    <Library 
                      size={24}
                      className="sm:w-7 sm:h-7 lg:w-8 lg:h-8"
                      color={isActive ? Colors.primary.blue : "#9CA3AF"} 
                      strokeWidth={2} 
                    />
                  )}
                </View>
                
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    styles.label,
                    isActive ? styles.labelActive : styles.labelInactive
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.md,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SPACING.md,
    paddingRight: LAYOUT.SPACING.xl,
  },
  categoriesRow: {
    flexDirection: 'row',
  },
  categoryButton: {
    alignItems: 'center',
    marginRight: LAYOUT.SPACING.md, // 16px gap between categories (React Native compatible)
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: LAYOUT.RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  iconContainerActive: {
    borderColor: Colors.primary.blue,
    backgroundColor: '#EFF6FF',
  },
  iconContainerInactive: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  label: {
    marginTop: LAYOUT.SPACING.sm,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    width: 56,
  },
  labelActive: {
    color: Colors.primary.blue,
  },
  labelInactive: {
    color: Colors.text.sub,
  },
});
