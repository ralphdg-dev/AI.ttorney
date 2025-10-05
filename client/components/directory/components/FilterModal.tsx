import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  Dimensions,
} from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text as UIText } from "@/components/ui/text";
import { Pressable as UIPressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../../constants/Colors";
import tw from "tailwind-react-native-classnames";

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDays: string[];
  setSelectedDays: (days: string[]) => void;
  selectedSpecialization: string;
  setSelectedSpecialization: (spec: string) => void;
}

const SPECIALIZATIONS = [
  "All",
  "Family Law",
  "Labor Law",
  "Civil Law",
  "Criminal Law",
  "Consumer Law",
];

const DAYS = [
  { full: "Monday", abbr: "Mon" },
  { full: "Tuesday", abbr: "Tue" },
  { full: "Wednesday", abbr: "Wed" },
  { full: "Thursday", abbr: "Thu" },
  { full: "Friday", abbr: "Fri" },
  { full: "Saturday", abbr: "Sat" },
  { full: "Sunday", abbr: "Sun" },
];

export default function FilterModal({
  visible,
  onClose,
  selectedDays,
  setSelectedDays,
  selectedSpecialization,
  setSelectedSpecialization,
}: FilterModalProps) {
  const { height: screenHeight } = Dimensions.get("window");
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(300));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View
        style={[
          tw`flex-1`,
          {
            backgroundColor: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["rgba(0,0,0,0)", "rgba(0,0,0,0.4)"],
            }),
          },
        ]}
      >
        <Pressable style={tw`flex-1`} onPress={onClose}>
          <Animated.View
            style={[
              tw`bg-white rounded-t-3xl`,
              {
                marginTop: "auto",
                transform: [{ translateY: slideAnim }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 20,
              },
            ]}
          >
            <VStack className="p-6">
              {/* Header */}
              <HStack className="items-center justify-between mb-6">
                <UIText
                  className="text-xl font-bold"
                  style={{ color: Colors.text.head }}
                >
                  Filter Lawyers
                </UIText>
                <UIPressable onPress={onClose} className="p-2">
                  <Ionicons name="close" size={24} color={Colors.text.sub} />
                </UIPressable>
              </HStack>

              {/* Scrollable Content */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: screenHeight * 0.5 }}
              >
                {/* Days Filter */}
                <VStack className="mb-6">
                  <HStack className="items-center mb-3">
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={Colors.primary.blue}
                    />
                    <UIText
                      className="text-base font-semibold ml-2"
                      style={{ color: Colors.text.head }}
                    >
                      Available Days
                    </UIText>
                  </HStack>

                  <View style={tw`flex-row flex-wrap -mx-1`}>
                    {DAYS.map(({ full, abbr }) => {
                      const selected = selectedDays.includes(full);
                      return (
                        <Pressable
                          key={full}
                          onPress={() =>
                            setSelectedDays(
                              selected
                                ? selectedDays.filter((d) => d !== full)
                                : [...selectedDays, full]
                            )
                          }
                          style={[
                            tw`px-4 py-2 m-1 rounded-lg border`,
                            {
                              backgroundColor: selected
                                ? Colors.primary.blue
                                : "white",
                              borderColor: selected
                                ? Colors.primary.blue
                                : "#E5E7EB",
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: selected ? "white" : Colors.text.sub,
                            }}
                          >
                            {abbr}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </VStack>

                {/* Specialization Filter */}
                <VStack className="mb-6">
                  <HStack className="items-center mb-3">
                    <Ionicons
                      name="briefcase-outline"
                      size={18}
                      color={Colors.primary.blue}
                    />
                    <UIText
                      className="text-base font-semibold ml-2"
                      style={{ color: Colors.text.head }}
                    >
                      Specialization
                    </UIText>
                  </HStack>

                  <View style={tw`flex-row flex-wrap -mx-1`}>
                    {SPECIALIZATIONS.map((spec) => {
                      const selected = selectedSpecialization === spec;
                      return (
                        <Pressable
                          key={spec}
                          onPress={() => setSelectedSpecialization(spec)}
                          style={[
                            tw`px-4 py-2 m-1 rounded-lg border`,
                            {
                              backgroundColor: selected
                                ? Colors.primary.blue
                                : "white",
                              borderColor: selected
                                ? Colors.primary.blue
                                : "#E5E7EB",
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: selected ? "white" : Colors.text.sub,
                            }}
                          >
                            {spec}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </VStack>
              </ScrollView>

              {/* Action Buttons */}
              <HStack className="items-center justify-between pt-4 border-t border-gray-200">
                <UIPressable
                  onPress={() => {
                    setSelectedDays([]);
                    setSelectedSpecialization("All");
                  }}
                  className="px-6 py-3 rounded-lg border border-gray-200"
                >
                  <UIText
                    className="font-semibold"
                    style={{ color: Colors.text.sub }}
                  >
                    Clear All
                  </UIText>
                </UIPressable>

                <UIPressable
                  onPress={onClose}
                  className="px-8 py-3 rounded-lg"
                  style={{ backgroundColor: Colors.primary.blue }}
                >
                  <UIText className="font-semibold text-white">
                    Apply Filters
                  </UIText>
                </UIPressable>
              </HStack>
            </VStack>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
