import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, ScrollView, Alert, Text, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import tw from "tailwind-react-native-classnames";
import Header from "../../../components/Header";
import TabNavigation from "../components/TabNavigation";
import SearchBar from "../components/SearchBar";
import FilterButton from "../components/FilterButton";
import LawyerCard from "../components/LawyerCard";
import Navbar from "../../Navbar";
import { SidebarProvider, SidebarWrapper } from "../../AppSidebar";

interface Lawyer {
  id: string;
  lawyer_id: string;
  name: string;
  specialization: string;
  location: string;
  hours: string;
  days: string;
  available: boolean;
  hours_available: string;
  created_at: string;
}

const frontendCache = {
  lawyers: null as any,
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
};

export default function DirectoryScreen() {
  const [activeTab, setActiveTab] = useState<string>("lawyers");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lawyersData, setLawyersData] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const router = useRouter();

  // Memoized fetch function with caching
  const fetchLawyers = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);

      // Check cache if not forcing refresh
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

        // Update cache
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

  // Initial load
  useEffect(() => {
    fetchLawyers();
  }, [fetchLawyers]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLawyers(true); // Force refresh
  }, [fetchLawyers]);

  // Memoized utility functions
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

  // Memoized lawyers data transformation
  const lawyers = useMemo(() => {
    return lawyersData.map((lawyer) => ({
      ...lawyer,
      available: isLawyerAvailableToday(lawyer.days),
      displayDays: getDayAbbreviations(lawyer.days),
      specialization: lawyer.specialization // Use singular
        ? lawyer.specialization.split(",").map((s) => s.trim())
        : [],
      hours_available: lawyer.hours_available
        ? lawyer.hours_available.split(";").map((h) => h.trim())
        : [],
    }));
  }, [lawyersData, isLawyerAvailableToday, getDayAbbreviations]);

  // Memoized search filtering
  const filteredLawyers = useMemo(() => {
    if (!searchQuery.trim()) {
      return lawyers;
    }

    const query = searchQuery.toLowerCase().trim();
    return lawyers.filter((lawyer) => {
      return (
        lawyer.name.toLowerCase().includes(query) ||
        lawyer.specialization.some((spec) =>
          spec.toLowerCase().includes(query)
        ) ||
        lawyer.location.toLowerCase().includes(query)
      );
    });
  }, [lawyers, searchQuery]);

  const handleFilterPress = useCallback((): void => {
    Alert.alert("Filter", "Filter options");
  }, []);

  const handleBookConsultation = useCallback(
    (lawyer: Lawyer & { displayDays: string }): void => {
      router.push({
        pathname: "/booklawyer",
        params: {
          id: lawyer.id,
          lawyerId: lawyer.lawyer_id,
          lawyerName: lawyer.name,
          lawyerSpecialization: JSON.stringify(lawyer.specialization), // Change from lawyerspecialization
          lawyerHours: lawyer.hours,
          lawyerDays: lawyer.displayDays,
          lawyerhours_available: JSON.stringify(lawyer.hours_available),
        },
      });
    },
    [router]
  );

  useEffect(() => {
    const timer = setTimeout(() => {}, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <SidebarProvider>
      <View style={tw`flex-1 bg-gray-50`}>
        <Header title="Find Legal Help" showMenu={true} />

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        <View style={tw`relative`}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search lawyers..."
          />
          <FilterButton onPress={handleFilterPress} />
        </View>

        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0000ff"]}
              tintColor="#0000ff"
            />
          }
        >
          {loading && !refreshing ? (
            <Text style={tw`text-center p-4`}></Text>
          ) : filteredLawyers.length === 0 ? (
            <Text style={tw`text-center p-4`}>
              {searchQuery
                ? `No lawyers found for "${searchQuery}"`
                : "No lawyers available"}
            </Text>
          ) : (
            <>
              {filteredLawyers.map((lawyer) => (
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
