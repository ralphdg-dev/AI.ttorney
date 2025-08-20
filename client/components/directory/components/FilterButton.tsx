import React from "react";
import { Pressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../../constants/Colors";

interface FilterButtonProps {
  onPress: () => void;
}

export default function FilterButton({ onPress }: FilterButtonProps) {
  return (
    <Pressable
      className="absolute right-6 p-2"
      style={{ zIndex: 10 }}
      onPress={onPress}
    >
      <Ionicons name="options" size={20} color={Colors.text.sub} />
    </Pressable>
  );
}