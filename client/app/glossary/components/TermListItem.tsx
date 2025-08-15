import React from "react";
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import tw from "tailwind-react-native-classnames";
import Colors from "@/constants/Colors";
import { ChevronRight } from "lucide-react-native";

export interface TermItem {
  id: string;
  title: string;
  summary: string;
}

interface TermListItemProps {
  item: TermItem;
  onPress?: (item: TermItem) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function TermListItem({ item, onPress, containerStyle }: TermListItemProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[tw`mb-4`, containerStyle]}
      onPress={() => onPress && onPress(item)}
    >
      <View style={[tw`rounded-xl px-5 py-5 bg-white flex-row items-start`, { borderColor: "#e5e7eb", borderWidth: 1 }]}> 
        <View style={[tw`w-2 h-2 rounded-full mt-1 mr-4`, { backgroundColor: "#fbbf24" }]} />
        <View style={tw`flex-1`}>
          <Text style={[tw`font-bold mb-2 text-base`, { color: Colors.text.head }]}>{item.title}</Text>
          <Text style={[tw`text-sm leading-5`, { color: Colors.text.sub }]}>{item.summary}</Text>
        </View>
        <ChevronRight size={18} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );
}


