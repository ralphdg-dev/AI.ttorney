import React from "react";
import { Dimensions } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text as UIText } from "@/components/ui/text";
import { Pressable as UIPressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";

const { width: screenWidth } = Dimensions.get("window");

interface Consultation {
  id: string;
  lawyer_name: string;
  specialization: string;
  consultation_date: string;
  consultation_time: string;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  created_at: string;
  message?: string;
  email?: string;
  mobile_number?: string;
  responded_at?: string;
}

const STATUS_CONFIG = {
  pending: {
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    icon: "time-outline" as const,
    label: "Pending",
  },
  accepted: {
    color: "#10B981",
    bgColor: "#D1FAE5",
    icon: "checkmark-circle-outline" as const,
    label: "Accepted",
  },
  rejected: {
    color: "#EF4444",
    bgColor: "#FEE2E2",
    icon: "close-circle-outline" as const,
    label: "Rejected",
  },
  completed: {
    color: "#6B7280",
    bgColor: "#F3F4F6",
    icon: "checkmark-done-outline" as const,
    label: "Completed",
  },
  cancelled: {
    color: "#EF4444",
    bgColor: "#FEE2E2",
    icon: "close-circle-outline" as const,
    label: "Cancelled",
  },
};

interface ConsultationCardProps {
  consultation: Consultation;
  index: number;
  onViewDetails: (consultation: Consultation) => void;
}

const formatDate = (dateString: string) => {
  if (!dateString) return "Not scheduled";

  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
};

export default function ConsultationCard({ consultation, index, onViewDetails }: ConsultationCardProps) {
  const statusConfig = STATUS_CONFIG[consultation.status];

  return (
    <Box
      key={consultation.id}
      className="mx-4 md:mx-6 bg-white rounded-lg border border-gray-200 p-4 md:p-6"
      style={{
        marginBottom: 16,
        marginTop: 0,
      }}
    >
      <HStack className="justify-between items-start mb-3">
        <VStack className="flex-1 mr-2">
          <UIText
            className="font-bold"
            style={{
              fontSize: screenWidth < 768 ? 15 : 16,
              color: Colors.text.head,
            }}
          >
            {consultation.lawyer_name}
          </UIText>
          <UIText
            className="mt-1"
            style={{
              fontSize: screenWidth < 768 ? 12 : 14,
              color: Colors.text.sub,
            }}
          >
            {consultation.specialization}
          </UIText>
        </VStack>

        <Box
          className="px-2 md:px-3 py-1 rounded-full flex-row items-center"
          style={{ backgroundColor: statusConfig.bgColor }}
        >
          <Ionicons
            name={statusConfig.icon}
            size={screenWidth < 768 ? 12 : 14}
            color={statusConfig.color}
          />
          <UIText
            className="font-semibold ml-1"
            style={{
              fontSize: screenWidth < 768 ? 10 : 12,
              color: statusConfig.color,
            }}
          >
            {statusConfig.label}
          </UIText>
        </Box>
      </HStack>

      {consultation.message && (
        <UIText
          className="mb-3 italic"
          style={{
            fontSize: screenWidth < 768 ? 12 : 14,
            color: Colors.text.sub,
          }}
          numberOfLines={2}
        >
          &ldquo;{consultation.message}&rdquo;
        </UIText>
      )}

      <VStack className="mb-3" space="sm">
        {consultation.consultation_date && (
          <HStack className="items-center">
            <Ionicons
              name="calendar-outline"
              size={screenWidth < 768 ? 14 : 16}
              color={Colors.text.sub}
            />
            <UIText
              className="ml-2"
              style={{
                fontSize: screenWidth < 768 ? 12 : 14,
                color: Colors.text.sub,
              }}
            >
              {formatDate(consultation.consultation_date)}
            </UIText>
          </HStack>
        )}

        {consultation.consultation_time && (
          <HStack className="items-center">
            <Ionicons
              name="time-outline"
              size={screenWidth < 768 ? 14 : 16}
              color={Colors.text.sub}
            />
            <UIText
              className="ml-2"
              style={{
                fontSize: screenWidth < 768 ? 12 : 14,
                color: Colors.text.sub,
              }}
            >
              {consultation.consultation_time}
            </UIText>
          </HStack>
        )}
      </VStack>

      <UIPressable
        className="py-2 md:py-3 rounded-lg items-center justify-center border"
        style={{
          borderColor: Colors.primary.blue,
          backgroundColor: "white",
        }}
        onPress={() => onViewDetails(consultation)}
      >
        <UIText
          className="font-semibold"
          style={{
            fontSize: screenWidth < 768 ? 13 : 14,
            color: Colors.primary.blue,
          }}
        >
          View Details
        </UIText>
      </UIPressable>
    </Box>
  );
}

export type { Consultation };
