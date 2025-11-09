import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, FlatList, useWindowDimensions, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import UnifiedSearchBar from "@/components/common/UnifiedSearchBar";
import Colors from "@/constants/Colors";
import { LAYOUT } from "@/constants/LayoutConstants";
import CategoryScroller from "@/components/glossary/CategoryScroller";
import Navbar from "@/components/Navbar";
import { GuestNavbar, GuestSidebar } from "@/components/guest";
import { SidebarWrapper, useSidebar } from "@/components/AppSidebar";
import { ArticleCard, ArticleItem } from "@/components/guides/ArticleCard";
import { ArticleCardSkeletonList } from "@/components/guides/ArticleCardSkeleton";
import { useLegalArticles } from "@/hooks/useLegalArticles";
import { useAuth } from "@/contexts/AuthContext";
import { useBookmarks } from "@/contexts/BookmarksContext";

export default function GuidesScreen() {
  const router = useRouter();
  const { isGuestMode } = useAuth();
  const { openSidebar } = useSidebar();
  const { articles: legalArticles, loading, error, refetch, getArticlesByCategory, searchArticles } = useLegalArticles();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isGuestSidebarOpen, setIsGuestSidebarOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();
  
  const ARTICLES_PER_PAGE = 12;
  const cardGap = LAYOUT.SPACING.md; // 16
  
  // FAANG approach: Always 1 column on mobile for better UX
  const numColumns = 1;
  
  const [displayArticles, setDisplayArticles] = useState<ArticleItem[]>([]);
  const previousSearchRef = useRef<string>("");

  useEffect(() => {
    if (activeCategory === "all" && !searchQuery.trim()) {
      setDisplayArticles(legalArticles);
    }
  }, [legalArticles, activeCategory, searchQuery]);

  // Removed tab options - only showing legal terms for guests

  // Search debounce
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      const trimmedQuery = searchQuery.trim();
      const searchKey = `${trimmedQuery}-${activeCategory}`;
      
      if (previousSearchRef.current === searchKey) return;
      previousSearchRef.current = searchKey;
      
      if (trimmedQuery) {
        if (trimmedQuery.length >= 2) {
          try {
            const searchResults = await searchArticles(trimmedQuery, activeCategory !== "all" ? activeCategory : undefined);
            setDisplayArticles(searchResults);
          } catch (err) {
            console.error("Search error:", err);
            setDisplayArticles([]);
          }
        }
      } else {
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

  const handleToggleBookmark = async (item: ArticleItem): Promise<void> => {
    await toggleBookmark(item.id, item.title);
  };

  // Removed toggle - only showing legal terms for guests

  const handleMenuPress = useCallback(() => {
    if (isGuestMode) {
      setIsGuestSidebarOpen(true);
    } else {
      openSidebar();
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
          <View style={tw`flex-row items-center justify-center`}>
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
                  style={tw`items-center justify-center w-10 h-10 mx-1`}
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
          className="mt-4 text-center text-gray-700"
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
                paddingHorizontal: 20,
                paddingBottom: 100,  
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
                    width: numColumns > 1 ? (width - 32 - 12) / numColumns : "100%",
                    marginHorizontal: 0,
                    marginBottom: cardGap,
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
