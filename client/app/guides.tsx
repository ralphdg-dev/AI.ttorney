import React, { useMemo, useRef, useState } from "react";
import { View, FlatList, useWindowDimensions } from "react-native";
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

  const tabOptions = [
    { id: "guides", label: "Legal Guides" },
    { id: "terms", label: "Legal Terms" },
  ];

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

  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});

  const filteredByCategory = useMemo(() => {
    return placeholderArticles.filter((a) =>
      activeCategory === "all" ? true : a.category?.toLowerCase() === activeCategory
    );
  }, [placeholderArticles, activeCategory]);

  const articlesToRender: ArticleItem[] = useMemo(() => {
    const searched = filteredByCategory.filter((a) =>
      `${a.title}`.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      `${a.summary}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
    return searched.map((a) => ({ ...a, isBookmarked: !!bookmarks[a.id] }));
  }, [filteredByCategory, searchQuery, bookmarks]);

  const handleFilterPress = (): void => {};


  const handleCategoryChange = (categoryId: string): void => {
    setActiveCategory(categoryId);
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
        />

        <Navbar activeTab="learn" />
        <SidebarWrapper />
      </View>
    </SidebarProvider>
  );
}


