import React from "react";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Box } from "@/components/ui/box";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../../constants/Colors";

interface HeaderProps {
  title: string;
  onMenuPress: () => void;
  showMenu?: boolean;
}

export default function Header({ title, onMenuPress, showMenu = true }: HeaderProps) {
  return (
    <HStack className="items-center justify-between px-6 pt-12 pb-4 bg-white">
      {showMenu ? (
        <Pressable onPress={onMenuPress} className="p-2">
          <Ionicons name="menu" size={24} color={Colors.primary.blue} />
        </Pressable>
      ) : (
        <Box className="w-10" />
      )}
      
      <Text 
        className="text-lg font-bold" 
        style={{ color: Colors.primary.blue }}
      >
        {title}
      </Text>
      
      <Box className="w-10" />
    </HStack>
  );
}