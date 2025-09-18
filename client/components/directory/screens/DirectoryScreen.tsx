// C:\Users\Mikko\Desktop\AI.ttorney\client\components\directory\screens\DirectoryScreen.tsx
import React, { useState } from "react";
import { View, ScrollView, Alert } from "react-native";
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
  id: number;
  name: string;
  specializations: string[];
  location: string;
  hours: string;
  days: string;
  available: boolean;
}

export default function DirectoryScreen() {
  const [activeTab, setActiveTab] = useState<string>("lawyers");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const router = useRouter();

  const lawyers: Lawyer[] = [
    {
      id: 1,
      name: "Atty. Joaquin Miguel Angeles",
      specializations: ["Criminal Law", "Civil Law", "Family Law", "Litigation"],
      location: "Quezon City",
      hours: "8:00 AM - 8:00 PM",
      days: "Monday - Friday",
      available: true,
    },
    {
      id: 2,
      name: "Atty. Lyanna Ysabel Cristobal",
      specializations: ["Corporate Law", "Intellectual Property", "Contract Law", "Business Law"],
      location: "Quezon City",
      hours: "8:00 AM - 8:00 PM",
      days: "Monday - Friday",
      available: true,
    },
    {
      id: 3,
      name: "Atty. Ralph De Guzman",
      specializations: ["Real Estate Law", "Property Law", "Landlord-Tenant", "Estate Planning"],
      location: "Quezon City",
      hours: "8:00 AM - 8:00 PM",
      days: "Monday - Friday",
      available: false,
    },
    {
      id: 4,
      name: "Atty. Mikko Samaniego",
      specializations: ["Immigration Law", "International Law", "Human Rights", "Asylum Cases"],
      location: "Quezon City",
      hours: "8:00 AM - 8:00 PM",
      days: "Monday - Friday",
      available: false,
    },
  ];

  const handleFilterPress = (): void => {
    Alert.alert("Filter", "Filter options");
  };

  const handleBookConsultation = (lawyer: Lawyer): void => {
    router.push({
      pathname: "/booklawyer",
      params: {
        lawyerId: lawyer.id.toString(),
        lawyerName: lawyer.name,
        lawyerSpecializations: JSON.stringify(lawyer.specializations),
        lawyerHours: lawyer.hours,
        lawyerDays: lawyer.days
      }
    });
  };

  return (
    <SidebarProvider>
      <View style={tw`flex-1 bg-gray-50`}>
        <Header
          title="Find Legal Help"
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

        <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {lawyers.map((lawyer) => (
            <LawyerCard
              key={lawyer.id}
              lawyer={lawyer}
              onBookConsultation={() => handleBookConsultation(lawyer)}
            />
          ))}

          <View style={tw`h-4`} />
        </ScrollView>

        <Navbar activeTab="find" />
        <SidebarWrapper />
      </View>
    </SidebarProvider>
  );
}