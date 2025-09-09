import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, FlatList, useWindowDimensions, TouchableOpacity } from "react-native";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import ToggleGroup from "@/components/ui/ToggleGroup";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import CategoryScroller from "@/components/glossary/CategoryScroller";
import Navbar from "@/components/Navbar";
import { SidebarProvider, SidebarWrapper } from "@/components/AppSidebar";
import ArticleCard, { ArticleItem } from "@/components/guides/ArticleCard";
import { useLegalArticles } from "@/hooks/useLegalArticles";

export default function GuidesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("guides");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();
  
  const ARTICLES_PER_PAGE = 10;

  const horizontalPadding = 24;
  const minCardWidth = 320;
  const numColumns = Math.max(1, Math.min(3, Math.floor((width - horizontalPadding * 2) / minCardWidth)));

  // Fetch articles
  const { articles: legalArticles, loading, error, refetch, getArticlesByCategory, searchArticles } = useLegalArticles();

  const [displayArticles, setDisplayArticles] = useState<ArticleItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const previousSearchRef = useRef<string>("");

  useEffect(() => {
    if (activeCategory === "all" && !searchQuery.trim()) {
      setDisplayArticles(legalArticles);
    }
  }, [legalArticles, activeCategory, searchQuery]);

  const tabOptions = [
    { id: "guides", label: "Legal Guides" },
    { id: "terms", label: "Legal Terms" },
  ];

  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});

  // Search debounce
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      const trimmedQuery = searchQuery.trim();
      const searchKey = `${trimmedQuery}-${activeCategory}`;
      
      if (previousSearchRef.current === searchKey) return;
      previousSearchRef.current = searchKey;
      
      if (trimmedQuery) {
        if (trimmedQuery.length >= 2) {
          setIsSearching(true);
          try {
            const searchResults = await searchArticles(trimmedQuery, activeCategory !== "all" ? activeCategory : undefined);
            setDisplayArticles(searchResults);
          } catch (err) {
            console.error("Search error:", err);
            setDisplayArticles([]);
          } finally {
            setIsSearching(false);
          }
        }
      } else {
        setIsSearching(false);
        if (activeCategory === "all") {
          setDisplayArticles(legalArticles);
        } else {
          try {
            const byCat = await getArticlesByCategory(activeCategory);
            setDisplayArticles(byCat);
          } catch (err) {
            console.error("Category fetch error:", err);
            setDisplayArticles(legalArticles);
          }
        }
      }
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, activeCategory, legalArticles, searchArticles, getArticlesByCategory]);

  const articlesToRender: ArticleItem[] = useMemo(() => {
    return displayArticles.map((a: ArticleItem) => ({ ...a, isBookmarked: !!bookmarks[a.id] }));
  }, [displayArticles, bookmarks]);

  // Pagination
  const totalArticles = articlesToRender.length;
  const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const endIndex = startIndex + ARTICLES_PER_PAGE;
  const paginatedArticles = articlesToRender.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  const handleCategoryChange = (categoryId: string): void => {
    setActiveCategory(categoryId);
    if (categoryId && categoryId !== "all") {
      (async () => {
        const byCat = await getArticlesByCategory(categoryId);
        setDisplayArticles(byCat);
      })();
    } else {
      setDisplayArticles(legalArticles);
    }
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 50);
  };

  const handleArticlePress = (item: ArticleItem): void => {
    router.push(`/article/${item.id}` as any);
  };

  const handleToggleBookmark = (item: ArticleItem): void => {
    setBookmarks((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
  };

  const onToggleChange = (id: string) => {
    setActiveTab(id);
    if (id === "terms") {
      router.push("/glossary");
    }
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

const renderPagination = () => {
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

  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  return (
    <View style={tw`py-6 bg-gray-50`}>
      <View style={tw`flex-col items-center`}>
        {/* Pagination buttons */}
        {totalPages > 1 && (
          <View style={tw`flex-row justify-center items-center`}>
            {/* Prev button */}
            <TouchableOpacity
              onPress={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={tw`w-10 h-10 mx-1 rounded-full justify-center items-center ${
                currentPage === 1
                  ? "bg-gray-200 opacity-50"
                  : "bg-white border border-gray-300"
              }`}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={currentPage === 1 ? "#9CA3AF" : Colors.primary.blue}
              />
            </TouchableOpacity>

            {/* Page numbers */}
            {getVisiblePages().map((page, index) =>
              page === "..." ? (
                <View
                  key={`ellipsis-${index}`}
                  style={tw`w-10 h-10 mx-1 justify-center items-center`}
                >
                  <GSText className="text-gray-500">...</GSText>
                </View>
              ) : (
                <TouchableOpacity
                  key={page}
                  onPress={() => handlePageChange(page as number)}
                  style={tw`w-10 h-10 mx-1 rounded-lg justify-center items-center border ${
                    currentPage === page
                      ? "bg-gray-200 border-gray-300"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <GSText
                    className={
                      currentPage === page
                        ? "text-gray-700 font-bold"
                        : "text-gray-700"
                    }
                  >
                    {page}
                  </GSText>
                </TouchableOpacity>
              )
            )}

            {/* Next button */}
            <TouchableOpacity
              onPress={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={tw`w-10 h-10 mx-1 rounded-full justify-center items-center ${
                currentPage === totalPages
                  ? "bg-gray-200 opacity-50"
                  : "bg-white border border-gray-300"
              }`}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={currentPage === totalPages ? "#9CA3AF" : Colors.primary.blue}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Counter */}
        <GSText
          size="sm"
          className="mt-4 text-gray-700 text-center"
          style={{ fontSize: 14 }}
        >
  Showing {Math.min(endIndex, totalArticles)} of {totalArticles} results
        </GSText>
      </View>
    </View>
  );
};

  

  return (
    <SidebarProvider>
      <View style={tw`flex-1 bg-gray-50`}>
        <Header title="Know Your Batas" showMenu={true} />

        <ToggleGroup options={tabOptions} activeOption={activeTab} onOptionChange={onToggleChange} />

        <Box className="px-6 pt-6 mb-4">
          <Input variant="outline" size="lg" className="bg-white rounded-lg border border-gray-300">
            <InputSlot className="pl-3">
              <Ionicons name="search" size={20} color="#9CA3AF" />
            </InputSlot>
            <InputField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search articles"
              placeholderTextColor="#9CA3AF"
              className="text-[#313131]"
            />
            <InputSlot className="pr-3">
              <Ionicons name="options" size={20} color={Colors.text.sub} />
            </InputSlot>
          </Input>
        </Box>

        {loading || isSearching ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <GSText size="lg" className="text-gray-500">
              {isSearching ? "Searching articles..." : "Loading articles..."}
            </GSText>
          </View>
        ) : error ? (
          <View style={tw`flex-1 justify-center items-center px-6`}>
            <GSText size="lg" className="text-red-500 text-center mb-4">{error}</GSText>
            <TouchableOpacity 
              style={tw`bg-blue-500 px-4 py-2 rounded-lg`}
              onPress={refetch}
            >
              <GSText size="sm" className="text-white">Retry</GSText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
<FlatList
  ref={flatListRef}
  data={paginatedArticles}
  key={`${numColumns}-${activeCategory}-${currentPage}`}
  keyExtractor={(item) => item.id}
  numColumns={numColumns}
  ListHeaderComponent={renderListHeader}
  ListFooterComponent={renderPagination}
  contentContainerStyle={{ 
    paddingHorizontal: 24, 
    paddingBottom: 50,  
    flexGrow: 1 
  }}
  columnWrapperStyle={numColumns > 1 ? { justifyContent: "space-between" } : undefined}
  renderItem={({ item }) => (
    <ArticleCard
      item={item}
      onPress={handleArticlePress}
      onToggleBookmark={handleToggleBookmark}
      containerStyle={{
        width: numColumns > 1
          ? (width - horizontalPadding * 2 - 12) / numColumns
          : "100%",
        marginHorizontal: 0
      }}
    />
  )}
  showsVerticalScrollIndicator={false}
  style={{ flex: 1 }}
  removeClippedSubviews={true}
  maxToRenderPerBatch={8}
  initialNumToRender={6}
  windowSize={8}
  ListEmptyComponent={
    <View style={tw`flex-1 justify-center items-center py-8`}>
      <GSText size="lg" className="text-gray-500 text-center">No articles found</GSText>
    </View>
  }
/>

          </View>
        )}

        <Navbar activeTab="learn" />
        <SidebarWrapper />
      </View>
    </SidebarProvider>
  );
}
