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
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();

  const horizontalPadding = 24;
  const minCardWidth = 320;
  const numColumns = Math.max(1, Math.min(3, Math.floor((width - horizontalPadding * 2) / minCardWidth)));

  // Use the custom hook to fetch legal articles from Supabase
  const { articles: legalArticles, loading, error, refetch, getArticlesByCategory } = useLegalArticles();

  // Locally controlled list for display, fed by server-side category filter
  const [displayArticles, setDisplayArticles] = useState<ArticleItem[]>([]);

  // Initialize from full list or reset when switching back to "all"
  useEffect(() => {
    if (activeCategory === "all") {
      setDisplayArticles(legalArticles);
    }
  }, [legalArticles, activeCategory]);

  const tabOptions = [
    { id: "guides", label: "Legal Guides" },
    { id: "terms", label: "Legal Terms" },
  ];

  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});

  const filteredByCategory = useMemo(() => {
    return displayArticles;
  }, [displayArticles]);

  const articlesToRender: ArticleItem[] = useMemo(() => {
    const searched = filteredByCategory.filter((a: ArticleItem) =>
      `${a.title}`.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      `${a.summary}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
    return searched.map((a: ArticleItem) => ({ ...a, isBookmarked: !!bookmarks[a.id] }));
  }, [filteredByCategory, searchQuery, bookmarks]);

  const handleFilterPress = (): void => {};


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
    if (id === 'terms') {
      router.push('/glossary');
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
            <InputSlot className="pr-3" onPress={handleFilterPress}>
              <Ionicons name="options" size={20} color={Colors.text.sub} />
            </InputSlot>
          </Input>
        </Box>

        {loading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <GSText size="lg" className="text-gray-500">Loading articles...</GSText>
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
          <FlatList
            ref={flatListRef}
            data={articlesToRender}
            key={`${numColumns}-${activeCategory}`}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80, flexGrow: 1 }}
            columnWrapperStyle={numColumns > 1 ? { justifyContent: "space-between" } : undefined}
            renderItem={({ item }) => (
              <ArticleCard
                item={item}
                onPress={handleArticlePress}
                onToggleBookmark={handleToggleBookmark}
                containerStyle={{ width: numColumns > 1 ? (width - horizontalPadding * 2 - 12) / numColumns : "100%", marginHorizontal: 0 }}
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
        )}

        <Navbar activeTab="learn" />
        <SidebarWrapper />
      </View>
    </SidebarProvider>
  );
}


