import React, { useState } from "react";
import {
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  View,
  Alert,
} from "react-native";
import tw from "tailwind-react-native-classnames";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text as UIText } from "@/components/ui/text";
import { Pressable as UIPressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { ConsultationWithLawyer } from "@/types/consultation.types";
import { getStatusColor, formatConsultationDate, formatConsultationTime } from "@/utils/consultationUtils";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface ConsultationDetailModalProps {
  visible: boolean;
  consultation: ConsultationWithLawyer | null;
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
  onClose: () => void;
  onCancel: (consultationId: string) => void;
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return "Not available";

  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("en-US", options);
};


// Parse and clean specialization data (same logic as LawyerCard/ConsultationCard)
const parseSpecializations = (spec: string | null): string[] => {
  if (!spec) return [];
  try {
    const parsed = JSON.parse(spec);
    if (Array.isArray(parsed)) {
      return parsed.map(s => typeof s === 'string' ? s.replace(/[\[\]"]/g, '').trim() : s).filter(s => s && s.length > 0);
    }
  } catch {
    return spec.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
  return [spec.trim()].filter(s => s.length > 0);
};

export default function ConsultationDetailModal({
  visible,
  consultation,
  fadeAnim,
  scaleAnim,
  onClose,
  onCancel,
}: ConsultationDetailModalProps) {
  const [showAllSpecialization, setShowAllSpecialization] = useState(false);
  
  if (!consultation) return null;
  
  const cleanedSpecializations = parseSpecializations(consultation.lawyer_info?.specialization || null);
  const primarySpecialization = cleanedSpecializations[0] || 'Awaiting Lawyer';
  const additionalCount = Math.max(0, cleanedSpecializations.length - 1);

  const handleCancelWithWarning = () => {
    if (consultation.status === "accepted") {
      Alert.alert(
        "Cancel Accepted Consultation",
        "⚠️ Warning: Cancelling this accepted consultation will result in a temporary ban from booking new consultations.\n\n" +
        "• 1st cancellation: 1 day ban\n" +
        "• 2nd cancellation: 3 day ban\n" +
        "• 3rd+ cancellation: 7 day ban\n\n" +
        "Are you sure you want to proceed?",
        [
          {
            text: "Keep Consultation",
            style: "cancel",
          },
          {
            text: "Cancel Anyway",
            style: "destructive",
            onPress: () => onCancel(consultation.id),
          },
        ]
      );
    } else {
      // For pending consultations, no warning needed
      onCancel(consultation.id);
    }
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 justify-center items-center`} pointerEvents="box-none">
        {/* Backdrop */}
        <TouchableOpacity
          style={tw`absolute inset-0 bg-black bg-opacity-50`}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Modal Content */}
        <Animated.View
          style={[
            tw`bg-white rounded-lg mx-4 w-11/12 max-w-md`,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              maxHeight: screenHeight * 0.8,
            },
          ]}
          pointerEvents="auto"
        >
          {/* Header */}
          <HStack className="justify-between items-center p-4 border-b border-gray-200">
            <UIText
              className="font-bold"
              style={{
                fontSize: 16,
                color: Colors.text.head,
              }}
            >
              Consultation Details
            </UIText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={22}
                color={Colors.text.sub}
              />
            </TouchableOpacity>
          </HStack>

          {/* Content */}
          <ScrollView
            style={{ maxHeight: 400 }}
            showsVerticalScrollIndicator={false}
          >
            <VStack className="p-4" space="md">
              {/* Lawyer Info Card */}
              <Box
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <HStack className="justify-between items-start mb-2">
                  <VStack className="flex-1 mr-2">
                    <UIText
                      className="font-bold"
                      style={{
                        fontSize: 15,
                        color: Colors.text.head,
                      }}
                    >
                      {consultation.lawyer_info?.name || "Pending Assignment"}
                    </UIText>
                    {/* Specialization badges - same style as Legal Directory */}
                    <HStack className="flex-wrap items-center mt-1">
                      <Box 
                        className="px-2 py-0.5 rounded-full mr-1 mb-1"
                        style={{ backgroundColor: '#E5E7EB' }}
                      >
                        <UIText
                          className="font-medium"
                          style={{ fontSize: 11, color: Colors.text.head }}
                        >
                          {primarySpecialization}
                        </UIText>
                      </Box>
                      {additionalCount > 0 && (
                        <UIPressable
                          onPress={() => setShowAllSpecialization(!showAllSpecialization)}
                          className="px-2 py-0.5 rounded-full mb-1"
                          style={{ backgroundColor: '#E5E7EB' }}
                        >
                          <UIText
                            className="font-medium"
                            style={{ fontSize: 11, color: Colors.text.sub }}
                          >
                            +{additionalCount} more
                          </UIText>
                        </UIPressable>
                      )}
                    </HStack>
                    
                    {/* All Specializations Dropdown */}
                    {showAllSpecialization && cleanedSpecializations.length > 1 && (
                      <Box 
                        className="mt-2 p-2 rounded-lg"
                        style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' }}
                      >
                        <UIText
                          className="mb-1 font-semibold"
                          style={{ fontSize: 11, color: Colors.text.head }}
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
                                style={{ fontSize: 11, color: Colors.text.head }}
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
                      backgroundColor: getStatusColor(consultation.status).bg,
                      borderColor: getStatusColor(consultation.status).border,
                      borderWidth: 1,
                    }}
                  >
                    <UIText
                      className="font-semibold"
                      style={{
                        fontSize: 10,
                        color: getStatusColor(consultation.status).text,
                      }}
                    >
                      {getStatusColor(consultation.status).label}
                    </UIText>
                  </Box>
                </HStack>
              </Box>

              {/* Consultation Details */}
              <VStack space="xs">
                {consultation.consultation_date && (
                  <HStack className="items-center py-2">
                    <Ionicons name="calendar-outline" size={16} color={Colors.text.sub} />
                    <UIText
                      className="ml-2 flex-1"
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
                  <HStack className="items-center py-2">
                    <Ionicons name="time-outline" size={16} color={Colors.text.sub} />
                    <UIText
                      className="ml-2 flex-1"
                      style={{
                        fontSize: 13,
                        color: Colors.text.head,
                      }}
                    >
                      {formatConsultationTime(consultation.consultation_time)}
                    </UIText>
                  </HStack>
                )}

                {consultation.responded_at && (
                  <HStack className="justify-between">
                    <UIText
                      className="font-medium"
                      style={{
                        fontSize: screenWidth < 768 ? 13 : 14,
                        color: Colors.text.head,
                      }}
                    >
                      Responded At:
                    </UIText>
                    <UIText
                      className="text-right flex-1 ml-2"
                      style={{
                        fontSize: screenWidth < 768 ? 13 : 14,
                        color: Colors.text.sub,
                      }}
                    >
                      {formatDateTime(consultation.responded_at)}
                    </UIText>
                  </HStack>
                )}
              </VStack>

              {/* Contact Information */}
              {(consultation.email || consultation.mobile_number) && (
                <VStack space="xs">
                  {consultation.email && (
                    <HStack className="items-center py-2">
                      <Ionicons name="mail-outline" size={16} color={Colors.text.sub} />
                      <UIText
                        className="ml-2 flex-1"
                        style={{
                          fontSize: 13,
                          color: Colors.text.head,
                        }}
                      >
                        {consultation.email}
                      </UIText>
                    </HStack>
                  )}

                  {consultation.mobile_number && (
                    <HStack className="items-center py-2">
                      <Ionicons name="call-outline" size={16} color={Colors.text.sub} />
                      <UIText
                        className="ml-2 flex-1"
                        style={{
                          fontSize: 13,
                          color: Colors.text.head,
                        }}
                      >
                        {consultation.mobile_number}
                      </UIText>
                    </HStack>
                  )}
                </VStack>
              )}

              {/* Message */}
              {consultation.message && (
                <Box
                  className="p-3 rounded-lg"
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
                  >
                    &ldquo;{consultation.message}&rdquo;
                  </UIText>
                </Box>
              )}
            </VStack>
          </ScrollView>

          {/* Action Buttons */}
          {(consultation.status === "pending" || consultation.status === "accepted") && (
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB" }}>
              <UIPressable
                className="w-full py-3 rounded-lg items-center justify-center"
                style={{
                  backgroundColor: "#EF4444",
                }}
                onPress={handleCancelWithWarning}
              >
                <UIText className="font-semibold" style={{ fontSize: 14, color: "white" }}>
                  Cancel Consultation
                </UIText>
              </UIPressable>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
