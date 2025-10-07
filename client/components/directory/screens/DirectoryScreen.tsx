import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Alert,
  Text,
  RefreshControl,
  Modal,
  Pressable,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { LawyerListSkeleton } from "../components/LawyerListSkeleton";

import FilterModal from "../components/FilterModal";
import { useRouter } from "expo-router";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text as UIText } from "@/components/ui/text";
import { Pressable as UIPressable } from "@/components/ui/pressable";
import tw from "tailwind-react-native-classnames";
import Header from "../../../components/Header";
import TabNavigation from "../components/TabNavigation";
import LawyerCard from "../components/LawyerCard";
import GoogleLawFirmsFinder from "../components/GoogleLawFirmsFinder";
import Navbar from "../../Navbar";
import { SidebarProvider, SidebarWrapper } from "../../AppSidebar";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../../constants/Colors";
import { useAuth } from "../../../contexts/AuthContext";

interface Lawyer {
  id: string;
  lawyer_id: string;
  name: string;
  specialization: string;
  location: string;
  hours: string;
  bio: string;
  days: string;
  available: boolean;
  hours_available: string;
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
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const router = useRouter();
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] =
    useState<string>("All");
  const { user, isAuthenticated } = useAuth();

  const { height: screenHeight } = Dimensions.get("window");
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
  }, [filterVisible]);

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
        setLastUpdated(frontendCache.timestamp);
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
        setLastUpdated(now);

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
    fetchLawyers();
  }, [fetchLawyers]);

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

  const isLawyerAvailableToday = useCallback((days: string): boolean => {
    if (!days) return false;

    const today = new Date();
    const dayOfWeek = today.getDay();

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const currentDay = dayNames[dayOfWeek];
    const availableDays = days.split(",").map((day) => day.trim());

    return availableDays.includes(currentDay);
  }, []);

  const lawyers = useMemo(() => {
    return lawyersData.map((lawyer) => ({
      ...lawyer,
      available: isLawyerAvailableToday(lawyer.days),
      displayDays: getDayAbbreviations(lawyer.days),
      specialization: lawyer.specialization
        ? lawyer.specialization.split(",").map((s) => s.trim())
        : [],
      hours_available: lawyer.hours_available
        ? lawyer.hours_available.split(";").map((h) => h.trim())
        : [],
    }));
  }, [lawyersData, isLawyerAvailableToday, getDayAbbreviations]);

  const filteredLawyers = useMemo(() => {
    let filtered = lawyers;

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
        const specs = lawyer.specialization.map((s) => s.toLowerCase());
        const validSpecs = [
          "family law",
          "labor law",
          "civil law",
          "criminal law",
          "consumer law",
        ];

        if (selectedSpecialization === "Others Law") {
          return specs.some((s) => !validSpecs.includes(s));
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

        {/* Search and Filter Section */}
        <HStack className="items-center px-6 mb-4">
          <Box className="flex-1 mr-2">
            <Box className="relative">
              <View
                style={[
                  tw`flex-row items-center bg-white border border-gray-200 rounded-lg px-4 py-3`,
                ]}
              >
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <input
                  placeholder="Search lawyers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    fontSize: 14,
                    color: Colors.text.head,
                    border: "none",
                    outline: "none",
                    backgroundColor: "transparent",
                  }}
                />
              </View>
            </Box>
          </Box>

          {/* Filter Button */}
          <UIPressable
            onPress={() => setFilterVisible(true)}
            className="bg-white border border-gray-200 p-3 rounded-lg relative"
          >
            <Ionicons
              name="filter-outline"
              size={20}
              color={Colors.primary.blue}
            />
            {hasActiveFilters && (
              <Box
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                style={{ backgroundColor: Colors.primary.blue }}
              />
            )}
          </UIPressable>
        </HStack>

        <FilterModal
          visible={filterVisible}
          onClose={() => setFilterVisible(false)}
          selectedDays={selectedDays}
          setSelectedDays={setSelectedDays}
          selectedSpecialization={selectedSpecialization}
          setSelectedSpecialization={setSelectedSpecialization}
        />

        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
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
                    onBookConsultation={() => handleBookConsultation(lawyer)}
                  />
                ))}
            </>
          )}

          <View style={tw`h-4`} />
        </ScrollView>

        <Navbar activeTab="find" />
        <SidebarWrapper />
      </View>
    </SidebarProvider>
  );
}
