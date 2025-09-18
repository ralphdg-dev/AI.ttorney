import React, { useState, useEffect } from "react";
import { Alert, useWindowDimensions } from "react-native";
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
  month: number;
  year: number;
  isToday?: boolean;
  isSelected?: boolean;
  isCurrentMonth?: boolean;
}

interface LawyerData {
  id: string;
  name: string;
  specializations: string[];
  hours: string;
  days: string;
}

export default function LawyerBookingView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375; // iPhone SE and similar small devices
  
  const [lawyerData, setLawyerData] = useState<LawyerData | null>(null);
  
  const [bottomActiveTab, setBottomActiveTab] = useState("find");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("9:00AM-10:00AM");
  const [email, setEmail] = useState("user@email.com");
  const [mobileNumber, setMobileNumber] = useState("09123456789");
  const [communicationMode, setCommunicationMode] = useState("Online");
  const [concern, setConcern] = useState("");

  const [monthDropdownVisible, setMonthDropdownVisible] = useState(false);
  const [modeDropdownVisible, setModeDropdownVisible] = useState(false);
  const [showAllSpecializations, setShowAllSpecializations] = useState(false);

  // Get current date
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();
  const currentYear = today.getFullYear();
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedDay, setSelectedDay] = useState(currentDate);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const communicationModes = ["Online", "In-person", "Phone"];

  const timeSlots: TimeSlot[] = [
    { id: "8:00AM-9:00AM", time: "8:00AM-9:00AM", available: true },
    { id: "9:00AM-10:00AM", time: "9:00AM-10:00AM", available: true },
    { id: "10:00AM-11:00AM", time: "10:00AM-11:00AM", available: true },
  ];

  // Function to generate all days for the selected month
  const generateCalendarDays = (month: number, year: number) => {
    const days: CalendarDay[] = [];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Days from previous month to show
    const daysFromPrevMonth = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Days from next month to show (to complete the grid)
    const totalDays = daysFromPrevMonth + lastDay.getDate();
    const daysFromNextMonth = totalDays <= 35 ? 35 - totalDays : 42 - totalDays;
    
    // Add days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = prevMonthLastDay - i;
      const dayDate = new Date(year, month - 1, date);
      
      days.push({
        date,
        day: daysOfWeek[dayDate.getDay()],
        month: month - 1,
        year: year,
        isCurrentMonth: false
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dayDate = new Date(year, month, i);
      const isToday = dayDate.getDate() === today.getDate() && 
                     dayDate.getMonth() === today.getMonth() && 
                     dayDate.getFullYear() === today.getFullYear();
      const isSelected = i === selectedDay && month === selectedMonth && year === selectedYear;
      
      days.push({
        date: i,
        day: daysOfWeek[dayDate.getDay()],
        month,
        year,
        isToday,
        isSelected,
        isCurrentMonth: true
      });
    }
    
    // Add days from next month
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const dayDate = new Date(year, month + 1, i);
      
      days.push({
        date: i,
        day: daysOfWeek[dayDate.getDay()],
        month: month + 1,
        year: year,
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  // Initialize calendar days
  useEffect(() => {
    setCalendarDays(generateCalendarDays(selectedMonth, selectedYear));
  }, [selectedMonth, selectedYear, selectedDay]);

  // Navigate to previous month
  const navigateToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    setSelectedDay(1); // Reset to first day of the month
  };

  // Navigate to next month
  const navigateToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    setSelectedDay(1); // Reset to first day of the month
  };

  // Handle day selection
  const handleDaySelect = (day: CalendarDay) => {
    if (!day.isCurrentMonth) {
      // If selecting a day from previous/next month, switch to that month
      setSelectedMonth(day.month);
      setSelectedYear(day.year);
    }
    setSelectedDay(day.date);
  };

  useEffect(() => {
    // Extract lawyer data from route params
    if (params.lawyerId) {
      try {
        const specializations = params.lawyerSpecializations 
          ? JSON.parse(params.lawyerSpecializations as string)
          : ["General Law"];
          
        setLawyerData({
          id: params.lawyerId as string,
          name: params.lawyerName as string,
          specializations: specializations,
          hours: params.lawyerHours as string,
          days: params.lawyerDays as string
        });
      } catch (error) {
        console.error("Error parsing specializations:", error);
        setLawyerData({
          id: params.lawyerId as string,
          name: params.lawyerName as string,
          specializations: ["General Law"],
          hours: params.lawyerHours as string,
          days: params.lawyerDays as string
        });
      }
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

  // Get the first specialization and count the rest
  const primarySpecialization = lawyerData.specializations[0];
  const additionalCount = lawyerData.specializations.length - 1;

  return (
    <Box className="flex-1 bg-gray-50">
      {/* Header */}
      <HStack className="items-center justify-between px-4 pt-10 pb-3 bg-white">
        <Pressable onPress={handleBackPress} className="p-2">
          <Ionicons name="arrow-back" size={24} color={Colors.primary.blue} />
        </Pressable>
        <Text
          className={`${isSmallScreen ? 'text-base' : 'text-lg'} font-bold`}
          style={{ color: Colors.primary.blue }}
        >
          Talk to a Lawyer
        </Text>
        <Box className="w-8" />
      </HStack>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Lawyer Profile */}
        <VStack className="mx-4 mt-4 mb-5 bg-white rounded-lg p-5 items-center">
          <Box
            className={`${isSmallScreen ? 'w-16 h-16' : 'w-20 h-20'} rounded-full mb-4 items-center justify-center`}
            style={{ backgroundColor: Colors.primary.blue }}
          >
            <Text className="text-white text-xl font-bold">
              {lawyerData.name.charAt(0)}
            </Text>
          </Box>
          <Text
            className={`${isSmallScreen ? 'text-base' : 'text-lg'} font-bold mb-1 text-center`}
            style={{ color: Colors.text.head }}
          >
            {lawyerData.name}
          </Text>
          
          {/* Specializations */}
          <Pressable 
            onPress={() => setShowAllSpecializations(!showAllSpecializations)}
            className="mb-4"
          >
            <HStack className="items-center flex-wrap justify-center">
              <Text
                className="text-sm text-center"
                style={{ color: Colors.text.sub }}
              >
                {primarySpecialization}
              </Text>
              {additionalCount > 0 && (
                <Text
                  className="text-sm ml-1"
                  style={{ color: Colors.primary.blue }}
                >
                  + {additionalCount} more
                </Text>
              )}
            </HStack>
          </Pressable>

          {showAllSpecializations && (
            <Box className="mb-4 p-3 bg-gray-100 rounded-lg w-full">
              <Text 
                className="text-sm font-semibold mb-2 text-center" 
                style={{ color: Colors.text.head }}
              >
                All Specializations:
              </Text>
              {lawyerData.specializations.map((spec, index) => (
                <Text 
                  key={index} 
                  className="text-sm text-center" 
                  style={{ color: Colors.text.sub }}
                >
                  • {spec}
                </Text>
              ))}
            </Box>
          )}

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
        <VStack className="mx-4 mb-5">
          <HStack className="items-center justify-between mb-4">
            <Text
              className={`${isSmallScreen ? 'text-base' : 'text-lg'} font-semibold`}
              style={{ color: Colors.text.head }}
            >
              Schedule
            </Text>
          </HStack>

          {monthDropdownVisible && (
            <VStack className="bg-white border border-gray-300 rounded-lg mb-4">
              {months.map((month, index) => (
                <Pressable
                  key={month}
                  className="px-4 py-2"
                  onPress={() => {
                    setSelectedMonth(index);
                    setMonthDropdownVisible(false);
                    
                    // Reset to today if selecting current month
                    if (index === currentMonth) {
                      setSelectedDay(currentDate);
                      setSelectedYear(currentYear);
                    } else {
                      setSelectedDay(1);
                    }
                  }}
                >
                  <Text style={{ 
                    color: index === selectedMonth ? Colors.primary.blue : Colors.text.head,
                    fontWeight: index === selectedMonth ? 'bold' : 'normal'
                  }}>
                    {month} {currentYear}
                  </Text>
                </Pressable>
              ))}
            </VStack>
          )}

          {/* Calendar Navigation */}
          <HStack className="items-center justify-between mb-4">
            <Pressable onPress={navigateToPreviousMonth}>
              <Ionicons name="chevron-back" size={24} color={Colors.primary.blue} />
            </Pressable>
            
            <Text className="text-base font-semibold" style={{ color: Colors.text.head }}>
              {months[selectedMonth]} {selectedYear}
            </Text>
            
            <Pressable onPress={navigateToNextMonth}>
              <Ionicons name="chevron-forward" size={24} color={Colors.primary.blue} />
            </Pressable>
          </HStack>

          {/* Calendar Grid */}
          <HStack className="flex-wrap justify-between mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <Box key={day} className={`${isSmallScreen ? 'w-10' : 'w-12'} items-center mb-2`}>
                <Text className="text-xs font-semibold" style={{ color: Colors.text.sub }}>
                  {day}
                </Text>
              </Box>
            ))}
            
            {calendarDays.map((day) => (
              <Pressable
                key={`${day.month}-${day.date}`}
                className={`${isSmallScreen ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg items-center justify-center mb-1`}
                style={{
                  backgroundColor: day.isSelected 
                    ? Colors.primary.blue 
                    : day.isToday
                      ? Colors.primary.lightBlue
                      : "transparent",
                  opacity: day.isCurrentMonth ? 1 : 0.4
                }}
                onPress={() => handleDaySelect(day)}
              >
                <Text
                  className={`${isSmallScreen ? 'text-sm' : 'text-base'} font-medium`}
                  style={{
                    color: day.isSelected ? "white" : 
                           day.isToday ? Colors.primary.blue : 
                           Colors.text.head,
                  }}
                >
                  {day.date}
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
                className="mr-2 mb-2 px-3 py-1.5 rounded-lg border"
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
                  className="text-xs font-medium"
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
        <VStack className="mx-4 mb-5">
          <Text
            className="text-base font-semibold mb-3"
            style={{ color: Colors.text.head }}
          >
            Email
          </Text>
          <Input className="mb-4">
            <InputField
              className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
              style={{ color: Colors.text.head, fontSize: 14 }}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
            />
          </Input>

          <VStack className="mb-4">
            <Text
              className="text-base font-semibold mb-2"
              style={{ color: Colors.text.head }}
            >
              Mobile Number
            </Text>
            <Input className="mb-4">
              <InputField
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                style={{ color: Colors.text.head, fontSize: 14 }}
                value={mobileNumber}
                onChangeText={setMobileNumber}
                placeholder="Enter mobile number"
                keyboardType="phone-pad"
              />
            </Input>

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
              <Text style={{ color: Colors.text.head, fontSize: 14 }}>
                {communicationMode}
              </Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={Colors.text.sub}
              />
            </Pressable>
            {modeDropdownVisible && (
              <VStack className="bg-white border border-gray-300 rounded-lg mt-1">
                {communicationModes.map((mode) => (
                  <Pressable
                    key={mode}
                    className="px-4 py-2"
                    onPress={() => {
                      setCommunicationMode(mode);
                      setModeDropdownVisible(false);
                    }}
                  >
                    <Text style={{ color: Colors.text.head, fontSize: 14 }}>{mode}</Text>
                  </Pressable>
                ))}
              </VStack>
            )}
          </VStack>

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
                height: 100,
                textAlignVertical: "top",
                fontSize: 14
              }}
              value={concern}
              onChangeText={setConcern}
              placeholder="State your concern here..."
              multiline
              numberOfLines={4}
            />
          </Input>
        </VStack>

        {/* Book Button */}
        <Box className="mx-4 mb-8">
          <Button
            className="py-4 rounded-lg items-center justify-center"
            style={{ backgroundColor: Colors.primary.blue }}
            onPress={handleBookConsultation}
          >
            <Text className="text-white font-semibold text-sm">
              Book Consultation with {lawyerData.name.split(' ')[1]}
            </Text>
          </Button>
        </Box>
      </ScrollView>

      <Navbar activeTab="find" onTabPress={handleBottomNavChange} />
    </Box>
  );
}