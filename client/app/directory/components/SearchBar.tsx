import React from "react";
import { View, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";
import Colors from "../../../constants/Colors";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder = "Search..." }: SearchBarProps) {
  return (
    <View style={tw`px-6 mb-4`}>
      <View style={tw`relative`}>
        <TextInput
          style={[
            tw`border border-gray-300 rounded-lg px-4 py-3 bg-white pl-12`,
            { color: Colors.text.head },
          ]}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
        />
        <Ionicons
          name="search"
          size={20}
          color="#9CA3AF"
          style={tw`absolute left-4 top-3`}
        />
      </View>
    </View>
  );
}