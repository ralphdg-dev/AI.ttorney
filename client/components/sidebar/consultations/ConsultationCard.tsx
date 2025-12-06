import React, { useState } from "react";
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
  const [showAllSpecialization, setShowAllSpecialization] = useState(false);
  const statusConfig = getStatusColor(consultation.status);
  const modeConfig = getModeColor(consultation.consultation_mode);
  const ModeIcon = getModeIcon(consultation.consultation_mode);
  const lawyerName = consultation.lawyer_info?.name || "Pending Assignment";
  
  // Parse and clean specialization data (same logic as LawyerCard)
  const parseSpecializations = (spec: string | null): string[] => {
    if (!spec) return [];
    try {
      // Try parsing as JSON array
      const parsed = JSON.parse(spec);
      if (Array.isArray(parsed)) {
        return parsed.map(s => typeof s === 'string' ? s.replace(/[\[\]"]/g, '').trim() : s).filter(s => s && s.length > 0);
      }
    } catch {
      // Not JSON, try comma-separated
      return spec.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    return [spec.trim()].filter(s => s.length > 0);
  };
  
  const cleanedSpecializations = parseSpecializations(consultation.lawyer_info?.specialization || null);
  const primarySpecialization = cleanedSpecializations[0] || 'Awaiting Lawyer';
  const additionalCount = Math.max(0, cleanedSpecializations.length - 1);

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
            Atty. {lawyerName}
          </UIText>
          {/* Specialization badges - same style as Legal Directory */}
          <HStack className="flex-wrap items-center mt-1">
            <Box 
              className="px-2 py-0.5 rounded-full mr-1 mb-1"
              style={{ backgroundColor: '#F3F4F6' }}
            >
              <UIText
                className="font-medium"
                style={{
                  fontSize: screenWidth < 768 ? 11 : 12,
                  color: Colors.text.head,
                }}
              >
                {primarySpecialization}
              </UIText>
            </Box>
            {additionalCount > 0 && (
              <UIPressable
                onPress={() => setShowAllSpecialization(!showAllSpecialization)}
                className="px-2 py-0.5 rounded-full mb-1"
                style={{ backgroundColor: '#F3F4F6' }}
              >
                <UIText
                  className="font-medium"
                  style={{
                    fontSize: screenWidth < 768 ? 11 : 12,
                    color: Colors.text.sub,
                  }}
                >
                  +{additionalCount} more
                </UIText>
              </UIPressable>
            )}
          </HStack>
          
          {/* All Specializations Dropdown - same style as Legal Directory */}
          {showAllSpecialization && cleanedSpecializations.length > 1 && (
            <Box 
              className="mt-2 p-3 rounded-lg"
              style={{ 
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E5E7EB'
              }}
            >
              <UIText
                className="mb-2 font-semibold"
                style={{
                  fontSize: 12,
                  color: Colors.text.head,
                }}
              >
                All Specializations
              </UIText>
              <VStack space="xs">
                {cleanedSpecializations.map((spec, idx) => (
                  <HStack key={idx} className="items-center">
                    <Box
                      className="w-1.5 h-1.5 rounded-full mr-2"
                      style={{ backgroundColor: '#9CA3AF' }}
                    />
                    <UIText
                      className="font-medium"
                      style={{
                        fontSize: 12,
                        color: Colors.text.head,
                      }}
                    >
                      {spec}
                    </UIText>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}
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
