import React, { useEffect, useRef } from "react";
import { Modal, View, TouchableOpacity, Dimensions, Animated } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text as UIText } from "@/components/ui/text";
import { Pressable as UIPressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";
import Colors from "../../../constants/Colors";
import { shouldUseNativeDriver } from "../../../utils/animations";

const { height: screenHeight } = Dimensions.get("window");

interface ConsultationFilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
}

const statusOptions = [
  { id: "upcoming", label: "Upcoming" },
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function ConsultationFilterModal({
  visible,
  onClose,
  selectedStatus,
  setSelectedStatus,
}: ConsultationFilterModalProps) {
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: shouldUseNativeDriver('transform'),
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: shouldUseNativeDriver('transform'),
      }).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleStatusSelect = (statusId: string) => {
    setSelectedStatus(statusId);
    onClose(); // Close immediately after selection
  };

  const handleBackdropPress = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
        {/* Backdrop - Touchable area to close modal */}
        <TouchableOpacity
          style={tw`absolute inset-0`}
          activeOpacity={1}
          onPress={handleBackdropPress}
        />
        
        <Animated.View
          style={[
            tw`bg-white rounded-t-3xl`,
            { 
              maxHeight: screenHeight * 0.5,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Header */}
          <VStack className="px-6 py-4 border-b border-gray-200">
            <HStack className="justify-between items-center">
              <UIText className="text-lg font-bold" style={{ color: Colors.text.head }}>
                Filter by Status
              </UIText>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={Colors.text.sub} />
              </TouchableOpacity>
            </HStack>
          </VStack>

          {/* Status Options */}
          <VStack className="px-6 py-6">
            <VStack space="md">
              {/* First Row */}
              <HStack space="sm" className="justify-center">
                {statusOptions.slice(0, 3).map((option) => (
                  <UIPressable
                    key={option.id}
                    onPress={() => handleStatusSelect(option.id)}
                    className="px-4 py-3 rounded-lg border flex-1 items-center"
                    style={{
                      backgroundColor: selectedStatus === option.id ? Colors.primary.blue : 'white',
                      borderColor: selectedStatus === option.id ? Colors.primary.blue : '#E5E7EB',
                    }}
                  >
                    <UIText 
                      className="text-sm font-medium"
                      style={{ 
                        color: selectedStatus === option.id ? 'white' : Colors.text.head
                      }}
                    >
                      {option.label}
                    </UIText>
                  </UIPressable>
                ))}
              </HStack>
              
              {/* Second Row */}
              <HStack space="sm" className="justify-center">
                {statusOptions.slice(3, 5).map((option) => (
                  <UIPressable
                    key={option.id}
                    onPress={() => handleStatusSelect(option.id)}
                    className="px-4 py-3 rounded-lg border flex-1 items-center"
                    style={{
                      backgroundColor: selectedStatus === option.id ? Colors.primary.blue : 'white',
                      borderColor: selectedStatus === option.id ? Colors.primary.blue : '#E5E7EB',
                    }}
                  >
                    <UIText 
                      className="text-sm font-medium"
                      style={{ 
                        color: selectedStatus === option.id ? 'white' : Colors.text.head
                      }}
                    >
                      {option.label}
                    </UIText>
                  </UIPressable>
                ))}
              </HStack>
            </VStack>
          </VStack>
        </Animated.View>
      </View>
    </Modal>
  );
}
