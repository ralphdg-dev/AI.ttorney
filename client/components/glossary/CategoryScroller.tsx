  import React from "react";
  import { View, Text, TouchableOpacity, ScrollView } from "react-native";
  import tw from "tailwind-react-native-classnames";
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
    includeAllOption?: boolean; // default true for glossary, can be disabled elsewhere
  }

  // Helper to compute categories list optionally including 'all'
  const composeCategories = (includeAll: boolean) =>
    (includeAll
      ? ([{ id: "all", label: "All" }, ...LEGAL_CATEGORIES] as (LegalCategory | { id: string; label: string })[])
      : (LEGAL_CATEGORIES as (LegalCategory | { id: string; label: string })[])
    );

  export default function CategoryScroller({ activeCategory, onCategoryChange, includeAllOption = true }: CategoryScrollerProps) {
    const tileSize = 64; // fixed to keep layout consistent across categories
    const categories = composeCategories(includeAllOption);

    const categoryIcons: Record<string, React.ComponentType<any>> = {
      all: Library,
      family: Users,
      work: Briefcase,
      civil: ScrollText,
      criminal: Gavel,
      consumer: ShoppingCart,
      others: Tag,
    };

    return (
      <View style={tw`mb-4`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
          <View style={tw`flex-row`}>
            {categories.map((c) => {
              const isActive = activeCategory === c.id;
              const Icon = categoryIcons[c.id];
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[tw`items-center mr-4`]}
                  onPress={() => onCategoryChange(c.id)}
                >
                  <View
                    style={[
                      tw`rounded-2xl items-center justify-center border`,
                      {
                        width: tileSize,
                        height: tileSize,
                        backgroundColor: "#fff",
                        borderColor: isActive ? Colors.primary.blue : "#e5e7eb",
                      },
                    ]}
                  >
                    {Icon ? (
                      <Icon size={28} color={isActive ? Colors.primary.blue : "#9CA3AF"} strokeWidth={2} />
                    ) : (
                      <Library size={28} color={isActive ? Colors.primary.blue : "#9CA3AF"} strokeWidth={2} />
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                      tw`mt-2 text-sm font-medium`,
                      {
                        color: isActive ? Colors.primary.blue : Colors.text.sub,
                        width: tileSize,
                        textAlign: "center",
                      },
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

