import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, FlatList, useWindowDimensions, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import UnifiedSearchBar from "@/components/common/UnifiedSearchBar";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import CategoryScroller from "@/components/glossary/CategoryScroller";
import Navbar from "@/components/Navbar";
import { SidebarWrapper } from "@/components/AppSidebar";
import { ArticleCard, ArticleItem } from "@/components/guides/ArticleCard";
import { useBookmarks } from "@/contexts/BookmarksContext";
import { useAuth } from "../contexts/AuthContext";
import AuthGuard from "../components/auth/AuthGuard";
import { NetworkConfig } from '@/utils/networkConfig';
import Button from "@/components/ui/Button";
import { ArticleCardSkeletonList } from "@/components/guides/ArticleCardSkeleton";
import { Filter, SortAsc } from "lucide-react-native";

const API_BASE_URL = NetworkConfig.getApiUrl();

export default function BookmarkedGuidesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { bookmarkedGuideIds } = useBookmarks();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [bookmarkedArticles, setBookmarkedArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();

  const horizontalPadding = 16;
  const minCardWidth = 320;
  const numColumns = Math.max(1, Math.min(3, Math.floor((width - horizontalPadding * 2) / minCardWidth)));

  // Load bookmarked articles
  useEffect(() => {
    const loadBookmarkedArticles = async () => {
      if (!session?.access_token) {
        setBookmarkedArticles([]);
        setLoading(false);
        return;
      }

      if (bookmarkedGuideIds.size === 0) {
        setBookmarkedArticles([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/legal/articles`);

        if (response.ok) {
          const data = await response.json();
          const articles = data.data || [];
          
          const bookmarked: ArticleItem[] = articles
            .filter((article: any) => bookmarkedGuideIds.has(article.id))
            .map((article: any) => ({
              id: article.id,
              title: article.title_en || article.title,
              summary: article.description_en || article.description,
              category: article.category,
              isBookmarked: true,
            }));
          
          setBookmarkedArticles(bookmarked);
        }
      } catch (error) {
        console.error("Error loading bookmarked articles:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBookmarkedArticles();
  }, [bookmarkedGuideIds, session?.access_token]);

  // Filter bookmarked articles by category and search
  const filteredArticles = useMemo(() => {
    let filtered = bookmarkedArticles;

    // Filter by category
    if (activeCategory !== "all") {
      filtered = filtered.filter((a) => a.category?.toLowerCase() === activeCategory);
    }

    // Filter by search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((a) =>
        `${a.title}`.toLowerCase().includes(query) || `${a.summary}`.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [bookmarkedArticles, activeCategory, searchQuery]);

  const handleCategoryChange = (categoryId: string): void => {
    setActiveCategory(categoryId);
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 50);
  };

  const handleArticlePress = (item: ArticleItem): void => {
    router.push(`/article/${item.id}` as any);
  };

  const renderListHeader = () => (
    <View>
      <HStack className="items-center mb-4 px-5">
        <Ionicons name="bookmarks" size={16} color={Colors.text.sub} />
        <GSText size="sm" bold className="ml-2" style={{ color: Colors.text.sub }}>
          Filter by Category
        </GSText>
      </HStack>
      <CategoryScroller activeCategory={activeCategory} onCategoryChange={handleCategoryChange} includeAllOption />

      {/* Results Info */}
      <View style={tw`px-5 mb-3`}>
        <HStack className="items-center justify-between">
          <GSText size="sm" style={{ color: Colors.text.sub }}>
            {filteredArticles.length} {filteredArticles.length === 1 ? 'result' : 'results'}
            {activeCategory !== "all" && ` in ${activeCategory}`}
            {searchQuery && ` for "${searchQuery}"`}
          </GSText>
          {filteredArticles.length > 1 && (
            <HStack className="items-center">
              <SortAsc size={14} color={Colors.text.sub} />
              <GSText size="xs" className="ml-1" style={{ color: Colors.text.sub }}>
                A-Z
              </GSText>
            </HStack>
          )}
        </HStack>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={[tw`flex-1 items-center justify-center`, { paddingHorizontal: 16 }]}> 
      <GSText size="lg" bold className="mb-2" style={{ color: Colors.text.head }}>
        No Bookmarked Guides Yet
      </GSText>
      <GSText size="sm" className="mb-4 text-center" style={{ color: Colors.text.sub }}>
        Save helpful legal guides to access them quickly here.
      </GSText>
      <Button 
        title="Browse Legal Guides"
        onPress={() => router.push('/guides')} 
        variant="primary"
      />
    </View>
  );

  return (
    <AuthGuard requireAuth={true}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
        <Header title="Bookmarked Guides" showMenu={true} />

      <View style={{ paddingHorizontal: 20 }}>
        <UnifiedSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search your bookmarked guides"
          loading={loading}
          containerClassName="pt-6 pb-4"
        />
      </View>

      {loading ? (
        <ArticleCardSkeletonList count={3} containerStyle={{ width: "100%", marginHorizontal: 0 }} />
      ) : bookmarkedArticles.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredArticles}
          key={`${numColumns}-${activeCategory}`}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={
            <View style={[tw`items-center py-12`, { paddingHorizontal: 16 }]}> 
              <Filter size={32} color={Colors.text.sub} strokeWidth={1.5} />
              <GSText size="md" className="mt-4 text-center" style={{ color: Colors.text.sub }}>
                No guides match your current filters
              </GSText>
              <GSText size="sm" className="mt-2 text-center" style={{ color: Colors.text.sub }}>
                Try adjusting your search or category filter
              </GSText>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 20, flexGrow: 1 }}
          columnWrapperStyle={numColumns > 1 ? { justifyContent: "space-between" } : undefined}
          renderItem={({ item }) => (
            <ArticleCard
              item={item}
              onPress={handleArticlePress}
              onToggleBookmark={() => {}}
              containerStyle={{ 
                width: numColumns > 1 ? (width - horizontalPadding * 2 - 12) / numColumns : "100%", 
                marginHorizontal: 0,
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          initialNumToRender={6}
          windowSize={8}
        />
      )}

        <Navbar />
        <SidebarWrapper />
      </SafeAreaView>
    </AuthGuard>
  );
}
