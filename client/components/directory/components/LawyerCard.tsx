import React, { useState } from "react";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Box } from "@/components/ui/box";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../../constants/Colors";

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

  const primarySpecialization = lawyer.specialization[0];
  const additionalCount = lawyer.specialization.length - 1;

  const handleSpecializationPress = () => {
    setShowAllSpecialization(!showAllSpecialization);
  };

  return (
    <Box className="mx-6 mb-4 bg-white rounded-lg border border-gray-200 p-4">
      <HStack className="justify-between items-start mb-2">
        <VStack className="flex-1">
          <Text
            className="font-bold text-base"
            style={{ color: Colors.text.head }}
          >
            {lawyer.name}
          </Text>

          {/* specialization with tooltip */}
          <Pressable onPress={handleSpecializationPress} className="mt-1">
            <HStack className="items-center">
              <Text className="text-sm" style={{ color: Colors.text.sub }}>
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

          {showAllSpecialization && (
            <Box className="mt-2 p-3 bg-gray-100 rounded-lg">
              <Text
                className="text-sm font-semibold mb-1"
                style={{ color: Colors.text.head }}
              >
                All Specializations: {/* Fix typo */}
              </Text>
              {lawyer.specialization.map((spec, index) => (
                <Text
                  key={index}
                  className="text-sm"
                  style={{ color: Colors.text.sub }}
                >
                  • {spec}
                </Text>
              ))}
            </Box>
          )}

          <Text className="text-sm mt-2" style={{ color: Colors.text.sub }}>
            {lawyer.location}
          </Text>
        </VStack>

        <HStack className="items-center">
          <Box
            className="w-2 h-2 rounded-full mr-2"
            style={{
              backgroundColor: lawyer.available ? "#10B981" : "#9CA3AF",
            }}
          />
          <Text
            className="text-xs font-medium"
            style={{ color: lawyer.available ? "#10B981" : "#9CA3AF" }}
          >
            {lawyer.available ? "Available" : "Unavailable"}
          </Text>
        </HStack>
      </HStack>

      <HStack className="items-center mb-4">
        <HStack className="items-center">
          <Ionicons name="calendar-outline" size={16} color={Colors.text.sub} />
          <Text className="text-sm ml-1" style={{ color: Colors.text.sub }}>
            {lawyer.days}
          </Text>

          {/* Get today's available hours */}
          {(() => {
            const today = new Date();
            const dayNames = [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ];
            const currentDay = dayNames[today.getDay()];
            const todayHours = lawyer.hours_available.find((h) =>
              h.startsWith(`${currentDay}=`)
            );

            if (todayHours) {
              const time = todayHours.split("=")[1]?.trim();
              return (
                <Text
                  className="text-sm ml-2"
                  style={{ color: Colors.primary.blue }}
                >
                  • {time}
                </Text>
              );
            }

            return null;
          })()}
        </HStack>
      </HStack>

      <Pressable
        className="py-3 rounded-lg items-center justify-center"
        style={{
          backgroundColor: lawyer.available ? Colors.primary.blue : "#E5E7EB",
        }}
        onPress={() => lawyer.available && onBookConsultation(lawyer)}
        disabled={!lawyer.available}
      >
        <Text
          className="font-semibold"
          style={{
            color: lawyer.available ? "white" : "#9CA3AF",
          }}
        >
          Book Consultation
        </Text>
      </Pressable>
    </Box>
  );
}
