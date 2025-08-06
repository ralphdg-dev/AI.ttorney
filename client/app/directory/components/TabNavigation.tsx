import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import tw from "tailwind-react-native-classnames";
import Colors from "../../../constants/Colors";

interface Tab {
  id: string;
  label: string;
}

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: Tab[] = [
    { id: 'law-firms', label: 'Law Firms' },
    { id: 'lawyers', label: 'Lawyers' }
  ];

  return (
    <View style={tw`flex-row mx-6 mb-4`}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            tw`flex-1 py-3 items-center border-b-2`,
            {
              borderBottomColor: activeTab === tab.id ? Colors.primary.blue : 'transparent'
            }
          ]}
          onPress={() => onTabChange(tab.id)}
        >
          <Text
            style={[
              tw`font-semibold`,
              {
                color: activeTab === tab.id ? Colors.primary.blue : Colors.text.sub
              }
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}