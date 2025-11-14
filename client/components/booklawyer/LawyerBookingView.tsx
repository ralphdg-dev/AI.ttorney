import React, { useState, useEffect, useMemo } from "react";
import { Alert, useWindowDimensions, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Calendar, Clock, Mail, Phone, MessageSquare, Video, MapPin, User, Check, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react-native";
import Colors from "../../constants/Colors";
import Navbar from "@/components/Navbar";
import { LawyerNavbar } from "@/components/lawyer/shared";
import Header from "@/components/Header";
import { SidebarWrapper } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { ScrollView } from "@/components/ui/scroll-view";
import { Pressable } from "@/components/ui/pressable";
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Heading } from '@/components/ui/heading';
import { Icon } from '@/components/ui/icon';
import { Button, ButtonText } from '@/components/ui/button/';

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
  lawyer_id: string; // Foreign key to users table
  name: string;
  specialization: string[];
  hours: string;
  days: string;
  bio: string;
  hours_available: DayAvailability[] | Record<string, string[]>; // Legacy or JSONB format
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
  const { user, session } = useAuth();
  const toast = useToast();

  const [lawyerData, setLawyerData] = useState<LawyerData | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [email, setEmail] = useState(user?.email || "");
  const [mobileNumber, setMobileNumber] = useState("");
  const [communicationMode, setCommunicationMode] = useState<string>('Online');
  const [concern, setConcern] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);

  const [showAllSpecializations, setShowAllSpecializations] = useState(false);

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [consultationBanStatus, setConsultationBanStatus] = useState<{
    can_book: boolean;
    ban_status: string;
    ban_end: string | null;
    message: string | null;
  } | null>(null);
  const [isCheckingBanStatus, setIsCheckingBanStatus] = useState(false);

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();
  const currentYear = today.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedDay, setSelectedDay] = useState(currentDate);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
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

  const parseHoursAvailable = (hoursData: any): DayAvailability[] | Record<string, string[]> => {
    if (!hoursData) return [];

    // If already JSONB object, return as-is
    if (typeof hoursData === 'object' && !Array.isArray(hoursData)) {
      return hoursData;
    }

    // Legacy array format
    if (Array.isArray(hoursData) && hoursData.length === 0) return [];

    return hoursData.map((daySchedule: string) => {
      const [day, timesStr] = daySchedule.split("=");
      const times = timesStr
        ? timesStr.split(",").map((t: string) => t.trim())
        : [];
      return { day: day.trim(), times };
    });
  };

  // Check if lawyer is available on a specific date
  const isLawyerAvailableOnDate = (date: Date): boolean => {
    if (!lawyerData || !lawyerData.hours_available) return false;

    const dayName = date.toLocaleDateString("en-US", {
      weekday: "long",
    });

    // Handle JSONB format: {"Monday": ["09:00", "11:00"]}
    if (typeof lawyerData.hours_available === 'object' && !Array.isArray(lawyerData.hours_available)) {
      const times = lawyerData.hours_available[dayName] || [];
      return times.length > 0;
    }

    // Legacy format: DayAvailability[]
    if (Array.isArray(lawyerData.hours_available)) {
      const dayAvailability = lawyerData.hours_available.find(
        (availability) =>
          availability.day.toLowerCase() === dayName.toLowerCase()
      );
      return dayAvailability ? dayAvailability.times.length > 0 : false;
    }

    return false;
  };

  const getTimeSlotsForSelectedDay = (): TimeSlot[] => {
    if (!lawyerData || !lawyerData.hours_available) return [];

    const selectedDate = new Date(selectedYear, selectedMonth, selectedDay);
    const selectedDayName = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    // Handle JSONB format: {"Monday": ["09:00", "11:00"]}
    if (typeof lawyerData.hours_available === 'object' && !Array.isArray(lawyerData.hours_available)) {
      const times = lawyerData.hours_available[selectedDayName] || [];
      return times.map((time, index) => {
        // Convert 24h to 12h format for display
        const [hour, minute] = time.split(':');
        const hourNum = parseInt(hour);
        const ampm = hourNum >= 12 ? 'PM' : 'AM';
        const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
        
        return {
          id: time, // Store "09:00" format (24-hour) for API
          time: `${displayHour}:${minute} ${ampm}`, // Display "9:00 AM" format
          available: true,
        };
      });
    }

    // Legacy format: DayAvailability[]
    if (Array.isArray(lawyerData.hours_available)) {
      const dayAvailability = lawyerData.hours_available.find(
        (availability) =>
          availability.day.toLowerCase() === selectedDayName.toLowerCase()
      );

      if (!dayAvailability) return [];

      return dayAvailability.times.map((time, index) => ({
        id: `${dayAvailability.day}-${time}-${index}`,
        time,
        available: true,
      }));
    }

    return [];
  };
  const timeSlots: TimeSlot[] = getTimeSlotsForSelectedDay();

  const validateEmail = (email: string): boolean => {
    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email.trim());
  };

  const validateMobileNumber = (mobile: string): boolean => {
    // Remove all non-digit characters for validation
    const digitsOnly = mobile.replace(/\D/g, '');
    
    // Philippine mobile numbers: 10 digits (09XXXXXXXXX) or 11 digits with country code (639XXXXXXXXX)
    // International format: 8-15 digits
    if (mobile.startsWith('+63')) {
      // Philippine format with +63: should have 12 digits total (63 + 10 digits)
      return digitsOnly.length === 12 && digitsOnly.startsWith('63');
    } else if (mobile.startsWith('09')) {
      // Philippine format without country code: should have 11 digits
      return digitsOnly.length === 11 && digitsOnly.startsWith('09');
    } else if (mobile.startsWith('+')) {
      // International format: 8-15 digits after +
      return digitsOnly.length >= 8 && digitsOnly.length <= 15;
    } else {
      // Generic validation: at least 10 digits
      return digitsOnly.length >= 10 && digitsOnly.length <= 15;
    }
  };

  const validateBookingForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    // Email validation
    if (!email.trim()) {
      errors.email = "Email address is required";
    } else if (email.trim().length < 5) {
      errors.email = "Email address is too short";
    } else if (email.trim().length > 254) {
      errors.email = "Email address is too long";
    } else if (!validateEmail(email.trim())) {
      errors.email = "Please enter a valid email address (e.g., name@example.com)";
    }

    // Mobile number validation
    if (!mobileNumber.trim()) {
      errors.mobileNumber = "Mobile number is required";
    } else if (!validateMobileNumber(mobileNumber)) {
      const digitsOnly = mobileNumber.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        errors.mobileNumber = "Mobile number is too short (minimum 10 digits)";
      } else if (digitsOnly.length > 15) {
        errors.mobileNumber = "Mobile number is too long (maximum 15 digits)";
      } else {
        errors.mobileNumber = "Please enter a valid mobile number (e.g., +63 912 345 6789)";
      }
    }

    // Concern validation
    if (!concern.trim()) {
      errors.concern = "Please describe your legal concern";
    } else if (concern.trim().length < 10) {
      errors.concern = "Please provide more details (minimum 10 characters)";
    } else if (concern.trim().length > 2000) {
      errors.concern = "Concern is too long (maximum 2000 characters)";
    }

    // Time slot validation
    if (!selectedTimeSlot) {
      errors.timeSlot = "Please select a time slot";
    }

    // Date validation (ensure not in the past)
    const selectedDate = new Date(selectedYear, selectedMonth, selectedDay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      errors.timeSlot = "Cannot book consultation for past dates";
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
    // Convert 24-hour format to 12-hour format with AM/PM
    if (!selectedTimeSlot) return '';
    
    const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const getFormattedDateForAPI = (): string => {
    return `${selectedYear}-${(selectedMonth + 1)
      .toString()
      .padStart(2, "0")}-${selectedDay.toString().padStart(2, "0")}`;
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // First try AuthContext session token
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      return headers;
    }
    
    // Fallback to AsyncStorage
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  };

  const checkConsultationBanStatus = async (): Promise<boolean> => {
    if (!user?.id) {
      console.log("No user ID available for ban check");
      return true; // Allow booking if no user (shouldn't happen in authenticated flow)
    }

    setIsCheckingBanStatus(true);
    
    try {
      const { NetworkConfig } = await import('@/utils/networkConfig');
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const headers = await getAuthHeaders();
      
      const response = await fetch(
        `${apiUrl}/consultation-requests/ban-status/${user.id}`,
        {
          method: "GET",
          headers,
        }
      );

      // If forbidden, treat as restricted and show message
      if (response.status === 403) {
        let payload: any = null;
        try { payload = await response.json(); } catch {}
        const msg = payload?.detail || payload?.message || "Your account is temporarily restricted from booking consultations.";
        setConsultationBanStatus({ can_book: false, ban_status: "active", ban_end: null, message: msg });
        Alert.alert(
          "Booking Temporarily Restricted",
          msg,
          [{ text: "OK" }]
        );
        return false;
      }

      if (!response.ok) {
        console.error("Failed to check ban status:", response.status);
        // Network/other error: do not block, but do not overwrite any prior status
        return true;
      }

      const banStatus = await response.json();
      console.log("📋 Consultation ban status:", banStatus);
      
      setConsultationBanStatus(banStatus);
      
      if (!banStatus.can_book) {
        // Show ban message to user
        Alert.alert(
          "Booking Temporarily Restricted",
          banStatus.message || "You are temporarily unable to book consultations.",
          [{ text: "OK" }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking consultation ban status:", error);
      return true; // Fail-open: allow booking if check fails
    } finally {
      setIsCheckingBanStatus(false);
    }
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
        id: params.id as string, // lawyer_info.id (primary key)
        lawyer_id: params.lawyerId as string, // lawyer_info.lawyer_id (foreign key to users)
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
        id: params.id as string, // lawyer_info.id (primary key)
        lawyer_id: params.lawyerId as string, // lawyer_info.lawyer_id (foreign key to users)
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
    console.log("📋 Received params:", {
      id: params.id,
      lawyerId: params.lawyerId,
      lawyerName: params.lawyerName
    });
    
    if (params.lawyerId && params.lawyerName) {
      initializeLawyerData();
    } else {
      console.error("❌ Missing required params: lawyerId or lawyerName");
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

    // Previous month days
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

    // Current month days
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

    // Next month days
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
  }, [selectedMonth, selectedYear, selectedDay]);

  const canNavigateToPrevious = useMemo(() => {
    if (selectedYear < currentYear) return false;
    if (selectedYear === currentYear && selectedMonth <= currentMonth) return false;
    return true;
  }, [selectedMonth, selectedYear, currentMonth, currentYear]);

  const navigateToPreviousMonth = () => {
    if (!canNavigateToPrevious) return;
    
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    // Set to first available day of new month
    const newDate = new Date(selectedYear, selectedMonth - 1, 1);
    const firstAvailableDay = newDate < today ? today.getDate() : 1;
    setSelectedDay(firstAvailableDay);
    setSelectedTimeSlot(null);
  };

  const navigateToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    setSelectedDay(1);
    setSelectedTimeSlot(null);
  };

  const handleDaySelect = (day: CalendarDay) => {
    // Simulate loading for better UX
    setIsLoadingSlots(true);
    
    if (!day.isCurrentMonth) {
      setSelectedMonth(day.month);
      setSelectedYear(day.year);
    }
    setSelectedDay(day.date);

    setSelectedTimeSlot(null);

    if (validationErrors.timeSlot) {
      setValidationErrors((prev) => ({ ...prev, timeSlot: undefined }));
    }

    // Simulate async loading
    setTimeout(() => setIsLoadingSlots(false), 300);
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleBookConsultation = async () => {
    const errors = validateBookingForm();

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstError = Object.values(errors)[0];
      Alert.alert("Validation Error", firstError);
      return;
    }

    // Check consultation ban status before proceeding
    const canBook = await checkConsultationBanStatus();
    if (!canBook) {
      return; // Ban check already shows alert to user
    }

    setValidationErrors({});
    setShowConfirmationModal(true);
  };

  const proceedWithBooking = async () => {
    setShowConfirmationModal(false);
    setIsSubmitting(true);

    try {
      // Normalize consultation mode to lowercase for backend
      const normalizedMode = communicationMode.toLowerCase().replace('in-person', 'onsite');
      
      const consultationRequestData = {
        user_id: user?.id || "anonymous",
        lawyer_id: lawyerData?.id, // Use lawyer_info.id (backend validates against lawyer_info table)
        message: concern.trim(),
        email: email.trim(),
        mobile_number: mobileNumber.trim(),
        consultation_date: getFormattedDateForAPI(),
        consultation_time: selectedTimeSlot || '', // Send 24-hour format (e.g., "09:00")
        consultation_mode: normalizedMode, // Send lowercase: "online", "onsite", or "phone"
      };

      console.log("📤 Sending consultation request:", consultationRequestData);
      console.log("👨‍⚖️ Lawyer Data:", {
        id: lawyerData?.id,
        lawyer_id: lawyerData?.lawyer_id,
        name: lawyerData?.name
      });
      
      // Validate lawyer_id exists
      if (!lawyerData?.lawyer_id) {
        throw new Error('Lawyer ID is missing. Please try selecting the lawyer again.');
      }

      const { NetworkConfig } = await import('@/utils/networkConfig');
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${apiUrl}/consultation-requests/`,
        {
          method: "POST",
          headers: {
            ...headers,
          },
          body: JSON.stringify(consultationRequestData),
        }
      );

      const result = await response.json();
      
      console.log("Response status:", response.status);
      console.log("Response data:", result);
      
      if (!response.ok) {
        if (response.status === 403) {
          const msg = result?.detail || result?.message || 'Your account is temporarily restricted from booking consultations.';
          Alert.alert(
            'Booking Temporarily Restricted',
            msg,
            [{ text: 'OK' }]
          );
          setIsSubmitting(false);
          return;
        }
        throw new Error(result.detail || result.message || 'Failed to submit consultation request');
      }
      
      console.log('✅ Consultation request submitted successfully:', result.data);
      
      // Show success toast
      toast.show({
        placement: 'top',
        duration: 4000,
        render: ({ id }) => (
          <Toast nativeID={id} action="success" variant="solid">
            <ToastTitle>Request Sent!</ToastTitle>
            <ToastDescription>
              Your consultation request has been submitted. The lawyer will review it shortly.
            </ToastDescription>
          </Toast>
        ),
      });
      
      // Navigate back to directory after a short delay
      setTimeout(() => {
        router.push('/directory');
      }, 500);
    } catch (error: any) {
      console.error(' Error submitting consultation request:', error);
      
      // Show error toast
      toast.show({
        placement: 'top',
        duration: 5000,
        render: ({ id }) => (
          <Toast nativeID={id} action="error" variant="solid">
            <ToastTitle>Request Failed</ToastTitle>
            <ToastDescription>
              {error.message || 'Failed to submit consultation request. Please try again.'}
            </ToastDescription>
          </Toast>
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    
    // Real-time validation
    if (value.trim() && validationErrors.email) {
      // Clear error if user is typing and field is not empty
      if (value.trim().length >= 5 && validateEmail(value.trim())) {
        setValidationErrors((prev) => ({ ...prev, email: undefined }));
      }
    } else if (!value.trim() && validationErrors.email) {
      // Keep showing error if field is empty
      setValidationErrors((prev) => ({ ...prev, email: "Email address is required" }));
    }
  };

  const handleMobileChange = (value: string) => {
    setMobileNumber(value);
    
    // Real-time validation
    if (value.trim() && validationErrors.mobileNumber) {
      // Clear error if valid
      if (validateMobileNumber(value)) {
        setValidationErrors((prev) => ({ ...prev, mobileNumber: undefined }));
      }
    } else if (!value.trim() && validationErrors.mobileNumber) {
      // Keep showing error if field is empty
      setValidationErrors((prev) => ({ ...prev, mobileNumber: "Mobile number is required" }));
    }
  };

  const handleConcernChange = (value: string) => {
    setConcern(value);
    
    // Real-time validation
    if (value.trim() && validationErrors.concern) {
      // Clear error if user has typed enough
      if (value.trim().length >= 10) {
        setValidationErrors((prev) => ({ ...prev, concern: undefined }));
      }
    } else if (!value.trim() && validationErrors.concern) {
      // Keep showing error if field is empty
      setValidationErrors((prev) => ({ ...prev, concern: "Please describe your legal concern" }));
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
      <Box className="items-center justify-center flex-1 bg-gray-50">
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
        <VStack className={`${isSmallScreen ? 'mx-3 p-5' : 'mx-4 p-6'} mt-4 mb-3 bg-white rounded-2xl`} style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
          <HStack className="items-start mb-5">
            <Box
              className={`${
                isSmallScreen ? "w-20 h-20" : "w-24 h-24"
              } rounded-2xl items-center justify-center mr-4`}
              style={{ backgroundColor: Colors.primary.blue, shadowColor: Colors.primary.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
            >
              <User size={isSmallScreen ? 36 : 44} color="white" strokeWidth={2.5} />
            </Box>
            <VStack className="flex-1">
              <Text
                className={`${
                  isSmallScreen ? "text-xl" : "text-2xl"
                } font-bold mb-2`}
                style={{ color: Colors.text.head, letterSpacing: -0.5 }}
              >
                {lawyerData.name}
              </Text>
              <HStack className="items-center mb-2">
                <Box className="px-2 py-1 rounded-md" style={{ backgroundColor: '#ECFDF5' }}>
                  <Text className="text-xs font-semibold" style={{ color: '#059669' }}>
                    Available
                  </Text>
                </Box>
              </HStack>
              {lawyerData.hours_available && Object.keys(lawyerData.hours_available).length > 0 && (
                <HStack className="items-center">
                  <Calendar size={16} color={Colors.text.sub} strokeWidth={2} />
                  <Text className="ml-2 text-sm font-medium" style={{ color: Colors.text.sub }}>
                    {Object.keys(lawyerData.hours_available).join(', ')}
                  </Text>
                </HStack>
              )}
            </VStack>
          </HStack>

          {/* Specializations - Modern Pills */}
          <VStack className="pb-5 mb-5 border-b" style={{ borderColor: '#F3F4F6' }}>
            <HStack className="items-center mb-3">
              <Box className="w-1 h-4 mr-2 rounded-full" style={{ backgroundColor: Colors.primary.blue }} />
              <Text className="text-xs font-bold tracking-wide" style={{ color: Colors.text.secondary }}>
                SPECIALIZATIONS
              </Text>
            </HStack>
            <HStack className="flex-wrap">
              <Box className="px-4 py-2 mb-2 mr-2 rounded-full" style={{ backgroundColor: Colors.primary.blue, shadowColor: Colors.primary.blue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 }}>
                <Text className="text-sm font-bold" style={{ color: 'white' }}>
                  {primarySpecialization}
                </Text>
              </Box>
              {additionalCount > 0 && (
                <TouchableOpacity
                  onPress={() => setShowAllSpecializations(!showAllSpecializations)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F0F9FF', marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#BFDBFE' }}
                >
                  <Text className="text-sm font-bold" style={{ color: Colors.primary.blue }}>
                    +{additionalCount} more
                  </Text>
                </TouchableOpacity>
              )}
            </HStack>
          </VStack>

          {showAllSpecializations && (
            <Box className="w-full p-4 mb-5 rounded-xl" style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text
                className="mb-3 text-sm font-bold"
                style={{ color: Colors.text.head }}
              >
                All Specializations
              </Text>
              <VStack className="gap-2">
                {lawyerData.specialization.map((spec, index) => (
                  <HStack key={index} className="items-center">
                    <Box className="w-1.5 h-1.5 rounded-full mr-3" style={{ backgroundColor: Colors.primary.blue }} />
                    <Text
                      className="flex-1 text-sm font-medium"
                      style={{ color: Colors.text.sub }}
                    >
                      {spec}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}

          {lawyerData.bio && lawyerData.bio.trim() !== "" ? (
            <VStack>
              <HStack className="items-center mb-3">
                <Box className="w-1 h-4 mr-2 rounded-full" style={{ backgroundColor: Colors.primary.blue }} />
                <Text className="text-xs font-bold tracking-wide" style={{ color: Colors.text.secondary }}>
                  ABOUT
                </Text>
              </HStack>

              <Text
                className={`${
                  isSmallScreen
                    ? "text-sm leading-6"
                    : isMediumScreen
                    ? "text-base leading-7"
                    : "text-base leading-7"
                }`}
                style={{
                  color: Colors.text.sub,
                  textAlign: "left",
                }}
              >
                {showFullBio || !shouldShowReadMore
                  ? lawyerData.bio
                  : getTruncatedBio(lawyerData.bio, bioMaxLength)}
              </Text>

              {shouldShowReadMore && (
                <Pressable
                  onPress={() => setShowFullBio(!showFullBio)}
                  className="mt-3"
                >
                  <HStack className="items-center">
                    <Text
                      className={`${
                        isSmallScreen ? "text-sm" : "text-sm"
                      } font-bold`}
                      style={{ color: Colors.primary.blue }}
                    >
                      {showFullBio ? "Show Less" : "Read More"}
                    </Text>
                    <ChevronRight size={16} color={Colors.primary.blue} strokeWidth={2.5} style={{ transform: [{ rotate: showFullBio ? '90deg' : '0deg' }] }} />
                  </HStack>
                </Pressable>
              )}
            </VStack>
          ) : (
            <VStack className="items-center py-6">
              <Box className="items-center justify-center w-12 h-12 mb-2 rounded-full" style={{ backgroundColor: '#F3F4F6' }}>
                <User size={24} color={Colors.text.sub} strokeWidth={1.5} />
              </Box>
              <Text className="text-sm font-medium" style={{ color: Colors.text.sub }}>
                No bio available
              </Text>
            </VStack>
          )}
        </VStack>

        {/* Schedule - Modern Card */}
        <VStack className={`${isSmallScreen ? 'mx-3 p-5' : 'mx-4 p-6'} mb-3 bg-white rounded-2xl`} style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
          <HStack className="items-center mb-5">
            <Box className="items-center justify-center w-10 h-10 mr-3 rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
              <Clock size={20} color={Colors.primary.blue} strokeWidth={2.5} />
            </Box>
            <VStack className="flex-1">
              <Text className="text-lg font-bold" style={{ color: Colors.text.head }}>
                Select Date & Time
              </Text>
              <Text className="text-xs" style={{ color: Colors.text.sub }}>
                Choose your preferred slot
              </Text>
            </VStack>
          </HStack>

          {/* Calendar Navigation - Modern */}
          <HStack className="items-center justify-between px-2 mb-4">
            <TouchableOpacity
              onPress={navigateToPreviousMonth}
              disabled={!canNavigateToPrevious}
              style={{ 
                padding: 8, 
                borderRadius: 8, 
                backgroundColor: canNavigateToPrevious ? '#F9FAFB' : '#F3F4F6',
                opacity: canNavigateToPrevious ? 1 : 0.4
              }}
            >
              <ChevronLeft size={20} color={canNavigateToPrevious ? Colors.primary.blue : '#9CA3AF'} strokeWidth={2.5} />
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
          <VStack className="mb-4">
            {/* Day Headers */}
            <HStack className="mb-2" style={{ width: '100%' }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <Box
                  key={day}
                  style={{ flex: 1, alignItems: 'center' }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: Colors.text.sub }}
                  >
                    {day}
                  </Text>
                </Box>
              ))}
            </HStack>

            {/* Calendar Days Grid */}
            <HStack className="flex-wrap" style={{ width: '100%' }}>
              {calendarDays.map((day) => {
                const dayDate = new Date(day.year, day.month, day.date);
                const isPastDay =
                  dayDate <
                  new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                  );
                
                // Check if lawyer is available on this date
                const isAvailable = isLawyerAvailableOnDate(dayDate);
                const isDisabled = !day.isCurrentMonth || isPastDay || !isAvailable;

                return (
                  <Pressable
                    key={`${day.month}-${day.date}`}
                    style={{
                      width: `${100 / 7}%`,
                      aspectRatio: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 4,
                      borderRadius: 12,
                      backgroundColor: day.isSelected
                        ? Colors.primary.blue
                        : day.isToday
                        ? "#DBEAFE"
                        : "transparent",
                      opacity: isDisabled ? 0.3 : 1,
                      borderWidth: day.isToday && !day.isSelected ? 2 : 0,
                      borderColor: Colors.primary.blue,
                    }}
                    disabled={isDisabled}
                    onPress={() => {
                      if (!isDisabled) handleDaySelect(day);
                    }}
                  >
                    <Text
                      className={`${
                        isSmallScreen ? "text-sm" : "text-base"
                      } ${
                        day.isSelected || day.isToday ? "font-bold" : "font-medium"
                      }`}
                      style={{
                        color: day.isSelected
                          ? "white"
                          : day.isToday
                          ? Colors.primary.blue
                          : day.isCurrentMonth
                          ? Colors.text.head
                          : Colors.text.tertiary,
                      }}
                    >
                      {day.date}
                    </Text>
                  </Pressable>
                );
              })}
            </HStack>
          </VStack>

          {/* Time Slots - Modern Grid */}
          <VStack className="pt-4 mt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
            <HStack className="items-center justify-between mb-3">
              <HStack className="items-center">
                <Clock size={16} color={Colors.primary.blue} strokeWidth={2} />
                <Text className="ml-2 text-sm font-semibold" style={{ color: Colors.text.head }}>
                  Available Time Slots
                </Text>
              </HStack>
              {timeSlots.length > 0 && (
                <Box className="px-2 py-1 rounded-full" style={{ backgroundColor: '#ECFDF5' }}>
                  <Text className="text-xs font-semibold" style={{ color: '#059669' }}>
                    {timeSlots.length} slots
                  </Text>
                </Box>
              )}
            </HStack>
            
            {validationErrors.timeSlot && (
              <HStack className="items-center p-2 mb-2 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                <AlertCircle size={14} color="#DC2626" strokeWidth={2} />
                <Text className="ml-2 text-xs" style={{ color: '#DC2626' }}>
                  {validationErrors.timeSlot}
                </Text>
              </HStack>
            )}

            {isLoadingSlots ? (
              <HStack className="items-center justify-center py-8">
                <ActivityIndicator size="small" color={Colors.primary.blue} />
                <Text className="ml-2 text-sm" style={{ color: Colors.text.sub }}>
                  Loading available slots...
                </Text>
              </HStack>
            ) : timeSlots.length > 0 ? (
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
                    // slot.id contains 24-hour format "09:00"
                    const [hour, minute] = slot.id.split(":");
                    const h = parseInt(hour);
                    const m = parseInt(minute);

                    const slotTime = new Date();
                    slotTime.setHours(h, m, 0, 0);

                    isPastTime = slotTime.getTime() < today.getTime();
                  }

                  const isDisabled = isPastTime || !slot.available;

                  // Determine if slot is fully booked (for future implementation with booking data)
                  const isFullyBooked = false; // TODO: Check against actual bookings from backend

                  return (
                    <TouchableOpacity
                      key={slot.id}
                      disabled={isDisabled}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 12,
                        marginRight: 8,
                        marginBottom: 8,
                        borderWidth: 2,
                        backgroundColor: isFullyBooked 
                          ? '#FEE2E2' 
                          : selectedTimeSlot === slot.id 
                          ? Colors.primary.blue 
                          : 'white',
                        borderColor: isFullyBooked
                          ? '#DC2626'
                          : selectedTimeSlot === slot.id 
                          ? Colors.primary.blue 
                          : '#E5E7EB',
                        opacity: isDisabled ? 0.4 : 1,
                        shadowColor: selectedTimeSlot === slot.id ? Colors.primary.blue : '#000',
                        shadowOffset: { width: 0, height: selectedTimeSlot === slot.id ? 2 : 0 },
                        shadowOpacity: selectedTimeSlot === slot.id ? 0.2 : 0,
                        shadowRadius: 4,
                        elevation: selectedTimeSlot === slot.id ? 2 : 0,
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
                        <Clock 
                          size={16} 
                          color={isFullyBooked ? '#DC2626' : selectedTimeSlot === slot.id ? "white" : Colors.text.sub} 
                          strokeWidth={2} 
                        />
                        <Text
                          className="ml-2 text-sm font-bold"
                          style={{
                            color: isFullyBooked 
                              ? '#DC2626' 
                              : selectedTimeSlot === slot.id 
                              ? "white" 
                              : Colors.text.head,
                          }}
                        >
                          {slot.time}
                        </Text>
                        {isFullyBooked && (
                          <Box className="ml-2">
                            <Text className="text-xs font-semibold" style={{ color: '#DC2626' }}>FULL</Text>
                          </Box>
                        )}
                        {selectedTimeSlot === slot.id && !isFullyBooked && (
                          <Box className="ml-2">
                            <CheckCircle2 size={14} color="white" strokeWidth={2.5} />
                          </Box>
                        )}
                      </HStack>
                    </TouchableOpacity>
                  );
                })}
              </HStack>
            ) : (
              <VStack className="items-center py-8">
                <Box className="items-center justify-center w-16 h-16 mb-3 rounded-full" style={{ backgroundColor: '#F3F4F6' }}>
                  <Clock size={32} color={Colors.text.sub} strokeWidth={1.5} />
                </Box>
                <Text className="mb-1 text-sm font-medium" style={{ color: Colors.text.head }}>
                  No Available Slots
                </Text>
                <Text className="text-xs text-center" style={{ color: Colors.text.sub }}>
                  Please select a different day
                </Text>
              </VStack>
            )}
          </VStack>
        </VStack>

        {/* Contact Info - Modern Card */}
        <VStack className={`${isSmallScreen ? 'mx-3 p-5' : 'mx-4 p-6'} mb-3 bg-white rounded-2xl`} style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
          <HStack className="items-center mb-5">
            <Box className="items-center justify-center w-10 h-10 mr-3 rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
              <MessageSquare size={20} color={Colors.primary.blue} strokeWidth={2.5} />
            </Box>
            <VStack className="flex-1">
              <Text className="text-lg font-bold" style={{ color: Colors.text.head }}>
                Your Information
              </Text>
              <Text className="text-xs" style={{ color: Colors.text.sub }}>
                Contact details
              </Text>
            </VStack>
          </HStack>

          <VStack className="mb-4">
            <Text className="mb-2 text-xs font-bold tracking-wide" style={{ color: Colors.text.secondary }}>
              EMAIL ADDRESS
            </Text>
            <HStack className={`items-center ${isSmallScreen ? 'px-4 py-3.5' : 'px-4 py-4'} rounded-xl border-2`} style={{ borderColor: validationErrors.email ? '#EF4444' : '#E5E7EB', backgroundColor: '#FAFAFA' }}>
              <Mail size={18} color={validationErrors.email ? '#EF4444' : Colors.text.sub} strokeWidth={2} />
              <TextInput
                style={{ flex: 1, marginLeft: 8, color: Colors.text.head, fontSize: 14, padding: 0, outlineStyle: 'none' } as any}
                value={email}
                onChangeText={handleEmailChange}
                placeholder="your.email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                placeholderTextColor={Colors.text.tertiary}
              />
            </HStack>
            {validationErrors.email && (
              <Text className="mt-1 text-xs text-red-500">
                {validationErrors.email}
              </Text>
            )}
          </VStack>

          <VStack className="mb-4">
            <Text className="mb-2 text-xs font-bold tracking-wide" style={{ color: Colors.text.secondary }}>
              MOBILE NUMBER
            </Text>
            <HStack className={`items-center ${isSmallScreen ? 'px-4 py-3.5' : 'px-4 py-4'} rounded-xl border-2`} style={{ borderColor: validationErrors.mobileNumber ? '#EF4444' : '#E5E7EB', backgroundColor: '#FAFAFA' }}>
              <Phone size={18} color={validationErrors.mobileNumber ? '#EF4444' : Colors.text.sub} strokeWidth={2} />
              <TextInput
                style={{ flex: 1, marginLeft: 8, color: Colors.text.head, fontSize: 14, padding: 0, outlineStyle: 'none' } as any}
                value={mobileNumber}
                onChangeText={handleMobileChange}
                placeholder="+63 912 345 6789"
                keyboardType="phone-pad"
                autoComplete="tel"
                maxLength={20}
                placeholderTextColor={Colors.text.tertiary}
              />
            </HStack>
            {validationErrors.mobileNumber && (
              <Text className="mt-1 text-xs text-red-500">
                {validationErrors.mobileNumber}
              </Text>
            )}
          </VStack>

          <VStack className="mb-4">
            <Text className="mb-2 text-xs font-bold tracking-wide" style={{ color: Colors.text.secondary }}>
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
                    <Box className="items-center justify-center w-10 h-10 rounded-full" style={{ backgroundColor: isSelected ? Colors.primary.blue : '#F3F4F6' }}>
                      <ModeIcon size={18} color={isSelected ? 'white' : Colors.text.sub} strokeWidth={2} />
                    </Box>
                    <Text
                      className="flex-1 ml-3 text-sm font-semibold"
                      style={{ color: isSelected ? Colors.primary.blue : Colors.text.head }}
                    >
                      {mode}
                    </Text>
                    {isSelected && (
                      <Box className="items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: Colors.primary.blue }}>
                        <Check size={14} color="white" strokeWidth={3} />
                      </Box>
                    )}
                  </TouchableOpacity>
                );
              })}
            </VStack>
          </VStack>

          <VStack>
            <Text className="mb-2 text-xs font-bold tracking-wide" style={{ color: Colors.text.secondary }}>
              YOUR CONCERN
            </Text>
            <Box className={`${isSmallScreen ? 'px-4 py-3.5' : 'px-4 py-4'} rounded-xl border-2`} style={{ borderColor: validationErrors.concern ? '#EF4444' : '#E5E7EB', minHeight: 120, backgroundColor: '#FAFAFA' }}>
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
                placeholder="Describe your legal concern (minimum 10 characters)"
                placeholderTextColor={Colors.text.tertiary}
                multiline
                numberOfLines={5}
                maxLength={2000}
              />
            </Box>
            {validationErrors.concern && (
              <Text className="mt-1 text-xs text-red-500">
                {validationErrors.concern}
              </Text>
            )}
            {!validationErrors.concern && concern.trim() && (
              <Text className="mt-1 text-xs" style={{ color: Colors.text.sub }}>
                {concern.trim().length}/2000 characters
              </Text>
            )}
          </VStack>
        </VStack>

        {/* Book Button - Modern CTA */}
        <Box className={`${isSmallScreen ? 'mx-3' : 'mx-4'} mb-6`}>
          <TouchableOpacity
            onPress={handleBookConsultation}
            disabled={isSubmitting || isCheckingBanStatus}
            style={{
              backgroundColor: (isSubmitting || isCheckingBanStatus) ? '#9CA3AF' : Colors.primary.blue,
              paddingVertical: 16,
              borderRadius: 16,
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            <HStack className="items-center justify-center">
              {(isSubmitting || isCheckingBanStatus) ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Calendar size={22} color="white" strokeWidth={2.5} />
              )}
              <Text className="ml-2 text-lg font-bold text-white">
                {isSubmitting
                  ? "Processing..."
                  : isCheckingBanStatus
                  ? "Checking eligibility..."
                  : `Book Consultation`}
              </Text>
            </HStack>
          </TouchableOpacity>
          <HStack className="items-center justify-center mt-3">
            <CheckCircle2 size={14} color={Colors.text.sub} strokeWidth={2} />
            <Text className="text-xs ml-1.5" style={{ color: Colors.text.sub }}>
              You&apos;ll receive a confirmation email shortly
            </Text>
          </HStack>
        </Box>
      </ScrollView>

      {/* Confirmation Modal - GlueStack UI Design */}
      <Modal isOpen={showConfirmationModal} onClose={() => !isSubmitting && setShowConfirmationModal(false)} size="md">
        <ModalBackdrop className="bg-black/50" />
        <ModalContent className="max-w-md mx-4 bg-white border-0 shadow-2xl rounded-2xl">
          <ModalHeader className="px-4 pt-6 pb-0">
            <VStack className="items-center w-full gap-3">
              <Box className="flex items-center justify-center w-12 h-12 rounded-full" style={{ backgroundColor: '#E8F2FF' }}>
                <Icon 
                  as={CheckCircle2} 
                  size="lg" 
                  className="w-6 h-6"
                  style={{ color: Colors.primary.blue }}
                />
              </Box>
              <Heading size="lg" className="font-bold text-center text-gray-900">
                Confirm Consultation
              </Heading>
            </VStack>
          </ModalHeader>
          
          <ModalBody className="px-4 py-3">
            <VStack className="gap-3">
              <Text className="mb-2 text-sm text-center text-gray-600">
                Please review your consultation details before confirming.
              </Text>
              
              <Box className="p-4 bg-gray-50 rounded-xl">
                <VStack className="gap-3">
                  <VStack className="gap-1">
                    <Text className="text-xs font-semibold text-gray-500">LAWYER</Text>
                    <Text className="text-base font-bold text-gray-900">{lawyerData.name}</Text>
                  </VStack>
                  
                  <HStack className="items-center gap-2">
                    <Calendar size={16} color={Colors.text.sub} strokeWidth={2} />
                    <Text className="text-sm text-gray-700">{getFormattedDate()}</Text>
                  </HStack>
                  
                  <HStack className="items-center gap-2">
                    <Clock size={16} color={Colors.text.sub} strokeWidth={2} />
                    <Text className="text-sm text-gray-700">{getSelectedTimeSlotText()}</Text>
                  </HStack>
                  
                  <HStack className="items-center gap-2">
                    {communicationMode === 'Online' ? <Video size={16} color={Colors.text.sub} strokeWidth={2} /> : communicationMode === 'Phone' ? <Phone size={16} color={Colors.text.sub} strokeWidth={2} /> : <MapPin size={16} color={Colors.text.sub} strokeWidth={2} />}
                    <Text className="text-sm text-gray-700">{communicationMode}</Text>
                  </HStack>
                  
                  <HStack className="items-center gap-2">
                    <Mail size={16} color={Colors.text.sub} strokeWidth={2} />
                    <Text className="text-sm text-gray-700">{email}</Text>
                  </HStack>
                  
                  <HStack className="items-center gap-2">
                    <Phone size={16} color={Colors.text.sub} strokeWidth={2} />
                    <Text className="text-sm text-gray-700">{mobileNumber}</Text>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
          
          <ModalFooter className="p-4 pt-1">
            <HStack className="w-full gap-2">
              <Button 
                variant="outline" 
                className="flex-1 py-3 bg-transparent border-gray-300 rounded-lg"
                onPress={() => setShowConfirmationModal(false)}
                isDisabled={isSubmitting}
              >
                <ButtonText className="text-sm font-medium text-gray-700">
                  Cancel
                </ButtonText>
              </Button>
              <Button 
                variant="solid"
                className="flex-1 py-3 rounded-lg bg-[#023D7B] hover:bg-[#012B5A]"
                onPress={proceedWithBooking}
                isDisabled={isSubmitting}
              >
                <ButtonText className="text-sm font-semibold text-white">
                  {isSubmitting ? "Confirming..." : "Confirm"}
                </ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>

      {user?.role === 'verified_lawyer' ? (
        <LawyerNavbar activeTab={null} />
      ) : (
        <Navbar activeTab="find" />
      )}
      <SidebarWrapper />
    </SafeAreaView>
  );
}
