import React, { useState, useMemo, useEffect } from "react";
import { View, ScrollView, Alert, Text } from "react-native";
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
  specializations: string;
  location: string;
  hours: string;
  days: string;
  available: boolean;
  hours_available: string;
  created_at: string;
}

export default function DirectoryScreen() {
  const [activeTab, setActiveTab] = useState<string>("lawyers");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lawyersData, setLawyersData] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    fetchLawyers();
  }, []);

  const fetchLawyers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/legal-consultations/lawyers');
      const result = await response.json();
      
      if (result.success) {
        setLawyersData(result.data || []);
      } else {
        Alert.alert("Error", "Failed to fetch lawyers: " + result.error);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to connect to server");
      console.error("Error fetching lawyers:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDayAbbreviations = (days: string): string => {
    const dayArray = days.split(',');
    const abbreviationMap: { [key: string]: string } = {
      Monday: "M",
      Tuesday: "T",
      Wednesday: "W",
      Thursday: "Th",
      Friday: "F",
      Saturday: "Sat",
      Sunday: "Sun",
    };

    return dayArray.map((day) => abbreviationMap[day.trim()] || day.trim()).join("");
  };

  const isLawyerAvailableToday = (days: string): boolean => {
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
    const availableDays = days.split(',').map(day => day.trim());

    return availableDays.includes(currentDay);
  };

  const lawyers = useMemo(() => {
    return lawyersData.map((lawyer) => ({
      ...lawyer,
      available: isLawyerAvailableToday(lawyer.days),
      displayDays: getDayAbbreviations(lawyer.days),
      // Convert specializations string to array for compatibility
      specializations: lawyer.specializations.split(',').map(s => s.trim()),
      // Convert hours_available string to array for compatibility
      hours_available: lawyer.hours_available.split(',').map(h => h.trim()),
    }));
  }, [lawyersData]);

  // Filter lawyers based on search query
  const filteredLawyers = useMemo(() => {
    if (!searchQuery.trim()) {
      return lawyers;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return lawyers.filter(lawyer => {
      return (
        lawyer.name.toLowerCase().includes(query) ||
        lawyer.specializations.some(spec => 
          spec.toLowerCase().includes(query)
        ) ||
        lawyer.location.toLowerCase().includes(query)
      );
    });
  }, [lawyers, searchQuery]);

  const handleFilterPress = (): void => {
    Alert.alert("Filter", "Filter options");
  };

  const handleBookConsultation = (
    lawyer: Lawyer & { displayDays: string }
  ): void => {
    router.push({
      pathname: "/booklawyer",
      params: {
        lawyerId: lawyer.id.toString(),
        lawyerName: lawyer.name,
        lawyerSpecializations: JSON.stringify(lawyer.specializations),
        lawyerHours: lawyer.hours,
        lawyerDays: lawyer.displayDays,
        lawyerhours_available: JSON.stringify(lawyer.hours_available),
      },
    });
  };
  
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
        >
          {loading ? (
            <Text style={tw`text-center p-4`}></Text>
          ) : filteredLawyers.length === 0 ? (
            <Text style={tw`text-center p-4`}>
              {searchQuery ? `No lawyers found for "${searchQuery}"` : "No lawyers available"}
            </Text>
          ) : (
            filteredLawyers.map((lawyer) => (
              <LawyerCard
                key={lawyer.id}
                lawyer={{
                  ...lawyer,
                  days: lawyer.displayDays,
                }}
                onBookConsultation={() => handleBookConsultation(lawyer)}
              />
            ))
          )}

          <View style={tw`h-4`} />
        </ScrollView>

        <Navbar activeTab="find" />
        <SidebarWrapper />
      </View>
    </SidebarProvider>
  );
}