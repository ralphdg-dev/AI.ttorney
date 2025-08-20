import React from "react";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Box } from "@/components/ui/box";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../../constants/Colors";

interface Lawyer {
  id: number;
  name: string;
  specialization: string;
  location: string;
  hours: string;
  days: string;
  available: boolean;
}

interface LawyerCardProps {
  lawyer: Lawyer;
  onBookConsultation: (lawyer: Lawyer) => void;
}

export default function LawyerCard({ lawyer, onBookConsultation }: LawyerCardProps) {
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
          <Text 
            className="text-sm mt-1" 
            style={{ color: Colors.text.sub }}
          >
            {lawyer.specialization}
          </Text>
          <Text 
            className="text-sm" 
            style={{ color: Colors.text.sub }}
          >
            {lawyer.location}
          </Text>
        </VStack>
        
        <HStack className="items-center">
          <Box
            className="w-2 h-2 rounded-full mr-2"
            style={{ backgroundColor: lawyer.available ? '#10B981' : '#9CA3AF' }}
          />
          <Text
            className="text-xs font-medium"
            style={{ color: lawyer.available ? '#10B981' : '#9CA3AF' }}
          >
            {lawyer.available ? 'Available' : 'Unavailable'}
          </Text>
        </HStack>
      </HStack>

      <HStack className="items-center mb-4">
        <HStack className="items-center mr-6">
          <Ionicons name="time-outline" size={16} color={Colors.text.sub} />
          <Text 
            className="text-sm ml-1" 
            style={{ color: Colors.text.sub }}
          >
            {lawyer.hours}
          </Text>
        </HStack>
        
        <HStack className="items-center">
          <Ionicons name="calendar-outline" size={16} color={Colors.text.sub} />
          <Text 
            className="text-sm ml-1" 
            style={{ color: Colors.text.sub }}
          >
            {lawyer.days}
          </Text>
        </HStack>
      </HStack>

      <Pressable
        className="py-3 rounded-lg items-center justify-center"
        style={{ 
          backgroundColor: lawyer.available ? Colors.primary.blue : '#E5E7EB',
        }}
        onPress={() => lawyer.available && onBookConsultation(lawyer)}
        disabled={!lawyer.available}
      >
        <Text
          className="font-semibold"
          style={{ 
            color: lawyer.available ? 'white' : '#9CA3AF'
          }}
        >
          Book Consultation
        </Text>
      </Pressable>
    </Box>
  );
}