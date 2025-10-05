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
} from "react-native";
import { useRouter } from "expo-router";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text as UIText } from "@/components/ui/text";
import { Pressable as UIPressable } from "@/components/ui/pressable";
import tw from "tailwind-react-native-classnames";
import Header from "../../../components/Header";
import TabNavigation from "../components/TabNavigation";
import SearchBar from "../components/SearchBar";
import LawyerCard from "../components/LawyerCard";
import Navbar from "../../Navbar";
import { SidebarProvider, SidebarWrapper } from "../../AppSidebar";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../../constants/Colors";

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
  ttl: 5 * 60 * 1000,
};

export default function DirectoryScreen() {
  const [activeTab, setActiveTab] = useState<string>("lawyers");
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

  const { height: screenHeight } = Dimensions.get("window");

  const SPECIALIZATIONS = [
    "All",
    "Family Law",
    "Labor Law",
    "Civil Law",
    "Criminal Law",
    "Consumer Law",
  ];

  const DAYS = [
    { full: "Monday", abbr: "Mon" },
    { full: "Tuesday", abbr: "Tue" },
    { full: "Wednesday", abbr: "Wed" },
    { full: "Thursday", abbr: "Thu" },
    { full: "Friday", abbr: "Fri" },
    { full: "Saturday", abbr: "Sat" },
    { full: "Sunday", abbr: "Sun" },
  ];

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
        },
      });
    },
    [router]
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

        {/* Filter Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={filterVisible}
          onRequestClose={() => setFilterVisible(false)}
        >
          <Pressable
            style={[tw`flex-1`, { backgroundColor: "rgba(0, 0, 0, 0.4)" }]}
            onPress={() => setFilterVisible(false)}
          >
            <Pressable
              style={[
                tw`bg-white rounded-t-3xl`,
                {
                  marginTop: "auto",
                  maxHeight: screenHeight * 0.8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: -4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 20,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <VStack className="p-6">
                {/* Modal Header */}
                <HStack className="items-center justify-between mb-6">
                  <UIText
                    className="text-xl font-bold"
                    style={{ color: Colors.text.head }}
                  >
                    Filter Lawyers
                  </UIText>
                  <UIPressable
                    onPress={() => setFilterVisible(false)}
                    className="p-2"
                  >
                    <Ionicons name="close" size={24} color={Colors.text.sub} />
                  </UIPressable>
                </HStack>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: screenHeight * 0.5 }}
                >
                  {/* Days Filter Section */}
                  <VStack className="mb-6">
                    <HStack className="items-center mb-3">
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={Colors.primary.blue}
                      />
                      <UIText
                        className="text-base font-semibold ml-2"
                        style={{ color: Colors.text.head }}
                      >
                        Available Days
                      </UIText>
                    </HStack>

                    <View style={tw`flex-row flex-wrap -mx-1`}>
                      {DAYS.map(({ full, abbr }) => {
                        const selected = selectedDays.includes(full);
                        return (
                          <Pressable
                            key={full}
                            onPress={() =>
                              setSelectedDays((prev) =>
                                selected
                                  ? prev.filter((d) => d !== full)
                                  : [...prev, full]
                              )
                            }
                            style={[
                              tw`px-4 py-2 m-1 rounded-lg border`,
                              {
                                backgroundColor: selected
                                  ? Colors.primary.blue
                                  : "white",
                                borderColor: selected
                                  ? Colors.primary.blue
                                  : "#E5E7EB",
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: selected ? "white" : Colors.text.sub,
                              }}
                            >
                              {abbr}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </VStack>

                  {/* Specialization Filter Section */}
                  <VStack className="mb-6">
                    <HStack className="items-center mb-3">
                      <Ionicons
                        name="briefcase-outline"
                        size={18}
                        color={Colors.primary.blue}
                      />
                      <UIText
                        className="text-base font-semibold ml-2"
                        style={{ color: Colors.text.head }}
                      >
                        Specialization
                      </UIText>
                    </HStack>

                    <View style={tw`flex-row flex-wrap -mx-1`}>
                      {SPECIALIZATIONS.map((spec) => {
                        const selected = selectedSpecialization === spec;
                        return (
                          <Pressable
                            key={spec}
                            onPress={() => setSelectedSpecialization(spec)}
                            style={[
                              tw`px-4 py-2 m-1 rounded-lg border`,
                              {
                                backgroundColor: selected
                                  ? Colors.primary.blue
                                  : "white",
                                borderColor: selected
                                  ? Colors.primary.blue
                                  : "#E5E7EB",
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: selected ? "white" : Colors.text.sub,
                              }}
                            >
                              {spec}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </VStack>
                </ScrollView>

                {/* Action Buttons */}
                <HStack className="items-center justify-between pt-4 border-t border-gray-200">
                  <UIPressable
                    onPress={() => {
                      setSelectedDays([]);
                      setSelectedSpecialization("All");
                    }}
                    className="px-6 py-3 rounded-lg border border-gray-200"
                  >
                    <UIText
                      className="font-semibold"
                      style={{ color: Colors.text.sub }}
                    >
                      Clear All
                    </UIText>
                  </UIPressable>

                  <UIPressable
                    onPress={() => setFilterVisible(false)}
                    className="px-8 py-3 rounded-lg"
                    style={{ backgroundColor: Colors.primary.blue }}
                  >
                    <UIText className="font-semibold text-white">
                      Apply Filters
                    </UIText>
                  </UIPressable>
                </HStack>
              </VStack>
            </Pressable>
          </Pressable>
        </Modal>

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
            <VStack className="items-center justify-center py-8">
              <UIText style={{ color: Colors.text.sub }}>
                Loading lawyers...
              </UIText>
            </VStack>
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
              {hasActiveFilters && (
                <HStack className="px-6 mb-2 items-center">
                  <UIText
                    className="text-sm"
                    style={{ color: Colors.text.sub }}
                  >
                    Showing {filteredLawyers.length} result
                    {filteredLawyers.length !== 1 ? "s" : ""}
                  </UIText>
                </HStack>
              )}
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
