import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import Colors from "@/constants/Colors";
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
    <View className="mb-4 md:mb-6">
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ 
          paddingHorizontal: 16,
          paddingRight: 32 
        }}
        className="flex-1"
      >
        <View className="flex-row space-x-3 md:space-x-4 lg:space-x-5">
          {categories.map((c) => {
            const isActive = activeCategory === c.id;
            const Icon = categoryIcons[c.id as keyof typeof categoryIcons];
            
            return (
              <TouchableOpacity
                key={c.id}
                className="items-center"
                onPress={() => onCategoryChange(c.id)}
                activeOpacity={0.8}
              >
                {/* Flat design - no shadows or 3D effects */}
                <View
                  className={`
                    w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18
                    rounded-xl items-center justify-center border-2 
                    transition-all duration-200 ease-in-out
                    ${isActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                  `}
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
                
                {/* Responsive text sizing */}
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className={`
                    mt-2 text-xs sm:text-sm lg:text-base font-medium text-center
                    w-14 sm:w-16 lg:w-18
                    ${isActive ? 'text-blue-600' : 'text-gray-600'}
                  `}
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

