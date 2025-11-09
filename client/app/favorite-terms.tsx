import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Alert, StatusBar, Animated, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { shouldUseNativeDriver } from '@/utils/animations';
import { useRouter } from "expo-router";
import tw from "tailwind-react-native-classnames";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button/";
import UnifiedSearchBar from "@/components/common/UnifiedSearchBar";
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
import { NetworkConfig } from '@/utils/networkConfig';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = NetworkConfig.getApiUrl();

export default function FavoritesScreen() {
  const router = useRouter();
  const { loadFavorites } = useFavorites();
  const { session } = useAuth();
  const [favoriteTerms, setFavoriteTerms] = useState<TermItem[]>([]);
  const [filteredTerms, setFilteredTerms] = useState<TermItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [scrollY] = useState(new Animated.Value(0));

  const loadFavoriteTerms = useCallback(async () => {
    if (!session?.access_token) {
      setFavoriteTerms([]);
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/user/favorites/terms`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch favorites');

      const data = await response.json();
      
      const terms: TermItem[] = data
        .filter((fav: any) => fav.term)
        .map((fav: any) => ({
          id: fav.term.id.toString(),
          title: fav.term.term_en,
          definition: fav.term.definition_en,
          filipinoTerm: fav.term.term_fil,
          category: fav.term.category,
          isFavorite: true,
        }));
      
      setFavoriteTerms(terms);
      await loadFavorites(); // Sync context
    } catch (error) {
      console.error("Error loading favorites:", error);
      Alert.alert("Error", "Failed to load favorites");
    } finally {
      setLoading(false);
    }
  }, [session, loadFavorites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavoriteTerms();
    setRefreshing(false);
  }, [loadFavoriteTerms]);

  useEffect(() => {
    loadFavoriteTerms();
  }, [loadFavoriteTerms]);

  // Filter terms based on search query and category - MEMOIZED
  const filteredTerms = useMemo(() => {
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

    return filtered;
  }, [favoriteTerms, searchQuery, activeCategory]);


  const handleTermPress = useCallback((term: TermItem) => {
    router.push(`/glossary/${term.id}`);
  }, [router]);



  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
        <Header
          title="Favorite Terms"
          showMenu={true}
        />
        <View style={tw`items-center justify-center flex-1`}>
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

      {/* Search Bar */}
      {favoriteTerms.length > 0 && (
        <View style={{ paddingHorizontal: 20 }}>
          <UnifiedSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search your favorite terms"
            loading={loading}
            showFilterIcon={false}
            containerClassName="pt-6 pb-4"
          />
        </View>
      )}

      {favoriteTerms.length === 0 ? (
        // Empty State
        <View style={[tw`items-center justify-center flex-1 px-8`, { marginTop: -60 }]}>
          <View style={[tw`items-center justify-center w-24 h-24 mb-6 rounded-full`, { backgroundColor: '#F0F9FF' }]}>
            <Star size={40} color={Colors.primary.blue} strokeWidth={1.5} />
          </View>
          <GSText size="lg" bold className="mb-3 text-center" style={{ color: Colors.text.head }}>
            No Favorite Terms Yet
          </GSText>
          <GSText size="sm" className="mb-6 leading-6 text-center" style={{ color: Colors.text.sub }}>
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
          {/* Category Filter */}
          <View style={tw`px-5`}>
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
          <View style={tw`px-5`}>
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
    </SafeAreaView>
  );
}
