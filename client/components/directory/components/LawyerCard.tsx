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
      className="mx-6 mb-3 bg-white rounded-xl border border-gray-100 overflow-hidden"
      style={{ elevation: 1.5 }}
    >
      {/* Header Section */}
      <Box className="p-3 pb-2">
        <HStack className="justify-between items-start mb-2">
          {/* Left Section - Name & Specialization */}
          <VStack className="flex-1 pr-2">
            {/* Lawyer Name */}
            <Text
              className="font-bold text-base mb-0.5"
              style={{ color: Colors.text.head }}
            >
              Atty. {lawyer.name}
            </Text>

            {/* Specialization */}
            <Pressable onPress={handleSpecializationPress}>
              <HStack className="items-center flex-wrap">
                <Box className="bg-blue-50 px-2.5 py-0.5 rounded-full mr-1 mb-1">
                  <Text
                    className="text-[11px] font-medium"
                    style={{ color: Colors.primary.blue }}
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
                      className="text-[11px] font-medium"
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
              className="px-2.5 py-1 mt-[3px] rounded-full flex-row items-center mb-1"
              style={{
                backgroundColor: "#F3F4F6", // light gray background
              }}
            >
              <Ionicons
                name="location-outline"
                size={11}
                color="#6B7280" // gray-500
                style={{ marginRight: 4 }}
              />
              <Text
                className="text-[10px] font-semibold"
                style={{
                  color: "#6B7280", // gray text
                }}
                numberOfLines={1}
              >
                {lawyer.location}
              </Text>
            </Box>
          </VStack>
        </HStack>

        {/* All Specializations Dropdown */}
        {showAllSpecialization && (
          <Box className=" p-2.5 mb-3 bg-gray-50 rounded-lg border border-gray-100">
            <Text
              className="text-xs font-semibold mb-1.5"
              style={{ color: Colors.text.head }}
            >
              All Specializations
            </Text>
            <VStack className="gap-0.5">
              {lawyer.specialization.map((spec, index) => (
                <HStack key={index} className="items-center">
                  <Box
                    className="w-1 h-1 rounded-full mr-1.5"
                    style={{ backgroundColor: Colors.primary.blue }}
                  />
                  <Text className="text-xs" style={{ color: Colors.text.sub }}>
                    {spec}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}
      </Box>

      {/* Divider */}
      <Box className="h-px bg-gray-100 -mt-2" />

      {/* Schedule Section */}
      <Box className="p-3 pt-2.5">
        {/* Available Days */}
        {hasAvailableDays && (
          <VStack className="mb-2">
            <HStack className="items-center mb-1">
              <Ionicons
                name="calendar-outline"
                size={15}
                color={Colors.primary.blue}
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
                  className="bg-white px-2 py-0.5 rounded border border-gray-200"
                >
                  <Text
                    className="text-[11px] font-medium"
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
          <Box className="bg-blue-50 rounded-lg p-2.5 mb-3">
            <HStack className="items-center mb-1">
              <Ionicons
                name="time-outline"
                size={15}
                color={Colors.primary.blue}
              />
              <Text
                className="text-xs ml-1.5 font-semibold"
                style={{ color: Colors.primary.blue }}
              >
                Available Time Today
              </Text>
            </HStack>
            <HStack className="flex-wrap gap-1.5">
              {todayTimes.slice(0, 4).map((time, index) => (
                <Box
                  key={index}
                  className="bg-white px-2.5 py-0.5 rounded border border-blue-200"
                >
                  <Text
                    className="text-[11px] font-medium"
                    style={{ color: Colors.primary.blue }}
                  >
                    {time}
                  </Text>
                </Box>
              ))}
              {todayTimes.length > 4 && (
                <Box className="bg-white px-2.5 py-0.5 rounded border border-blue-200">
                  <Text
                    className="text-[11px] font-medium"
                    style={{ color: Colors.primary.blue }}
                  >
                    +{todayTimes.length - 4} more
                  </Text>
                </Box>
              )}
            </HStack>
          </Box>
        ) : (
          <Box className="bg-gray-50 rounded-lg p-2.5 mb-3">
            <HStack className="items-center">
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={Colors.text.sub}
              />
              <Text
                className="text-[11px] ml-1"
                style={{ color: Colors.text.sub }}
              >
                {hasAvailableHours
                  ? "No slots available today."
                  : "Check booking for available schedule"}
              </Text>
            </HStack>
          </Box>
        )}

        {/* Book Button */}
        <Pressable
          className="py-2.5 rounded-lg items-center justify-center"
          style={{
            backgroundColor: isBookable ? Colors.primary.blue : "#F3F4F6",
            elevation: isBookable ? 2 : 0,
          }}
          onPress={handleBookPress}
          disabled={!isBookable || checkingRequest}
        >
          <HStack className="items-center">
            {!checkingRequest && isBookable && (
              <Ionicons
                name="calendar"
                size={16}
                color="white"
                style={{ marginRight: 4 }}
              />
            )}
            <Text
              className="font-semibold text-sm"
              style={{
                color: isBookable ? "white" : "#9CA3AF",
              }}
            >
              {buttonText}
            </Text>
          </HStack>
        </Pressable>
      </Box>
    </Box>
  );
}
