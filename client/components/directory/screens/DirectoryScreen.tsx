import React, { useState } from "react";
import { View, ScrollView, Alert } from "react-native";
import tw from "tailwind-react-native-classnames";
import Header from "../../../components/Header";
import TabNavigation from "../components/TabNavigation";
import SearchBar from "../components/SearchBar";
import FilterButton from "../components/FilterButton";
import LawyerCard from "../components/LawyerCard";
import Navbar from "../../Navbar";

interface Lawyer {
  id: number;
  name: string;
  specialization: string;
  location: string;
  hours: string;
  days: string;
  available: boolean;
}

export default function DirectoryScreen() {
  const [activeTab, setActiveTab] = useState<string>("lawyers");
  const [bottomActiveTab, setBottomActiveTab] = useState<string>("legal");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const lawyers: Lawyer[] = [
    {
      id: 1,
      name: "Atty. Joaquin Miguel Angeles",
      specialization: "Specializes in Litigation + 3 more",
      location: "Quezon City",
      hours: "8:00 AM - 8:00 PM",
      days: "Monday - Friday",
      available: true,
    },
    {
      id: 2,
      name: "Atty. Lyanna Ysabel Cristobal",
      specialization: "Specializes in Litigation + 3 more",
      location: "Quezon City",
      hours: "8:00 AM - 8:00 PM",
      days: "Monday - Friday",
      available: true,
    },
    {
      id: 3,
      name: "Atty. Ralph De Guzman",
      specialization: "Specializes in Litigation + 3 more",
      location: "Quezon City",
      hours: "8:00 AM - 8:00 PM",
      days: "Monday - Friday",
      available: false,
    },
    {
      id: 4,
      name: "Atty. Mikko Samaniego",
      specialization: "Specializes in Litigation + 3 more",
      location: "Quezon City",
      hours: "8:00 AM - 8:00 PM",
      days: "Monday - Friday",
      available: false,
    },
  ];

  const handleMenuPress = (): void => {
    Alert.alert("Menu", "Menu pressed");
  };

  const handleFilterPress = (): void => {
    Alert.alert("Filter", "Filter options");
  };

  const handleBookConsultation = (lawyer: Lawyer): void => {
    Alert.alert(
      "Book Consultation",
      `Booking consultation with ${lawyer.name}`
    );
  };

  const handleBottomNavChange = (tab: string): void => {
    setBottomActiveTab(tab);
    Alert.alert("Navigation", `Navigating to ${tab}`);
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Header
        title="Find Legal Help"
        onMenuPress={handleMenuPress}
        showMenu={true}
      />

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <View style={tw`relative`}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search lawyers..."
        />
        <FilterButton onPress={handleFilterPress} />
      </View>

      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        {lawyers.map((lawyer) => (
          <LawyerCard
            key={lawyer.id}
            lawyer={lawyer}
            onBookConsultation={handleBookConsultation}
          />
        ))}

        {/* Add some bottom padding */}
        <View style={tw`h-4`} />
      </ScrollView>

      <Navbar />
    </View>
  );
}
