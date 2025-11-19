import React from "react";
import { View, TextInput, Dimensions } from "react-native";
import tw from "tailwind-react-native-classnames";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";

const { width: screenWidth } = Dimensions.get("window");

interface ConsultationSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function ConsultationSearchBar({ searchQuery, onSearchChange }: ConsultationSearchBarProps) {
  return (
    <HStack className="items-center px-4 md:px-6 mb-2 mt-2">
      <Box className="flex-1">
        <Box className="relative">
          <View
            style={[
              tw`flex-row items-center bg-white border border-gray-200 rounded-lg px-3 md:px-4 py-2 md:py-3`,
            ]}
          >
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search consultations..."
              value={searchQuery}
              onChangeText={onSearchChange}
              style={{
                marginLeft: 8,
                fontSize: screenWidth < 768 ? 14 : 16,
                color: Colors.text.head,
                backgroundColor: "transparent",
                flex: 1,
              }}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </Box>
      </Box>
    </HStack>
  );
}
