import React from "react";
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import tw from "tailwind-react-native-classnames";
import Colors from "@/constants/Colors";
import { ChevronRight, Star } from "lucide-react-native";

export interface TermItem {
  id: string;
  title: string;
  summary: string;
  isFavorite?: boolean;
}

interface TermListItemProps {
  item: TermItem;
  onPress?: (item: TermItem) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function TermListItem({ item, onPress, containerStyle }: TermListItemProps) {
  const isFavorite = !!item.isFavorite;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[tw`mb-4`, containerStyle]}
      onPress={() => onPress && onPress(item)}
    >
      <View style={[tw`rounded-xl px-5 py-5 bg-white flex-row items-start`, { borderColor: "#e5e7eb", borderWidth: 1 }]}> 
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
          <Text style={[tw`font-bold mb-2 text-base`, { color: Colors.text.head }]}>{item.title}</Text>
          <Text style={[tw`text-sm leading-5`, { color: Colors.text.sub }]}>{item.summary}</Text>
        </View>
        <ChevronRight size={18} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );
}


