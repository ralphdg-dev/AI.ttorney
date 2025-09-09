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
import ArticleCard, { ArticleItem } from "@/components/guides/ArticleCard";
import { Button, ButtonText } from "@/components/ui/button";
import { Filter } from "lucide-react-native";

export default function BookmarkedGuidesScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();

  const horizontalPadding = 24;
  const minCardWidth = 320;
  const numColumns = Math.max(1, Math.min(3, Math.floor((width - horizontalPadding * 2) / minCardWidth)));

  // Reuse placeholder articles from Guides, mirroring the look and feel
  const placeholderArticles: ArticleItem[] = useMemo(
    () => [
      {
        id: "1",
        title: "How Annulment Works in the Philippines",
        filipinoTitle: "Paano Gumagana ang Annulment sa Pilipinas",
        summary:
          "Understand the legal grounds, procedure, timeline, and costs involved in filing for annulment in the Philippines.",
        filipinoSummary:
          "Alamin ang mga batayan, proseso, tagal, at gastos sa paghahain ng annulment sa Pilipinas.",
        imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80&auto=format&fit=crop",
        category: "Family",
      },
      {
        id: "2",
        title: "Employee Rights During Probationary Period",
        filipinoTitle: "Mga Karapatan ng Empleyado sa Panahon ng Probation",
        summary:
          "A quick guide to rights, obligations, and due process for probationary employees and employers.",
        filipinoSummary:
          "Mabilisang gabay sa mga karapatan, obligasyon, at due process para sa probationary na empleyado at employer.",
        imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80&auto=format&fit=crop",
        category: "Work",
      },
      {
        id: "a3",
        title: "Small Claims: When and How to File",
        filipinoTitle: "Small Claims: Kailan at Paano Maghain",
        summary:
          "Learn eligibility, filing steps, fees, and what to expect in small claims court.",
        filipinoSummary:
          "Alamin ang kwalipikasyon, mga hakbang sa paghahain, bayarin, at inaasahan sa small claims court.",
        image: require("@/assets/images/guides-placeholder/small-claims.png"),
        category: "Civil",
      },
      {
        id: "a4",
        title: "What To Do If You're Arrested",
        filipinoTitle: "Ano ang Gagawin Kung Maaresto",
        summary:
          "Immediate steps to protect your rights, from invoking counsel to handling searches and seizures.",
        filipinoSummary:
          "Agarang mga hakbang para protektahan ang iyong karapatan, mula sa paghingi ng abogado hanggang sa pagharap sa paghahalughog at pagsamsam.",
        image: require("@/assets/images/guides-placeholder/arrest.jpg"),
        category: "Criminal",
      },
      {
        id: "a5",
        title: "Consumer Warranty Basics",
        filipinoTitle: "Mga Batayan ng Consumer Warranty",
        summary:
          "Know the difference between express and implied warranties and how to file a claim.",
        filipinoSummary:
          "Alamin ang pagkakaiba ng express at implied warranty at kung paano maghain ng reklamo.",
        imageUrl: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=1200&q=80&auto=format&fit=crop",
        category: "Consumer",
      },
    ],
    []
  );

  // For now, simulate a set of bookmarked IDs. Later, wire this to persisted user data.
  const bookmarkedIds = useMemo(() => new Set(["1", "a4"]), []);

  // All bookmarked guides regardless of category/search
  const allBookmarkedArticles: ArticleItem[] = useMemo(() => {
    return placeholderArticles
      .filter((a) => bookmarkedIds.has(a.id))
      .map((a) => ({ ...a, isBookmarked: true }));
  }, [placeholderArticles, bookmarkedIds]);

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
      <Button onPress={() => router.push('/guides')} style={{ backgroundColor: Colors.primary.blue }}>
        <ButtonText>Browse Legal Guides</ButtonText>
      </Button>
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

      <Navbar activeTab="learn" />
    </View>
  );
}
