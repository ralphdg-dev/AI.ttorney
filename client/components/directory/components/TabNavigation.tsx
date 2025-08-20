import React from "react";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
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
    <HStack className="mx-6 mb-4" space="none">
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          className="flex-1 py-3 items-center border-b-2"
          style={{
            borderBottomColor: activeTab === tab.id ? Colors.primary.blue : "transparent"
          }}
          onPress={() => onTabChange(tab.id)}
        >
          <Text
            className="font-semibold"
            style={{
              color: activeTab === tab.id ? Colors.primary.blue : Colors.text.sub
            }}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </HStack>
  );
}