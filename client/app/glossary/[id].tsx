import React, { useState, useEffect, useCallback } from "react";
import { View, Alert, StatusBar, Animated, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import tw from "tailwind-react-native-classnames";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Badge, BadgeText } from "@/components/ui/badge";
import BackButton from "@/components/ui/BackButton";
import Navbar from "@/components/Navbar";
import Colors from "@/constants/Colors";
import { Star, BookOpen, Globe } from "lucide-react-native";
// import { db } from "@/lib/supabase";
import { Database } from "@/types/database.types";

type GlossaryTerm = Database["public"]["Tables"]["glossary_terms"]["Row"];

// Sample data matching the schema - replace with actual API call
const sampleTerms: GlossaryTerm[] = [
  {
    id: 1,
    term_en: "Annulment",
    term_fil: "Pagpapawalang-bisa",
    definition_en: "A court declaration that a marriage is invalid from the start, as if it never existed. Unlike divorce, which ends a valid marriage, annulment treats the marriage as if it was never legally valid.",
    definition_fil: "Isang pagpapahayag ng korte na ang kasal ay walang bisa mula pa sa simula, na parang hindi ito nangyari. Hindi tulad ng diborsyo na nagtatapos sa isang wastong kasal, ang annulment ay tumuturing sa kasal na parang hindi ito kailanman naging legal na wasto.",
    example_en: "Maria filed for annulment because her husband concealed his existing marriage, making their union void from the beginning.",
    example_fil: "Nag-file si Maria ng annulment dahil itinago ng kanyang asawa ang kanyang kasalukuyang kasal, na ginawang walang bisa ang kanilang unyon mula pa sa simula.",
    domain: "Family",
    view_count: 1250,
    created_at: "2024-01-15T08:00:00Z",
    updated_at: "2024-01-15T08:00:00Z"
  },
  {
    id: 2,
    term_en: "Employment Contract",
    term_fil: "Kontrata sa Trabaho",
    definition_en: "A legally binding agreement between employer and employee that sets out the terms and conditions of employment, including duties, compensation, benefits, and termination procedures.",
    definition_fil: "Isang legal na kasunduan sa pagitan ng employer at empleyado na nagtatatag ng mga tuntunin at kondisyon ng trabaho, kasama ang mga tungkulin, sahod, benepisyo, at pamamaraan ng pagtatapos.",
    example_en: "Before starting work, John signed an employment contract that specified his salary, working hours, and probationary period.",
    example_fil: "Bago magsimula sa trabaho, pumirma si John ng kontrata sa trabaho na nagtukoy sa kanyang sahod, oras ng trabaho, at probationary period.",
    domain: "Work",
    view_count: 890,
    created_at: "2024-01-16T09:30:00Z",
    updated_at: "2024-01-16T09:30:00Z"
  }
];

export default function TermDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [term, setTerm] = useState<GlossaryTerm | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scrollY] = useState(new Animated.Value(0));

  const loadTerm = useCallback(async () => {
    try {
      setLoading(true);
      // For now, use sample data. Replace with actual API call:
      // const { data, error } = await db.legal.glossary.get(parseInt(id));
      const foundTerm = sampleTerms.find(t => t.id === parseInt(id));
      
      if (foundTerm) {
        setTerm(foundTerm);
        // Increment view count (would be done server-side in real implementation)
        // await db.legal.glossary.update(foundTerm.id, { view_count: (foundTerm.view_count || 0) + 1 });
      } else {
        Alert.alert("Error", "Term not found");
        router.back();
      }
    } catch (error) {
      console.error("Error loading term:", error);
      Alert.alert("Error", "Failed to load term details");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadTerm();
  }, [loadTerm]);

  const handleBack = () => {
    router.push('/glossary');
  };



  const toggleFavorite = async () => {
    try {
      setIsFavorite(!isFavorite);
      // In real implementation, would call API to toggle favorite
      // if (isFavorite) {
      //   await db.userPreferences.favorites.delete(favoriteId);
      // } else {
      //   await db.userPreferences.favorites.create({ user_id: userId, glossary_id: term.id });
      // }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setIsFavorite(!isFavorite); // Revert on error
    }
  };

  const getCategoryBadgeClasses = (domain?: string | null) => {
    switch ((domain || '').toLowerCase()) {
      case 'family':
        return { container: 'bg-rose-50 border-rose-200', text: 'text-rose-700' };
      case 'work':
        return { container: 'bg-blue-50 border-blue-200', text: 'text-blue-700' };
      case 'civil':
        return { container: 'bg-violet-50 border-violet-200', text: 'text-violet-700' };
      case 'criminal':
        return { container: 'bg-red-50 border-red-200', text: 'text-red-700' };
      case 'consumer':
        return { container: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' };
      default:
        return { container: 'bg-gray-50 border-gray-200', text: 'text-gray-700' };
    }
  };

  if (loading) {
    return (
      <View style={tw`flex-1 bg-gray-50`}>
        <View style={[tw`flex-row items-center justify-between px-5`, { paddingTop: 44, paddingBottom: 16 }]}>
        <BackButton onPress={handleBack} color={Colors.primary.blue} />
        <GSText>Loading...</GSText>
      </View>
        <View style={tw`flex-1 items-center justify-center`}>
          <GSText>Loading term details...</GSText>
        </View>
      </View>
    );
  }

  if (!term) {
    return (
      <View style={tw`flex-1 bg-gray-50`}>
        <View style={[tw`flex-row items-center justify-between px-5`, { paddingTop: 44, paddingBottom: 16 }]}>
        <BackButton onPress={handleBack} color={Colors.primary.blue} />
        <GSText>Term Not Found</GSText>
      </View>
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <GSText className="text-center mb-4">The requested term could not be found.</GSText>
          <Button onPress={handleBack}>
            <ButtonText>Go Back</ButtonText>
          </Button>
        </View>
      </View>
    );
  }


  return (
    <View style={tw`flex-1 bg-gray-100`}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Simple Header */}
      <View style={[tw`flex-row items-center justify-between px-4 bg-white`, { paddingTop: 50, paddingBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]}>
        <BackButton onPress={handleBack} color={Colors.primary.blue} />
        <GSText size="lg" bold style={{ color: Colors.primary.blue }}>
          {term?.term_en || 'Legal Term'}
        </GSText>
        <Pressable onPress={toggleFavorite} style={tw`p-2`}>
          <Star
            size={22}
            color={isFavorite ? "#F59E0B" : "#9CA3AF"}
            fill={isFavorite ? "#F59E0B" : "none"}
          />
        </Pressable>
      </View>

      <Animated.ScrollView 
        style={[tw`flex-1`, { backgroundColor: '#F9FAFB' }]}
        contentContainerStyle={tw`pb-20`}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Single Content Card */}
        <View style={tw`bg-white mx-3 mt-2 rounded-lg`} className="shadow-sm">
          {/* Term Header */}
          <View style={tw`px-4 pt-4 pb-3 border-b border-gray-100`}>
            <GSText size="lg" bold className="mb-1" style={{ color: Colors.text.head }}>
              {term.term_en}
            </GSText>
            {term.term_fil && (
              <GSText size="sm" className="mb-2" style={{ color: Colors.primary.blue, fontWeight: '500' }}>
                {term.term_fil}
              </GSText>
            )}
            {term.domain && (
              <Badge
                variant="outline"
                className={`self-start rounded-md ${getCategoryBadgeClasses(term.domain).container}`}
              >
                <BadgeText size="sm" className={getCategoryBadgeClasses(term.domain).text}>
                  {term.domain}
                </BadgeText>
              </Badge>
            )}
          </View>

          {/* English Definition */}
          <View style={tw`px-4 py-3 border-b border-gray-100`}>
            <HStack className="items-center mb-2">
              <Globe size={16} color={Colors.primary.blue} />
              <GSText size="sm" bold className="ml-2" style={{ color: Colors.text.head }}>
                Definition
              </GSText>
            </HStack>
            <GSText size="sm" style={{ color: Colors.text.head }}>
              {term.definition_en}
            </GSText>
          </View>

          {/* Filipino Definition */}
          {term.definition_fil && (
            <View style={tw`px-4 py-3 border-b border-gray-100`}>
              <HStack className="items-center mb-2">
                <Globe size={16} color={Colors.primary.blue} />
                <GSText size="sm" bold className="ml-2" style={{ color: Colors.text.head }}>
                  Kahulugan sa Filipino
                </GSText>
              </HStack>
              <GSText size="sm" style={{ color: Colors.text.head }}>
                {term.definition_fil}
              </GSText>
            </View>
          )}

          {/* Examples Section */}
          {(term.example_en || term.example_fil) && (
            <View style={tw`px-4 py-3`}>
              <HStack className="items-center mb-2">
                <BookOpen size={16} color={Colors.primary.blue} />
                <GSText size="sm" bold className="ml-2" style={{ color: Colors.text.head }}>
                  Examples
                </GSText>
              </HStack>
              
              {term.example_en && (
                <View style={tw`mb-3`}>
                  <GSText size="xs" bold className="mb-1" style={{ color: Colors.text.sub }}>
                    English:
                  </GSText>
                  <View style={[tw`p-2 rounded-md`, { backgroundColor: '#F8FAFC', borderLeftWidth: 2, borderLeftColor: Colors.primary.blue }]}>
                    <GSText size="xs" className="italic" style={{ color: Colors.text.head }}>
                      &ldquo;{term.example_en}&rdquo;
                    </GSText>
                  </View>
                </View>
              )}
              
              {term.example_fil && (
                <View>
                  <GSText size="xs" bold className="mb-1" style={{ color: Colors.text.sub }}>
                    Filipino:
                  </GSText>
                  <View style={[tw`p-2 rounded-md`, { backgroundColor: '#F0F9FF', borderLeftWidth: 2, borderLeftColor: Colors.primary.blue }]}>
                    <GSText size="xs" className="italic" style={{ color: Colors.text.head }}>
                      &ldquo;{term.example_fil}&rdquo;
                    </GSText>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>
      
      {/* Bottom Navigation */}
      <Navbar activeTab="learn" />
    </View>
  );
}
