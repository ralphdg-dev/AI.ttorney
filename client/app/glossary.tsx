import React, { useMemo, useState, useRef, useEffect } from "react";
import { View, FlatList, Alert, useWindowDimensions, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import tw from "tailwind-react-native-classnames";
import Header from "@/components/Header";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import ToggleGroup from "@/components/ui/ToggleGroup";
import CategoryScroller from "@/components/glossary/CategoryScroller";
import TermListItem, { TermItem } from "@/components/glossary/TermListItem";
import Colors from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { SidebarProvider, SidebarWrapper } from "@/components/AppSidebar";

// Supabase Configuration
import { createClient } from "@supabase/supabase-js";

// Use environment variables for secure access
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GlossaryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("terms");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const horizontalPadding = 24;
  const minCardWidth = 360;
  const numColumns = Math.max(1, Math.min(3, Math.floor((width - horizontalPadding * 2) / minCardWidth)));

  const tabOptions = [
    { id: "guides", label: "Legal Guides" },
    { id: "terms", label: "Legal Terms" },
  ];

  // Fetch legal terms directly from Supabase
const fetchLegalTerms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from("glossary_terms")
        .select("id, term_en, term_fil, definition_en, definition_fil, example_en, example_fil, category, created_at")
        .order("term_en", { ascending: true }); // Order by English term alphabetically

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }
      
      if (data) {
        const placeholderText = "wala pa HHAHHA";
        // Map the Supabase data fields to the local TermItem interface
        const formattedTerms: TermItem[] = data.map((item: any) => ({
          id: item.id,
          title: item.term_en || placeholderText,
          filipinoTerm: item.term_fil || placeholderText,
          definition: item.definition_en || placeholderText,
          filipinoDefinition: item.definition_fil || placeholderText,
          example: item.example_en || placeholderText,
          filipinoExample: item.example_fil || placeholderText,
          category: item.category || placeholderText,
        }));
        setTerms(formattedTerms);
      }
    } catch (err) {
      console.error("Error fetching legal terms from Supabase:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      
      Alert.alert(
        "Connection Error",
        `Could not fetch terms from Supabase. Error: ${errorMessage}`,
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegalTerms();
  }, []);

  const filteredByCategory = useMemo(() => {
    return terms.filter((t) =>
      activeCategory === "all" ? true : t.category?.toLowerCase() === activeCategory.toLowerCase()
    );
  }, [terms, activeCategory]);

  const termsToRender: TermItem[] = useMemo(() => {
    return filteredByCategory.filter((t) =>
      `${t.title} ${t.filipinoTerm ?? ""}`
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase())
    );
  }, [filteredByCategory, searchQuery]);

  const handleFilterPress = (): void => {
    Alert.alert("Filter", "Filter options");
  };

  const handleTermPress = (item: TermItem): void => {
    router.push(`/glossary/${item.id}` as any);
  };

  const handleCategoryChange = (categoryId: string): void => {
    setActiveCategory(categoryId);
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 50);
  };

  const handleRefresh = async (): Promise<void> => {
    await fetchLegalTerms();
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

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={tw`flex-1 justify-center items-center py-10`}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <GSText className="mt-4 text-center" style={{ color: Colors.text.sub }}>
            Loading legal terms...
          </GSText>
        </View>
      );
    }

    if (error) {
      return (
        <View style={tw`flex-1 justify-center items-center py-10 px-6`}>
          <Ionicons name="cloud-offline" size={48} color={Colors.text.sub} />
          <GSText className="mt-4 text-center font-bold" style={{ color: Colors.text.main }}>
            Connection Error
          </GSText>
          <GSText className="mt-2 text-center" style={{ color: Colors.text.sub }}>
            Unable to load legal terms. Please check your connection and try again.
          </GSText>
          <Box className="mt-4 px-4 py-2 bg-blue-500 rounded-lg" onTouchEnd={handleRefresh}>
            <GSText className="text-white font-semibold">Retry</GSText>
          </Box>
        </View>
      );
    }

    if (termsToRender.length === 0 && searchQuery.trim()) {
      return (
        <View style={tw`flex-1 justify-center items-center py-10`}>
          <Ionicons name="search" size={48} color={Colors.text.sub} />
          <GSText className="mt-4 text-center font-bold" style={{ color: Colors.text.main }}>
            No results found
          </GSText>
          <GSText className="mt-2 text-center" style={{ color: Colors.text.sub }}>
            Try adjusting your search terms or category filter.
          </GSText>
        </View>
      );
    }

    return (
      <View style={tw`flex-1 justify-center items-center py-10`}>
        <Ionicons name="book" size={48} color={Colors.text.sub} />
        <GSText className="mt-4 text-center font-bold" style={{ color: Colors.text.main }}>
          No terms available
        </GSText>
        <GSText className="mt-2 text-center" style={{ color: Colors.text.sub }}>
          Legal terms will appear here once loaded.
        </GSText>
      </View>
    );
  };

  const getItemLayout = (data: any, index: number) => {
    const ITEM_HEIGHT = 140;
    const HEADER_HEIGHT = 120;
    return {
      length: ITEM_HEIGHT,
      offset: HEADER_HEIGHT + ITEM_HEIGHT * Math.floor(index / numColumns),
      index,
    };
  };

  const onToggleChange = (id: string) => {
    setActiveTab(id);
    if (id === 'guides') {
      router.push('/guides');
    }
  };

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
              placeholder="Search legal terms..."
              placeholderTextColor="#9CA3AF"
              className="text-[#313131]"
              editable={!loading}
            />
            <InputSlot className="pr-3" onPress={handleFilterPress}>
              <Ionicons name="options" size={20} color={Colors.text.sub} />
            </InputSlot>
          </Input>
        </Box>

        <FlatList
          ref={flatListRef}
          data={termsToRender}
          key={`${numColumns}-${activeCategory}`}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          ListHeaderComponent={!loading && !error ? renderListHeader : undefined}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={{ 
            paddingHorizontal: 24, 
            paddingBottom: 80,
            flexGrow: 1
          }}
          columnWrapperStyle={numColumns > 1 ? { justifyContent: "space-between" } : undefined}
          renderItem={({ item }) => (
            <TermListItem
              item={item}
              onPress={handleTermPress}
              containerStyle={{ 
                width: numColumns > 1 ? (width - horizontalPadding * 2 - 12) / numColumns : "100%", 
                marginHorizontal: 0 
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          initialNumToRender={6}
          windowSize={8}
          getItemLayout={numColumns === 1 ? getItemLayout : undefined}
          refreshing={loading}
          onRefresh={handleRefresh}
        />

        <Navbar activeTab="learn" />
        <SidebarWrapper />
      </View>
    </SidebarProvider>
  );
}