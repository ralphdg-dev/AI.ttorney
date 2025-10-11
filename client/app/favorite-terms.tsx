import React, { useState, useEffect, useCallback } from "react";
import { View, Alert, StatusBar, Animated, Pressable, RefreshControl, Platform } from "react-native";
import { useRouter } from "expo-router";
import tw from "tailwind-react-native-classnames";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text as GSText } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Box } from "@/components/ui/box";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import {
  SidebarProvider,
  SidebarWrapper,
} from "@/components/AppSidebar";
import Colors from "@/constants/Colors";
import { Star, Search, Heart, BookOpen, Filter, SortAsc } from "lucide-react-native";
import TermListItem, { TermItem } from "@/components/glossary/TermListItem";
import CategoryScroller from "@/components/glossary/CategoryScroller";
import { useFavorites } from "@/contexts/FavoritesContext";

// Sample favorite terms data - replace with actual API call
const sampleFavoriteTerms: TermItem[] = [
  {
    id: "1",
    title: "Annulment",
    summary: "A court declaration that a marriage is invalid from the start, as if it never existed. Unlike divorce, which ends a valid marriage, annulment treats the marriage as if it was never legally valid.",
    isFavorite: true,
    filipinoTerm: "Pagpapawalang-bisa",
    category: "Family"
  },
  {
    id: "2",
    title: "Employment Contract",
    summary: "A legally binding agreement between employer and employee that sets out the terms and conditions of employment, including duties, compensation, benefits, and termination procedures.",
    isFavorite: true,
    filipinoTerm: "Kontrata sa Trabaho",
    category: "Work"
  },
  {
    id: "3",
    title: "Habeas Corpus",
    summary: "A legal principle that protects against unlawful detention, requiring authorities to bring a detained person before a court to determine if their imprisonment is lawful.",
    isFavorite: true,
    filipinoTerm: "Habeas Corpus",
    category: "Criminal"
  },
  {
    id: "4",
    title: "Power of Attorney",
    summary: "A legal document that gives one person the authority to act on behalf of another person in legal or financial matters.",
    isFavorite: true,
    filipinoTerm: "Kapangyarihan ng Abogado",
    category: "Civil"
  },
  {
    id: "5",
    title: "Consumer Protection",
    summary: "Laws and regulations designed to protect buyers of goods and services from unfair business practices and defective products.",
    isFavorite: true,
    filipinoTerm: "Proteksyon sa Mamimili",
    category: "Consumer"
  }
];

export default function FavoritesScreen() {
  const router = useRouter();
  const { favoriteTermIds, toggleFavorite, getFavoriteCount, loadFavorites } = useFavorites();
  const [filteredTerms, setFilteredTerms] = useState<TermItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [scrollY] = useState(new Animated.Value(0));

  // Get favorite terms from sample data based on favoriteTermIds
  const favoriteTerms = sampleFavoriteTerms.filter(term => favoriteTermIds.has(term.id));

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
  }, [loadFavorites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavoriteTerms();
    setRefreshing(false);
  }, [loadFavoriteTerms]);

  useEffect(() => {
    loadFavoriteTerms();
  }, []); // Remove loadFavoriteTerms dependency to prevent infinite loop

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
        term.summary.toLowerCase().includes(query) ||
        term.filipinoTerm?.toLowerCase().includes(query)
      );
    }

    setFilteredTerms(filtered);
  }, [favoriteTerms, searchQuery, activeCategory]);

  const handleBack = () => {
    router.back();
  };

  const handleTermPress = (term: TermItem) => {
    router.push(`/glossary/${term.id}`);
  };

  const handleRemoveFromFavorites = async (termId: string) => {
    const term = favoriteTerms.find(t => t.id === termId);
    if (term) {
      await toggleFavorite(termId, term.title);
    }
  };

  const handleClearAllFavorites = () => {
    Alert.alert(
      "Clear All Favorites",
      "Are you sure you want to remove all terms from your favorites? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              // Remove all favorites one by one
              for (const term of favoriteTerms) {
                await toggleFavorite(term.id);
              }
              Alert.alert("Cleared", "All favorite terms have been removed");
            } catch (error) {
              Alert.alert("Error", "Failed to clear favorites");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={tw`flex-1 bg-gray-50`}>
        <Header
          title="Favorite Terms"
          showMenu={true}
        />
        <View style={tw`flex-1 items-center justify-center`}>
          <GSText>Loading your favorite terms...</GSText>
        </View>
      </View>
    );
  }

  return (
    <SidebarProvider>
      <View style={tw`flex-1 bg-gray-100`}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
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
            { useNativeDriver: Platform.OS !== 'web' }
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
      <Navbar />
      <SidebarWrapper />
    </View>
    </SidebarProvider>
  );
}
