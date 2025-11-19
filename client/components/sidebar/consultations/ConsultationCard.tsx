import React from "react";
import { Dimensions } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text as UIText } from "@/components/ui/text";
import { Pressable as UIPressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { ConsultationWithLawyer } from "@/types/consultation.types";
import { getStatusColor, getModeColor, getModeIcon, formatConsultationDate, formatConsultationTime } from "@/utils/consultationUtils";

const { width: screenWidth } = Dimensions.get("window");


interface ConsultationCardProps {
  consultation: ConsultationWithLawyer;
  index: number;
  onViewDetails: (consultation: ConsultationWithLawyer) => void;
}


export default function ConsultationCard({ consultation, index, onViewDetails }: ConsultationCardProps) {
  const statusConfig = getStatusColor(consultation.status);
  const modeConfig = getModeColor(consultation.consultation_mode);
  const ModeIcon = getModeIcon(consultation.consultation_mode);
  const lawyerName = consultation.lawyer_info?.name || "Pending Assignment";
  const specialization = consultation.lawyer_info?.specialization || "Awaiting Lawyer";

  return (
    <Box
      key={consultation.id}
      className="bg-white rounded-lg p-3 md:p-4"
      style={{
        marginBottom: 12,
        marginTop: 0,
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      {/* Header: Lawyer Info + Status */}
      <HStack className="justify-between items-start mb-3">
        <VStack className="flex-1 mr-2">
          <UIText
            className="font-bold"
            style={{
              fontSize: screenWidth < 768 ? 15 : 16,
              color: Colors.text.head,
            }}
          >
            {lawyerName}
          </UIText>
          <UIText
            className="mt-0.5"
            style={{
              fontSize: screenWidth < 768 ? 12 : 13,
              color: Colors.text.sub,
            }}
          >
            {specialization}
          </UIText>
        </VStack>

        <Box
          className="px-2.5 py-1 rounded-full"
          style={{ 
            backgroundColor: statusConfig.bg, 
            borderColor: statusConfig.border, 
            borderWidth: 1 
          }}
        >
          <UIText
            className="font-semibold"
            style={{
              fontSize: 10,
              color: statusConfig.text,
            }}
          >
            {statusConfig.label}
          </UIText>
        </Box>
      </HStack>

      {/* Message Preview */}
      {consultation.message && (
        <Box
          className="mb-3 p-2 rounded"
          style={{
            backgroundColor: "#F9FAFB",
            borderLeftWidth: 3,
            borderLeftColor: "#9CA3AF",
          }}
        >
          <UIText
            className="italic"
            style={{
              fontSize: 13,
              color: Colors.text.sub,
            }}
            numberOfLines={2}
          >
            &ldquo;{consultation.message}&rdquo;
          </UIText>
        </Box>
      )}

      {/* Consultation Details */}
      <VStack className="mb-3" space="xs">
        {consultation.consultation_date && (
          <HStack className="items-center">
            <Ionicons
              name="calendar-outline"
              size={14}
              color={Colors.text.sub}
            />
            <UIText
              className="ml-2"
              style={{
                fontSize: 13,
                color: Colors.text.head,
              }}
            >
              {formatConsultationDate(consultation.consultation_date)}
            </UIText>
          </HStack>
        )}

        {consultation.consultation_time && (
          <HStack className="items-center">
            <Ionicons
              name="time-outline"
              size={14}
              color={Colors.text.sub}
            />
            <UIText
              className="ml-2"
              style={{
                fontSize: 13,
                color: Colors.text.head,
              }}
            >
              {formatConsultationTime(consultation.consultation_time)}
            </UIText>
          </HStack>
        )}

        {consultation.consultation_mode && (
          <HStack className="items-center">
            <ModeIcon size={14} color={Colors.text.sub} />
            <UIText
              className="ml-2"
              style={{
                fontSize: 13,
                color: Colors.text.head,
              }}
            >
              {modeConfig.label}
            </UIText>
          </HStack>
        )}
      </VStack>

      {/* View Details Button */}
      <UIPressable
        className="py-2 rounded items-center justify-center"
        style={{
          backgroundColor: Colors.primary.blue,
        }}
        onPress={() => onViewDetails(consultation)}
      >
        <UIText
          className="font-semibold"
          style={{
            fontSize: 13,
            color: "white",
          }}
        >
          View Details
        </UIText>
      </UIPressable>
    </Box>
  );
}
