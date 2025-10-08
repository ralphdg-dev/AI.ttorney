import React, { useState, useEffect } from "react";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Box } from "@/components/ui/box";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../../constants/Colors";
import { useAuth } from "../../../contexts/AuthContext";
import { hasActiveConsultationRequest } from "../../utils/consultationUtils";

interface Lawyer {
  id: string;
  name: string;
  specialization: string[];
  location: string;
  days: string;
  available: boolean;
  hours_available: string[];
}

interface LawyerCardProps {
  lawyer: Lawyer;
  onBookConsultation: (lawyer: Lawyer) => void;
}

export default function LawyerCard({
  lawyer,
  onBookConsultation,
}: LawyerCardProps) {
  const [showAllSpecialization, setShowAllSpecialization] = useState(false);
  const [hasActiveRequest, setHasActiveRequest] = useState(false);
  const [checkingRequest, setCheckingRequest] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const primarySpecialization = lawyer.specialization[0];
  const additionalCount = lawyer.specialization.length - 1;

  // Get today's available times
  const getTodayAvailableTimes = (): string[] => {
    const today = new Date().toLocaleString("en-US", { weekday: "long" });

    if (!lawyer.hours_available || lawyer.hours_available.length === 0) {
      return [];
    }

    // Parse the hours_available string
    for (const daySchedule of lawyer.hours_available) {
      if (daySchedule.includes("=")) {
        const [day, times] = daySchedule.split("=").map((s) => s.trim());

        if (day.toLowerCase() === today.toLowerCase()) {
          // Split times by comma and clean them up
          return times
            .split(",")
            .map((time) => time.trim())
            .filter((time) => time);
        }
      }
    }

    return [];
  };

  const todayTimes = getTodayAvailableTimes();
  const hasTimesToday = todayTimes.length > 0;

  useEffect(() => {
    const checkActiveRequests = async () => {
      if (!isAuthenticated || !user) {
        setHasActiveRequest(false);
        return;
      }

      setCheckingRequest(true);
      try {
        const activeRequest = await hasActiveConsultationRequest(user.id);
        setHasActiveRequest(activeRequest);
      } catch (error) {
        console.error("Error checking active requests:", error);
        setHasActiveRequest(false);
      } finally {
        setCheckingRequest(false);
      }
    };

    checkActiveRequests();
  }, [user, isAuthenticated]);

  const handleSpecializationPress = () => {
    setShowAllSpecialization(!showAllSpecialization);
  };

  const handleBookPress = () => {
    if (!hasActiveRequest) {
      onBookConsultation(lawyer);
    } else {
      alert(
        "You already have an active consultation request. Please wait for it to be completed or rejected before booking another one."
      );
    }
  };

  const isBookable = !hasActiveRequest && !checkingRequest && lawyer.available;

  const buttonText = checkingRequest
    ? "Checking..."
    : hasActiveRequest
    ? "Already Booked"
    : !lawyer.available
    ? "Unavailable"
    : "Book Consultation";

  const hasAvailableDays = lawyer.days && lawyer.days.trim() !== "";
  const hasAvailableHours =
    lawyer.hours_available && lawyer.hours_available.length > 0;

  return (
    <Box
      className="mx-2 mb-3 bg-white rounded-lg border border-gray-200 overflow-hidden"
      style={{ 
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      }}
    >
      {/* Header Section */}
      <Box className="p-4 pb-3">
        <HStack className="justify-between items-start mb-3">
          {/* Left Section - Name & Specialization */}
          <VStack className="flex-1 pr-2">
            {/* Lawyer Name */}
            <Text
              className="font-semibold text-base mb-0.5"
              style={{ color: Colors.text.head }}
            >
              Atty. {lawyer.name}
            </Text>

            {/* Specialization */}
            <Pressable onPress={handleSpecializationPress}>
              <HStack className="items-center flex-wrap">
                <Box className="bg-gray-100 px-2 py-0.5 rounded-full mr-1 mb-1">
                  <Text
                    className="text-xs font-medium"
                    style={{ color: Colors.text.head }}
                  >
                    {primarySpecialization}
                  </Text>
                </Box>

                {additionalCount > 0 && (
                  <Pressable
                    onPress={handleSpecializationPress}
                    className="bg-gray-100 px-2 py-0.5 rounded-full mb-1"
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: Colors.text.sub }}
                    >
                      +{additionalCount} more
                    </Text>
                  </Pressable>
                )}
              </HStack>
            </Pressable>
          </VStack>

          {/* Right Section - Location Badge */}
          <VStack className="items-end">
            <Box
              className="px-2 py-1 rounded-full flex-row items-center"
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB"
              }}
            >
              <Ionicons
                name="location-outline"
                size={10}
                color="#6B7280"
                style={{ marginRight: 3 }}
              />
              <Text
                className="text-xs font-medium"
                style={{
                  color: "#6B7280",
                }}
                ellipsizeMode="tail"
                numberOfLines={1}
              >
                {lawyer.location}
              </Text>
            </Box>
          </VStack>
        </HStack>

        {/* All Specializations Dropdown */}
        {showAllSpecialization && (
          <Box className="p-3 mb-3 bg-white rounded-lg border border-gray-200" style={{ elevation: 0.5 }}>
            <Text
              className="text-sm font-semibold mb-2"
              style={{ color: Colors.text.head }}
            >
              All Specializations
            </Text>
            <VStack className="gap-1">
              {lawyer.specialization.map((spec, index) => (
                <HStack key={index} className="items-center">
                  <Box
                    className="w-1.5 h-1.5 rounded-full mr-2"
                    style={{ backgroundColor: "#9CA3AF" }}
                  />
                  <Text className="text-sm font-medium" style={{ color: Colors.text.head }}>
                    {spec}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}
      </Box>

      {/* Divider */}
      <Box className="h-px bg-gray-100 mx-3" />

      {/* Schedule Section */}
      <Box className="p-4 pt-2">
        {/* Available Days */}
        {hasAvailableDays && (
          <VStack className="mb-3">
            <HStack className="items-center mb-1">
              <Ionicons
                name="calendar-outline"
                size={14}
                color="#6B7280"
              />
              <Text
                className="text-xs ml-1.5 font-medium"
                style={{ color: Colors.text.head }}
              >
                Available Days
              </Text>
            </HStack>
            <HStack className="flex-wrap gap-1">
              {lawyer.days.match(/[A-Z][a-z]+/g)?.map((day, index) => (
                <Box
                  key={index}
                  className="bg-gray-50 px-2 py-0.5 rounded border border-gray-200"
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: Colors.text.head }}
                  >
                    {day}
                  </Text>
                </Box>
              ))}
            </HStack>
          </VStack>
        )}

        {/* Today's Available Times */}
        {hasTimesToday ? (
          <VStack className="mb-3">
            <HStack className="items-center mb-1">
              <Ionicons
                name="time-outline"
                size={14}
                color="#374151"
              />
              <Text
                className="text-xs ml-1.5 font-semibold"
                style={{ color: Colors.text.head }}
              >
                Available Today
              </Text>
            </HStack>
            <HStack className="flex-wrap gap-1.5">
              {todayTimes.slice(0, 4).map((time, index) => (
                <Box
                  key={index}
                  className="bg-white px-2 py-0.5 rounded border border-gray-300"
                  style={{ elevation: 0.5 }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: Colors.text.head }}
                  >
                    {time}
                  </Text>
                </Box>
                ))}
              {todayTimes.length > 4 && (
                <Box className="bg-white px-2 py-0.5 rounded border border-gray-300" style={{ elevation: 0.5 }}>
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: Colors.text.head }}
                  >
                    +{todayTimes.length - 4} more
                  </Text>
                </Box>
              )}
            </HStack>
          </VStack>
        ) : (
          <VStack className="mb-3">
            <HStack className="items-center">
              <Ionicons
                name="information-circle-outline"
                size={12}
                color={Colors.text.sub}
              />
              <Text
                className="text-xs ml-1 font-medium"
                style={{ color: Colors.text.sub }}
              >
                {hasAvailableHours
                  ? "No slots available today."
                  : "Check booking for available schedule"}
              </Text>
            </HStack>
          </VStack>
        )}

        {/* Book Button */}
        <Pressable
          className="py-2.5 rounded-lg items-center justify-center"
          style={{
            backgroundColor: isBookable ? Colors.primary.blue : "#F9FAFB",
            borderWidth: isBookable ? 0 : 1,
            borderColor: isBookable ? "transparent" : "#D1D5DB",
            elevation: isBookable ? 1 : 0,
          }}
          onPress={handleBookPress}
          disabled={!isBookable || checkingRequest}
        >
          <Text
            className="font-semibold text-sm"
            style={{
              color: isBookable ? "white" : "#6B7280",
            }}
          >
            {buttonText}
          </Text>
        </Pressable>
      </Box>
    </Box>
  );
}
