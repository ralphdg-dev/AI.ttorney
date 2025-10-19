import React from "react";
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import tw from "tailwind-react-native-classnames";
import Colors from "@/constants/Colors";
import { ChevronRight, Star } from "lucide-react-native";
import { Badge, BadgeText } from "@/components/ui/badge";
import Card from "@/components/ui/Card";
import { useFavorites } from "@/contexts/FavoritesContext";

export interface TermItem {
  id: string;
  title: string;
  definition: string;
  isFavorite?: boolean;
  filipinoTerm?: string; 
  filipinoDefinition?: string; 
  example?: string;
  filipinoExample?: string;
  category?: string;
}

interface TermListItemProps {
  item: TermItem;
  onPress?: (item: TermItem) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function TermListItem({ item, onPress, containerStyle }: TermListItemProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isTermFavorite = isFavorite(item.id);

  const handleFavoritePress = async (e: any) => {
    e.stopPropagation(); // Prevent triggering the main onPress
    await toggleFavorite(item.id, item.title);
  };

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
        <TouchableOpacity style={tw`mt-1 mr-4`} onPress={handleFavoritePress}>
          <Star
            size={18}
            color={isTermFavorite ? "#f59e0b" : "#9ca3af"}
            strokeWidth={2}
            // Fill when favorited; outline when not
            fill={isTermFavorite ? "#f59e0b" : "none"}
          />
        </TouchableOpacity>
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[tw`font-bold text-lg`, { color: Colors.text.head, flexShrink: 1, marginRight: 8 }]}
            >
              {item.title}
            </Text>
            <View style={tw`flex-row items-center`}>
              {item.category ? (
                <Badge
                  variant="outline"
                  className={`rounded-md ${getCategoryBadgeClasses(item.category).container}`}
                  style={{ marginRight: 8 }}
                >
                  <BadgeText size="sm" className={getCategoryBadgeClasses(item.category).text}>
                    {item.category}
                  </BadgeText>
                </Badge>
              ) : null}
              <ChevronRight size={18} color="#9ca3af" />
            </View>
          </View>
          {item.filipinoTerm ? (
            <Text style={[tw`text-sm mb-3 font-medium`, { color: Colors.primary.blue }]}>
              {item.filipinoTerm}
            </Text>
          ) : null}
          <Text 
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[tw`text-sm`, { color: Colors.text.sub }]}
          >
            {item.definition}
          </Text>
          {item.filipinoDefinition ? (
            <Text 
              numberOfLines={2}
              ellipsizeMode="tail"
              style={[tw`text-sm mt-1 italic`, { color: '#6B7280' }]}
            >
              {item.filipinoDefinition}
            </Text>
          ) : null}
        </View>
      </Card>
    </TouchableOpacity>
  );
}