import React, { useMemo, useRef, useState } from "react";
import { View, FlatList, useWindowDimensions } from "react-native";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import CategoryScroller from "@/components/glossary/CategoryScroller";
import Navbar from "@/components/Navbar";
import { SidebarWrapper } from "@/components/AppSidebar";
import { ArticleCard, ArticleItem } from "@/components/guides/ArticleCard";
import { useLegalArticles } from "@/hooks/useLegalArticles";
import Button from "@/components/ui/Button";
import { Filter, SortAsc } from "lucide-react-native";

export default function BookmarkedGuidesScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();

  const horizontalPadding = 24;
  const minCardWidth = 320;
  const numColumns = Math.max(1, Math.min(3, Math.floor((width - horizontalPadding * 2) / minCardWidth)));

  // Use real articles from the hook instead of placeholders
  const { articles: realArticles } = useLegalArticles();
  
  // For now, simulate a set of bookmarked IDs. Later, wire this to persisted user data.
  const bookmarkedIds = useMemo(() => new Set<string>([]), []); // Empty for now - no placeholders

  // All bookmarked guides regardless of category/search
  const allBookmarkedArticles: ArticleItem[] = useMemo(() => {
    return realArticles
      .filter((a: ArticleItem) => bookmarkedIds.has(a.id))
      .map((a: ArticleItem) => ({ ...a, isBookmarked: true }));
  }, [realArticles, bookmarkedIds]);

  // Narrow to current category from already-bookmarked
  const filteredByCategory = useMemo(() => {
    return allBookmarkedArticles.filter((a) =>
      activeCategory === "all" ? true : a.category?.toLowerCase() === activeCategory
    );
  }, [allBookmarkedArticles, activeCategory]);

  // Apply search on top of category
  const bookmarkedArticles: ArticleItem[] = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return filteredByCategory;
    return filteredByCategory.filter((a) =>
      `${a.title}`.toLowerCase().includes(query) || `${a.summary}`.toLowerCase().includes(query)
    );
  }, [filteredByCategory, searchQuery]);

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
      <HStack className="items-center mb-4">
        <Ionicons name="bookmarks" size={16} color={Colors.text.sub} />
        <GSText size="sm" bold className="ml-2" style={{ color: Colors.text.sub }}>
          Filter by Category
        </GSText>
      </HStack>
      <CategoryScroller activeCategory={activeCategory} onCategoryChange={handleCategoryChange} includeAllOption />

      {/* Results Info (match Favorite Terms) */}
      <View style={tw`px-5 mb-3`}>
        <HStack className="items-center justify-between">
          <GSText size="sm" style={{ color: Colors.text.sub }}>
            {bookmarkedArticles.length} {bookmarkedArticles.length === 1 ? 'result' : 'results'}
            {activeCategory !== "all" && ` in ${activeCategory}`}
            {searchQuery && ` for "${searchQuery}"`}
          </GSText>
          {bookmarkedArticles.length > 1 && (
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
    <View style={[tw`flex-1 items-center justify-center`, { paddingHorizontal: 24 }]}> 
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
    <View style={tw`flex-1 bg-gray-50`}>
      <Header title="Bookmarked Guides" showMenu={true} />

      <Box className="px-6 pt-6 mb-4">
        <Input variant="outline" size="lg" className="bg-white rounded-lg border border-gray-300">
          <InputSlot className="pl-3">
            <Ionicons name="search" size={20} color="#9CA3AF" />
          </InputSlot>
          <InputField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search your bookmarked guides"
            placeholderTextColor="#9CA3AF"
            className="text-[#313131]"
          />
        </Input>
      </Box>

      {allBookmarkedArticles.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          ref={flatListRef}
          data={bookmarkedArticles}
          key={`${numColumns}-${activeCategory}`}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={
            <View style={[tw`items-center py-12`, { paddingHorizontal: 24 }]}> 
              <Filter size={32} color={Colors.text.sub} strokeWidth={1.5} />
              <GSText size="md" className="mt-4 text-center" style={{ color: Colors.text.sub }}>
                No guides match your current filters
              </GSText>
              <GSText size="sm" className="mt-2 text-center" style={{ color: Colors.text.sub }}>
                Try adjusting your search or category filter
              </GSText>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80, flexGrow: 1 }}
          columnWrapperStyle={numColumns > 1 ? { justifyContent: "space-between" } : undefined}
          renderItem={({ item }) => (
            <ArticleCard
              item={item}
              onPress={handleArticlePress}
              onToggleBookmark={() => {}}
              containerStyle={{ width: numColumns > 1 ? (width - horizontalPadding * 2 - 12) / numColumns : "100%", marginHorizontal: 0 }}
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
    </View>
  );
}
