import React from "react";
import { View, Dimensions } from "react-native";
import tw from "tailwind-react-native-classnames";
import { Text as UIText } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";

const { width: screenWidth } = Dimensions.get("window");

interface ConsultationEmptyStateProps {
  searchQuery: string;
}

export default function ConsultationEmptyState({ searchQuery }: ConsultationEmptyStateProps) {
  return (
    <View style={tw`flex-1 justify-center items-center py-12 px-4`}>
      <Ionicons
        name="calendar-outline"
        size={screenWidth < 768 ? 40 : 48}
        color={Colors.text.sub}
        style={tw`mb-3`}
      />
      <UIText
        className="text-center font-semibold mb-2"
        style={{
          fontSize: screenWidth < 768 ? 16 : 18,
          color: Colors.text.head,
        }}
      >
        {searchQuery
          ? "No consultations found"
          : "No consultations yet"}
      </UIText>
      <UIText
        className="text-center"
        style={{
          fontSize: screenWidth < 768 ? 13 : 14,
          color: Colors.text.sub,
        }}
      >
        {searchQuery
          ? `No results for "${searchQuery}"`
          : "Your consultation requests will appear here"}
      </UIText>
    </View>
  );
}
