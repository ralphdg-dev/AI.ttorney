import React from "react";
import {
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  View,
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


export default function ConsultationDetailModal({
  visible,
  consultation,
  fadeAnim,
  scaleAnim,
  onClose,
  onCancel,
}: ConsultationDetailModalProps) {
  if (!consultation) return null;

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
                    <UIText
                      style={{ fontSize: 13, color: Colors.text.sub, marginTop: 2 }}
                    >
                      {consultation.lawyer_info?.specialization || "Awaiting Lawyer"}
                    </UIText>
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
          {consultation.status === "pending" && (
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB" }}>
              <HStack space="sm">
                <UIPressable
                  className="flex-1 py-2.5 rounded-lg items-center justify-center border"
                  style={{
                    borderColor: Colors.primary.blue,
                    backgroundColor: "white",
                  }}
                  onPress={onClose}
                >
                  <UIText className="font-semibold" style={{ fontSize: 13, color: Colors.primary.blue }}>
                    Close
                  </UIText>
                </UIPressable>

                <UIPressable
                  className="flex-1 py-2.5 rounded-lg items-center justify-center"
                  style={{
                    backgroundColor: "#EF4444",
                  }}
                  onPress={() => {
                    console.log("🟢 Cancel button pressed in modal");
                    console.log("🟢 Consultation ID:", consultation.id);
                    console.log("🟢 onCancel function exists:", typeof onCancel);
                    onCancel(consultation.id);
                  }}
                >
                  <UIText className="font-semibold" style={{ fontSize: 13, color: "white" }}>
                    Cancel Consultation
                  </UIText>
                </UIPressable>
              </HStack>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
