import React from "react";
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from "react-native";
import tw from "tailwind-react-native-classnames";
import Colors from "@/constants/Colors";
import {
  Library,
  Users,
  Briefcase,
  ScrollText,
  Gavel,
  ShoppingCart,
} from "lucide-react-native";

interface Category {
  id: string;
  label: string;
}

interface CategoryScrollerProps {
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const categories: Category[] = [
  { id: "all", label: "All" },
  { id: "family", label: "Family" },
  { id: "work", label: "Work" },
  { id: "civil", label: "Civil" },
  { id: "criminal", label: "Criminal" },
  { id: "consumer", label: "Consumer" },
];

export default function CategoryScroller({ activeCategory, onCategoryChange }: CategoryScrollerProps) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 450; // Increased threshold to accommodate 6 categories
  const shouldScroll = isSmallScreen;

  const categoryIcons: Record<string, React.ComponentType<any>> = {
    all: Library,
    family: Users,
    work: Briefcase,
    civil: ScrollText,
    criminal: Gavel,
    consumer: ShoppingCart,
  };

  return (
    <View style={tw`mb-4`}>
      {shouldScroll ? (
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
                      tw`w-16 h-16 rounded-2xl items-center justify-center border`,
                      {
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
                  <Text style={[tw`mt-2 text-sm font-medium`, { color: isActive ? Colors.primary.blue : Colors.text.sub }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View style={tw`flex-row justify-between`}>
          {categories.map((c) => {
            const isActive = activeCategory === c.id;
            const Icon = categoryIcons[c.id];
            return (
              <TouchableOpacity
                key={c.id}
                style={tw`items-center`}
                onPress={() => onCategoryChange(c.id)}
              >
                <View
                  style={[
                    tw`w-14 h-14 rounded-2xl items-center justify-center border`,
                    {
                      backgroundColor: "#fff",
                      borderColor: isActive ? Colors.primary.blue : "#e5e7eb",
                    },
                  ]}
                >
                  {Icon ? (
                    <Icon size={22} color={isActive ? Colors.primary.blue : "#9CA3AF"} strokeWidth={2} />
                  ) : (
                    <Library size={22} color={isActive ? Colors.primary.blue : "#9CA3AF"} strokeWidth={2} />
                  )}
                </View>
                <Text style={[tw`mt-2 text-xs font-medium text-center`, { color: isActive ? Colors.primary.blue : Colors.text.sub }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}


