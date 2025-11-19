import React, { useEffect, useState, useCallback } from "react";
import { View, useWindowDimensions, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import Colors from "@/constants/Colors";
import Card from "@/components/ui/Card";
import { Heading } from "@/components/ui/heading";
import { Text as GSText } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Divider } from "@/components/ui/divider";
import { Accordion, AccordionContent, AccordionHeader, AccordionIcon, AccordionItem, AccordionTitleText, AccordionTrigger, AccordionContentText } from "@/components/ui/accordion";
import { Star, Languages, BookText, Quote } from "lucide-react-native";
import { CacheService, generateTermCacheKey } from "@/services/cacheService";
import { NetworkConfig } from "@/utils/networkConfig";

export interface TermDetailData {
  id: string;
  englishTerm: string;
  filipinoTerm: string;
  englishDefinition: string;
  filipinoDefinition: string;
  exampleUsage?: {
    english?: string;
    filipino?: string;
  };
  isFavorite?: boolean;
  category?: string;
}

interface TermDetailProps {
  termId: string;
}

export default function TermDetail({ termId }: TermDetailProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 800;
  const [term, setTerm] = useState<TermDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const formatTerm = (apiTerm: any): TermDetailData => {
    const placeholderText = "Information not available";
    return {
      id: apiTerm.id.toString(),
      englishTerm: apiTerm.term_en || placeholderText,
      filipinoTerm: apiTerm.term_fil || placeholderText,
      englishDefinition: apiTerm.definition_en || placeholderText,
      filipinoDefinition: apiTerm.definition_fil || placeholderText,
      exampleUsage: {
        english: apiTerm.example_en || undefined,
        filipino: apiTerm.example_fil || undefined,
      },
      category: apiTerm.category || undefined,
      isFavorite: false,
    };
  };

  const fetchTermDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const cacheKey = generateTermCacheKey(termId);
      const isConnected = await CacheService.isConnected();
      setIsOffline(!isConnected);

      const cachedData = await CacheService.get<any>(cacheKey);

      if (cachedData) {
        console.log("Using cached term data for:", cacheKey);
        const formattedTerm = formatTerm(cachedData);
        setTerm(formattedTerm);

        if (!isConnected) {
          setLoading(false);
          return;
        }
      }

      if (!isConnected && !cachedData) {
        throw new Error("No internet connection and no cached data available");
      }

      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/glossary/terms/${termId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const formattedTerm = formatTerm(data);
      setTerm(formattedTerm);

      await CacheService.set(cacheKey, data);
    } catch (err) {
      console.error("Error fetching term detail:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";

      setError(errorMessage);

      if (!isOffline && !term) {
        Alert.alert(
          "Connection Error",
          `Could not fetch term details. Error: ${errorMessage}`,
          [{ text: "OK" }]
        );
      }
    } finally {
      setLoading(false);
    }
  }, [termId, isOffline, term]);

  useEffect(() => {
    fetchTermDetail();
  }, [fetchTermDetail]);

  const handleRefresh = async (): Promise<void> => {
    await fetchTermDetail();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FAFB" }}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        <GSText className="mt-4" style={{ color: Colors.text.sub }}>
          {isOffline ? "Loading cached data..." : "Loading term details..."}
        </GSText>
      </View>
    );
  }

  if (error && !term) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FAFB", padding: 24 }}>
        <GSText size="lg" bold style={{ color: Colors.text.head, marginBottom: 8 }}>
          {isOffline ? "Offline Mode" : "Connection Error"}
        </GSText>
        <GSText style={{ color: Colors.text.sub, textAlign: "center", marginBottom: 16 }}>
          {isOffline
            ? "Unable to load term details. Please check your connection."
            : "Unable to load term details. Please check your connection and try again."}
        </GSText>
        {!isOffline && (
          <TouchableOpacity
            onPress={handleRefresh}
            style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.primary.blue, borderRadius: 8 }}
          >
            <GSText style={{ color: "white" }}>Retry</GSText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!term) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FAFB" }}>
        <GSText style={{ color: Colors.text.sub }}>Term not found</GSText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 }}>
        <HStack className="items-center justify-between">
          <VStack className="flex-1 mr-4">
            <Heading size="xl" bold style={{ color: Colors.text.head }}>
              {term.englishTerm}
            </Heading>
            <GSText size="sm" sub style={{ color: Colors.text.sub, marginTop: 4 }}>
              {term.filipinoTerm}
            </GSText>
            {term.category ? (
              <GSText size="xs" style={{ color: Colors.primary.blue, marginTop: 8 }}>
                {term.category}
              </GSText>
            ) : null}
          </VStack>
          <Star
            size={22}
            color={term.isFavorite ? "#f59e0b" : "#9CA3AF"}
            strokeWidth={2}
            fill={term.isFavorite ? "#f59e0b" : "none"}
          />
        </HStack>
      </View>

      <Divider />

      <View style={{ padding: 24 }}>
        {isWide ? (
          <HStack className="w-full" style={{ gap: 16 }}>
            <Card className="flex-1 p-4 bg-white">
              <HStack className="items-center mb-2">
                <BookText size={18} color={Colors.text.head} />
                <GSText size="md" bold style={{ marginLeft: 8, color: Colors.text.head }}>
                  English Definition
                </GSText>
              </HStack>
              <GSText size="md" style={{ color: Colors.text.sub, lineHeight: 22 }}>
                {term.englishDefinition}
              </GSText>
            </Card>

            <Card className="flex-1 p-4 bg-white">
              <HStack className="items-center mb-2">
                <Languages size={18} color={Colors.text.head} />
                <GSText size="md" bold style={{ marginLeft: 8, color: Colors.text.head }}>
                  Filipino Definition
                </GSText>
              </HStack>
              <GSText size="md" style={{ color: Colors.text.sub, lineHeight: 22 }}>
                {term.filipinoDefinition}
              </GSText>
            </Card>
          </HStack>
        ) : (
          <Card className="bg-white">
            <Accordion className="rounded-xl overflow-hidden">
              <AccordionItem value="english">
                <AccordionHeader>
                  <AccordionTrigger>
                    <HStack className="items-center flex-1">
                      <BookText size={18} color={Colors.text.head} />
                      <AccordionTitleText className="ml-2">English Definition</AccordionTitleText>
                    </HStack>
                    <AccordionIcon size="md" />
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent>
                  <AccordionContentText>
                    <GSText size="md" style={{ color: Colors.text.sub, lineHeight: 22 }}>
                      {term.englishDefinition}
                    </GSText>
                  </AccordionContentText>
                </AccordionContent>
              </AccordionItem>

              <Divider />

              <AccordionItem value="filipino">
                <AccordionHeader>
                  <AccordionTrigger>
                    <HStack className="items-center flex-1">
                      <Languages size={18} color={Colors.text.head} />
                      <AccordionTitleText className="ml-2">Filipino Definition</AccordionTitleText>
                    </HStack>
                    <AccordionIcon size="md" />
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent>
                  <AccordionContentText>
                    <GSText size="md" style={{ color: Colors.text.sub, lineHeight: 22 }}>
                      {term.filipinoDefinition}
                    </GSText>
                  </AccordionContentText>
                </AccordionContent>
              </AccordionItem>

              {term.exampleUsage?.english || term.exampleUsage?.filipino ? (
                <>
                  <Divider />
                  <AccordionItem value="example">
                    <AccordionHeader>
                      <AccordionTrigger>
                        <HStack className="items-center flex-1">
                          <Quote size={18} color={Colors.text.head} />
                          <AccordionTitleText className="ml-2">Example Usage</AccordionTitleText>
                        </HStack>
                        <AccordionIcon size="md" />
                      </AccordionTrigger>
                    </AccordionHeader>
                    <AccordionContent>
                      <VStack>
                        {term.exampleUsage?.english ? (
                          <GSText size="sm" style={{ color: Colors.text.sub, marginBottom: 8 }}>
                            &ldquo;{term.exampleUsage.english}&rdquo;
                          </GSText>
                        ) : null}
                        {term.exampleUsage?.filipino ? (
                          <GSText size="sm" style={{ color: Colors.text.sub }}>
                            &ldquo;{term.exampleUsage.filipino}&rdquo;
                          </GSText>
                        ) : null}
                      </VStack>
                    </AccordionContent>
                  </AccordionItem>
                </>
              ) : null}
            </Accordion>
          </Card>
        )}
      </View>
    </View>
  );
}