import React, { useState, useEffect } from "react";
import { Alert, useWindowDimensions, Modal, SafeAreaView, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Calendar, Clock, Mail, Phone, MessageSquare, Video, MapPin, User, Check, ChevronLeft, ChevronRight, X } from "lucide-react-native";
import Colors from "../../constants/Colors";
import Navbar from "@/components/Navbar";
import Header from "@/components/Header";
import { SidebarWrapper } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { ScrollView } from "@/components/ui/scroll-view";
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

interface DayAvailability {
  day: string;
  times: string[];
}

interface LawyerData {
  id: string;
  name: string;
  specialization: string[];
  hours: string;
  days: string;
  bio: string;
  hours_available: DayAvailability[];
}

interface ValidationErrors {
  email?: string;
  mobileNumber?: string;
  concern?: string;
  timeSlot?: string;
}

export default function LawyerBookingView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const { user } = useAuth();

  const [lawyerData, setLawyerData] = useState<LawyerData | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("9:00AM-10:00AM");
  const [email, setEmail] = useState(user?.email || "");
  const [mobileNumber, setMobileNumber] = useState("");
  const [communicationMode, setCommunicationMode] = useState("Online");
  const [concern, setConcern] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);

  const [showAllSpecializations, setShowAllSpecializations] = useState(false);

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();
  const currentYear = today.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedDay, setSelectedDay] = useState(currentDate);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  
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

  const isMediumScreen = width >= 375 && width < 768;
  const isLargeScreen = width >= 768;

  const parseHoursAvailable = (hoursAvailable: string[]): DayAvailability[] => {
    const dayAvailability: DayAvailability[] = [];

    hoursAvailable.forEach((daySchedule) => {
      const [dayPart, timesPart] = daySchedule.split("=");
      if (dayPart && timesPart) {
        const day = dayPart.trim();
        const times = timesPart.split(",").map((time) => time.trim());
        dayAvailability.push({ day, times });
      }
    });

    return dayAvailability;
  };

  const getTimeSlotsForSelectedDay = (): TimeSlot[] => {
    if (!lawyerData || !lawyerData.hours_available) return [];

    const selectedDate = new Date(selectedYear, selectedMonth, selectedDay);
    const selectedDayName = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    const dayAvailability = lawyerData.hours_available.find(
      (availability) =>
        availability.day.toLowerCase() === selectedDayName.toLowerCase()
    );

    if (!dayAvailability) return [];

    return dayAvailability.times.map((time, index) => ({
      id: `slot-${selectedDayName}-${index}`,
      time: time,
      available: true,
    }));
  };

  const timeSlots: TimeSlot[] = getTimeSlotsForSelectedDay();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobileNumber = (mobile: string): boolean => {
    const mobileRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
    return mobileRegex.test(mobile.trim());
  };

  const validateBookingForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!email.trim()) {
      errors.email = "Email address is required";
    } else if (!validateEmail(email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!mobileNumber.trim()) {
      errors.mobileNumber = "Mobile number is required";
    } else if (!validateMobileNumber(mobileNumber)) {
      errors.mobileNumber = "Please enter a valid mobile number";
    }

    if (!concern.trim()) {
      errors.concern = "Please describe your concern";
    }

    if (!selectedTimeSlot) {
      errors.timeSlot = "Please select a time slot";
    }

    return errors;
  };

  const getFormattedDate = (): string => {
    const date = new Date(selectedYear, selectedMonth, selectedDay);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getSelectedTimeSlotText = (): string => {
    const slot = timeSlots.find((slot) => slot.id === selectedTimeSlot);
    return slot ? slot.time : selectedTimeSlot;
  };

  const getFormattedDateForAPI = (): string => {
    return `${selectedYear}-${(selectedMonth + 1)
      .toString()
      .padStart(2, "0")}-${selectedDay.toString().padStart(2, "0")}`;
  };

  // Initialize lawyer data from params immediately - no API call needed
  const initializeLawyerData = () => {
    try {
      const specialization = params.lawyerSpecialization
        ? JSON.parse(params.lawyerSpecialization as string)
        : ["General Law"];

      const hours_available = params.lawyerhours_available
        ? JSON.parse(params.lawyerhours_available as string)
        : [];

      const lawyerInfo: LawyerData = {
        id: params.lawyerId as string,
        name: params.lawyerName as string,
        specialization: specialization,
        hours: params.lawyerHours as string,
        days: params.lawyerDays as string,
        hours_available: parseHoursAvailable(hours_available),
        bio: params.lawyerBio as string,
      };

      setLawyerData(lawyerInfo);
    } catch (error) {
      console.error("Error parsing lawyer data from params:", error);
      // Fallback to basic data
      setLawyerData({
        id: params.lawyerId as string,
        name: params.lawyerName as string,
        specialization: ["General Law"],
        hours: params.lawyerHours as string,
        days: params.lawyerDays as string,
        hours_available: [],
        bio: (params.lawyerBio as string) || "",
      });
    }
  };

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  // Initialize lawyer data from params instead of making API call
  useEffect(() => {
    if (params.lawyerId && params.lawyerName) {
      initializeLawyerData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateCalendarDays = (month: number, year: number) => {
    const days: CalendarDay[] = [];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysFromPrevMonth = firstDay.getDay();
    const totalDays = daysFromPrevMonth + lastDay.getDate();
    const daysFromNextMonth = totalDays <= 35 ? 35 - totalDays : 42 - totalDays;

    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = prevMonthLastDay - i;
      const dayDate = new Date(year, month - 1, date);

      days.push({
        date,
        day: daysOfWeek[dayDate.getDay()],
        month: month - 1,
        year: year,
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dayDate = new Date(year, month, i);
      const isToday =
        dayDate.getDate() === today.getDate() &&
        dayDate.getMonth() === today.getMonth() &&
        dayDate.getFullYear() === today.getFullYear();
      const isSelected =
        i === selectedDay && month === selectedMonth && year === selectedYear;

      days.push({
        date: i,
        day: daysOfWeek[dayDate.getDay()],
        month,
        year,
        isToday,
        isSelected,
        isCurrentMonth: true,
      });
    }

    for (let i = 1; i <= daysFromNextMonth; i++) {
      const dayDate = new Date(year, month + 1, i);

      days.push({
        date: i,
        day: daysOfWeek[dayDate.getDay()],
        month: month + 1,
        year: year,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  useEffect(() => {
    setCalendarDays(generateCalendarDays(selectedMonth, selectedYear));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const navigateToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    setSelectedDay(1);
  };

  const navigateToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    setSelectedDay(1);
  };

  const handleDaySelect = (day: CalendarDay) => {
    if (!day.isCurrentMonth) {
      setSelectedMonth(day.month);
      setSelectedYear(day.year);
    }
    setSelectedDay(day.date);

    setSelectedTimeSlot("");

    if (validationErrors.timeSlot) {
      setValidationErrors((prev) => ({ ...prev, timeSlot: undefined }));
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleBookConsultation = () => {
    const errors = validateBookingForm();

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstError = Object.values(errors)[0];
      Alert.alert("Validation Error", firstError);
      return;
    }

    setValidationErrors({});
    setShowConfirmationModal(true);
  };

  const proceedWithBooking = async () => {
    setShowConfirmationModal(false);
    setIsSubmitting(true);

    try {
      const consultationRequestData = {
        user_id: user?.id || "anonymous",
        lawyer_id: lawyerData?.id,
        message: concern.trim(),
        email: email.trim(),
        mobile_number: mobileNumber.trim(),
        consultation_date: getFormattedDateForAPI(),
        consultation_time: getSelectedTimeSlotText(),
        consultation_mode: communicationMode,
      };

      console.log("Sending consultation request:", consultationRequestData);

      const { NetworkConfig } = await import('@/utils/networkConfig');
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(
        `${apiUrl}/consultation-requests/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(consultationRequestData),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert(
          "Success",
          `Consultation request sent to ${lawyerData?.name}!\n\nYou will receive a confirmation email shortly.`,
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        throw new Error(
          result.error || result.detail || "Failed to book consultation"
        );
      }
    } catch (error) {
      console.error("Booking error:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to book consultation. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (validationErrors.email) {
      setValidationErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handleMobileChange = (value: string) => {
    setMobileNumber(value);
    if (validationErrors.mobileNumber) {
      setValidationErrors((prev) => ({ ...prev, mobileNumber: undefined }));
    }
  };

  const handleConcernChange = (value: string) => {
    setConcern(value);
    if (validationErrors.concern) {
      setValidationErrors((prev) => ({ ...prev, concern: undefined }));
    }
  };

  // Removed handleBottomNavChange - navbar will use default navigation

  const getTruncatedBio = (bio: string, maxLength: number) => {
    if (!bio || bio.trim() === "") return "";
    if (bio.length <= maxLength) return bio;
    return bio.substring(0, maxLength).trim() + "...";
  };

  if (!lawyerData) {
    return (
      <Box className="flex-1 bg-gray-50 items-center justify-center">
        <Text>Loading lawyer information...</Text>
      </Box>
    );
  }

  const primarySpecialization = lawyerData.specialization[0];
  const additionalCount = lawyerData.specialization.length - 1;
  const bioMaxLength = isSmallScreen ? 100 : isMediumScreen ? 100 : 200;
  const shouldShowReadMore =
    lawyerData.bio && lawyerData.bio.length > bioMaxLength;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <Box className="flex-1" style={{ backgroundColor: Colors.background.secondary }}>
        <Header title="Book Consultation" showMenu={true} showBackButton={true} onBackPress={handleBackPress} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Lawyer Profile Card - Modern Design */}
        <VStack className={`${isSmallScreen ? 'mx-3 p-4' : 'mx-4 p-5'} mt-4 mb-3 bg-white rounded-2xl shadow-sm`}>
          <HStack className="items-center mb-4">
            <Box
              className={`${
                isSmallScreen ? "w-16 h-16" : "w-20 h-20"
              } rounded-full items-center justify-center mr-4`}
              style={{ backgroundColor: Colors.primary.blue }}
            >
              <User size={isSmallScreen ? 32 : 40} color="white" strokeWidth={2} />
            </Box>
            <VStack className="flex-1">
              <Text
                className={`${
                  isSmallScreen ? "text-lg" : "text-xl"
                } font-bold mb-1`}
                style={{ color: Colors.text.head }}
              >
                {lawyerData.name}
              </Text>
              <HStack className="items-center">
                <Calendar size={14} color={Colors.text.sub} strokeWidth={2} />
                <Text className="text-sm ml-1.5" style={{ color: Colors.text.sub }}>
                  {lawyerData.days}
                </Text>
              </HStack>
            </VStack>
          </HStack>

          {/* Specializations - Modern Pills */}
          <VStack className="mb-4">
            <Text className="text-xs font-semibold mb-2" style={{ color: Colors.text.secondary }}>
              SPECIALIZATIONS
            </Text>
            <HStack className="flex-wrap">
              <Box className="px-3 py-1.5 rounded-full mr-2 mb-2" style={{ backgroundColor: '#EFF6FF' }}>
                <Text className="text-sm font-medium" style={{ color: Colors.primary.blue }}>
                  {primarySpecialization}
                </Text>
              </Box>
              {additionalCount > 0 && (
                <TouchableOpacity
                  onPress={() => setShowAllSpecializations(!showAllSpecializations)}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F3F4F6', marginRight: 8, marginBottom: 8 }}
                >
                  <Text className="text-sm font-medium" style={{ color: Colors.primary.blue }}>
                    +{additionalCount} more
                  </Text>
                </TouchableOpacity>
              )}
            </HStack>
          </VStack>

          {showAllSpecializations && (
            <Box className="mb-4 p-3 bg-gray-100 rounded-lg w-full">
              <Text
                className="text-sm font-semibold mb-2 text-center"
                style={{ color: Colors.text.head }}
              >
                All Specializations:
              </Text>
              {lawyerData.specialization.map((spec, index) => (
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

          {lawyerData.bio && lawyerData.bio.trim() !== "" ? (
            <VStack
              className={`mt-4 p-4 bg-gray-50 rounded-lg ${
                isLargeScreen ? "mx-8" : "mx-0"
              }`}
            >
              <Text className="text-xs font-semibold mb-3" style={{ color: Colors.text.secondary }}>
                ABOUT
              </Text>

              <Text
                className={`${
                  isSmallScreen
                    ? "text-xs leading-5"
                    : isMediumScreen
                    ? "text-sm leading-6"
                    : "text-base leading-7"
                }`}
                style={{
                  color: Colors.text.sub,
                  textAlign: "justify",
                }}
              >
                {showFullBio || !shouldShowReadMore
                  ? lawyerData.bio
                  : getTruncatedBio(lawyerData.bio, bioMaxLength)}
              </Text>

              {shouldShowReadMore && (
                <Pressable
                  onPress={() => setShowFullBio(!showFullBio)}
                  className="mt-2"
                >
                  <Text
                    className={`${
                      isSmallScreen ? "text-xs" : "text-sm"
                    } font-medium`}
                    style={{ color: Colors.primary.blue }}
                  >
                    {showFullBio ? "Show Less" : "Read More"}
                  </Text>
                </Pressable>
              )}
            </VStack>
          ) : (
            <Box className="mt-4 p-4 bg-gray-50 rounded-lg">
              <Text className="text-sm italic text-center" style={{ color: Colors.text.sub }}>
                No bio available
              </Text>
            </Box>
          )}
        </VStack>

        {/* Schedule - Modern Card */}
        <VStack className={`${isSmallScreen ? 'mx-3 p-4' : 'mx-4 p-5'} mb-3 bg-white rounded-2xl shadow-sm`}>
          <HStack className="items-center mb-4">
            <Clock size={20} color={Colors.primary.blue} strokeWidth={2} />
            <Text className="text-lg font-bold ml-2" style={{ color: Colors.text.head }}>
              Select Date & Time
            </Text>
          </HStack>

          {/* Calendar Navigation - Modern */}
          <HStack className="items-center justify-between mb-4 px-2">
            <TouchableOpacity
              onPress={navigateToPreviousMonth}
              style={{ padding: 8, borderRadius: 8, backgroundColor: '#F9FAFB' }}
            >
              <ChevronLeft size={20} color={Colors.primary.blue} strokeWidth={2.5} />
            </TouchableOpacity>

            <Text className="text-base font-bold" style={{ color: Colors.text.head }}>
              {months[selectedMonth]} {selectedYear}
            </Text>

            <TouchableOpacity
              onPress={navigateToNextMonth}
              style={{ padding: 8, borderRadius: 8, backgroundColor: '#F9FAFB' }}
            >
              <ChevronRight size={20} color={Colors.primary.blue} strokeWidth={2.5} />
            </TouchableOpacity>
          </HStack>

          {/* Calendar Grid */}
          <HStack className="flex-wrap justify-between mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <Box
                key={day}
                className={`${
                  isSmallScreen ? "w-10" : "w-12"
                } items-center mb-2`}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: Colors.text.sub }}
                >
                  {day}
                </Text>
              </Box>
            ))}

            {calendarDays.map((day) => {
              const dayDate = new Date(day.year, day.month, day.date);
              const isPastDay =
                dayDate <
                new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  today.getDate()
                );

              return (
                <Pressable
                  key={`${day.month}-${day.date}`}
                  className={`${
                    isSmallScreen ? "w-10 h-10" : "w-12 h-12"
                  } rounded-lg items-center justify-center mb-1`}
                  disabled={!day.isCurrentMonth || isPastDay} // 🔒 disable past days
                  style={{
                    backgroundColor: day.isSelected
                      ? Colors.primary.blue
                      : day.isToday
                      ? "#E3F2FD"
                      : "transparent",
                    opacity: !day.isCurrentMonth || isPastDay ? 0.3 : 1, // faded style for past days
                  }}
                  onPress={() => {
                    if (!isPastDay) handleDaySelect(day);
                  }}
                >
                  <Text
                    className={`${
                      isSmallScreen ? "text-sm" : "text-base"
                    } font-medium`}
                    style={{
                      color: day.isSelected
                        ? "white"
                        : day.isToday
                        ? Colors.primary.blue
                        : Colors.text.head,
                    }}
                  >
                    {day.date}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>

          {/* Time Slots - Modern Grid */}
          <Text className="text-sm font-semibold mb-3" style={{ color: Colors.text.head }}>
            Available Time Slots
          </Text>
          {validationErrors.timeSlot && (
            <Text className="text-red-500 text-xs mb-2">
              {validationErrors.timeSlot}
            </Text>
          )}
          <VStack>

            {timeSlots.length > 0 ? (
              <HStack className="flex-wrap">
                {timeSlots.map((slot) => {
                  const selectedDate = new Date(
                    selectedYear,
                    selectedMonth,
                    selectedDay
                  );
                  const isTodaySelected =
                    selectedDate.toDateString() === today.toDateString();

                  let isPastTime = false;

                  if (isTodaySelected) {
                    // Extract time from slot.time (like "9:00AM-10:00AM")
                    const [start] = slot.time.split("-");
                    const timeStr = start.trim().toUpperCase();
                    const match = timeStr.match(
                      /(\d{1,2}):?(\d{0,2})?\s?(AM|PM)/i
                    );

                    if (match) {
                      let [, hour, minute, period] = match;
                      let h = parseInt(hour);
                      const m = minute ? parseInt(minute) : 0;
                      if (period.toUpperCase() === "PM" && h < 12) h += 12;
                      if (period.toUpperCase() === "AM" && h === 12) h = 0;

                      const slotTime = new Date();
                      slotTime.setHours(h, m, 0, 0);

                      isPastTime = slotTime.getTime() < today.getTime();
                    }
                  }

                  const isDisabled = isPastTime || !slot.available;

                  return (
                    <TouchableOpacity
                      key={slot.id}
                      disabled={isDisabled}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 12,
                        marginRight: 8,
                        marginBottom: 8,
                        borderWidth: selectedTimeSlot === slot.id ? 0 : 1,
                        backgroundColor: selectedTimeSlot === slot.id ? Colors.primary.blue : 'white',
                        borderColor: '#E5E7EB',
                        opacity: isDisabled ? 0.4 : 1,
                      }}
                      onPress={() => {
                        if (!isDisabled) {
                          setSelectedTimeSlot(slot.id);
                          if (validationErrors.timeSlot) {
                            setValidationErrors((prev) => ({
                              ...prev,
                              timeSlot: undefined,
                            }));
                          }
                        }
                      }}
                    >
                      <HStack className="items-center">
                        <Clock size={14} color={selectedTimeSlot === slot.id ? "white" : Colors.text.sub} strokeWidth={2} />
                        <Text
                          className="text-sm font-semibold ml-1.5"
                          style={{
                            color: selectedTimeSlot === slot.id ? "white" : Colors.text.head,
                          }}
                        >
                          {slot.time}
                        </Text>
                      </HStack>
                    </TouchableOpacity>
                  );
                })}
              </HStack>
            ) : (
              <Text className="text-sm text-gray-500">
                No available slots for the selected day
              </Text>
            )}
          </VStack>
        </VStack>

        {/* Contact Info - Modern Card */}
        <VStack className={`${isSmallScreen ? 'mx-3 p-4' : 'mx-4 p-5'} mb-3 bg-white rounded-2xl shadow-sm`}>
          <HStack className="items-center mb-4">
            <MessageSquare size={20} color={Colors.primary.blue} strokeWidth={2} />
            <Text className="text-lg font-bold ml-2" style={{ color: Colors.text.head }}>
              Your Information
            </Text>
          </HStack>

          <VStack className="mb-3">
            <Text className="text-xs font-semibold mb-2" style={{ color: Colors.text.secondary }}>
              EMAIL ADDRESS
            </Text>
            <HStack className={`items-center ${isSmallScreen ? 'px-3 py-3' : 'px-4 py-3.5'} rounded-lg border`} style={{ borderColor: validationErrors.email ? '#EF4444' : '#E5E7EB', backgroundColor: 'white' }}>
              <Mail size={18} color={validationErrors.email ? '#EF4444' : Colors.text.sub} strokeWidth={2} />
              <TextInput
                style={{ flex: 1, marginLeft: 8, color: Colors.text.head, fontSize: 14, padding: 0, outlineStyle: 'none' } as any}
                value={email}
                onChangeText={handleEmailChange}
                placeholder="your.email@example.com"
                keyboardType="email-address"
                placeholderTextColor={Colors.text.tertiary}
              />
            </HStack>
            {validationErrors.email && (
              <Text className="text-red-500 text-xs mt-1">
                {validationErrors.email}
              </Text>
            )}
          </VStack>

          <VStack className="mb-3">
            <Text className="text-xs font-semibold mb-2" style={{ color: Colors.text.secondary }}>
              MOBILE NUMBER
            </Text>
            <HStack className={`items-center ${isSmallScreen ? 'px-3 py-3' : 'px-4 py-3.5'} rounded-lg border`} style={{ borderColor: validationErrors.mobileNumber ? '#EF4444' : '#E5E7EB', backgroundColor: 'white' }}>
              <Phone size={18} color={validationErrors.mobileNumber ? '#EF4444' : Colors.text.sub} strokeWidth={2} />
              <TextInput
                style={{ flex: 1, marginLeft: 8, color: Colors.text.head, fontSize: 14, padding: 0, outlineStyle: 'none' } as any}
                value={mobileNumber}
                onChangeText={handleMobileChange}
                placeholder="+63 912 345 6789"
                keyboardType="phone-pad"
                placeholderTextColor={Colors.text.tertiary}
              />
            </HStack>
            {validationErrors.mobileNumber && (
              <Text className="text-red-500 text-xs mt-1">
                {validationErrors.mobileNumber}
              </Text>
            )}
          </VStack>

          <VStack className="mb-3">
            <Text className="text-xs font-semibold mb-2" style={{ color: Colors.text.secondary }}>
              CONSULTATION MODE
            </Text>
            <VStack className="gap-2">
              {communicationModes.map((mode) => {
                const isSelected = communicationMode === mode;
                const ModeIcon = mode === 'Online' ? Video : mode === 'Phone' ? Phone : MapPin;
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setCommunicationMode(mode)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: isSmallScreen ? 12 : 16,
                      paddingVertical: isSmallScreen ? 12 : 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      backgroundColor: isSelected ? '#EFF6FF' : 'white',
                      borderColor: isSelected ? Colors.primary.blue : '#E5E7EB',
                    }}
                  >
                    <Box className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: isSelected ? Colors.primary.blue : '#F3F4F6' }}>
                      <ModeIcon size={18} color={isSelected ? 'white' : Colors.text.sub} strokeWidth={2} />
                    </Box>
                    <Text
                      className="text-sm font-semibold ml-3 flex-1"
                      style={{ color: isSelected ? Colors.primary.blue : Colors.text.head }}
                    >
                      {mode}
                    </Text>
                    {isSelected && (
                      <Box className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: Colors.primary.blue }}>
                        <Check size={14} color="white" strokeWidth={3} />
                      </Box>
                    )}
                  </TouchableOpacity>
                );
              })}
            </VStack>
          </VStack>

          <VStack>
            <Text className="text-xs font-semibold mb-2" style={{ color: Colors.text.secondary }}>
              YOUR CONCERN
            </Text>
            <Box className={`${isSmallScreen ? 'px-3 py-3' : 'px-4 py-3'} rounded-lg border`} style={{ borderColor: validationErrors.concern ? '#EF4444' : '#E5E7EB', minHeight: 100, backgroundColor: 'white' }}>
              <TextInput
                style={{
                  color: Colors.text.head,
                  fontSize: 14,
                  padding: 0,
                  textAlignVertical: "top",
                  minHeight: 100,
                  outlineStyle: 'none',
                } as any}
                value={concern}
                onChangeText={handleConcernChange}
                placeholder="Please describe your legal concern in detail..."
                placeholderTextColor={Colors.text.tertiary}
                multiline
                numberOfLines={5}
              />
            </Box>
            {validationErrors.concern && (
              <Text className="text-red-500 text-xs mt-1">
                {validationErrors.concern}
              </Text>
            )}
          </VStack>
        </VStack>

        {/* Book Button - Modern CTA */}
        <Box className={`${isSmallScreen ? 'mx-3' : 'mx-4'} mb-6`}>
          <TouchableOpacity
            onPress={handleBookConsultation}
            disabled={isSubmitting}
            style={{
              backgroundColor: isSubmitting ? '#9CA3AF' : Colors.primary.blue,
              paddingVertical: 14,
              borderRadius: 12,
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            <HStack className="items-center justify-center">
              {!isSubmitting && (
                <Calendar size={20} color="white" strokeWidth={2} />
              )}
              <Text className="text-white font-bold text-base ml-2">
                {isSubmitting
                  ? "Processing..."
                  : `Book Consultation`}
              </Text>
            </HStack>
          </TouchableOpacity>
          <Text className="text-xs text-center mt-2" style={{ color: Colors.text.sub }}>
            You&apos;ll receive a confirmation email shortly
          </Text>
        </Box>
      </ScrollView>

      {/* Confirmation Modal - Modern Design */}
      <Modal
        visible={showConfirmationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowConfirmationModal(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center px-4"
          style={styles.modalOverlay}
          onPress={() => !isSubmitting && setShowConfirmationModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
          >
            <Box className="bg-white rounded-3xl p-6 w-full shadow-lg" style={{ maxWidth: 400 }}>
              <HStack className="items-center justify-between mb-4">
                <HStack className="items-center">
                  <Box className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                    <Check size={20} color={Colors.primary.blue} strokeWidth={3} />
                  </Box>
                  <Text className="text-xl font-bold ml-3" style={{ color: Colors.text.head }}>
                    Confirm Booking
                  </Text>
                </HStack>
                <TouchableOpacity
                  onPress={() => !isSubmitting && setShowConfirmationModal(false)}
                  style={{ padding: 4 }}
                >
                  <X size={24} color={Colors.text.sub} strokeWidth={2} />
                </TouchableOpacity>
              </HStack>

              <VStack className="mb-6 p-4 bg-gray-50 rounded-2xl">
                <VStack className="mb-3">
                  <Text className="text-xs font-semibold mb-1" style={{ color: Colors.text.secondary }}>
                    LAWYER
                  </Text>
                  <Text className="text-base font-bold" style={{ color: Colors.text.head }}>
                    {lawyerData.name}
                  </Text>
                </VStack>

                <HStack className="items-center mb-2">
                  <Calendar size={16} color={Colors.text.sub} strokeWidth={2} />
                  <Text className="text-sm ml-2" style={{ color: Colors.text.sub }}>
                    {getFormattedDate()}
                  </Text>
                </HStack>

                <HStack className="items-center mb-2">
                  <Clock size={16} color={Colors.text.sub} strokeWidth={2} />
                  <Text className="text-sm ml-2" style={{ color: Colors.text.sub }}>
                    {getSelectedTimeSlotText()}
                  </Text>
                </HStack>

                <HStack className="items-center mb-2">
                  {communicationMode === 'Online' ? <Video size={16} color={Colors.text.sub} strokeWidth={2} /> : communicationMode === 'Phone' ? <Phone size={16} color={Colors.text.sub} strokeWidth={2} /> : <MapPin size={16} color={Colors.text.sub} strokeWidth={2} />}
                  <Text className="text-sm ml-2" style={{ color: Colors.text.sub }}>
                    {communicationMode}
                  </Text>
                </HStack>

                <HStack className="items-center mb-2">
                  <Mail size={16} color={Colors.text.sub} strokeWidth={2} />
                  <Text className="text-sm ml-2" style={{ color: Colors.text.sub }}>
                    {email}
                  </Text>
                </HStack>

                <HStack className="items-center">
                  <Phone size={16} color={Colors.text.sub} strokeWidth={2} />
                  <Text className="text-sm ml-2" style={{ color: Colors.text.sub }}>
                    {mobileNumber}
                  </Text>
                </HStack>
              </VStack>

              <HStack className="justify-between">
                <TouchableOpacity
                  onPress={() => setShowConfirmationModal(false)}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    marginRight: 8,
                    paddingVertical: 14,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: Colors.primary.blue,
                    backgroundColor: 'white',
                    alignItems: 'center',
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                >
                  <Text className="font-bold text-sm" style={{ color: Colors.primary.blue }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={proceedWithBooking}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    marginLeft: 8,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: isSubmitting ? '#9CA3AF' : Colors.primary.blue,
                    alignItems: 'center',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  <Text className="text-white font-bold text-sm">
                    {isSubmitting ? "Confirming..." : "Confirm Booking"}
                  </Text>
                </TouchableOpacity>
              </HStack>
            </Box>
          </Pressable>
        </Pressable>
      </Modal>
    </Box>

      <Navbar activeTab="find" />
      <SidebarWrapper />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
