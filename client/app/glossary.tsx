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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getContentBottomPadding } from '../constants/LayoutConstants';
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
} from "@/services/cacheService";
import { NetworkConfig } from "@/utils/networkConfig";
import { useGuest } from "../contexts/GuestContext";
import { useBookmarks } from "@/contexts/BookmarksContext";
import UnifiedSearchBar from "@/components/common/UnifiedSearchBar";

const ITEMS_PER_PAGE = 8;

export default function GlossaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sidebar = useSidebar();
  const { isGuestMode } = useGuest();
  const { openSidebar: openSidebarFromSidebar } = sidebar || {};
  
  // Force status bar to white on mount
  useEffect(() => {
    StatusBar.setBarStyle('dark-content', true);
    StatusBar.setBackgroundColor('#ffffff', true);
  }, []);
  const [activeTab, setActiveTab] = useState<string>("terms");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isGuestSidebarOpen, setIsGuestSidebarOpen] = useState(false);

  // Terms state
  const [allTerms, setAllTerms] = useState<TermItem[]>([]); // Store all terms
  const [terms, setTerms] = useState<TermItem[]>([]); // Filtered terms
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
  const [isSearchingArticles] = useState<boolean>(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();
  
  // Debug: Log articles state
  useEffect(() => {
    console.log('[Glossary] Articles state:', {
      count: legalArticles.length,
      loading: articlesLoading,
      error: articlesError
    });
  }, [legalArticles, articlesLoading, articlesError]);
  
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

  // Initialize articles display - set all articles when they're loaded
  useEffect(() => {
    console.log('[Glossary] Articles loaded from hook:', legalArticles.length);
    if (legalArticles.length > 0) {
      setDisplayArticles(legalArticles);
      console.log('[Glossary] DisplayArticles set to:', legalArticles.length, 'articles');
    } else {
      console.log('[Glossary] No articles to display yet');
    }
  }, [legalArticles]);

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

  // Fetch all legal terms once
  const fetchAllLegalTerms = useCallback(async () => {
    try {
      setTermsLoading(true);
      setTermsError(null);

      const cacheKey = 'glossary_all_terms';
      const isConnected = await CacheService.isConnected();
      setIsOffline(!isConnected);

      const cachedData = await CacheService.get<any>(cacheKey);

      if (cachedData) {
        const formattedTerms = formatTerms(
          cachedData.terms || []
        );
        setAllTerms(formattedTerms);
        if (!isConnected) {
          setTermsLoading(false);
          return;
        }
      }

      if (!isConnected && !cachedData) {
        throw new Error("No internet connection and no cached data available");
      }

      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/glossary/terms/all`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const formattedTerms = formatTerms(data.terms);
      setAllTerms(formattedTerms);

      await CacheService.set(cacheKey, {
        terms: data.terms,
      });
    } catch (err) {
      console.error("Error fetching legal terms:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setTermsError(errorMessage);

      if (!isOffline && !allTerms.length) {
        Alert.alert(
          "Connection Error",
          `Could not fetch terms from server. Error: ${errorMessage}`,
          [{ text: "OK" }]
        );
      }
    } finally {
      setTermsLoading(false);
    }
  }, [formatTerms, isOffline, allTerms.length]);

  // Filter terms client-side
  const filterTerms = useCallback((category: string, search: string) => {
    let filtered = [...allTerms];

    // Apply category filter
    if (category && category !== "all") {
      filtered = filtered.filter(term => term.category === category);
    }

    // Apply search filter
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      filtered = filtered.filter(term => 
        term.title.toLowerCase().includes(searchLower) ||
        (term.filipinoTerm && term.filipinoTerm.toLowerCase().includes(searchLower)) ||
        term.definition.toLowerCase().includes(searchLower) ||
        (term.filipinoDefinition && term.filipinoDefinition.toLowerCase().includes(searchLower))
      );
    }

    setTerms(filtered);
    setTermsTotalCount(filtered.length);
    setTermsTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
  }, [allTerms]);

  // Track if we've loaded terms before
  const hasLoadedTermsRef = useRef(false);

  // Initial load - fetch all terms once
  useEffect(() => {
    if (activeTab === "terms") {
      // Only fetch if we haven't loaded before OR we have no data
      if (!hasLoadedTermsRef.current && allTerms.length === 0) {
        fetchAllLegalTerms();
        hasLoadedTermsRef.current = true;
      }
    }
  }, [activeTab, allTerms.length, fetchAllLegalTerms]);

  // Filter terms when allTerms, category, or search changes
  useEffect(() => {
    if (activeTab === "terms" && allTerms.length > 0) {
      filterTerms(activeCategory, debouncedSearch);
    }
  }, [activeTab, allTerms, activeCategory, debouncedSearch, filterTerms]);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);


  // Articles filter with client-side filtering
  useEffect(() => {
    if (activeTab === "guides") {
      console.log('[Glossary] Filtering guides - legalArticles count:', legalArticles.length);
      const trimmedQuery = debouncedSearch.trim();
      
      if (trimmedQuery && trimmedQuery.length >= 2) {
        // Client-side search
        const searchResults = searchArticles(trimmedQuery, activeCategory !== "all" ? activeCategory : undefined);
        console.log('[Glossary] Search results:', searchResults.length);
        setDisplayArticles(searchResults);
      } else {
        // Client-side category filter
        if (activeCategory === "all") {
          console.log('[Glossary] Showing all articles:', legalArticles.length);
          setDisplayArticles(legalArticles);
        } else {
          const byCat = getArticlesByCategory(activeCategory);
          console.log('[Glossary] Category filtered articles:', byCat.length);
          setDisplayArticles(byCat);
        }
      }
    }
  }, [debouncedSearch, activeCategory, activeTab, legalArticles, searchArticles, getArticlesByCategory]);

  // Handle data differently for terms vs articles (both now use client-side pagination)
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
    // Both terms and articles now use client-side pagination
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return currentData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentData, currentPage]);

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
      openSidebarFromSidebar?.();
    }
  }, [isGuestMode, openSidebarFromSidebar]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    setCurrentPage(1);
    
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 50);
  }, []);

  const handleItemPress = useCallback((item: TermItem | ArticleItem) => {
    if (activeTab === "terms") {
      router.push(`/glossary/${item.id}`);
    } else {
      router.push(`/article/${item.id}`);
    }
  }, [activeTab, router]);

  const handleToggleBookmark = useCallback(async (item: ArticleItem) => {
    await toggleBookmark(item.id, item.title);
  }, [toggleBookmark]);

  // Optimized page change handler with functional state update and no animation
  const handlePageChange = useCallback((page: number) => {
    // Use functional update pattern for better React performance
    setCurrentPage(() => page);
    // Use animated: false for better performance
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, []);

  // Render functions
  const renderListHeader = useCallback(() => (
    <View style={{ marginBottom: isDesktop ? 28 : isTablet ? 24 : 20, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }}>
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
  ), [activeCategory, handleCategoryChange, isDesktop, isTablet, insets.top, insets.left, insets.right]);

  // Memoized pagination components for better performance
  const PageNumber = React.memo(({ page, isActive, onPress }: { page: number, isActive: boolean, onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 32,
        height: 32,
        marginHorizontal: 4,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: isActive ? '#3B82F6' : '#D1D5DB',
      }}
    >
      <GSText
        style={{
          fontSize: 12,
          fontWeight: isActive ? '700' : '400',
          color: isActive ? '#1E40AF' : '#374151',
        }}
      >
        {page}
      </GSText>
    </TouchableOpacity>
  ));

  const Ellipsis = React.memo(({ index }: { index: number }) => (
    <View
      style={{
        width: 32,
        height: 32,
        marginHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <GSText style={{ fontSize: 12, color: '#6B7280' }}>...</GSText>
    </View>
  ));

  const PaginationButton = React.memo(({ direction, disabled, onPress }: { direction: "back" | "forward", disabled: boolean, onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        width: 32,
        height: 32,
        marginHorizontal: 4,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: disabled ? 0 : 1,
        borderColor: '#D1D5DB',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Ionicons
        name={direction === "back" ? "chevron-back" : "chevron-forward"}
        size={16}
        color={disabled ? "#9CA3AF" : Colors.primary.blue}
      />
    </TouchableOpacity>
  ));

  const renderPaginationControls = useCallback(() => {
    // Show pagination if there are multiple pages
    if (totalPages <= 1) return null;

    // Memoize the visible pages calculation
    const visiblePages = useMemo(() => {
      if (totalPages <= 4) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      if (currentPage <= 3) {
        return [1, 2, 3, "...", totalPages];
      }

      if (currentPage >= totalPages - 2) {
        return [1, "...", totalPages - 2, totalPages - 1, totalPages];
      }

      return [1, "...", currentPage, "...", totalPages];
    }, [currentPage, totalPages]);

    // Optimized page change handlers
    const handlePrevPage = useCallback(() => {
      if (currentPage > 1) {
        setCurrentPage(prev => prev - 1);
        // Use animated: false for better performance
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
    }, [currentPage]);

    const handleNextPage = useCallback(() => {
      if (currentPage < totalPages) {
        setCurrentPage(prev => prev + 1);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
    }, [currentPage, totalPages]);

    const handlePageSelect = useCallback((page: number) => {
      setCurrentPage(page);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, []);

    return (
      <View style={{ 
        paddingTop: 12,
        paddingBottom: 4, // Reduced from 16 to 4
        paddingHorizontal: horizontalPadding,
      }}>
        <View style={{ alignItems: 'center' }}>
          {/* Single row pagination with all elements in one line */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {/* Previous button */}
            <PaginationButton 
              direction="back" 
              disabled={currentPage === 1} 
              onPress={handlePrevPage} 
            />

            {/* Page numbers */}
            {visiblePages.map((page, index) =>
              page === "..." ? (
                <Ellipsis key={`ellipsis-${index}`} index={index} />
              ) : (
                <PageNumber 
                  key={`page-${page}`}
                  page={page as number} 
                  isActive={currentPage === page} 
                  onPress={() => handlePageSelect(page as number)} 
                />
              )
            )}

            {/* Next button */}
            <PaginationButton 
              direction="forward" 
              disabled={currentPage === totalPages} 
              onPress={handleNextPage} 
            />
          </View>

          {/* Results counter - reduced margin */}
          <GSText 
            style={{ 
              fontSize: 12,
              color: '#6B7280',
              marginTop: 4, // Reduced from 8 to 4
            }}
          >
            Showing {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} results
          </GSText>
        </View>
      </View>
    );
  }, [currentPage, totalPages, totalCount, horizontalPadding]);

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
              onPress={() => activeTab === "terms" ? fetchAllLegalTerms() : refetch()}
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
  }, [activeTab, termsLoading, articlesLoading, isSearchingArticles, termsError, articlesError, isOffline, currentData.length, searchQuery, fetchAllLegalTerms, refetch]);

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const itemMarginBottom = isDesktop ? 16 : isTablet ? 14 : 12;
      const columnGap = isDesktop ? 16 : isTablet ? 14 : 12;
      const isLastInRow = numColumns <= 1 ? true : (index + 1) % numColumns === 0;

      const totalHorizontalGaps = numColumns > 1 ? columnGap * (numColumns - 1) : 0;
      const cardWidth =
        (screenWidth - horizontalPadding * 2 - totalHorizontalGaps) / numColumns;

      const baseContainerStyle = {
        width: cardWidth,
        marginBottom: itemMarginBottom,
        ...(numColumns > 1 && !isLastInRow ? { marginRight: columnGap } : {}),
      } as const;

      if (activeTab === "terms") {
        return (
          <TermListItem
            item={item}
            onPress={handleItemPress}
            showFavorite={!isGuestMode}
            containerStyle={baseContainerStyle}
          />
        );
      } else {
        return (
          <ArticleCard
            item={item}
            onPress={handleItemPress}
            onToggleBookmark={handleToggleBookmark}
            showBookmark={!isGuestMode}
            containerStyle={baseContainerStyle}
          />
        );
      }
    },
    [
      activeTab,
      handleItemPress,
      handleToggleBookmark,
      numColumns,
      screenWidth,
      horizontalPadding,
      isGuestMode,
      isDesktop,
      isTablet,
    ]
  );


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top", "left", "right"]}>
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
              paddingBottom: getContentBottomPadding(insets.bottom, 6), // Reduced from 20 to 6
              paddingTop: isDesktop ? 8 : isTablet ? 6 : 4,
              flexGrow: 1,
          }}
          columnWrapperStyle={
            numColumns > 1
              ? { justifyContent: "flex-start" }
              : undefined
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          initialNumToRender={8}
          windowSize={10}
          refreshing={termsLoading || articlesLoading}
          onRefresh={() => activeTab === "terms" ? fetchAllLegalTerms() : refetch()}
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
