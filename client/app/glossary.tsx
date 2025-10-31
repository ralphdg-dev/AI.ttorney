import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  Animated,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fadeIn, fadeOut } from '@/utils/animations';
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import { GuestNavbar, GuestSidebar } from "@/components/guest";
import ToggleGroup from "@/components/ui/ToggleGroup";
import CategoryScroller from "@/components/glossary/CategoryScroller";
import TermListItem, { TermItem } from "@/components/glossary/TermListItem";
import { ArticleCard, ArticleItem } from "@/components/guides/ArticleCard";
import Colors from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { SidebarWrapper } from "@/components/AppSidebar";
import { useLegalArticles } from "@/hooks/useLegalArticles";
import {
  CacheService,
  generateGlossaryCacheKey,
} from "@/services/cacheService";
import { NetworkConfig } from "@/utils/networkConfig";
import { useAuth } from "@/contexts/AuthContext";

const ITEMS_PER_PAGE = 10;

export default function GlossaryScreen() {
  const router = useRouter();
  const { isGuestMode } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("terms");
  const [isGuestSidebarOpen, setIsGuestSidebarOpen] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Terms state
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [termsLoading, setTermsLoading] = useState<boolean>(true);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [termsTotalPages, setTermsTotalPages] = useState<number>(1);
  const [termsTotalCount, setTermsTotalCount] = useState<number>(0);
  
  // Articles state
  const { 
    articles: legalArticles, 
    loading: articlesLoading, 
    error: articlesError, 
    refetch, 
    getArticlesByCategory, 
    searchArticles 
  } = useLegalArticles();
  const [displayArticles, setDisplayArticles] = useState<ArticleItem[]>([]);
  const [isSearchingArticles, setIsSearchingArticles] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  
  // Animation and layout
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = useWindowDimensions();
  
  // Responsive design
  const isTablet = screenWidth >= 768;
  const isDesktop = screenWidth >= 1024;
  const horizontalPadding = isDesktop ? 32 : isTablet ? 24 : 16;
  const minCardWidth = isDesktop ? 320 : isTablet ? 280 : 300;
  const numColumns = Math.max(
    1,
    Math.min(isDesktop ? 4 : isTablet ? 3 : 2, Math.floor((screenWidth - horizontalPadding * 2) / minCardWidth))
  );

  const tabOptions = [
    { id: "terms", label: "Legal Terms" },
    { id: "guides", label: "Legal Guides" },
  ];

  // Initialize articles display
  useEffect(() => {
    if (activeTab === "guides" && legalArticles.length > 0) {
      setDisplayArticles(legalArticles);
    }
  }, [legalArticles, activeTab]);

  // Network check
  useEffect(() => {
    const checkNetwork = async () => {
      const connected = await CacheService.isConnected();
      setIsOffline(!connected);
    };
    checkNetwork();
    CacheService.clearExpired();
  }, []);

  // Format terms from API
  const formatTerms = useCallback((apiTerms: any[]): TermItem[] => {
    const placeholderText = "Information not available";
    return apiTerms.map((item: any) => ({
      id: item.id.toString(),
      title: item.term_en || placeholderText,
      filipinoTerm: item.term_fil || placeholderText,
      definition: item.definition_en || placeholderText,
      filipinoDefinition: item.definition_fil || placeholderText,
      example: item.example_en || placeholderText,
      filipinoExample: item.example_fil || placeholderText,
      category: item.category || "others",
    }));
  }, []);

  // Fetch legal terms
  const fetchLegalTerms = useCallback(async (
    page = 1,
    category = activeCategory,
    search = searchQuery
  ) => {
    try {
      setTermsLoading(true);
      setTermsError(null);

      const cacheKey = generateGlossaryCacheKey(page, category, search);
      const isConnected = await CacheService.isConnected();
      setIsOffline(!isConnected);

      const cachedData = await CacheService.get<any>(cacheKey);

      if (cachedData) {
        const formattedTerms = formatTerms(
          cachedData.terms || cachedData.data?.terms || []
        );
        setTerms(formattedTerms);
        setTermsTotalPages(cachedData.pagination?.pages || 1);
        setTermsTotalCount(cachedData.pagination?.total || formattedTerms.length);
        if (!isConnected) {
          setTermsLoading(false);
          return;
        }
      }

      if (!isConnected && !cachedData) {
        throw new Error("No internet connection and no cached data available");
      }

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

      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/glossary/terms?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const formattedTerms = formatTerms(data.terms);
      setTerms(formattedTerms);
      setTermsTotalPages(data.pagination?.pages || 1);
      setTermsTotalCount(data.pagination?.total || formattedTerms.length);

      await CacheService.set(cacheKey, {
        terms: data.terms,
        pagination: data.pagination,
      });
    } catch (err) {
      console.error("Error fetching legal terms:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setTermsError(errorMessage);

      if (!isOffline && !terms.length) {
        Alert.alert(
          "Connection Error",
          `Could not fetch terms from server. Error: ${errorMessage}`,
          [{ text: "OK" }]
        );
      }
    } finally {
      setTermsLoading(false);
    }
  }, [activeCategory, searchQuery, formatTerms, isOffline, terms.length]);

  // Initial load
  useEffect(() => {
    if (activeTab === "terms") {
      fetchLegalTerms(1);
    }
  }, [activeTab, fetchLegalTerms]);

  // Search and category change with debounce
  useEffect(() => {
    if (activeTab === "terms") {
      const timeoutId = setTimeout(() => {
        fetchLegalTerms(1, activeCategory, searchQuery);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [activeCategory, searchQuery, activeTab, fetchLegalTerms]);

  // Articles search with debounce
  useEffect(() => {
    if (activeTab === "guides") {
      const searchTimeout = setTimeout(async () => {
        const trimmedQuery = searchQuery.trim();
        
        if (trimmedQuery && trimmedQuery.length >= 2) {
          setIsSearchingArticles(true);
          try {
            const searchResults = await searchArticles(trimmedQuery, activeCategory !== "all" ? activeCategory : undefined);
            setDisplayArticles(searchResults);
          } catch (err) {
            console.error("Search error:", err);
            setDisplayArticles([]);
          } finally {
            setIsSearchingArticles(false);
          }
        } else {
          setIsSearchingArticles(false);
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
    }
  }, [searchQuery, activeCategory, activeTab, legalArticles, searchArticles, getArticlesByCategory]);

  // Handle data differently for terms (server-side pagination) vs articles (client-side pagination)
  const currentData = useMemo(() => {
    if (activeTab === "terms") {
      // For terms, return the data as-is since pagination is handled server-side
      return terms;
    } else {
      // For articles, apply client-side filtering
      return displayArticles.map((a: ArticleItem) => ({ ...a, isBookmarked: !!bookmarks[a.id] }));
    }
  }, [activeTab, terms, displayArticles, bookmarks]);

  // Calculate pagination info based on tab
  const totalPages = activeTab === "terms" ? termsTotalPages : Math.ceil(currentData.length / ITEMS_PER_PAGE);
  const totalCount = activeTab === "terms" ? termsTotalCount : currentData.length;
  
  const paginatedData = useMemo(() => {
    if (activeTab === "terms") {
      // For terms, return all data since server already paginated
      return currentData;
    } else {
      // For articles, apply client-side pagination
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return currentData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }
  }, [activeTab, currentData, currentPage]);

  // Handlers
  const handleTabChange = useCallback((id: string) => {
    if (id === activeTab) return;
    
    // Smooth transition animation for both tabs
    fadeOut(fadeAnim, 150).start(() => {
      setActiveTab(id);
      setCurrentPage(1);
      setSearchQuery("");
      setActiveCategory("all");
      
      fadeIn(fadeAnim, 150).start();
    });
  }, [activeTab, fadeAnim]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    setCurrentPage(1);
    
    if (activeTab === "guides" && categoryId !== "all") {
      (async () => {
        try {
          const byCat = await getArticlesByCategory(categoryId);
          setDisplayArticles(byCat);
        } catch (err) {
          console.error("Category fetch error:", err);
          setDisplayArticles(legalArticles);
        }
      })();
    } else if (activeTab === "guides") {
      setDisplayArticles(legalArticles);
    }
    
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 50);
  }, [activeTab, getArticlesByCategory, legalArticles]);

  const handleItemPress = useCallback((item: TermItem | ArticleItem) => {
    if (activeTab === "terms") {
      router.push(`/glossary/${item.id}` as any);
    } else {
      router.push(`/article/${item.id}` as any);
    }
  }, [activeTab, router]);

  const handleToggleBookmark = useCallback((item: ArticleItem) => {
    setBookmarks(prev => ({ ...prev, [item.id]: !prev[item.id] }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    
    // For terms, fetch new data from server
    if (activeTab === "terms") {
      fetchLegalTerms(page, activeCategory, searchQuery);
    }
    
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [activeTab, activeCategory, searchQuery, fetchLegalTerms]);

  // Render functions
  const renderListHeader = useCallback(() => (
    <View className="mb-6">
      <HStack className="items-center mb-4">
        <Ionicons name="pricetags" size={16} color={Colors.text.sub} />
        <GSText size="sm" className="ml-2 font-semibold text-gray-600">
          Choose Category
        </GSText>
      </HStack>
      <CategoryScroller
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />
    </View>
  ), [activeCategory, handleCategoryChange]);

  const renderPaginationControls = useCallback(() => {
    // Show pagination if there are multiple pages
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      if (currentPage <= 3) {
        return [1, 2, 3, 4, "...", totalPages];
      }

      if (currentPage >= totalPages - 2) {
        return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      }

      return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
    };

    const visiblePages = getVisiblePages();

    return (
      <View className="py-6 bg-gray-50">
        <View className="flex-col items-center">
          <View className="flex-row justify-center items-center mb-4">
            <TouchableOpacity
              onPress={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`w-10 h-10 mx-1 rounded-full justify-center items-center ${
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

            {visiblePages.map((page, index) =>
              page === "..." ? (
                <View key={`ellipsis-${index}`} className="w-10 h-10 mx-1 justify-center items-center">
                  <GSText className="text-gray-500">...</GSText>
                </View>
              ) : (
                <TouchableOpacity
                  key={page}
                  onPress={() => handlePageChange(page as number)}
                  className={`w-10 h-10 mx-1 rounded-lg justify-center items-center border ${
                    currentPage === page
                      ? "bg-blue-100 border-blue-300"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <GSText
                    className={
                      currentPage === page
                        ? "text-blue-700 font-bold"
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
              className={`w-10 h-10 mx-1 rounded-full justify-center items-center ${
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

          <GSText className="text-sm text-gray-600">
            Showing {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} results
          </GSText>
        </View>
      </View>
    );
  }, [totalCount, totalPages, currentPage, handlePageChange]);

  const renderEmptyState = useCallback(() => {
    const isLoading = activeTab === "terms" ? termsLoading : (articlesLoading || isSearchingArticles);
    const error = activeTab === "terms" ? termsError : articlesError;

    if (isLoading) {
      return (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color={Colors.primary.blue} />
          <GSText className="mt-4 text-center text-gray-600">
            {isOffline ? "Loading cached data..." : `Loading ${activeTab}...`}
          </GSText>
        </View>
      );
    }

    if (error) {
      return (
        <View className="flex-1 justify-center items-center py-20 px-6">
          <Ionicons
            name={isOffline ? "cloud-offline" : "warning"}
            size={48}
            color={Colors.text.sub}
          />
          <GSText className="mt-4 text-center font-bold text-gray-800">
            {isOffline ? "Offline Mode" : "Connection Error"}
          </GSText>
          <GSText className="mt-2 text-center text-gray-600">
            {isOffline
              ? "Using cached data. Some features may be limited."
              : `Unable to load ${activeTab}. Please check your connection and try again.`}
          </GSText>
          {!isOffline && (
            <TouchableOpacity
              onPress={() => activeTab === "terms" ? fetchLegalTerms(currentPage) : refetch()}
              className="mt-4 px-6 py-3 bg-blue-500 rounded-lg"
            >
              <GSText className="text-white font-semibold">Retry</GSText>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (currentData.length === 0 && searchQuery.trim()) {
      return (
        <View className="flex-1 justify-center items-center py-20">
          <Ionicons name="search" size={48} color={Colors.text.sub} />
          <GSText className="mt-4 text-center font-bold text-gray-800">
            No results found
          </GSText>
          <GSText className="mt-2 text-center text-gray-600">
            {isOffline
              ? "No cached results for this search. Connect to internet to search."
              : "Try adjusting your search terms or category filter."}
          </GSText>
        </View>
      );
    }

    return (
      <View className="flex-1 justify-center items-center py-20">
        <Ionicons name={activeTab === "terms" ? "book" : "document-text"} size={48} color={Colors.text.sub} />
        <GSText className="mt-4 text-center font-bold text-gray-800">
          No {activeTab} available
        </GSText>
        <GSText className="mt-2 text-center text-gray-600">
          {isOffline
            ? "No cached data available. Connect to internet to load content."
            : `${activeTab === "terms" ? "Legal terms" : "Articles"} will appear here once loaded.`}
        </GSText>
      </View>
    );
  }, [activeTab, termsLoading, articlesLoading, isSearchingArticles, termsError, articlesError, isOffline, currentData.length, searchQuery, currentPage, fetchLegalTerms, refetch]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (activeTab === "terms") {
      return (
        <TermListItem
          item={item}
          onPress={handleItemPress}
          showFavorite={!isGuestMode}
          containerStyle={{
            width: numColumns > 1 ? (screenWidth - horizontalPadding * 2 - 12) / numColumns : "100%",
            marginBottom: 12,
          }}
        />
      );
    } else {
      return (
        <ArticleCard
          item={item}
          onPress={handleItemPress}
          onToggleBookmark={handleToggleBookmark}
          containerStyle={{
            width: numColumns > 1 ? (screenWidth - horizontalPadding * 2 - 12) / numColumns : "100%",
            marginHorizontal: 0,
            marginBottom: 12,
          }}
        />
      );
    }
  }, [activeTab, handleItemPress, handleToggleBookmark, numColumns, screenWidth, horizontalPadding, isGuestMode]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header 
        title="Know Your Batas" 
        showMenu={true}
        onMenuPress={isGuestMode ? () => setIsGuestSidebarOpen(true) : undefined}
      />

      <ToggleGroup
        options={tabOptions}
        activeOption={activeTab}
        onOptionChange={handleTabChange}
      />

      <Box className={`px-${horizontalPadding / 4} pt-6 pb-4`}>
        <Input
          variant="outline"
          size="lg"
          className="bg-white rounded-lg border border-gray-300"
        >
          <InputSlot className="pl-4">
            <Ionicons name="search" size={20} color="#9CA3AF" />
          </InputSlot>
          <InputField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search ${activeTab === "terms" ? "legal terms" : "articles"}...`}
            placeholderTextColor="#9CA3AF"
            className="text-gray-800 text-base"
            editable={!termsLoading && !articlesLoading}
          />
          <InputSlot className="pr-4">
            <Ionicons name="options" size={20} color={Colors.text.sub} />
          </InputSlot>
        </Input>
      </Box>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          ref={flatListRef}
          data={paginatedData}
          key={`glossary-${numColumns}-${activeCategory}-${currentPage}-${activeTab}-${screenWidth}`}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          extraData={screenWidth}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderPaginationControls}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={{
            paddingHorizontal: horizontalPadding,
            paddingBottom: 100,
            flexGrow: 1,
          }}
          columnWrapperStyle={
            numColumns > 1
              ? { justifyContent: "space-between", marginBottom: 0 }
              : undefined
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          initialNumToRender={8}
          windowSize={10}
          refreshing={termsLoading || articlesLoading}
          onRefresh={() => activeTab === "terms" ? fetchLegalTerms(currentPage) : refetch()}
        />
      </Animated.View>

      {/* Guest Sidebar */}
      {isGuestMode && (
        <GuestSidebar 
          isOpen={isGuestSidebarOpen} 
          onClose={() => setIsGuestSidebarOpen(false)} 
        />
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
