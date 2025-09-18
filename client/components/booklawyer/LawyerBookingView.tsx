// C:\Users\Mikko\Desktop\AI.ttorney\client\components\booklawyer\LawyerBookingView.tsx
import React, { useState, useEffect } from "react";
import { Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";
import Colors from "../../constants/Colors";
import Navbar from "@/components/Navbar";

import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ScrollView } from "@/components/ui/scroll-view";
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

interface CalendarDay {
  date: number;
  day: string;
  isSelected?: boolean;
}

interface LawyerData {
  id: string;
  name: string;
  specialization: string;
  hours: string;
  days: string;
}

export default function LawyerBookingView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [lawyerData, setLawyerData] = useState<LawyerData | null>(null);
  
  const [bottomActiveTab, setBottomActiveTab] = useState("find");
  const [selectedDay, setSelectedDay] = useState(9);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("9:00AM-10:00AM");
  const [email, setEmail] = useState("user@email.com");
  const [mobileNumber, setMobileNumber] = useState("09123456789");
  const [communicationMode, setCommunicationMode] = useState("Online");
  const [concern, setConcern] = useState("");

  const [selectedMonth, setSelectedMonth] = useState("August");
  const [monthDropdownVisible, setMonthDropdownVisible] = useState(false);
  const [modeDropdownVisible, setModeDropdownVisible] = useState(false);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const communicationModes = ["Online", "In-person", "Phone"];

  const calendarDays: CalendarDay[] = [
    { date: 7, day: "Sun" },
    { date: 8, day: "Mon" },
    { date: 9, day: "Tue", isSelected: true },
    { date: 10, day: "Wed" },
    { date: 11, day: "Thu" },
  ];

  const timeSlots: TimeSlot[] = [
    { id: "8:00AM-9:00AM", time: "8:00AM-9:00AM", available: true },
    { id: "9:00AM-10:00AM", time: "9:00AM-10:00AM", available: true },
    { id: "10:00AM-11:00AM", time: "10:00AM-11:00AM", available: true },
  ];

  useEffect(() => {
    // Extract lawyer data from route params
    if (params.lawyerId) {
      setLawyerData({
        id: params.lawyerId as string,
        name: params.lawyerName as string,
        specialization: params.lawyerSpecialization as string,
        hours: params.lawyerHours as string,
        days: params.lawyerDays as string
      });
    }
  }, [params]);

  const handleBackPress = () => {
    router.back();
  };

  const handleBookConsultation = () => {
    if (!concern.trim()) {
      Alert.alert("Error", "Please describe your concern");
      return;
    }
    Alert.alert("Success", `Consultation booked with ${lawyerData?.name}!`);
  };

  const handleBottomNavChange = (tab: string) => {
    setBottomActiveTab(tab);
    if (tab === "find") {
      router.push("/directory");
    } else {
      Alert.alert("Navigation", `Navigating to ${tab}`);
    }
  };

  if (!lawyerData) {
    return (
      <Box className="flex-1 bg-gray-50 items-center justify-center">
        <Text>Loading lawyer information...</Text>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-gray-50">
      {/* Header */}
      <HStack className="items-center justify-between px-6 pt-12 pb-4 bg-white">
        <Pressable onPress={handleBackPress} className="p-2">
          <Ionicons name="arrow-back" size={24} color={Colors.primary.blue} />
        </Pressable>
        <Text
          className="text-lg font-bold"
          style={{ color: Colors.primary.blue }}
        >
          Talk to a Lawyer
        </Text>
        <Box className="w-10" />
      </HStack>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Lawyer Profile */}
        <VStack className="mx-6 mt-4 mb-6 bg-white rounded-lg p-6 items-center">
          <Box
            className="w-20 h-20 rounded-full mb-4 items-center justify-center"
            style={{ backgroundColor: Colors.primary.blue }}
          >
            <Text className="text-white text-2xl font-bold">
              {lawyerData.name.charAt(0)}
            </Text>
          </Box>
          <Text
            className="text-lg font-bold mb-1 text-center"
            style={{ color: Colors.text.head }}
          >
            {lawyerData.name}
          </Text>
          <Text
            className="text-sm mb-4 text-center"
            style={{ color: Colors.text.sub }}
          >
            {lawyerData.specialization}
          </Text>
          <HStack className="items-center mb-2">
            <Ionicons name="time-outline" size={16} color={Colors.text.sub} />
            <Text className="text-sm ml-2" style={{ color: Colors.text.sub }}>
              {lawyerData.hours}
            </Text>
          </HStack>
          <HStack className="items-center">
            <Ionicons
              name="calendar-outline"
              size={16}
              color={Colors.text.sub}
            />
            <Text className="text-sm ml-2" style={{ color: Colors.text.sub }}>
              {lawyerData.days}
            </Text>
          </HStack>
        </VStack>

        {/* Schedule */}
        <VStack className="mx-6 mb-6">
          <HStack className="items-center justify-between mb-4">
            <Text
              className="text-lg font-semibold"
              style={{ color: Colors.text.head }}
            >
              Schedule
            </Text>
            <Pressable
              className="border border-gray-300 rounded-lg px-3 py-1 bg-white flex-row items-center"
              onPress={() => setMonthDropdownVisible(!monthDropdownVisible)}
            >
              <Text style={{ color: Colors.text.head }}>{selectedMonth}</Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={Colors.text.sub}
                style={tw`ml-1`}
              />
            </Pressable>
          </HStack>

          {monthDropdownVisible && (
            <VStack className="bg-white border border-gray-300 rounded-lg mb-4">
              {months.map((month) => (
                <Pressable
                  key={month}
                  className="px-4 py-2"
                  onPress={() => {
                    setSelectedMonth(month);
                    setMonthDropdownVisible(false);
                  }}
                >
                  <Text style={{ color: Colors.text.head }}>{month}</Text>
                </Pressable>
              ))}
            </VStack>
          )}

          {/* Calendar Days */}
          <HStack className="justify-between mb-6">
            {calendarDays.map((day) => (
              <Pressable
                key={day.date}
                className="w-12 h-16 rounded-lg items-center justify-center"
                style={{
                  backgroundColor:
                    selectedDay === day.date ? Colors.primary.blue : "white",
                }}
                onPress={() => setSelectedDay(day.date)}
              >
                <Text
                  className="text-lg font-bold mb-1"
                  style={{
                    color:
                      selectedDay === day.date ? "white" : Colors.text.head,
                  }}
                >
                  {day.date}
                </Text>
                <Text
                  className="text-xs"
                  style={{
                    color: selectedDay === day.date ? "white" : Colors.text.sub,
                  }}
                >
                  {day.day}
                </Text>
              </Pressable>
            ))}
          </HStack>

          {/* Time Slots */}
          <Text
            className="text-base font-semibold mb-3"
            style={{ color: Colors.text.head }}
          >
            Slots Available
          </Text>
          <HStack className="flex-wrap">
            {timeSlots.map((slot) => (
              <Pressable
                key={slot.id}
                className="mr-3 mb-3 px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor:
                    selectedTimeSlot === slot.id
                      ? Colors.primary.blue
                      : "white",
                  borderColor:
                    selectedTimeSlot === slot.id
                      ? Colors.primary.blue
                      : "#E5E7EB",
                }}
                onPress={() => setSelectedTimeSlot(slot.id)}
              >
                <Text
                  className="text-sm font-medium"
                  style={{
                    color:
                      selectedTimeSlot === slot.id ? "white" : Colors.text.head,
                  }}
                >
                  {slot.time}
                </Text>
              </Pressable>
            ))}
          </HStack>
        </VStack>

        {/* Contact Info */}
        <VStack className="mx-6 mb-6">
          <Text
            className="text-base font-semibold mb-4"
            style={{ color: Colors.text.head }}
          >
            Email
          </Text>
          <Input className="mb-4">
            <InputField
              className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
              style={{ color: Colors.text.head }}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
            />
          </Input>

          <HStack className="justify-between mb-4">
            <VStack className="flex-1 mr-2">
              <Text
                className="text-base font-semibold mb-2"
                style={{ color: Colors.text.head }}
              >
                Mobile Number
              </Text>
              <Input>
                <InputField
                  className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                  style={{ color: Colors.text.head }}
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
                />
              </Input>
            </VStack>

            <VStack className="flex-1 ml-2">
              <Text
                className="text-base font-semibold mb-2"
                style={{ color: Colors.text.head }}
              >
                Mode of communication
              </Text>
              <Pressable
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between"
                onPress={() => setModeDropdownVisible(!modeDropdownVisible)}
              >
                <Text style={{ color: Colors.text.head }}>
                  {communicationMode}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={Colors.text.sub}
                />
              </Pressable>
              {modeDropdownVisible && (
                <VStack className="bg-white border border-gray-300 rounded-lg mt-2">
                  {communicationModes.map((mode) => (
                    <Pressable
                      key={mode}
                      className="px-4 py-2"
                      onPress={() => {
                        setCommunicationMode(mode);
                        setModeDropdownVisible(false);
                      }}
                    >
                      <Text style={{ color: Colors.text.head }}>{mode}</Text>
                    </Pressable>
                  ))}
                </VStack>
              )}
            </VStack>
          </HStack>

          <Text
            className="text-base font-semibold mb-2"
            style={{ color: Colors.text.head }}
          >
            Concern
          </Text>
          <Input>
            <InputField
              className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
              style={{
                color: Colors.text.head,
                height: 120,
                textAlignVertical: "top",
              }}
              value={concern}
              onChangeText={setConcern}
              placeholder="State your concern here..."
              multiline
              numberOfLines={5}
            />
          </Input>
        </VStack>

        {/* Book Button */}
        <Box className="mx-6">
          <Button
            className="py-4 rounded-lg items-center justify-center"
            style={{ backgroundColor: Colors.primary.blue }}
            onPress={handleBookConsultation}
          >
            <Text className="text-white font-semibold text-base">
              Book Consultation with {lawyerData.name.split(' ')[1]}
            </Text>
          </Button>
        </Box>
      </ScrollView>

      <Navbar activeTab="find" onTabPress={handleBottomNavChange} />
    </Box>
  );
}