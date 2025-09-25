import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Alert,
  StatusBar,
  Animated,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { HStack } from "@/components/ui/hstack";
import { Text as GSText } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Badge, BadgeText } from "@/components/ui/badge";
import BackButton from "@/components/ui/BackButton";
import Navbar from "@/components/Navbar";
import Colors from "@/constants/Colors";
import { Star, BookOpen, Globe } from "lucide-react-native";
import { useFavorites } from "@/contexts/FavoritesContext";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

interface GlossaryTerm {
  id: number;
  term_en: string;
  term_fil: string | null;
  definition_en: string;
  definition_fil: string | null;
  example_en: string | null;
  example_fil: string | null;
  category: string | null;
  created_at: string;
}

export default function TermDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [term, setTerm] = useState<GlossaryTerm | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollY] = useState(new Animated.Value(0));
  const { width } = useWindowDimensions();
  
  const isTermFavorite = isFavorite(id);
  
  // Responsive design breakpoints
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const maxContentWidth = isDesktop ? 800 : isTablet ? 600 : width - 24;

  const loadTerm = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/glossary/terms/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data) {
        setTerm(data);
      } else {
        Alert.alert("Error", "Term not found");
        router.back();
      }
    } catch (error) {
      console.error("Error loading term:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      
      Alert.alert(
        "Connection Error",
        `Could not fetch term from server. Error: ${errorMessage}`,
        [
          { text: "Retry", onPress: loadTerm },
          { text: "Go Back", onPress: () => router.back() },
        ]
      );
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadTerm();
  }, [loadTerm]);

  const handleBack = () => {
    router.push("/glossary");
  };



  const handleToggleFavorite = async () => {
    if (term) {
      await toggleFavorite(id, term.term_en);
    }
  };

  const getCategoryBadgeClasses = (category?: string | null) => {
    switch ((category || "").toLowerCase()) {
      case "family":
        return {
          container: "bg-rose-50 border-rose-200",
          text: "text-rose-700",
        };
      case "work":
        return {
          container: "bg-blue-50 border-blue-200",
          text: "text-blue-700",
        };
      case "civil":
        return {
          container: "bg-violet-50 border-violet-200",
          text: "text-violet-700",
        };
      case "criminal":
        return { container: "bg-red-50 border-red-200", text: "text-red-700" };
      case "consumer":
        return {
          container: "bg-emerald-50 border-emerald-200",
          text: "text-emerald-700",
        };
      default:
        return {
          container: "bg-gray-50 border-gray-200",
          text: "text-gray-700",
        };
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <View 
          className="flex-row items-center justify-between px-4 md:px-6 lg:px-8 bg-white"
          style={{ paddingTop: 50, paddingBottom: 16 }}
        >
          <BackButton onPress={handleBack} color={Colors.primary.blue} />
          <GSText size="lg" bold style={{ color: Colors.primary.blue }}>
            Loading...
          </GSText>
          <View style={{ width: 38 }} />
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary.blue} />
          <GSText className="mt-4 text-gray-600">
            Loading term details...
          </GSText>
        </View>
      </View>
    );
  }

  if (!term) {
    return (
      <View className="flex-1 bg-gray-50">
        <View
          className="flex-row items-center justify-between px-4 md:px-6 lg:px-8 bg-white"
          style={{ paddingTop: 50, paddingBottom: 16 }}
        >
          <BackButton onPress={handleBack} color={Colors.primary.blue} />
          <GSText size="lg" bold style={{ color: Colors.primary.blue }}>
            Term Not Found
          </GSText>
          <View style={{ width: 38 }} />
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <GSText className="text-center mb-4 text-gray-600">
            The requested term could not be found.
          </GSText>
          <Button onPress={handleBack}>
            <ButtonText>Go Back to Glossary</ButtonText>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header with term name */}
      <View
        className="flex-row items-center justify-between px-4 md:px-6 lg:px-8 bg-white shadow-sm"
        style={{
          paddingTop: 50,
          paddingBottom: 16,
        }}
      >
        <BackButton onPress={handleBack} color={Colors.primary.blue} />
        <GSText
          size="lg"
          bold
          className="flex-1 text-center mx-2 md:text-xl lg:text-2xl"
          style={{ color: Colors.primary.blue }}
        >
          {term?.term_en || "Legal Term"}
        </GSText>
        <Pressable onPress={handleToggleFavorite} className="p-2">
          <Star
            size={22}
            color={isTermFavorite ? "#F59E0B" : "#9CA3AF"}
            fill={isTermFavorite ? "#F59E0B" : "none"}
          />
        </Pressable>
      </View>

      <Animated.ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ 
          paddingBottom: 100,
          alignItems: 'center',
          paddingHorizontal: isDesktop ? 0 : 12
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Main Content Card - Responsive width */}
        <View 
          className="bg-white mt-4 rounded-xl shadow-sm border border-gray-100"
          style={{ 
            width: maxContentWidth,
            maxWidth: '100%'
          }}
        >
          {/* Term Header Section */}
          <View className="px-4 md:px-6 lg:px-8 pt-6 pb-4 border-b border-gray-100">
            <GSText
              size="xl"
              bold
              className="mb-2 md:text-2xl lg:text-3xl text-gray-900"
            >
              {term.term_en}
            </GSText>
            {term.term_fil && (
              <GSText
                size="md"
                className="mb-3 md:text-lg lg:text-xl font-medium"
                style={{ color: Colors.primary.blue }}
              >
                {term.term_fil}
              </GSText>
            )}
            {term.category && (
              <Badge
                variant="outline"
                className={`self-start rounded-lg ${
                  getCategoryBadgeClasses(term.category).container
                }`}
              >
                <BadgeText
                  size="sm"
                  className={`${getCategoryBadgeClasses(term.category).text} md:text-base`}
                >
                  {term.category}
                </BadgeText>
              </Badge>
            )}
          </View>

          {/* English Definition */}
          <View className="px-4 md:px-6 lg:px-8 py-5 md:py-6 border-b border-gray-100">
            <HStack className="items-center mb-3">
              <Globe size={18} color={Colors.primary.blue} className="md:w-5 md:h-5" />
              <GSText
                size="md"
                bold
                className="ml-2 md:text-lg lg:text-xl text-gray-900"
              >
                Definition
              </GSText>
            </HStack>
            <GSText
              size="sm"
              className="md:text-base lg:text-lg text-gray-800 leading-relaxed"
            >
              {term.definition_en}
            </GSText>
          </View>

          {/* Filipino Definition */}
          {term.definition_fil && (
            <View className="px-4 md:px-6 lg:px-8 py-5 md:py-6 border-b border-gray-100">
              <HStack className="items-center mb-3">
                <Globe size={18} color={Colors.primary.blue} className="md:w-5 md:h-5" />
                <GSText
                  size="md"
                  bold
                  className="ml-2 md:text-lg lg:text-xl text-gray-900"
                >
                  Kahulugan sa Filipino
                </GSText>
              </HStack>
              <GSText
                size="sm"
                className="md:text-base lg:text-lg text-gray-800 leading-relaxed"
              >
                {term.definition_fil}
              </GSText>
            </View>
          )}

          {/* Examples Section */}
          {(term.example_en || term.example_fil) && (
            <View className="px-4 md:px-6 lg:px-8 py-5 md:py-6">
              <HStack className="items-center mb-4">
                <BookOpen size={18} color={Colors.primary.blue} className="md:w-5 md:h-5" />
                <GSText
                  size="md"
                  bold
                  className="ml-2 md:text-lg lg:text-xl text-gray-900"
                >
                  Examples
                </GSText>
              </HStack>

              {term.example_en && (
                <View className="mb-4">
                  <GSText
                    size="sm"
                    bold
                    className="mb-2 md:text-base text-gray-700"
                  >
                    English Example:
                  </GSText>
                  <View className="p-4 md:p-5 rounded-lg bg-slate-50 border-l-4 border-blue-500">
                    <GSText
                      size="sm"
                      className="italic md:text-base lg:text-lg text-gray-800 leading-relaxed"
                    >
                      &quot;{term.example_en}&quot;
                    </GSText>
                  </View>
                </View>
              )}

              {term.example_fil && (
                <View>
                  <GSText
                    size="sm"
                    bold
                    className="mb-2 md:text-base text-gray-700"
                  >
                    Halimbawa sa Filipino:
                  </GSText>
                  <View className="p-4 md:p-5 rounded-lg bg-blue-50 border-l-4 border-blue-500">
                    <GSText
                      size="sm"
                      className="italic md:text-base lg:text-lg text-gray-800 leading-relaxed"
                    >
                      &quot;{term.example_fil}&quot;
                    </GSText>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      <Navbar activeTab="learn" />
    </View>
  );
}