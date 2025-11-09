import React, { useEffect, useMemo, useRef, useState, useCallback, startTransition } from "react";
import { View, FlatList, useWindowDimensions, TouchableOpacity, StatusBar, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { LAYOUT } from "@/constants/LayoutConstants";
import CategoryScroller from "@/components/glossary/CategoryScroller";
import Navbar from "@/components/Navbar";
import { GuestNavbar } from "@/components/guest";
import { SidebarWrapper } from "@/components/AppSidebar";
import { ArticleCard, ArticleItem } from "@/components/guides/ArticleCard";
import { useLegalArticles } from "@/hooks/useLegalArticles";
import { useAuth } from "@/contexts/AuthContext";

export default function GuidesScreen() {
  const router = useRouter();
  const { isGuestMode } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("guides");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();
  
  const ARTICLES_PER_PAGE = 12;

  const horizontalPadding = LAYOUT.SPACING.lg; // 24
  const cardGap = LAYOUT.SPACING.md; // 16
  
  // FAANG approach: Always 1 column on mobile for better UX
  const numColumns = 1;
  const cardWidth = width - (horizontalPadding * 2);

  // Fetch articles
  const { articles: legalArticles, loading, error, refetch, getArticlesByCategory, searchArticles } = useLegalArticles();
  console.log('Legal articles from hook:', { legalArticles, loading, error });

  const [displayArticles, setDisplayArticles] = useState<ArticleItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const previousSearchRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const categoryCache = useRef<Record<string, ArticleItem[]>>({});
  const lastCategoryRef = useRef<string>("all");
  const latestCategoryRef = useRef<string>("all");
  
  // Debug effect to track displayArticles changes
  useEffect(() => {
    console.log('Display articles updated:', displayArticles);
  }, [displayArticles]);

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

  // Search debounce - OPTIMIZED with latest value pattern
  useEffect(() => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const trimmedQuery = searchQuery.trim();
    
    // Track the latest category
    latestCategoryRef.current = activeCategory;
    
    // Immediate optimistic update for category-only changes
    if (!trimmedQuery && activeCategory !== lastCategoryRef.current) {
      lastCategoryRef.current = activeCategory;
      
      // Use startTransition for non-urgent updates
      startTransition(() => {
        setCurrentPage(1);
      });
      
      // Immediate synchronous update with cached data
      if (activeCategory === "all") {
        if (legalArticles.length > 0) {
          setDisplayArticles(legalArticles);
          categoryCache.current["all"] = legalArticles;
        }
      } else if (categoryCache.current[activeCategory]) {
        setDisplayArticles(categoryCache.current[activeCategory]);
      }
    }
    
    const debounceTime = !trimmedQuery ? 0 : 150;
    
    const searchTimeout = setTimeout(async () => {
      const searchKey = `${trimmedQuery}-${activeCategory}`;
      
      // Skip if same search
      if (previousSearchRef.current === searchKey) return;
      previousSearchRef.current = searchKey;
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      const currentController = abortControllerRef.current;
      
      if (trimmedQuery && trimmedQuery.length >= 2) {
        setIsSearching(true);
        try {
          const searchResults = await searchArticles(trimmedQuery, activeCategory !== "all" ? activeCategory : undefined);
          // Only update if not aborted
          if (!currentController.signal.aborted) {
            setDisplayArticles(searchResults);
          }
        } catch (err) {
          if (!currentController.signal.aborted) {
            console.error("Search error:", err);
            setDisplayArticles([]);
          }
        } finally {
          if (!currentController.signal.aborted) {
            setIsSearching(false);
          }
        }
      } else {
        setIsSearching(false);
        if (activeCategory === "all") {
          if (!currentController.signal.aborted && legalArticles.length > 0) {
            setDisplayArticles(legalArticles);
            categoryCache.current["all"] = legalArticles;
          }
        } else {
          // Only fetch if not in cache and still the latest category
          if (!categoryCache.current[activeCategory]) {
            try {
              const byCat = await getArticlesByCategory(activeCategory);
              // Only update if this is still the latest category requested
              if (!currentController.signal.aborted && byCat.length > 0 && latestCategoryRef.current === activeCategory) {
                setDisplayArticles(byCat);
                categoryCache.current[activeCategory] = byCat;
              }
            } catch (err) {
              if (!currentController.signal.aborted) {
                console.error("Category fetch error:", err);
                if (legalArticles.length > 0 && latestCategoryRef.current === activeCategory) {
                  setDisplayArticles(legalArticles);
                }
              }
            }
          }
        }
      }
    }, debounceTime);

    return () => {
      clearTimeout(searchTimeout);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, activeCategory]);

  const previousArticlesRef = useRef<ArticleItem[]>([]);
  
  const articlesToRender: ArticleItem[] = useMemo(() => {
    const newArticles = displayArticles.map((a: ArticleItem) => ({ ...a, isBookmarked: !!bookmarks[a.id] }));
    
    // Keep previous data if new data is empty to prevent blank screen
    if (newArticles.length > 0) {
      previousArticlesRef.current = newArticles;
      return newArticles;
    }
    
    return previousArticlesRef.current;
  }, [displayArticles, bookmarks]);

  // Pagination
  const totalArticles = articlesToRender.length;
  const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const endIndex = startIndex + ARTICLES_PER_PAGE;
  const paginatedArticles = articlesToRender.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  const handleCategoryChange = useCallback((categoryId: string): void => {
    if (categoryId === activeCategory) return;
    
    // Batch state updates for smoother transition
    startTransition(() => {
      setActiveCategory(categoryId);
    });
    
    // Immediate scroll to top
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeCategory]);

  const handleArticlePress = useCallback((item: ArticleItem): void => {
    router.push(`/article/${item.id}` as any);
  }, [router]);

  const handleToggleBookmark = useCallback((item: ArticleItem): void => {
    setBookmarks((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
  }, []);

  const onToggleChange = (id: string) => {
    // Always navigate to glossary page - it has both tabs
    router.push("/glossary");
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
    if (page === currentPage) return;
    
    setCurrentPage(page);
    
    // Immediate scroll to top
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header title="Know Your Batas" showMenu={!isGuestMode} />

        <ToggleGroup options={tabOptions} activeOption={activeTab} onOptionChange={onToggleChange} />

        <Box className="px-6 pt-6 mb-4">
          <Input variant="outline" size="lg" className="bg-white rounded-lg border border-gray-300">
            <InputSlot className="pl-3">
              {isSearching ? (
                <ActivityIndicator size="small" color={Colors.primary.blue} />
              ) : (
                <Ionicons name="search" size={20} color="#9CA3AF" />
              )}
            </InputSlot>
            <InputField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search articles"
              placeholderTextColor="#9CA3AF"
              className="text-[#313131]"
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <InputSlot className="pr-2">
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </InputSlot>
            )}
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
              onPress={() => refetch()}
            >
              <GSText size="sm" className="text-white">Retry</GSText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              data={paginatedArticles}
              key={`guides-${numColumns}-${width}`}
              keyExtractor={(item) => item.id}
              numColumns={numColumns}
              extraData={[width, activeCategory, currentPage, paginatedArticles.length]}
              ListHeaderComponent={renderListHeader}
              ListFooterComponent={renderPagination}
              contentContainerStyle={{ 
                paddingHorizontal: horizontalPadding,
                paddingBottom: 100,  
                flexGrow: 1 
              }}
              columnWrapperStyle={undefined}
              renderItem={({ item }) => (
                <ArticleCard
                  item={item}
                  onPress={handleArticlePress}
                  onToggleBookmark={handleToggleBookmark}
                  containerStyle={{
                    width: cardWidth,
                    marginBottom: cardGap,
                  }}
                />
              )}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              removeClippedSubviews={true}
              maxToRenderPerBatch={5}
              initialNumToRender={8}
              windowSize={5}
              updateCellsBatchingPeriod={50}
              getItemLayout={(data, index) => ({
                length: 200,
                offset: 200 * index,
                index,
              })}
              refreshing={false}
              onRefresh={() => {
                setCurrentPage(1);
                refetch();
              }}
              ListEmptyComponent={
                <View style={tw`flex-1 justify-center items-center py-8`}>
                  <Ionicons name="document-text" size={48} color="#9CA3AF" />
                  <GSText size="lg" className="text-gray-500 text-center mt-4">No articles found</GSText>
                  {searchQuery.trim() && (
                    <GSText size="sm" className="text-gray-400 text-center mt-2">Try adjusting your search or filters</GSText>
                  )}
                </View>
              }
            />

          </View>
        )}

        {/* Conditional navbar rendering based on guest mode */}
        {isGuestMode ? (
          <GuestNavbar activeTab="learn" />
        ) : (
          <Navbar activeTab="learn" />
        )}
        {!isGuestMode && <SidebarWrapper />}
      </SafeAreaView>
  );
}
