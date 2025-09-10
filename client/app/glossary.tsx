import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  FlatList,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import tw from "tailwind-react-native-classnames";
import Header from "@/components/Header";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import ToggleGroup from "@/components/ui/ToggleGroup";
import CategoryScroller from "@/components/glossary/CategoryScroller";
import TermListItem, { TermItem } from "@/components/glossary/TermListItem";
import Colors from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { SidebarProvider, SidebarWrapper } from "@/components/AppSidebar";

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

// Pagination constants
const ITEMS_PER_PAGE = 10;

export default function GlossaryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("terms");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const horizontalPadding = 24;
  const minCardWidth = 360;
  const numColumns = Math.max(
    1,
    Math.min(3, Math.floor((width - horizontalPadding * 2) / minCardWidth))
  );

  const tabOptions = [
    { id: "guides", label: "Legal Guides" },
    { id: "terms", label: "Legal Terms" },
  ];

  // Fetch legal terms from your API
  const fetchLegalTerms = async (page = 1, category = activeCategory, search = searchQuery) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      if (category && category !== "all") {
        params.append("category", category);
      }

      if (search && search.trim()) {
        params.append("search", search.trim());
      }

      const response = await fetch(`${API_BASE_URL}/glossary/terms?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const placeholderText = "wala pa HHAHHA";
      const formattedTerms: TermItem[] = data.terms.map((item: any) => ({
        id: item.id,
        title: item.term_en || placeholderText,
        filipinoTerm: item.term_fil || placeholderText,
        definition: item.definition_en || placeholderText,
        filipinoDefinition: item.definition_fil || placeholderText,
        example: item.example_en || placeholderText,
        filipinoExample: item.example_fil || placeholderText,
        category: item.category || placeholderText,
      }));
      
      setTerms(formattedTerms);
      setTotalPages(data.pagination.pages);
      setTotalCount(data.pagination.total);
      setCurrentPage(page);
    } catch (err) {
      console.error("Error fetching legal terms from API:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);

      Alert.alert(
        "Connection Error",
        `Could not fetch terms from server. Error: ${errorMessage}`,
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegalTerms(1);
  }, []);

  // Update terms when category or search changes
  useEffect(() => {
    fetchLegalTerms(1, activeCategory, searchQuery);
  }, [activeCategory, searchQuery]);

  const handleFilterPress = (): void => {
    Alert.alert("Filter", "Filter options");
  };

  const handleTermPress = (item: TermItem): void => {
    router.push(`/glossary/${item.id}` as any);
  };

  const handleCategoryChange = (categoryId: string): void => {
    setActiveCategory(categoryId);
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 50);
  };

  const handleRefresh = async (): Promise<void> => {
    await fetchLegalTerms(currentPage);
  };

  const handlePageChange = (page: number): void => {
    fetchLegalTerms(page);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;

    // Mobile-friendly pagination with limited page buttons
    const getVisiblePages = () => {
      if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      if (currentPage <= 3) {
        return [1, 2, 3, 4, "...", totalPages];
      }

      if (currentPage >= totalPages - 2) {
        return [
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        ];
      }

      return [
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages,
      ];
    };

    const visiblePages = getVisiblePages();

    return (
      <View style={tw`flex-col items-center`}>
        {/* Pagination controls */}
        <View style={tw`flex-row justify-center items-center`}>
          <TouchableOpacity
            onPress={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={tw`p-3 mx-1 rounded-full ${
              currentPage === 1
                ? "bg-gray-200 opacity-50"
                : "bg-white border border-gray-300"
            }`}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={currentPage === 1 ? "#9CA3AF" : Colors.primary.blue}
            />
          </TouchableOpacity>

          {visiblePages.map((page, index) =>
            page === "..." ? (
              <View key={`ellipsis-${index}`} style={tw`px-2 py-3`}>
                <GSText className="text-gray-500">...</GSText>
              </View>
            ) : (
              <TouchableOpacity
                key={page}
                onPress={() => handlePageChange(page as number)}
                style={tw`w-10 h-10 mx-1 rounded-lg justify-center items-center ${
                  currentPage === page
                    ? "bg-gray-300"
                    : "bg border border-gray-300"
                }`}
              >
                <GSText
                  className={
                    currentPage === page
                      ? "text-white font-bold"
                      : "text-gray-700"
                  }
                >
                  {page}
                </GSText>
              </TouchableOpacity>
            )
          )}

          <TouchableOpacity
            onPress={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={tw`p-3 mx-1 rounded-full ${
              currentPage === totalPages
                ? "bg-gray-200 opacity-50"
                : "bg-white border border-gray-300"
            }`}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={currentPage === totalPages ? "#9CA3AF" : Colors.primary.blue}
            />
          </TouchableOpacity>
        </View>

        <GSText size="xs" className="mt-3 text-gray-500">
          Showing {terms.length} of {totalCount} results
        </GSText>
      </View>
    );
  };

  const renderListHeader = () => (
    <View>
      <HStack className="items-center mb-4">
        <Ionicons name="pricetags" size={16} color={Colors.text.sub} />
        <GSText
          size="sm"
          bold
          className="ml-2"
          style={{ color: Colors.text.sub }}
        >
          Choose Category
        </GSText>
      </HStack>
      <CategoryScroller
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />
    </View>
  );

  const renderListFooter = () => <View>{renderPaginationControls()}</View>;

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={tw`flex-1 justify-center items-center py-10`}>
          <ActivityIndicator size="large" color={Colors.primary.blue} />
          <GSText
            className="mt-4 text-center"
            style={{ color: Colors.text.sub }}
          >
            Loading legal terms...
          </GSText>
        </View>
      );
    }

    if (error) {
      return (
        <View style={tw`flex-1 justify-center items-center py-10 px-6`}>
          <Ionicons name="cloud-offline" size={48} color={Colors.text.sub} />
          <GSText
            className="mt-4 text-center font-bold"
            style={{ color: Colors.text.head }}
          >
            Connection Error
          </GSText>
          <GSText
            className="mt-2 text-center"
            style={{ color: Colors.text.sub }}
          >
            Unable to load legal terms. Please check your connection and try
            again.
          </GSText>
          <TouchableOpacity
            onPress={handleRefresh}
            style={tw`mt-4 px-4 py-2 bg-blue-500 rounded-lg`}
          >
            <GSText className="text-white font-semibold">Retry</GSText>
          </TouchableOpacity>
        </View>
      );
    }

    if (terms.length === 0 && searchQuery.trim()) {
      return (
        <View style={tw`flex-1 justify-center items-center py-10`}>
          <Ionicons name="search" size={48} color={Colors.text.sub} />
          <GSText
            className="mt-4 text-center font-bold"
            style={{ color: Colors.text.head }}
          >
            No results found
          </GSText>
          <GSText
            className="mt-2 text-center"
            style={{ color: Colors.text.sub }}
          >
            Try adjusting your search terms or category filter.
          </GSText>
        </View>
      );
    }

    return (
      <View style={tw`flex-1 justify-center items-center py-10`}>
        <Ionicons name="book" size={48} color={Colors.text.sub} />
        <GSText
          className="mt-4 text-center font-bold"
          style={{ color: Colors.text.head }}
        >
          No terms available
        </GSText>
        <GSText className="mt-2 text-center" style={{ color: Colors.text.sub }}>
          Legal terms will appear here once loaded.
        </GSText>
      </View>
    );
  };

  const getItemLayout = (data: any, index: number) => {
    const ITEM_HEIGHT = 140;
    const HEADER_HEIGHT = 120;
    return {
      length: ITEM_HEIGHT,
      offset: HEADER_HEIGHT + ITEM_HEIGHT * Math.floor(index / numColumns),
      index,
    };
  };

  const onToggleChange = (id: string) => {
    setActiveTab(id);
    if (id === "guides") {
      router.push("/guides");
    }
  };

  return (
    <SidebarProvider>
      <View style={tw`flex-1 bg-gray-50`}>
        <Header title="Know Your Batas" showMenu={true} />

        <ToggleGroup
          options={tabOptions}
          activeOption={activeTab}
          onOptionChange={onToggleChange}
        />

        <Box className="px-4 pt-4 pb-2">
          <Input
            variant="outline"
            size="lg"
            className="bg-white rounded-lg border border-gray-300"
          >
            <InputSlot className="pl-3">
              <Ionicons name="search" size={20} color="#9CA3AF" />
            </InputSlot>
            <InputField
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
              }}
              placeholder="Search legal terms..."
              placeholderTextColor="#9CA3AF"
              className="text-[#313131]"
              editable={!loading}
            />
            <InputSlot className="pr-3" onPress={handleFilterPress}>
              <Ionicons name="options" size={20} color={Colors.text.sub} />
            </InputSlot>
          </Input>
        </Box>

        <FlatList
          ref={flatListRef}
          data={terms}
          key={`${numColumns}-${activeCategory}-${currentPage}`}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          ListHeaderComponent={
            !loading && !error ? renderListHeader : undefined
          }
          ListFooterComponent={
            !loading && !error && terms.length > 0
              ? renderListFooter
              : undefined
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 80,
            flexGrow: 1,
          }}
          columnWrapperStyle={
            numColumns > 1
              ? { justifyContent: "space-between", marginBottom: 12 }
              : undefined
          }
          renderItem={({ item }) => (
            <TermListItem
              item={item}
              onPress={handleTermPress}
              containerStyle={{
                width: numColumns > 1 ? (width - 32 - 12) / numColumns : "100%",
                marginBottom: 12,
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          initialNumToRender={6}
          windowSize={8}
          getItemLayout={numColumns === 1 ? getItemLayout : undefined}
          refreshing={loading}
          onRefresh={handleRefresh}
        />

        <Navbar activeTab="learn" />
        <SidebarWrapper />
      </View>
    </SidebarProvider>
  );
}