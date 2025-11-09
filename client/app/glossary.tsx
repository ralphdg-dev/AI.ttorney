import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  Animated,
  Alert,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import Navbar from "@/components/Navbar";
import { GuestNavbar, GuestSidebar } from "@/components/guest";
import ToggleGroup from "@/components/ui/ToggleGroup";
import CategoryScroller from "@/components/glossary/CategoryScroller";
import TermListItem, { TermItem } from "@/components/glossary/TermListItem";
import { ArticleCard, ArticleItem } from "@/components/guides/ArticleCard";
import { ArticleCardSkeletonList } from "@/components/guides/ArticleCardSkeleton";
import Colors from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { SidebarWrapper, useSidebar } from "@/components/AppSidebar";
import { useLegalArticles } from "@/hooks/useLegalArticles";
import {
  CacheService,
  generateGlossaryCacheKey,
} from "@/services/cacheService";
import { NetworkConfig } from "@/utils/networkConfig";
import { useAuth } from "@/contexts/AuthContext";
import { useBookmarks } from "@/contexts/BookmarksContext";
import UnifiedSearchBar from "@/components/common/UnifiedSearchBar";

const ITEMS_PER_PAGE = 10;

export default function GlossaryScreen() {
  const router = useRouter();
  const { isGuestMode } = useAuth();
  const { openSidebar } = useSidebar();
  const [activeTab, setActiveTab] = useState<string>("terms");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isGuestSidebarOpen, setIsGuestSidebarOpen] = useState(false);

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
  const { isBookmarked, toggleBookmark } = useBookmarks();
  
  // Animation and layout
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = useWindowDimensions();
  
  // Responsive design
  const isTablet = screenWidth >= 768;
  const isDesktop = screenWidth >= 1024;
  const horizontalPadding = 20; // Consistent 20px padding across all screen sizes
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
      return terms;
    } else {
      // For articles, return all with bookmark status
      return displayArticles.map((a: ArticleItem) => ({ ...a, isBookmarked: isBookmarked(a.id) }));
    }
  }, [activeTab, terms, displayArticles, isBookmarked]);

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
  const handleTabChange = (tabId: string) => {
    // ⚡ FAANG OPTIMIZATION: State-based tabs - no navigation, no page reload
    setActiveTab(tabId);
    setCurrentPage(1);
    setActiveCategory("all");
    setSearchQuery("");
  };

  const handleMenuPress = useCallback(() => {
    if (isGuestMode) {
      setIsGuestSidebarOpen(true);
    } else {
      openSidebar();
    }
  }, [isGuestMode, openSidebar]);

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

  const handleToggleBookmark = useCallback(async (item: ArticleItem) => {
    await toggleBookmark(item.id, item.title);
  }, [toggleBookmark]);

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
    <View style={{ marginBottom: isDesktop ? 28 : isTablet ? 24 : 20 }}>
      <HStack className="items-center" style={{ marginBottom: isDesktop ? 16 : 12 }}>
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
  ), [activeCategory, handleCategoryChange, isDesktop, isTablet]);

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
      <View style={{ 
        paddingTop: isDesktop ? 32 : isTablet ? 24 : 20,
        paddingBottom: isDesktop ? 24 : isTablet ? 20 : 16,
        paddingHorizontal: horizontalPadding,
        backgroundColor: '#f9fafb',
        marginTop: 8,
      }}>
        <View className="flex-col items-center">
          <View className="flex-row flex-wrap items-center justify-center" style={{ marginBottom: isDesktop ? 16 : 12 }}>
            <TouchableOpacity
              onPress={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                width: isDesktop ? 44 : 40,
                height: isDesktop ? 44 : 40,
                marginHorizontal: isDesktop ? 6 : 4,
                marginVertical: 4,
                borderRadius: 9999,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: currentPage === 1 ? '#E5E7EB' : 'white',
                borderWidth: currentPage === 1 ? 0 : 1,
                borderColor: '#D1D5DB',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              <Ionicons
                name="chevron-back"
                size={isDesktop ? 20 : 18}
                color={currentPage === 1 ? "#9CA3AF" : Colors.primary.blue}
              />
            </TouchableOpacity>

            {visiblePages.map((page, index) =>
              page === "..." ? (
                <View 
                  key={`ellipsis-${index}`} 
                  style={{
                    width: isDesktop ? 44 : 40,
                    height: isDesktop ? 44 : 40,
                    marginHorizontal: isDesktop ? 6 : 4,
                    marginVertical: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <GSText className="text-gray-500" style={{ fontSize: isDesktop ? 16 : 14 }}>...</GSText>
                </View>
              ) : (
                <TouchableOpacity
                  key={page}
                  onPress={() => handlePageChange(page as number)}
                  style={{
                    width: isDesktop ? 44 : 40,
                    height: isDesktop ? 44 : 40,
                    marginHorizontal: isDesktop ? 6 : 4,
                    marginVertical: 4,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: currentPage === page ? '#DBEAFE' : 'white',
                    borderWidth: 1,
                    borderColor: currentPage === page ? '#93C5FD' : '#D1D5DB',
                  }}
                >
                  <GSText
                    style={{
                      fontSize: isDesktop ? 15 : 14,
                      fontWeight: currentPage === page ? '700' : '500',
                      color: currentPage === page ? '#1E40AF' : '#374151',
                    }}
                  >
                    {page}
                  </GSText>
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity
              onPress={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                width: isDesktop ? 44 : 40,
                height: isDesktop ? 44 : 40,
                marginHorizontal: isDesktop ? 6 : 4,
                marginVertical: 4,
                borderRadius: 9999,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: currentPage === totalPages ? '#E5E7EB' : 'white',
                borderWidth: currentPage === totalPages ? 0 : 1,
                borderColor: '#D1D5DB',
                opacity: currentPage === totalPages ? 0.5 : 1,
              }}
            >
              <Ionicons
                name="chevron-forward"
                size={isDesktop ? 20 : 18}
                color={currentPage === totalPages ? "#9CA3AF" : Colors.primary.blue}
              />
            </TouchableOpacity>
          </View>

          <GSText 
            style={{ 
              fontSize: isDesktop ? 14 : 13,
              color: '#6B7280',
            }}
          >
            Showing {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} results
          </GSText>
        </View>
      </View>
    );
  }, [totalCount, totalPages, currentPage, handlePageChange, isDesktop, isTablet, horizontalPadding]);

  const renderEmptyState = useCallback(() => {
    const isLoading = activeTab === "terms" ? termsLoading : (articlesLoading || isSearchingArticles);
    const error = activeTab === "terms" ? termsError : articlesError;

    if (isLoading) {
      return (
        <ArticleCardSkeletonList count={3} containerStyle={{ width: "100%", marginHorizontal: 0 }} />
      );
    }

    if (error) {
      return (
        <View className="items-center justify-center flex-1 px-6 py-20">
          <Ionicons
            name={isOffline ? "cloud-offline" : "warning"}
            size={48}
            color={Colors.text.sub}
          />
          <GSText className="mt-4 font-bold text-center text-gray-800">
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
              className="px-6 py-3 mt-4 bg-blue-500 rounded-lg"
            >
              <GSText className="font-semibold text-white">Retry</GSText>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (currentData.length === 0 && searchQuery.trim()) {
      return (
        <View className="items-center justify-center flex-1 py-20">
          <Ionicons name="search" size={48} color={Colors.text.sub} />
          <GSText className="mt-4 font-bold text-center text-gray-800">
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
      <View className="items-center justify-center flex-1 py-20">
        <Ionicons name={activeTab === "terms" ? "book" : "document-text"} size={48} color={Colors.text.sub} />
        <GSText className="mt-4 font-bold text-center text-gray-800">
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
    const itemMarginBottom = isDesktop ? 16 : isTablet ? 14 : 12;
    
    if (activeTab === "terms") {
      return (
        <TermListItem
          item={item}
          onPress={handleItemPress}
          showFavorite={!isGuestMode}
          containerStyle={{
            width: numColumns > 1 ? (screenWidth - horizontalPadding * 2 - 12) / numColumns : "100%",
            marginBottom: itemMarginBottom,
          }}
        />
      );
    } else {
      return (
        <ArticleCard
          item={item}
          onPress={handleItemPress}
          onToggleBookmark={handleToggleBookmark}
          showBookmark={!isGuestMode}
          containerStyle={{
            width: numColumns > 1 ? (screenWidth - horizontalPadding * 2 - 12) / numColumns : "100%",
            marginHorizontal: 0,
            marginBottom: itemMarginBottom,
          }}
        />
      );
    }
  }, [activeTab, handleItemPress, handleToggleBookmark, numColumns, screenWidth, horizontalPadding, isGuestMode, isDesktop, isTablet]);


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header 
        title="Legal Glossary" 
        showBackButton={false}
        showMenu={true}
        onMenuPress={handleMenuPress}
      />

      {!isGuestMode && (
        <ToggleGroup
          options={tabOptions}
          activeOption={activeTab}
          onOptionChange={handleTabChange}
        />
      )}

      <View style={{ paddingHorizontal: 20 }}>
        <UnifiedSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search ${activeTab === "terms" ? "legal terms" : "articles"}...`}
          loading={termsLoading || articlesLoading}
          showFilterIcon={false}
          containerClassName="pt-6 pb-4"
        />
      </View>

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
            paddingBottom: isDesktop ? 120 : isTablet ? 110 : 100,
            paddingTop: isDesktop ? 8 : isTablet ? 6 : 4,
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
      
      {/* Sidebar - Guest or Authenticated */}
      {isGuestMode ? (
        <GuestSidebar 
          isOpen={isGuestSidebarOpen} 
          onClose={() => setIsGuestSidebarOpen(false)} 
        />
      ) : (
        <SidebarWrapper />
      )}
    </SafeAreaView>
  );
}
