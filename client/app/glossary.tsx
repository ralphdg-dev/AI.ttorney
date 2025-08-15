import React, { useMemo, useState } from "react";
import { View, FlatList, Alert, Text, useWindowDimensions } from "react-native";
import tw from "tailwind-react-native-classnames";
import Header from "@/app/directory/components/Header";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import BottomNavigation from "@/app/directory/components/BottomNavigation";
import ToggleGroup from "@/components/ui/ToggleGroup";
import CategoryScroller from "./glossary/components/CategoryScroller";
import TermListItem, { TermItem } from "./glossary/components/TermListItem";
import Colors from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function GlossaryScreen() {
  const [activeTab, setActiveTab] = useState<string>("guides");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [bottomActiveTab, setBottomActiveTab] = useState<string>("learn");
  const { width } = useWindowDimensions();
  const horizontalPadding = 24; // px-6 on each side
  const minCardWidth = 360; // aim for 1–2 columns depending on width
  const numColumns = Math.max(1, Math.min(3, Math.floor((width - horizontalPadding * 2) / minCardWidth)));

  // Tab options for the toggle
  const tabOptions = [
    { id: "guides", label: "Legal Guides" },
    { id: "terms", label: "Legal Terms" },
  ];

  // Placeholder data: Replace with API data when backend is available
  const placeholderTerms: TermItem[] = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        id: `placeholder-${i + 1}`,
        title: "Annulment",
        summary:
          "A legal procedure that declares a marriage invalid from the beginning, meaning it is treated as if it never existed.",
      })),
    []
  );

  const termsToRender: TermItem[] = placeholderTerms.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleMenuPress = (): void => {
    Alert.alert("Menu", "Menu pressed");
  };

  const handleFilterPress = (): void => {
    Alert.alert("Filter", "Filter options");
  };

  const handleBottomNavChange = (tab: string): void => {
    setBottomActiveTab(tab);
    // Wire this to navigate when routes are ready
  };

  const handleTermPress = (item: TermItem): void => {
    Alert.alert("Term", item.title);
  };

  const renderListHeader = () => (
    <View>
      <HStack className="items-center mb-4">
        <Ionicons name="pricetags" size={16} color={Colors.text.sub} />
        <GSText size="sm" bold className="ml-2" style={{ color: Colors.text.sub }}>
          Choose Category
        </GSText>
      </HStack>
      <CategoryScroller activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
    </View>
  );

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Header title="Understand the PH Law" onMenuPress={handleMenuPress} showMenu={true} />

      <ToggleGroup
        options={tabOptions}
        activeOption={activeTab}
        onOptionChange={setActiveTab}
      />

      <Box className="px-6 pt-6 mb-12">
        <Input variant="outline" size="lg" className="bg-white rounded-lg border border-gray-300">
          <InputSlot className="pl-3">
            <Ionicons name="search" size={20} color="#9CA3AF" />
          </InputSlot>
          <InputField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor="#9CA3AF"
            className="text-[#313131]"
          />
          <InputSlot className="pr-3" onPress={handleFilterPress}>
            <Ionicons name="options" size={20} color={Colors.text.sub} />
          </InputSlot>
        </Input>
      </Box>

      <FlatList
        data={termsToRender}
        key={numColumns}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        columnWrapperStyle={numColumns > 1 ? { justifyContent: "space-between" } : undefined}
        renderItem={({ item }) => (
          <TermListItem
            item={item}
            onPress={handleTermPress}
            containerStyle={{ width: numColumns > 1 ? (width - horizontalPadding * 2 - 12) / numColumns : "100%", marginHorizontal: 0 }}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <BottomNavigation activeTab={bottomActiveTab} onTabChange={handleBottomNavChange} />
    </View>
  );
}


