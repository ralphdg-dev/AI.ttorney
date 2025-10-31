import React, { useState, useEffect, useCallback } from "react";
import { View, Alert, StatusBar, Animated, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { shouldUseNativeDriver } from '@/utils/animations';
import { useRouter } from "expo-router";
import tw from "tailwind-react-native-classnames";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button/";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Box } from "@/components/ui/box";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import {
  SidebarWrapper,
} from "@/components/AppSidebar";
import Colors from "@/constants/Colors";
import { Star, Filter, SortAsc } from "lucide-react-native";
import TermListItem, { TermItem } from "@/components/glossary/TermListItem";
import CategoryScroller from "@/components/glossary/CategoryScroller";
import { useFavorites } from "@/contexts/FavoritesContext";

// Sample favorite terms data - replace with actual API call
const sampleFavoriteTerms: TermItem[] = [
  {
    id: "1",
    title: "Annulment",
    definition: "A court declaration that a marriage is invalid from the start, as if it never existed. Unlike divorce, which ends a valid marriage, annulment treats the marriage as if it was never legally valid.",
    isFavorite: true,
    filipinoTerm: "Pagpapawalang-bisa",
    category: "Family"
  },
  {
    id: "2",
    title: "Employment Contract",
    definition: "A legal agreement between a landlord and tenant that outlines the terms and conditions for renting a property.",
    isFavorite: true,
    filipinoTerm: "Kontrata sa Trabaho",
    category: "Work"
  },
  {
    id: "3",
    title: "Habeas Corpus",
    definition: "A legal writ requiring law enforcement to bring a prisoner before the court to determine if the person's imprisonment or detention is lawful.",
    isFavorite: true,
    filipinoTerm: "Habeas Corpus",
    category: "Criminal"
  },
  {
    id: "4",
    title: "Power of Attorney",
    definition: "A legal document that allows someone to make decisions on behalf of another person when they become unable to make decisions for themselves.",
    isFavorite: true,
    filipinoTerm: "Kapangyarihan ng Abogado",
    category: "Civil"
  },
  {
    id: "5",
    title: "Consumer Protection",
    definition: "Laws and regulations designed to protect buyers of goods and services from unfair business practices and defective products.",
    isFavorite: true,
    filipinoTerm: "Proteksyon sa Mamimili",
    category: "Consumer"
  }
];

export default function FavoritesScreen() {
  const router = useRouter();
  const { favoriteTermIds, loadFavorites } = useFavorites();
  const [filteredTerms, setFilteredTerms] = useState<TermItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [scrollY] = useState(new Animated.Value(0));

  // Get favorite terms from sample data based on favoriteTermIds - MEMOIZED to prevent infinite loop
  const favoriteTerms = React.useMemo(() => 
    sampleFavoriteTerms.filter(term => favoriteTermIds.has(term.id)),
    [favoriteTermIds]
  );

  const loadFavoriteTerms = useCallback(async () => {
    try {
      setLoading(true);
      await loadFavorites();
    } catch (error) {
      console.error("Error loading favorite terms:", error);
      Alert.alert("Error", "Failed to load favorite terms");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // loadFavorites is stable, no need in deps

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavoriteTerms();
    setRefreshing(false);
  }, [loadFavoriteTerms]);

  useEffect(() => {
    loadFavoriteTerms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Filter terms based on search query and category
  useEffect(() => {
    let filtered = favoriteTerms;

    // Filter by category
    if (activeCategory !== "all") {
      filtered = filtered.filter(term => 
        term.category?.toLowerCase() === activeCategory.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(term =>
        term.title.toLowerCase().includes(query) ||
        term.definition.toLowerCase().includes(query) ||
        term.filipinoTerm?.toLowerCase().includes(query)
      );
    }

    setFilteredTerms(filtered);
  }, [favoriteTerms, searchQuery, activeCategory]);


  const handleTermPress = (term: TermItem) => {
    router.push(`/glossary/${term.id}`);
  };



  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
        <Header
          title="Favorite Terms"
          showMenu={true}
        />
        <View style={tw`flex-1 items-center justify-center`}>
          <GSText>Loading your favorite terms...</GSText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      
      {/* Header */}
      <Header
        title="Favorite Terms"
        showMenu={true}
      />

      {/* Search Bar (match Bookmarked Guides styling) */}
      {favoriteTerms.length > 0 && (
        <Box className="px-6 pt-6 mb-4">
          <Input variant="outline" size="lg" className="bg-white rounded-lg border border-gray-300">
            <InputSlot className="pl-3">
              <Ionicons name="search" size={20} color="#9CA3AF" />
            </InputSlot>
            <InputField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search your favorite terms"
              placeholderTextColor="#9CA3AF"
              className="text-[#313131]"
            />
          </Input>
        </Box>
      )}

      {favoriteTerms.length === 0 ? (
        // Empty State
        <View style={[tw`flex-1 items-center justify-center px-8`, { marginTop: -60 }]}>
          <View style={[tw`w-24 h-24 rounded-full items-center justify-center mb-6`, { backgroundColor: '#F0F9FF' }]}>
            <Star size={40} color={Colors.primary.blue} strokeWidth={1.5} />
          </View>
          <GSText size="lg" bold className="text-center mb-3" style={{ color: Colors.text.head }}>
            No Favorite Terms Yet
          </GSText>
          <GSText size="sm" className="text-center mb-6 leading-6" style={{ color: Colors.text.sub }}>
            Start building your personal legal dictionary by adding terms to your favorites. 
            Tap the star icon on any term in the glossary to save it here.
          </GSText>
          <Button 
            onPress={() => router.push('/glossary')}
            style={{ backgroundColor: Colors.primary.blue }}
          >
            <ButtonText>Browse Legal Terms</ButtonText>
          </Button>
        </View>
      ) : (
        <Animated.ScrollView 
          style={[tw`flex-1`, { backgroundColor: '#F9FAFB' }]}
          contentContainerStyle={tw`pb-20`}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary.blue]}
              tintColor={Colors.primary.blue}
            />
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: shouldUseNativeDriver('transform') }
          )}
        >
          {/* Category Filter (match Bookmarked Guides header) */}
          <View style={tw`px-4`}>
            <HStack className="items-center mb-4">
              <Ionicons name="bookmarks" size={16} color={Colors.text.sub} />
              <GSText size="sm" bold className="ml-2" style={{ color: Colors.text.sub }}>
                Filter by Category
              </GSText>
            </HStack>
            <CategoryScroller
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              includeAllOption={true}
            />
          </View>

          {/* Results Info */}
          <View style={tw`px-5 mb-3`}>
            <HStack className="items-center justify-between">
              <GSText size="sm" style={{ color: Colors.text.sub }}>
                {filteredTerms.length} {filteredTerms.length === 1 ? 'result' : 'results'}
                {activeCategory !== "all" && ` in ${activeCategory}`}
                {searchQuery && ` for "${searchQuery}"`}
              </GSText>
              {filteredTerms.length > 1 && (
                <HStack className="items-center">
                  <SortAsc size={14} color={Colors.text.sub} />
                  <GSText size="xs" className="ml-1" style={{ color: Colors.text.sub }}>
                    A-Z
                  </GSText>
                </HStack>
              )}
            </HStack>
          </View>

          {/* Terms List */}
          <View style={tw`px-3`}>
            {filteredTerms.length === 0 ? (
              <View style={tw`items-center py-12`}>
                <Filter size={32} color={Colors.text.sub} strokeWidth={1.5} />
                <GSText size="md" className="mt-4 text-center" style={{ color: Colors.text.sub }}>
                  No terms match your current filters
                </GSText>
                <GSText size="sm" className="mt-2 text-center" style={{ color: Colors.text.sub }}>
                  Try adjusting your search or category filter
                </GSText>
              </View>
            ) : (
              filteredTerms.map((term) => (
                <TermListItem
                  key={term.id}
                  item={term}
                  onPress={handleTermPress}
                />
              ))
            )}
            {filteredTerms.length > 0 && (
              <View style={[tw`mt-1 mb-6`, { paddingHorizontal: 8 }]}> 
                <Button onPress={() => router.push('/glossary')} style={{ backgroundColor: Colors.primary.blue }}>
                  <ButtonText>Browse Legal Terms</ButtonText>
                </Button>
              </View>
            )}
          </View>

        </Animated.ScrollView>
      )}
      
      {/* Bottom Navigation */}
      <Navbar activeTab="learn" />
      <SidebarWrapper />
    </SafeAreaView>
  );
}
