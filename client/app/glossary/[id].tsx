import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Alert,
  StatusBar,
  Animated,
  Pressable,
  ActivityIndicator,
} from "react-native";
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
  const [term, setTerm] = useState<GlossaryTerm | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scrollY] = useState(new Animated.Value(0));

  const getDynamicLineHeight = (text: string, baseSize: number) => {
    const charCount = text.length;
    const lineHeightIncrease = Math.floor(charCount / 50);
    const minLineHeight = baseSize * 1.2; // 120% of font size
    const maxLineHeight = baseSize * 1.8; // 180% of font size
    const newHeight = baseSize + lineHeightIncrease;

    return Math.min(Math.max(newHeight, minLineHeight), maxLineHeight);
  };

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

  const toggleFavorite = async () => {
    try {
      setIsFavorite(!isFavorite);
      // Note: NEED PA IKONEK SA USER
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setIsFavorite(!isFavorite);
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
      <View style={tw`flex-1 bg-gray-50`}>
        <View
          style={[
            tw`flex-row items-center justify-between px-5 bg-white`,
            { paddingTop: 50, paddingBottom: 16 },
          ]}
        >
          <BackButton onPress={handleBack} color={Colors.primary.blue} />
          <GSText size="lg" bold style={{ color: Colors.primary.blue }}>
            Loading...
          </GSText>
          <View style={{ width: 38 }} />
        </View>
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={Colors.primary.blue} />
          <GSText className="mt-4" style={{ color: Colors.text.sub }}>
            Loading term details...
          </GSText>
        </View>
      </View>
    );
  }

  if (!term) {
    return (
      <View style={tw`flex-1 bg-gray-50`}>
        <View
          style={[
            tw`flex-row items-center justify-between px-5 bg-white`,
            { paddingTop: 50, paddingBottom: 16 },
          ]}
        >
          <BackButton onPress={handleBack} color={Colors.primary.blue} />
          <GSText size="lg" bold style={{ color: Colors.primary.blue }}>
            Term Not Found
          </GSText>
          <View style={{ width: 38 }} />
        </View>
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <GSText
            className="text-center mb-4"
            style={{ color: Colors.text.sub }}
          >
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
    <View style={tw`flex-1 bg-gray-100`}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header with term name */}
      <View
        style={[
          tw`flex-row items-center justify-between px-4 bg-white`,
          {
            paddingTop: 50,
            paddingBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          },
        ]}
      >
        <BackButton onPress={handleBack} color={Colors.primary.blue} />
        <GSText
          size="lg"
          bold
          style={{
            color: Colors.primary.blue,
            flex: 1,
            textAlign: "center",
            marginHorizontal: 8,
          }}
        >
          {term?.term_en || "Legal Term"}
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
        style={[tw`flex-1`, { backgroundColor: "#F9FAFB" }]}
        contentContainerStyle={tw`pb-20`}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Main Content Card */}
        <View style={tw`bg-white mx-3 mt-2 rounded-lg shadow-sm`}>
          {/* Term Header Section */}
          <View style={tw`px-4 pt-4 pb-3 border-b border-gray-100`}>
            <GSText
              size="xl"
              bold
              className="mb-1"
              style={{ color: Colors.text.head }}
            >
              {term.term_en}
            </GSText>
            {term.term_fil && (
              <GSText
                size="md"
                className="mb-2"
                style={{ color: Colors.primary.blue, fontWeight: "500" }}
              >
                {term.term_fil}
              </GSText>
            )}
            {term.category && (
              <Badge
                variant="outline"
                className={`self-start rounded-md ${
                  getCategoryBadgeClasses(term.category).container
                }`}
              >
                <BadgeText
                  size="sm"
                  className={getCategoryBadgeClasses(term.category).text}
                >
                  {term.category}
                </BadgeText>
              </Badge>
            )}
          </View>

          {/* English Definition */}
          <View style={tw`px-4 py-4 border-b border-gray-100`}>
            <HStack className="items-center mb-2">
              <Globe size={16} color={Colors.primary.blue} />
              <GSText
                size="md"
                bold
                className="ml-2"
                style={{ color: Colors.text.head }}
              >
                Definition
              </GSText>
            </HStack>
            <GSText
              size="sm"
              style={{
                color: Colors.text.head,
              }}
            >
              {term.definition_en}
            </GSText>
          </View>

          {/* Filipino Definition */}
          {term.definition_fil && (
            <View style={tw`px-4 py-4 border-b border-gray-100`}>
              <HStack className="items-center mb-2">
                <Globe size={16} color={Colors.primary.blue} />
                <GSText
                  size="md"
                  bold
                  className="ml-2"
                  style={{ color: Colors.text.head }}
                >
                  Kahulugan sa Filipino
                </GSText>
              </HStack>
              <GSText
                size="sm"
                style={{
                  color: Colors.text.head,
                }}
              >
                {term.definition_fil}
              </GSText>
            </View>
          )}

          {/* Examples Section */}
          {(term.example_en || term.example_fil) && (
            <View style={tw`px-4 py-4`}>
              <HStack className="items-center mb-3">
                <BookOpen size={16} color={Colors.primary.blue} />
                <GSText
                  size="md"
                  bold
                  className="ml-2"
                  style={{ color: Colors.text.head }}
                >
                  Examples
                </GSText>
              </HStack>

              {term.example_en && (
                <View style={tw`mb-3`}>
                  <GSText
                    size="sm"
                    bold
                    className="mb-1"
                    style={{ color: Colors.text.sub }}
                  >
                    English Example:
                  </GSText>
                  <View
                    style={[
                      tw`p-3 rounded-lg`,
                      {
                        backgroundColor: "#F8FAFC",
                        borderLeftWidth: 3,
                        borderLeftColor: Colors.primary.blue,
                      },
                    ]}
                  >
                    <GSText
                      size="sm"
                      className="italic"
                      style={{
                        color: Colors.text.head,
                      }}
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
                    className="mb-1"
                    style={{ color: Colors.text.sub }}
                  >
                    Halimbawa sa Filipino:
                  </GSText>
                  <View
                    style={[
                      tw`p-3 rounded-lg`,
                      {
                        backgroundColor: "#F0F9FF",
                        borderLeftWidth: 3,
                        borderLeftColor: Colors.primary.blue,
                      },
                    ]}
                  >
                    <GSText
                      size="sm"
                      className="italic"
                      style={{ color: Colors.text.head }}
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