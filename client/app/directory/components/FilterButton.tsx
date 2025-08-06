import React from "react";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";
import Colors from "../../../constants/Colors";

interface FilterButtonProps {
  onPress: () => void;
}

export default function FilterButton({ onPress }: FilterButtonProps) {
  return (
    <TouchableOpacity
      style={[
        tw`absolute right-6 top-3 p-2`,
        { zIndex: 10 }
      ]}
      onPress={onPress}
    >
      <Ionicons name="options" size={20} color={Colors.text.sub} />
    </TouchableOpacity>
  );
}