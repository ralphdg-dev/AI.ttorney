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
import type { Consultation } from "./ConsultationCard";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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

interface ConsultationDetailModalProps {
  visible: boolean;
  consultation: Consultation | null;
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
      <View style={tw`flex-1 justify-center items-center`}>
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
        >
          {/* Header */}
          <HStack className="justify-between items-center p-4 md:p-6 border-b border-gray-200">
            <UIText
              className="font-bold"
              style={{
                fontSize: screenWidth < 768 ? 18 : 20,
                color: Colors.text.head,
              }}
            >
              Consultation Details
            </UIText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={Colors.text.sub}
              />
            </TouchableOpacity>
          </HStack>

          {/* Content */}
          <ScrollView
            style={tw`max-h-96`}
            showsVerticalScrollIndicator={true}
          >
            <VStack className="p-4 md:p-6" space="md">
              {/* Lawyer Info */}
              <VStack space="sm">
                <UIText
                  className="font-semibold text-gray-500"
                  style={{ fontSize: screenWidth < 768 ? 12 : 14 }}
                >
                  LAWYER INFORMATION
                </UIText>
                <HStack className="justify-between items-start">
                  <VStack className="flex-1 mr-2">
                    <UIText
                      className="font-bold"
                      style={{
                        fontSize: screenWidth < 768 ? 16 : 18,
                        color: Colors.text.head,
                      }}
                    >
                      {consultation.lawyer_name}
                    </UIText>
                    <UIText
                      className="text-sm"
                      style={{ color: Colors.text.sub }}
                    >
                      {consultation.specialization}
                    </UIText>
                  </VStack>
                  <Box
                    className="px-2 md:px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: STATUS_CONFIG[consultation.status].bgColor,
                    }}
                  >
                    <UIText
                      className="font-semibold"
                      style={{
                        fontSize: screenWidth < 768 ? 10 : 12,
                        color: STATUS_CONFIG[consultation.status].color,
                      }}
                    >
                      {STATUS_CONFIG[consultation.status].label}
                    </UIText>
                  </Box>
                </HStack>
              </VStack>

              {/* Consultation Details */}
              <VStack space="sm">
                <UIText
                  className="font-semibold text-gray-500"
                  style={{ fontSize: screenWidth < 768 ? 12 : 14 }}
                >
                  CONSULTATION DETAILS
                </UIText>

                <HStack className="justify-between">
                  <UIText
                    className="font-medium"
                    style={{
                      fontSize: screenWidth < 768 ? 13 : 14,
                      color: Colors.text.head,
                    }}
                  >
                    Request Date:
                  </UIText>
                  <UIText
                    className="text-right flex-1 ml-2"
                    style={{
                      fontSize: screenWidth < 768 ? 13 : 14,
                      color: Colors.text.sub,
                    }}
                  >
                    {formatDateTime(consultation.created_at)}
                  </UIText>
                </HStack>

                {consultation.consultation_date && (
                  <HStack className="justify-between">
                    <UIText
                      className="font-medium"
                      style={{
                        fontSize: screenWidth < 768 ? 13 : 14,
                        color: Colors.text.head,
                      }}
                    >
                      Scheduled Date:
                    </UIText>
                    <UIText
                      className="text-right flex-1 ml-2"
                      style={{
                        fontSize: screenWidth < 768 ? 13 : 14,
                        color: Colors.text.sub,
                      }}
                    >
                      {formatDate(consultation.consultation_date)}
                    </UIText>
                  </HStack>
                )}

                {consultation.consultation_time && (
                  <HStack className="justify-between">
                    <UIText
                      className="font-medium"
                      style={{
                        fontSize: screenWidth < 768 ? 13 : 14,
                        color: Colors.text.head,
                      }}
                    >
                      Scheduled Time:
                    </UIText>
                    <UIText
                      className="text-right flex-1 ml-2"
                      style={{
                        fontSize: screenWidth < 768 ? 13 : 14,
                        color: Colors.text.sub,
                      }}
                    >
                      {consultation.consultation_time}
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
                <VStack space="sm">
                  <UIText
                    className="font-semibold text-gray-500"
                    style={{ fontSize: screenWidth < 768 ? 12 : 14 }}
                  >
                    CONTACT INFORMATION
                  </UIText>

                  {consultation.email && (
                    <HStack className="justify-between">
                      <UIText
                        className="font-medium"
                        style={{
                          fontSize: screenWidth < 768 ? 13 : 14,
                          color: Colors.text.head,
                        }}
                      >
                        Email:
                      </UIText>
                      <UIText
                        className="text-right flex-1 ml-2"
                        style={{
                          fontSize: screenWidth < 768 ? 13 : 14,
                          color: Colors.text.sub,
                        }}
                      >
                        {consultation.email}
                      </UIText>
                    </HStack>
                  )}

                  {consultation.mobile_number && (
                    <HStack className="justify-between">
                      <UIText
                        className="font-medium"
                        style={{
                          fontSize: screenWidth < 768 ? 13 : 14,
                          color: Colors.text.head,
                        }}
                      >
                        Mobile:
                      </UIText>
                      <UIText
                        className="text-right flex-1 ml-2"
                        style={{
                          fontSize: screenWidth < 768 ? 13 : 14,
                          color: Colors.text.sub,
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
                <VStack space="sm">
                  <UIText
                    className="font-semibold text-gray-500"
                    style={{ fontSize: screenWidth < 768 ? 12 : 14 }}
                  >
                    MESSAGE
                  </UIText>
                  <UIText
                    style={{
                      fontSize: screenWidth < 768 ? 13 : 14,
                      color: Colors.text.sub,
                      lineHeight: screenWidth < 768 ? 18 : 20,
                    }}
                  >
                    {consultation.message}
                  </UIText>
                </VStack>
              )}
            </VStack>
          </ScrollView>

          {/* Action Buttons */}
          {consultation.status === "pending" && (
            <View style={tw`p-4 md:p-6 border-t border-gray-200`}>
              <HStack space="md">
                <UIPressable
                  className="flex-1 py-3 rounded-lg items-center justify-center border"
                  style={{
                    borderColor: Colors.primary.blue,
                    backgroundColor: "white",
                  }}
                  onPress={onClose}
                >
                  <UIText className="font-semibold" style={{ color: Colors.primary.blue }}>
                    Close
                  </UIText>
                </UIPressable>

                <UIPressable
                  className="flex-1 py-3 rounded-lg items-center justify-center"
                  style={{
                    backgroundColor: "#EF4444",
                  }}
                  onPress={() => onCancel(consultation.id)}
                >
                  <UIText className="font-semibold text-white">
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
