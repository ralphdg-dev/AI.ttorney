import React, { useMemo, useState, useRef, useEffect } from "react";
import { View, FlatList, Alert, useWindowDimensions } from "react-native";
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
  const flatListRef = useRef<FlatList>(null);
  const horizontalPadding = 24; // px-6 on each side
  const minCardWidth = 360; // aim for 1–2 columns depending on width
  const numColumns = Math.max(1, Math.min(3, Math.floor((width - horizontalPadding * 2) / minCardWidth)));

  // Tab options for the toggle
  const tabOptions = [
    { id: "guides", label: "Legal Guides" },
    { id: "terms", label: "Legal Terms" },
  ];

  // Sample data to showcase full UI; replace with API data later
  const placeholderTerms: TermItem[] = useMemo(
    () =>
      [
        {
          id: "1",
          title: "Annulment",
          filipinoTerm: "Pagpapawalang-bisa",
          summary:
            "A court declaration that a marriage is invalid from the start.",
          isFavorite: true,
          category: "Family",
        },
        {
          id: "2",
          title: "Employment Contract",
          filipinoTerm: "Kontrata sa Trabaho",
          summary:
            "A legally binding agreement between employer and employee that sets out terms of employment.",
          isFavorite: false,
          category: "Work",
        },
        {
          id: "3",
          title: "Damages",
          filipinoTerm: "Danyos",
          summary:
            "Monetary compensation awarded for loss or injury caused by another's unlawful act.",
          isFavorite: false,
          category: "Civil",
        },
        {
          id: "4",
          title: "Probable Cause",
          filipinoTerm: "Makatwirang Hinala",
          summary:
            "Sufficient reason based on facts to believe a crime has been committed.",
          isFavorite: true,
          category: "Criminal",
        },
        {
          id: "5",
          title: "Warranty",
          filipinoTerm: "Garantiya",
          summary:
            "A promise regarding the quality or performance of goods or services.",
          isFavorite: false,
          category: "Consumer",
        },
        {
          id: "6",
          title: "Custody",
          filipinoTerm: "Kustodiya",
          summary:
            "A legal right to care for and make decisions about a child.",
          isFavorite: false,
          category: "Family",
        },
        {
          id: "7",
          title: "Severance Pay",
          filipinoTerm: "Bayad-Paghihiwalay",
          summary:
            "Compensation paid to an employee upon termination under certain conditions.",
          isFavorite: false,
          category: "Work",
        },
        {
          id: "8",
          title: "Lease",
          filipinoTerm: "Upa",
          summary:
            "A contract granting use of property for a specified time in exchange for payment.",
          isFavorite: false,
          category: "Civil",
        },
      ],
    []
  );

  const filteredByCategory = useMemo(() => {
    return placeholderTerms.filter((t) =>
      activeCategory === "all" ? true : t.category?.toLowerCase() === activeCategory
    );
  }, [placeholderTerms, activeCategory]);

  const termsToRender: TermItem[] = useMemo(() => {
    return filteredByCategory.filter((t) =>
      `${t.title} ${t.filipinoTerm ?? ""}`
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase())
    );
  }, [filteredByCategory, searchQuery]);

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

  const handleCategoryChange = (categoryId: string): void => {
    setActiveCategory(categoryId);
    // Scroll to top when category changes
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 50);
  };

  const renderListHeader = () => (
    <View>
      <HStack className="items-center mb-4">
        <Ionicons name="pricetags" size={16} color={Colors.text.sub} />
        <GSText size="sm" bold className="ml-2" style={{ color: Colors.text.sub }}>
          Choose Category
        </GSText>
      </HStack>
      <CategoryScroller activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />
    </View>
  );

  const getItemLayout = (data: any, index: number) => {
    const ITEM_HEIGHT = 140; // Approximate height of each TermListItem including margin
    const HEADER_HEIGHT = 120; // Approximate height of the header
    return {
      length: ITEM_HEIGHT,
      offset: HEADER_HEIGHT + ITEM_HEIGHT * Math.floor(index / numColumns),
      index,
    };
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Header title="Understand the PH Law" onMenuPress={handleMenuPress} showMenu={true} />

      <ToggleGroup
        options={tabOptions}
        activeOption={activeTab}
        onOptionChange={setActiveTab}
      />

      <Box className="px-6 pt-6 mb-4">
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
        ref={flatListRef}
        data={termsToRender}
        key={`${numColumns}-${activeCategory}`} // Add activeCategory to key to force re-render
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={{ 
          paddingHorizontal: 24, 
          paddingBottom: 24,
          flexGrow: 1 // Ensure content takes up full space
        }}
        columnWrapperStyle={numColumns > 1 ? { justifyContent: "space-between" } : undefined}
        renderItem={({ item }) => (
          <TermListItem
            item={item}
            onPress={handleTermPress}
            containerStyle={{ 
              width: numColumns > 1 ? (width - horizontalPadding * 2 - 12) / numColumns : "100%", 
              marginHorizontal: 0 
            }}
          />
        )}
        showsVerticalScrollIndicator={false}
        // Always allow scrolling, even with little content
        scrollEnabled={true}
        bounces={true}
        // Ensure FlatList fills remaining space
        style={{ flex: 1 }}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        // Add getItemLayout for better performance (optional)
        getItemLayout={numColumns === 1 ? getItemLayout : undefined}
      />

      <BottomNavigation activeTab={bottomActiveTab} onTabChange={handleBottomNavChange} />
    </View>
  );
}