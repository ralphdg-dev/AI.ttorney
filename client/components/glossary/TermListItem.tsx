import React from "react";
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import tw from "tailwind-react-native-classnames";
import Colors from "@/constants/Colors";
import { ChevronRight, Star } from "lucide-react-native";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export interface TermItem {
  id: string;
  title: string; // maps to term_en from database
  summary: string; // maps to definition_en from database
  isFavorite?: boolean;
  filipinoTerm?: string; // maps to term_fil from database
  category?: string; // maps to domain from database
}

interface TermListItemProps {
  item: TermItem;
  onPress?: (item: TermItem) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function TermListItem({ item, onPress, containerStyle }: TermListItemProps) {
  const isFavorite = !!item.isFavorite;

  const getCategoryBadgeClasses = (
    category?: string
  ): { container: string; text: string } => {
    switch ((category || '').toLowerCase()) {
      case 'family':
        return { container: 'bg-rose-50 border-rose-200', text: 'text-rose-700' };
      case 'work':
        return { container: 'bg-blue-50 border-blue-200', text: 'text-blue-700' };
      case 'civil':
        return { container: 'bg-violet-50 border-violet-200', text: 'text-violet-700' };
      case 'criminal':
        return { container: 'bg-red-50 border-red-200', text: 'text-red-700' };
      case 'consumer':
        return { container: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' };
      default:
        return { container: 'bg-gray-50 border-gray-200', text: 'text-gray-700' };
    }
  };
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[tw`mb-4`, containerStyle]}
      onPress={() => onPress && onPress(item)}
    >
      <Card className="flex-row items-start px-5 py-5 bg-white rounded-2xl border border-gray-200">
        <View style={tw`mt-1 mr-4`}>
          <Star
            size={18}
            color={isFavorite ? "#f59e0b" : "#9ca3af"}
            strokeWidth={2}
            // Fill when favorited; outline when not
            fill={isFavorite ? "#f59e0b" : "none"}
          />
        </View>
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[tw`font-bold text-lg`, { color: Colors.text.head, flexShrink: 1, marginRight: 8 }]}
            >
              {item.title}
            </Text>
            {item.category ? (
              <Badge
                variant="outline"
                className={`rounded-md ${getCategoryBadgeClasses(item.category).container}`}
              >
                <BadgeText size="sm" className={getCategoryBadgeClasses(item.category).text}>
                  {item.category}
                </BadgeText>
              </Badge>
            ) : null}
          </View>
          {item.filipinoTerm ? (
            <Text style={[tw`text-sm mb-3 font-medium`, { color: Colors.primary.blue }]}>
              {item.filipinoTerm}
            </Text>
          ) : null}
          <Text 
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[tw`text-sm leading-5`, { color: Colors.text.sub }]}
          >
            {item.summary}
          </Text>
        </View>
        <ChevronRight size={18} color="#9ca3af" />
      </Card>
    </TouchableOpacity>
  );
}

