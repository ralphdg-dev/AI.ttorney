import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/text";
import Colors from "@/constants/Colors";

interface ToggleOption {
  id: string;
  label: string;
}

interface ToggleGroupProps {
  options: ToggleOption[];
  activeOption: string;
  onOptionChange: (optionId: string) => void;
  className?: string;
}

export default function ToggleGroup({ options, activeOption, onOptionChange, className }: ToggleGroupProps) {
  return (
    <View className={`bg-white ${className || ""}`}>
      <View className="flex-row mx-6">
        {options.map((option) => (
          <TouchableOpacity
            key={option.id}
            className="flex-1 py-3 items-center border-b-2"
            style={{
              borderBottomColor: activeOption === option.id ? Colors.primary.blue : "transparent",
            }}
            onPress={() => onOptionChange(option.id)}
          >
            <Text
              className="font-semibold"
              style={{
                color: activeOption === option.id ? Colors.primary.blue : Colors.text.sub,
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
