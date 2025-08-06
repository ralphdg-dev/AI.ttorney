import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";
import Colors from "../../../constants/Colors";

interface HeaderProps {
  title: string;
  onMenuPress: () => void;
  showMenu?: boolean;
}

export default function Header({ title, onMenuPress, showMenu = true }: HeaderProps) {
  return (
    <View style={tw`flex-row items-center justify-between px-6 pt-12 pb-4 bg-white`}>
      {showMenu ? (
        <TouchableOpacity onPress={onMenuPress} style={tw`p-2`}>
          <Ionicons name="menu" size={24} color={Colors.primary.blue} />
        </TouchableOpacity>
      ) : (
        <View style={tw`w-10`} />
      )}
      
      <Text style={[tw`text-lg font-bold`, { color: Colors.primary.blue }]}>
        {title}
      </Text>
      
      <View style={tw`w-10`} />
    </View>
  );
}