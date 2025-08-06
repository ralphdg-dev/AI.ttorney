import React from "react";
import { View, TouchableOpacity } from "react-native";
import {
  Home,
  Home as HomeSolid,
  MessageCirclePlus,
  MessageCirclePlus as MessageCirclePlusSolid,
  MapPin,
  MapPin as MapPinSolid,
  CircleUserRound,
  CircleUserRound as CircleUserRoundSolid,
  Scale,
  Scale as ScaleSolid,
} from "lucide-react-native";
import tw from "tailwind-react-native-classnames";
import Colors from "../../../constants/Colors";

interface NavItem {
  id: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  ActiveIcon: React.ComponentType<{ size: number; color: string }>;
}

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function BottomNavigation({
  activeTab = "legalhelp",
  onTabChange,
}: BottomNavigationProps) {
  const navItems: NavItem[] = [
    { id: "home", Icon: Home, ActiveIcon: HomeSolid },
    { id: "learn", Icon: Scale, ActiveIcon: ScaleSolid },
    { id: "ask", Icon: MessageCirclePlus, ActiveIcon: MessageCirclePlusSolid },
    { id: "legalhelp", Icon: MapPin, ActiveIcon: MapPinSolid },
    { id: "profile", Icon: CircleUserRound, ActiveIcon: CircleUserRoundSolid },
  ];

  return (
    <View
      style={[
        tw`flex-row bg-white border-t border-gray-200 py-2`,
        { paddingBottom: 20 },
      ]}
    >
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={tw`flex-1 items-center py-2`}
          onPress={() => onTabChange(item.id)}
        >
          {activeTab === item.id ? (
            <item.ActiveIcon size={24} color={Colors.primary.blue} />
          ) : (
            <item.Icon size={24} color={Colors.text.sub} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}
