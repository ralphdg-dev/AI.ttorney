import React, { useState, useEffect } from "react";
import { Alert, useWindowDimensions, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
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

  const [modeDropdownVisible, setModeDropdownVisible] = useState(false);
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
  }, [params]);

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
  }, [selectedMonth, selectedYear, selectedDay]);

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

      const response = await fetch(
        "http://localhost:8000/consultation-requests/",
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

  const handleBottomNavChange = (tab: string) => {
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

  const primarySpecialization = lawyerData.specialization[0];
  const additionalCount = lawyerData.specialization.length - 1;

  return (
    <Box className="flex-1 bg-gray-50">
      {/* Header */}
      <HStack className="items-center justify-between px-4 pt-10 pb-3 bg-white">
        <Pressable onPress={handleBackPress} className="p-2">
          <Ionicons name="arrow-back" size={24} color={Colors.primary.blue} />
        </Pressable>
        <Text
          className={`${isSmallScreen ? "text-base" : "text-lg"} font-bold`}
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
            className={`${
              isSmallScreen ? "w-16 h-16" : "w-20 h-20"
            } rounded-full mb-4 items-center justify-center`}
            style={{ backgroundColor: Colors.primary.blue }}
          >
            <Text className="text-white text-xl font-bold">
              {lawyerData.name.charAt(0)}
            </Text>
          </Box>
          <Text
            className={`${
              isSmallScreen ? "text-base" : "text-lg"
            } font-bold mb-1 text-center`}
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

          <HStack className="items-center"></HStack>
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
              className={`${
                isSmallScreen ? "text-base" : "text-lg"
              } font-semibold`}
              style={{ color: Colors.text.head }}
            >
              Schedule
            </Text>
          </HStack>

          {/* Calendar Navigation */}
          <HStack className="items-center justify-between mb-4">
            <Pressable onPress={navigateToPreviousMonth}>
              <Ionicons
                name="chevron-back"
                size={24}
                color={Colors.primary.blue}
              />
            </Pressable>

            <Text
              className="text-base font-semibold"
              style={{ color: Colors.text.head }}
            >
              {months[selectedMonth]} {selectedYear}
            </Text>

            <Pressable onPress={navigateToNextMonth}>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={Colors.primary.blue}
              />
            </Pressable>
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

            {calendarDays.map((day) => (
              <Pressable
                key={`${day.month}-${day.date}`}
                className={`${
                  isSmallScreen ? "w-10 h-10" : "w-12 h-12"
                } rounded-lg items-center justify-center mb-1`}
                style={{
                  backgroundColor: day.isSelected
                    ? Colors.primary.blue
                    : day.isToday
                    ? "#E3F2FD"
                    : "transparent",
                  opacity: day.isCurrentMonth ? 1 : 0.4,
                }}
                onPress={() => handleDaySelect(day)}
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
            ))}
          </HStack>

          {/* Time Slots */}
          <Text
            className="text-base font-semibold mb-3"
            style={{ color: Colors.text.head }}
          >
            Slots Available
          </Text>
          {validationErrors.timeSlot && (
            <Text className="text-red-500 text-sm mb-2">
              {validationErrors.timeSlot}
            </Text>
          )}
          <VStack>
            {validationErrors.timeSlot && (
              <Text className="text-red-500 text-sm mb-2">
                {validationErrors.timeSlot}
              </Text>
            )}

            {timeSlots.length > 0 ? (
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
                    onPress={() => {
                      setSelectedTimeSlot(slot.id);
                      if (validationErrors.timeSlot) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          timeSlot: undefined,
                        }));
                      }
                    }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{
                        color:
                          selectedTimeSlot === slot.id
                            ? "white"
                            : Colors.text.head,
                      }}
                    >
                      {slot.time}
                    </Text>
                  </Pressable>
                ))}
              </HStack>
            ) : (
              <Text className="text-sm text-gray-500">
                No available slots for the selected day
              </Text>
            )}
          </VStack>
        </VStack>

        {/* Contact Info */}
        <VStack className="mx-4 mb-5">
          <Text
            className="text-base font-semibold mb-3"
            style={{ color: Colors.text.head }}
          >
            Email
          </Text>
          <Input className="mb-2">
            <InputField
              className={`border rounded-lg px-4 py-3 bg-white ${
                validationErrors.email ? "border-red-500" : "border-gray-300"
              }`}
              style={{ color: Colors.text.head, fontSize: 14 }}
              value={email}
              onChangeText={handleEmailChange}
              placeholder="Enter your email"
              keyboardType="email-address"
            />
          </Input>
          {validationErrors.email && (
            <Text className="text-red-500 text-sm mb-2">
              {validationErrors.email}
            </Text>
          )}

          <VStack className="mb-4">
            <Text
              className="text-base font-semibold mb-2"
              style={{ color: Colors.text.head }}
            >
              Mobile Number
            </Text>
            <Input className="mb-2">
              <InputField
                className={`border rounded-lg px-4 py-3 bg-white ${
                  validationErrors.mobileNumber
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                style={{ color: Colors.text.head, fontSize: 14 }}
                value={mobileNumber}
                onChangeText={handleMobileChange}
                placeholder="Enter mobile number"
                keyboardType="phone-pad"
              />
            </Input>
            {validationErrors.mobileNumber && (
              <Text className="text-red-500 text-sm mb-2">
                {validationErrors.mobileNumber}
              </Text>
            )}

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
              <Ionicons name="chevron-down" size={20} color={Colors.text.sub} />
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
                    <Text style={{ color: Colors.text.head, fontSize: 14 }}>
                      {mode}
                    </Text>
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
          <Input className="mb-2">
            <InputField
              className={`border rounded-lg px-4 py-3 bg-white ${
                validationErrors.concern ? "border-red-500" : "border-gray-300"
              }`}
              style={{
                color: Colors.text.head,
                height: 50,
                textAlignVertical: "top",
                fontSize: 14,
              }}
              value={concern}
              onChangeText={handleConcernChange}
              placeholder="State your concern here..."
              multiline
              numberOfLines={4}
            />
          </Input>
          {validationErrors.concern && (
            <Text className="text-red-500 text-sm">
              {validationErrors.concern}
            </Text>
          )}
        </VStack>

        {/* Book Button */}
        <Box className="mx-4 mb-8">
          <Button
            className="py-4 rounded-lg items-center justify-center"
            style={{ backgroundColor: Colors.primary.blue }}
            onPress={handleBookConsultation}
            disabled={isSubmitting}
          >
            <Text className="text-white font-semibold text-sm">
              {isSubmitting
                ? "Booking..."
                : `Book Consultation with ${lawyerData.name.split(" ")[0]}`}
            </Text>
          </Button>
        </Box>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmationModal(false)}
      >
        <Box className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
          <Box className="bg-white rounded-lg p-6 w-full max-w-sm">
            <Text
              className="text-xl font-bold mb-4 text-center"
              style={{ color: Colors.text.head }}
            >
              Confirm Booking
            </Text>

            <VStack className="mb-6">
              <Text
                className="text-base font-semibold mb-2"
                style={{ color: Colors.text.head }}
              >
                Lawyer: {lawyerData.name}
              </Text>

              <Text className="text-sm mb-1" style={{ color: Colors.text.sub }}>
                Date: {getFormattedDate()}
              </Text>

              <Text className="text-sm mb-1" style={{ color: Colors.text.sub }}>
                Time: {getSelectedTimeSlotText()}
              </Text>

              <Text className="text-sm mb-1" style={{ color: Colors.text.sub }}>
                Mode: {communicationMode}
              </Text>

              <Text className="text-sm mb-1" style={{ color: Colors.text.sub }}>
                Email: {email}
              </Text>

              <Text className="text-sm" style={{ color: Colors.text.sub }}>
                Mobile: {mobileNumber}
              </Text>
            </VStack>

            <HStack className="justify-between">
              <Button
                className="flex-1 mr-2 py-3 rounded-lg items-center justify-center border"
                style={{
                  backgroundColor: "white",
                  borderColor: Colors.primary.blue,
                }}
                onPress={() => setShowConfirmationModal(false)}
                disabled={isSubmitting}
              >
                <Text
                  className="font-semibold text-sm"
                  style={{ color: Colors.primary.blue }}
                >
                  Cancel
                </Text>
              </Button>

              <Button
                className="flex-1 ml-2 py-3 rounded-lg items-center justify-center"
                style={{ backgroundColor: Colors.primary.blue }}
                onPress={proceedWithBooking}
                disabled={isSubmitting}
              >
                <Text className="text-white font-semibold text-sm">
                  {isSubmitting ? "Confirming..." : "Confirm"}
                </Text>
              </Button>
            </HStack>
          </Box>
        </Box>
      </Modal>

      <Navbar activeTab="find" onTabPress={handleBottomNavChange} />
    </Box>
  );
}
