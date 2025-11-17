import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Animated,
  Easing,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LawyerListSkeleton } from "../components/LawyerListSkeleton";
import Colors from "@/constants/Colors";

import FilterModal from "../components/FilterModal";
import { useRouter, useLocalSearchParams } from "expo-router";
import GoogleLawFirmsFinder from "../components/GoogleLawFirmsFinder";
import { VStack } from "@/components/ui/vstack";
import { Text as UIText } from "@/components/ui/text";
import tw from "tailwind-react-native-classnames";
import Header from "../../../components/Header";
import TabNavigation from "../components/TabNavigation";
import { shouldUseNativeDriver } from "../../../utils/animations";
import LawyerCard from "../components/LawyerCard";
import Navbar from "../../Navbar";
import { SidebarWrapper } from "../../AppSidebar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../contexts/AuthContext";
import UnifiedSearchBar from "@/components/common/UnifiedSearchBar";

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
  hours_available: string | string[] | Record<string, string[]>; // JSONB or legacy formats
  created_at: string;
}

// FAANG-style multi-layer caching system
const frontendCache = {
  lawyers: null as any,
  timestamp: 0,
  ttl: 60 * 1000, // 1 minute for fresher data - aligned with backend
};

// Law firms cache with location+radius keys (Google/Netflix pattern)
const lawFirmsCache = {
  data: new Map<string, { results: any; timestamp: number; location: string; radius: number }>(),
  ttl: 5 * 60 * 1000, // 5 minutes - Google Places data changes frequently
  maxSize: 50, // Prevent memory bloat
  
  // Generate cache key: "{location}_{radius}"
  getKey: (location: string, radius: number): string => `${location.toLowerCase()}_${radius}`,
  
  // Get cached results if valid
  get: (location: string, radius: number) => {
    const key = lawFirmsCache.getKey(location, radius);
    const cached = lawFirmsCache.data.get(key);
    
    if (!cached) return null;
    
    // Check TTL
    if (Date.now() - cached.timestamp > lawFirmsCache.ttl) {
      lawFirmsCache.data.delete(key);
      return null;
    }
    
    console.log(`🎯 Cache HIT: ${cached.results.length} law firms for ${location} (${radius}km)`);
    return cached.results;
  },
  
  // Set cache with automatic cleanup
  set: (location: string, radius: number, results: any) => {
    const key = lawFirmsCache.getKey(location, radius);
    
    // Cleanup old entries if max size reached
    if (lawFirmsCache.data.size >= lawFirmsCache.maxSize) {
      const oldestKey = lawFirmsCache.data.keys().next().value;
      if (oldestKey) {
        lawFirmsCache.data.delete(oldestKey);
      }
    }
    
    lawFirmsCache.data.set(key, {
      results,
      timestamp: Date.now(),
      location,
      radius
    });
    
    console.log(`💾 Cache SET: ${results.length} law firms for ${location} (${radius}km)`);
  },
  
  // Clear all cache
  clear: () => {
    lawFirmsCache.data.clear();
    console.log('🗑️ Law firms cache cleared');
  },
  
  // Get cache stats for debugging
  getStats: () => {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    lawFirmsCache.data.forEach((cached) => {
      if (now - cached.timestamp <= lawFirmsCache.ttl) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });
    
    return {
      total: lawFirmsCache.data.size,
      valid: validEntries,
      expired: expiredEntries,
      maxSize: lawFirmsCache.maxSize
    };
  }
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
  const [hasActiveRequest, setHasActiveRequest] = useState<boolean>(false);
  const [checkingActiveRequest, setCheckingActiveRequest] = useState<boolean>(false);

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(300));

  // Read query param to select initial tab (e.g., /directory?tab=lawyers)
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  useEffect(() => {
    if (typeof tab === 'string') {
      const normalized = tab.toLowerCase();
      if (normalized === 'lawyers' || normalized === 'law-firms') {
        setActiveTab(normalized);
      }
    }
  }, [tab]);

  useEffect(() => {
    if (filterVisible) {
      // Animate fade-in + slide-up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: shouldUseNativeDriver('opacity'),
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: shouldUseNativeDriver('transform'),
        }),
      ]).start();
    } else {
      // Animate fade-out + slide-down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: shouldUseNativeDriver('opacity'),
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: shouldUseNativeDriver('transform'),
        }),
      ]).start();
    }
  }, [filterVisible, fadeAnim, slideAnim]);

  const fetchLawyers = useCallback(async (forceRefresh: boolean = false) => {
    try {
      // Don't show loading spinner if we have cached data
      const now = Date.now();
      const hasCachedData = frontendCache.lawyers && frontendCache.lawyers.length > 0;
      
      if (!hasCachedData) {
        setLoading(true);
      }

      // Check cache first
      if (
        !forceRefresh &&
        frontendCache.lawyers &&
        now - frontendCache.timestamp < frontendCache.ttl
      ) {
        setLawyersData(frontendCache.lawyers);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { NetworkConfig } = await import('@/utils/networkConfig');
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const url = forceRefresh
        ? `${apiUrl}/legal-consultations/lawyers?refresh=true`
        : `${apiUrl}/legal-consultations/lawyers`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const result = await response.json();

      if (result.success) {
        const lawyers = result.data || [];
        setLawyersData(lawyers);

        // Update cache
        frontendCache.lawyers = lawyers;
        frontendCache.timestamp = now;
      } else {
        // Only show alert if we don't have cached data
        if (!hasCachedData) {
          Alert.alert("Error", "Failed to fetch lawyers: " + result.error);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Lawyer fetch timeout');
      } else {
        console.error("Error fetching lawyers:", error);
      }
      // Only show alert if we don't have cached data
      if (!frontendCache.lawyers || frontendCache.lawyers.length === 0) {
        Alert.alert("Error", "Failed to connect to server");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Check for active consultation request once
  const checkActiveRequest = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setHasActiveRequest(false);
      return;
    }

    setCheckingActiveRequest(true);
    try {
      const { NetworkConfig } = await import('@/utils/networkConfig');
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(
        `${apiUrl}/legal-consultations/user/${user.id}/active-requests`,
        { signal: AbortSignal.timeout(5000) } // 5s timeout
      );
      
      if (response.ok) {
        const result = await response.json();
        setHasActiveRequest(result.has_active_requests || false);
      } else {
        setHasActiveRequest(false);
      }
    } catch (error) {
      console.warn('Error checking active requests:', error);
      setHasActiveRequest(false);
    } finally {
      setCheckingActiveRequest(false);
    }
  }, [isAuthenticated, user]);

  // Track if we've loaded data before
  const hasLoadedRef = React.useRef(false);

  useEffect(() => {
    // Only fetch lawyers when lawyers tab is active
    if (activeTab === "lawyers") {
      // Check if we have valid cached data
      const now = Date.now();
      const hasCachedData = frontendCache.lawyers && 
                           frontendCache.lawyers.length > 0 &&
                           now - frontendCache.timestamp < frontendCache.ttl;
      
      // Only fetch if we don't have cached data OR it's the first load
      if (!hasCachedData || !hasLoadedRef.current) {
        fetchLawyers();
        hasLoadedRef.current = true;
      } else {
        // Use cached data immediately
        setLawyersData(frontendCache.lawyers);
        setLoading(false);
      }
      
      // Always check active request (it's fast)
      checkActiveRequest();
    }
  }, [activeTab, fetchLawyers, checkActiveRequest]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLawyers(true);
  }, [fetchLawyers]);

  const getDayAbbreviations = useCallback((days: string): string => {
    if (!days) return "";

    const dayArray = days.split(",");
    const abbreviationMap: { [key: string]: string } = {
      Monday: "Mon",
      Tuesday: "Tue",
      Wednesday: "Wed",
      Thursday: "Thurs",
      Friday: "Fri",
      Saturday: "Sat",
      Sunday: "Sun",
    };

    return dayArray
      .map((day) => abbreviationMap[day.trim()] || day.trim())
      .join("");
  }, []);

  // Memoize lawyer processing for better performance
  const lawyers = useMemo(() => {
    if (!lawyersData || lawyersData.length === 0) return [];
    
    return lawyersData.map((lawyer) => ({
      ...lawyer,
      displayDays: getDayAbbreviations(lawyer.days),
      specialization: Array.isArray(lawyer.specialization)
        ? lawyer.specialization
        : typeof lawyer.specialization === 'string' && lawyer.specialization
        ? lawyer.specialization.split(",").map((s: string) => s.trim())
        : [],
      // hours_available can be JSONB object or legacy string array
      hours_available: typeof lawyer.hours_available === 'object' && !Array.isArray(lawyer.hours_available)
        ? lawyer.hours_available // JSONB format: {"Monday": ["09:00"]}
        : Array.isArray(lawyer.hours_available)
        ? lawyer.hours_available // Already array
        : typeof lawyer.hours_available === 'string' && lawyer.hours_available
        ? lawyer.hours_available.split(";").map((h: string) => h.trim()) // Legacy string
        : [] as string[],
    }));
  }, [lawyersData, getDayAbbreviations]);

  // Optimized filtering with early returns
  const filteredLawyers = useMemo(() => {
    if (!lawyers || lawyers.length === 0) return [];
    
    let filtered = lawyers;

    // Filter out unavailable lawyers first (most restrictive)
    filtered = filtered.filter((lawyer) => lawyer.available);
    if (filtered.length === 0) return [];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((lawyer) =>
        lawyer.name.toLowerCase().includes(query)
      );
      if (filtered.length === 0) return [];
    }

    // Apply day filter
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
      if (filtered.length === 0) return [];
    }

    // Apply specialization filter
    if (selectedSpecialization !== "All") {
      const validSpecs = [
        "family law",
        "labor law",
        "civil law",
        "criminal law",
        "consumer law",
      ];
      
      filtered = filtered.filter((lawyer) => {
        const specs = lawyer.specialization.map((s: string) => s.toLowerCase());

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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header title="Find Legal Help" showMenu={true} />

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Conditionally render based on active tab */}
      {activeTab === "law-firms" ? (
        // Law Firms Tab - Google Law Firms Finder with consistent container
        <View style={{ flex: 1 }}>
          <GoogleLawFirmsFinder 
            searchQuery={searchQuery} 
            cache={lawFirmsCache} // Pass FAANG cache to component
          />
        </View>
      ) : (
        // Lawyers Tab - Using UnifiedSearchBar component with same container structure
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <UnifiedSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search lawyers..."
              loading={loading}
              showFilterIcon={true}
              onFilterPress={() => setFilterVisible(true)}
              containerClassName="pt-6 pb-4"
            />
          </View>

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
              contentContainerStyle={{ paddingBottom: 60, paddingTop: 12, paddingHorizontal: 20 }}
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
                        hasActiveRequest={hasActiveRequest}
                        checkingRequest={checkingActiveRequest}
                      />
                    ))}
                </>
              )}

            <View style={tw`h-4`} />
          </ScrollView>
        </View>
      )}

      <Navbar activeTab="find" />
      <SidebarWrapper />
    </SafeAreaView>
  );
}
