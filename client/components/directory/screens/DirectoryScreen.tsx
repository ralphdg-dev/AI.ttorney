import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Animated,
  Easing,
  TextInput,
  Pressable,
} from "react-native";
import { LawyerListSkeleton } from "../components/LawyerListSkeleton";

import FilterModal from "../components/FilterModal";
import { useRouter } from "expo-router";
import GoogleLawFirmsFinder from "../components/GoogleLawFirmsFinder";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text as UIText } from "@/components/ui/text";
import { Pressable as UIPressable } from "@/components/ui/pressable";
import tw from "tailwind-react-native-classnames";
import Header from "../../../components/Header";
import TabNavigation from "../components/TabNavigation";
import LawyerCard from "../components/LawyerCard";
import Navbar from "../../Navbar";
import { SidebarProvider, SidebarWrapper } from "../../AppSidebar";
import { Ionicons } from "@expo/vector-icons";
import { Spinner } from "@/components/ui/spinner";
import Colors from "../../../constants/Colors";
import { useAuth } from "../../../contexts/AuthContext";

interface Lawyer {
  id: string;
  lawyer_id: string;
  name: string;
  specialization: string | string[];
  location: string;
  hours: string;
  bio: string;
  days: string;
  available: boolean;
  hours_available: string | string[];
  created_at: string;
}

const frontendCache = {
  lawyers: null as any,
  timestamp: 0,
  ttl: 5 * 60 * 1000,
};

export default function DirectoryScreen() {
  const [activeTab, setActiveTab] = useState<string>("law-firms");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lawyersData, setLawyersData] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const router = useRouter();
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] =
    useState<string>("All");
  const { user, isAuthenticated } = useAuth();

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(300));

  useEffect(() => {
    if (filterVisible) {
      // Animate fade-in + slide-up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate fade-out + slide-down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [filterVisible, fadeAnim, slideAnim]);

  const fetchLawyers = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);

      const now = Date.now();
      if (
        !forceRefresh &&
        frontendCache.lawyers &&
        now - frontendCache.timestamp < frontendCache.ttl
      ) {
        setLawyersData(frontendCache.lawyers);
        setLoading(false);
        return;
      }

      const url = forceRefresh
        ? "http://localhost:8000/legal-consultations/lawyers?refresh=true"
        : "http://localhost:8000/legal-consultations/lawyers";

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        const lawyers = result.data || [];
        setLawyersData(lawyers);

        frontendCache.lawyers = lawyers;
        frontendCache.timestamp = now;
      } else {
        Alert.alert("Error", "Failed to fetch lawyers: " + result.error);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to connect to server");
      console.error("Error fetching lawyers:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch lawyers when lawyers tab is active
    if (activeTab === "lawyers") {
      fetchLawyers();
    }
  }, [activeTab, fetchLawyers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLawyers(true);
  }, [fetchLawyers]);

  const getDayAbbreviations = useCallback((days: string): string => {
    if (!days) return "";

    const dayArray = days.split(",");
    const abbreviationMap: { [key: string]: string } = {
      Monday: "M",
      Tuesday: "T",
      Wednesday: "W",
      Thursday: "Th",
      Friday: "F",
      Saturday: "Sat",
      Sunday: "Sun",
    };

    return dayArray
      .map((day) => abbreviationMap[day.trim()] || day.trim())
      .join("");
  }, []);

  const lawyers = useMemo(() => {
    return lawyersData.map((lawyer) => ({
      ...lawyer,
      displayDays: getDayAbbreviations(lawyer.days),
      specialization: Array.isArray(lawyer.specialization)
        ? lawyer.specialization
        : typeof lawyer.specialization === 'string' && lawyer.specialization
        ? lawyer.specialization.split(",").map((s: string) => s.trim())
        : [],
      hours_available: Array.isArray(lawyer.hours_available)
        ? lawyer.hours_available
        : typeof lawyer.hours_available === 'string' && lawyer.hours_available
        ? lawyer.hours_available.split(";").map((h: string) => h.trim())
        : [],
    }));
  }, [lawyersData, getDayAbbreviations]);

  const filteredLawyers = useMemo(() => {
    let filtered = lawyers;

    // Filter out unavailable lawyers
    filtered = filtered.filter((lawyer) => lawyer.available);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((lawyer) =>
        lawyer.name.toLowerCase().includes(query)
      );
    }

    if (selectedDays.length > 0) {
      filtered = filtered.filter((lawyer) => {
        if (!lawyer.days) return false;
        const availableDays = lawyer.days
          .split(",")
          .map((d: string) => d.trim().toLowerCase());
        return selectedDays.some((day) =>
          availableDays.includes(day.toLowerCase())
        );
      });
    }

    if (selectedSpecialization !== "All") {
      filtered = filtered.filter((lawyer) => {
        const specs = lawyer.specialization.map((s: string) => s.toLowerCase());
        const validSpecs = [
          "family law",
          "labor law",
          "civil law",
          "criminal law",
          "consumer law",
        ];

        if (selectedSpecialization === "Others Law") {
          return specs.some((s: string) => !validSpecs.includes(s));
        }

        return specs.includes(selectedSpecialization.toLowerCase());
      });
    }

    return filtered;
  }, [lawyers, searchQuery, selectedDays, selectedSpecialization]);

  const handleBookConsultation = useCallback(
    (lawyer: Lawyer & { displayDays: string }): void => {
      if (!isAuthenticated || !user) {
        // Redirect to login if not authenticated
        router.push("/login");
        return;
      }

      router.push({
        pathname: "/booklawyer",
        params: {
          id: lawyer.id,
          lawyerId: lawyer.lawyer_id,
          lawyerName: lawyer.name,
          lawyerSpecialization: JSON.stringify(lawyer.specialization),
          lawyerHours: lawyer.hours,
          lawyerDays: lawyer.displayDays,
          lawyerhours_available: JSON.stringify(lawyer.hours_available),
          lawyerBio: lawyer.bio,
          userId: user.id,
        },
      });
    },
    [router, user, isAuthenticated]
  );

  const hasActiveFilters =
    selectedDays.length > 0 || selectedSpecialization !== "All";

  return (
    <SidebarProvider>
      <View style={tw`flex-1 bg-gray-50`}>
        <Header title="Find Legal Help" showMenu={true} />

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Conditionally render based on active tab */}
        {activeTab === "law-firms" ? (
          // Law Firms Tab - Google Law Firms Finder
          <GoogleLawFirmsFinder searchQuery={searchQuery} />
        ) : (
          // Lawyers Tab - Using SearchHeader for consistency
          <>
            {/* Search Header - Consistent with Law Firms */}
            <Box className="bg-white border-b border-gray-200" style={{ zIndex: 100 }}>
              <VStack space="md" className="px-4 py-4 bg-white" style={{ zIndex: 1000 }}>
                <HStack space="sm" className="items-center">
                  <Box className="flex-1 relative" style={{ zIndex: 1000 }}>
                    <Box className="bg-white rounded-lg border border-gray-300 focus:border-blue-400" style={{ 
                      minHeight: 48,
                      maxHeight: 48,
                      height: 48
                    }}>
                      <HStack style={{ 
                        height: 48, 
                        alignItems: 'center', 
                        paddingLeft: 20,
                        paddingRight: 16
                      }}>
                        <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 14 }} />
                        
                        <TextInput
                          className="flex-1 text-base"
                          placeholder="Search lawyers..."
                          placeholderTextColor="#9CA3AF"
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          returnKeyType="search"
                          editable={!loading}
                          style={{ 
                            color: Colors.text.head,
                            height: 48,
                            fontSize: 16,
                            lineHeight: 20,
                            textAlignVertical: 'center',
                            includeFontPadding: false
                          }}
                          autoCorrect={false}
                          autoCapitalize="words"
                          blurOnSubmit={false}
                          maxLength={100}
                          multiline={false}
                          numberOfLines={1}
                        />
                        
                        {/* Fixed-width container for right icons */}
                        <Box style={{ 
                          width: 24, 
                          height: 48, 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          flexShrink: 0 
                        }}>
                          {searchQuery.length > 0 && !loading && (
                            <Pressable 
                              onPress={() => setSearchQuery('')}
                              style={{ 
                                width: 24, 
                                height: 24, 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                borderRadius: 12
                              }}
                            >
                              <Ionicons name="close" size={18} color="#6B7280" />
                            </Pressable>
                          )}
                          {loading && (
                            <Box style={{ 
                              width: 18, 
                              height: 18, 
                              justifyContent: 'center', 
                              alignItems: 'center' 
                            }}>
                              <Spinner size="small" color={Colors.primary.blue} />
                            </Box>
                          )}
                        </Box>
                      </HStack>
                    </Box>
                  </Box>
                  
                  {/* Filter Button - Right of Search Bar */}
                  <UIPressable
                    onPress={() => setFilterVisible(true)}
                    className="bg-white border border-gray-300 px-3 py-2 rounded-lg relative active:bg-gray-50"
                    style={{ height: 48, justifyContent: 'center' }}
                  >
                    <HStack space="xs" className="items-center">
                      <Ionicons
                        name="filter-outline"
                        size={16}
                        color={Colors.primary.blue}
                      />
                      <UIText className="text-sm font-medium" style={{ color: Colors.text.head }}>
                        Filter
                      </UIText>
                    </HStack>
                    {hasActiveFilters && (
                      <Box
                        className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                        style={{ backgroundColor: Colors.primary.blue }}
                      />
                    )}
                  </UIPressable>
                </HStack>
              </VStack>
            </Box>

            <FilterModal
              visible={filterVisible}
              onClose={() => setFilterVisible(false)}
              selectedDays={selectedDays}
              setSelectedDays={setSelectedDays}
              selectedSpecialization={selectedSpecialization}
              setSelectedSpecialization={setSelectedSpecialization}
            />

            <ScrollView
              style={tw`flex-1 bg-gray-50`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 8, paddingTop: 12 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[Colors.primary.blue]}
                  tintColor={Colors.primary.blue}
                />
              }
            >
              {loading && !refreshing ? (
                <LawyerListSkeleton count={3} />
              ) : filteredLawyers.length === 0 ? (
                <VStack className="items-center justify-center py-12 px-6">
                  <Ionicons
                    name="search-outline"
                    size={48}
                    color={Colors.text.sub}
                    style={{ marginBottom: 12 }}
                  />
                  <UIText
                    className="text-center text-base font-semibold mb-2"
                    style={{ color: Colors.text.head }}
                  >
                    No lawyers found
                  </UIText>
                  <UIText
                    className="text-center text-sm"
                    style={{ color: Colors.text.sub }}
                  >
                    {searchQuery
                      ? `Try adjusting your search for "${searchQuery}"`
                      : hasActiveFilters
                      ? "Try adjusting your filters"
                      : "No lawyers are currently available"}
                  </UIText>
                </VStack>
              ) : (
                <>
                  {filteredLawyers
                    .filter(
                      (lawyer) =>
                        lawyer.days &&
                        lawyer.days.trim() !== "" &&
                        lawyer.hours_available &&
                        lawyer.hours_available.length > 0
                    )
                    .map((lawyer) => (
                      <LawyerCard
                        key={lawyer.id}
                        lawyer={{
                          ...lawyer,
                          days: lawyer.displayDays,
                        }}
                        onBookConsultation={() =>
                          handleBookConsultation(lawyer)
                        }
                      />
                    ))}
                </>
              )}

              <View style={tw`h-4`} />
            </ScrollView>
          </>
        )}

        <Navbar activeTab="find" />
        <SidebarWrapper />
      </View>
    </SidebarProvider>
  );
}
