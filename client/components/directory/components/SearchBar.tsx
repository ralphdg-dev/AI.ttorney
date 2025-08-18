import React from "react";
import { Box } from "@/components/ui/box";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../../constants/Colors";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder = "Search..." }: SearchBarProps) {
  return (
    <Box className="px-6 mb-4">
      <Box className="relative">
        <Input
          className="border border-gray-300 rounded-lg bg-white"
          size="md"
        >
          <InputSlot className="absolute left-4 top-3">
            <Ionicons
              name="search"
              size={20}
              color="#9CA3AF"
            />
          </InputSlot>
          <InputField
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={value}
            onChangeText={onChangeText}
            style={{ color: Colors.text.head }}
            className="pl-12 py-3"
          />
        </Input>
      </Box>
    </Box>
  );
}