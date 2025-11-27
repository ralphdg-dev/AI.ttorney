import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, FlatList, useWindowDimensions, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import UnifiedSearchBar from "@/components/common/UnifiedSearchBar";
import Colors from "@/constants/Colors";
import { getContentBottomPadding } from "@/constants/LayoutConstants";
import CategoryScroller from "@/components/glossary/CategoryScroller";
import Navbar from "@/components/Navbar";
import { GuestNavbar, GuestSidebar } from "@/components/guest";
import { SidebarWrapper, useSidebar } from "@/components/AppSidebar";
import { ArticleCard, ArticleItem } from "@/components/guides/ArticleCard";
import { ArticleCardSkeletonList } from "@/components/guides/ArticleCardSkeleton";
import { useLegalArticles } from "@/hooks/useLegalArticles";
import { useGuest } from "../contexts/GuestContext";
import { useBookmarks } from "@/contexts/BookmarksContext";

export default function GuidesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isGuestMode } = useGuest();
  const sidebar = useSidebar();
  const { openSidebar } = sidebar || {};
  const { articles: legalArticles, loading, error, refetch, getArticlesByCategory, searchArticles } = useLegalArticles();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isGuestSidebarOpen, setIsGuestSidebarOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();
  
  const ARTICLES_PER_PAGE = 8;
  
  // Responsive design
  const numColumns = width > 768 ? 2 : 1;
  
  const [displayArticles, setDisplayArticles] = useState<ArticleItem[]>([]);

  useEffect(() => {
    if (activeCategory === "all" && !searchQuery.trim()) {
      setDisplayArticles(legalArticles);
    }
  }, [legalArticles, activeCategory, searchQuery]);

  // Removed tab options - only showing legal terms for guests

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Search and filter with client-side filtering
  useEffect(() => {
    const trimmedQuery = debouncedSearch.trim();
    
    if (trimmedQuery && trimmedQuery.length >= 2) {
      // Client-side search
      const searchResults = searchArticles(trimmedQuery, activeCategory !== "all" ? activeCategory : undefined);
      setDisplayArticles(searchResults);
    } else {
      // Client-side category filter
      if (activeCategory === "all") {
        setDisplayArticles(legalArticles);
      } else {
        const byCat = getArticlesByCategory(activeCategory);
        setDisplayArticles(byCat);
      }
    }
  }, [debouncedSearch, activeCategory, legalArticles, searchArticles, getArticlesByCategory]);

  const articlesToRender: ArticleItem[] = useMemo(() => {
    return displayArticles.map((a: ArticleItem) => ({ ...a, isBookmarked: isBookmarked(a.id) }));
  }, [displayArticles, isBookmarked]);

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
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 50);
  };

  const handleArticlePress = (item: ArticleItem): void => {
    router.push(`/article/${item.id}` as any);
  };

  const handleToggleBookmark = async (item: ArticleItem): Promise<void> => {
    await toggleBookmark(item.id, item.title);
  };

  // Removed toggle - only showing legal terms for guests

  const handleMenuPress = useCallback(() => {
    if (isGuestMode) {
      setIsGuestSidebarOpen(true);
    } else {
      openSidebar?.();
    }
  }, [isGuestMode, openSidebar]);


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

// Memoized pagination components for better performance
const PageNumber = React.memo(({ page, isActive, onPress }: { page: number, isActive: boolean, onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    style={tw`w-8 h-8 mx-1 rounded-lg justify-center items-center border ${isActive ? "border-blue-500" : "border-gray-300"}`}
  >
    <GSText
      style={{
        fontSize: 12,
        fontWeight: isActive ? "700" : "400",
        color: isActive ? "#1E40AF" : "#374151",
      }}
    >
      {page}
    </GSText>
  </TouchableOpacity>
));

const Ellipsis = React.memo(({ index }: { index: number }) => (
  <View key={`ellipsis-${index}`} style={tw`items-center justify-center w-8 h-8 mx-1`}>
    <GSText style={{ fontSize: 12 }} className="text-gray-500">...</GSText>
  </View>
));

const PaginationButton = React.memo(({ direction, disabled, onPress }: { direction: "back" | "forward", disabled: boolean, onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={tw`w-8 h-8 mx-1 rounded-full justify-center items-center ${disabled ? "opacity-50" : "border border-gray-300"}`}
  >
    <Ionicons
      name={direction === "back" ? "chevron-back" : "chevron-forward"}
      size={16}
      color={disabled ? "#9CA3AF" : Colors.primary.blue}
    />
  </TouchableOpacity>
));

const renderPagination = useCallback(() => {
  // Memoize the visible pages calculation
  const visiblePages = useMemo(() => {
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
  }, [currentPage, totalPages]);

  // Optimized page change handlers with direct function references
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    }
  }, [currentPage, totalPages]);

  const handlePageSelect = useCallback((page: number) => {
    setCurrentPage(page);
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, []);

  // Don't render pagination if not needed
  if (totalPages <= 1) return null;

  return (
    <View style={tw`pt-2 pb-0`}>
      <View style={tw`items-center`}>
        {/* Single row pagination with all elements in one line */}
        <View style={tw`flex-row items-center justify-center`}>
          {/* Prev button */}
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

        {/* Counter - reduced margin top */}
        <GSText
          size="sm"
          className="mt-1 text-center text-gray-500"
          style={{ fontSize: 12 }}
        >
          Showing {Math.min(endIndex, totalArticles)} of {totalArticles} results
        </GSText>
      </View>
    </View>
  );
}, [currentPage, totalPages, totalArticles, endIndex]);

  

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header 
        title="Know Your Batas" 
        showBackButton={false}
        showMenu={true}
        onMenuPress={handleMenuPress}
      />

        <View style={{ paddingHorizontal: 20 }}>
          <UnifiedSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search articles"
            loading={loading}
            showFilterIcon={false}
            containerClassName="pt-6 pb-4"
          />
        </View>

        {loading ? (
        <ArticleCardSkeletonList count={3} containerStyle={{ width: "100%", marginHorizontal: 0 }} />
      ) : error ? (
          <View style={tw`items-center justify-center flex-1 px-6`}>
            <GSText size="lg" className="mb-4 text-center text-red-500">{error}</GSText>
            <TouchableOpacity 
              style={tw`px-4 py-2 bg-blue-500 rounded-lg`}
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
              key={`guides-${numColumns}-${activeCategory}-${currentPage}-${width}`}
              keyExtractor={(item) => item.id}
              numColumns={numColumns}
              extraData={width}
              ListHeaderComponent={renderListHeader}
              ListFooterComponent={renderPagination}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingBottom: getContentBottomPadding(insets.bottom, 8), // Reduced from 20 to 8
                flexGrow: 1 
              }}
              columnWrapperStyle={numColumns > 1 ? { justifyContent: "space-between" } : undefined}
              renderItem={({ item }) => (
                <ArticleCard
                  item={item}
                  onPress={handleArticlePress}
                  onToggleBookmark={handleToggleBookmark}
                  showBookmark={!isGuestMode}
                  containerStyle={{
                    width: numColumns > 1 ? (width - 24 - 16) / numColumns : "100%",
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
                <View style={tw`items-center justify-center flex-1 py-8`}>
                  <GSText size="lg" className="text-center text-gray-500">No articles found</GSText>
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
