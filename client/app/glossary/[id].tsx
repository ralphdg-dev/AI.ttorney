import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Alert,
  StatusBar,
  Animated,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text as GSText } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button/";
import { Badge, BadgeText } from "@/components/ui/badge";
import { shouldUseNativeDriver } from '@/utils/animations';
import BackButton from "@/components/ui/BackButton";
import Navbar from "@/components/Navbar";
import { GuestNavbar } from "@/components/guest";
import Colors from "@/constants/Colors";
import { Star, BookOpen, Globe } from "lucide-react-native";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useGuest } from "../../contexts/GuestContext";
import { NetworkConfig } from "@/utils/networkConfig";

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
  const { isGuestMode } = useGuest();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [term, setTerm] = useState<GlossaryTerm | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollY] = useState(new Animated.Value(0));
  
  const isTermFavorite = isFavorite(id);

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

  const loadTerm = useCallback(async () => {
    try {
      setLoading(true);

      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/glossary/terms/${id}`);

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
    if (term && id) {
      await toggleFavorite(id, term.term_en);
    }
  };

  // Loading state
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

  // Error state
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

  // Main content
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* Header */}
      <View 
        className="flex-row items-center justify-between px-4 bg-white border-b border-gray-200"
        style={{ paddingBottom: 16 }}
      >
        <BackButton onPress={handleBack} color={Colors.primary.blue} />
        <GSText
          size="xl"
          bold
          className="flex-1 text-center mx-2"
          style={{ color: Colors.primary.blue, fontSize: 20 }}
        >
          {term?.term_en || "Legal Term"}
        </GSText>
        {!isGuestMode && (
          <Pressable onPress={handleToggleFavorite} className="p-2">
            <Star
              size={24}
              color={isTermFavorite ? "#F59E0B" : "#D1D5DB"}
              fill={isTermFavorite ? "#F59E0B" : "none"}
            />
          </Pressable>
        )}
        {isGuestMode && <View style={{ width: 38 }} />}
      </View>

      {/* Content */}
      <Animated.ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ 
          paddingBottom: 100,
          paddingHorizontal: 16,
          paddingTop: 16
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: shouldUseNativeDriver('transform') }
        )}
      >
        {/* Main Content Card */}
        <View 
          className="bg-white rounded-2xl shadow-sm p-6"
          style={{ 
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3
          }}
        >
          {/* Term Header */}
          <View className="mb-6">
            <GSText
              size="2xl"
              bold
              className="mb-2"
              style={{ fontSize: 28, color: '#111827' }}
            >
              {term.term_en}
            </GSText>
            {term.term_fil && (
              <GSText size="md" className="mb-3" style={{ color: '#6B7280', fontStyle: 'italic' }}>
                {term.term_fil}
              </GSText>
            )}
            {term.category && (
              <Badge 
                variant="outline"
                className={getCategoryBadgeClasses(term.category).container}
                style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 }}
              >
                <BadgeText 
                  className={getCategoryBadgeClasses(term.category).text}
                  style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}
                >
                  {term.category}
                </BadgeText>
              </Badge>
            )}
          </View>

          {/* Definition */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Globe size={20} color={Colors.primary.blue} />
              <GSText size="lg" bold className="ml-2" style={{ color: '#111827', fontSize: 18 }}>
                Definition
              </GSText>
            </View>
            <GSText size="md" className="mb-4" style={{ color: '#374151', ...(Platform.OS !== 'web' && { lineHeight: 24 }) }}>
              {term.definition_en}
            </GSText>
          </View>

          {/* Filipino Definition */}
          {term.definition_fil && (
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <Globe size={20} color={Colors.primary.blue} />
                <GSText size="lg" bold className="ml-2" style={{ color: '#111827', fontSize: 18 }}>
                  Kahulugan sa Filipino
                </GSText>
              </View>
              <GSText size="md" style={{ color: '#374151', ...(Platform.OS !== 'web' && { lineHeight: 24 }) }}>
                {term.definition_fil}
              </GSText>
            </View>
          )}

          {/* Examples */}
          {(term.example_en || term.example_fil) && (
            <View>
              <View className="flex-row items-center mb-3">
                <BookOpen size={20} color={Colors.primary.blue} />
                <GSText size="lg" bold className="ml-2" style={{ color: '#111827', fontSize: 18 }}>
                  Examples
                </GSText>
              </View>
              {term.example_en && (
                <View className="mb-4">
                  <GSText size="sm" bold className="mb-2" style={{ color: '#6B7280' }}>
                    English Example:
                  </GSText>
                  <View 
                    className="bg-blue-50 p-4 rounded-lg"
                    style={{ borderLeftWidth: 4, borderLeftColor: Colors.primary.blue }}
                  >
                    <GSText size="md" style={{ color: '#374151', fontStyle: 'italic', ...(Platform.OS !== 'web' && { lineHeight: 22 }) }}>
                      &ldquo;{term.example_en}&rdquo;
                    </GSText>
                  </View>
                </View>
              )}
              {term.example_fil && (
                <View>
                  <GSText size="sm" bold className="mb-2" style={{ color: '#6B7280' }}>
                    Halimbawa sa Filipino:
                  </GSText>
                  <View 
                    className="bg-blue-50 p-4 rounded-lg"
                    style={{ borderLeftWidth: 4, borderLeftColor: Colors.primary.blue }}
                  >
                    <GSText size="md" style={{ color: '#374151', fontStyle: 'italic', ...(Platform.OS !== 'web' && { lineHeight: 22 }) }}>
                      &ldquo;{term.example_fil}&rdquo;
                    </GSText>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {isGuestMode ? (
        <GuestNavbar activeTab="learn" />
      ) : (
        <Navbar activeTab="learn" />
      )}
    </SafeAreaView>
  );
}
