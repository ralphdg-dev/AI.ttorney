import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";
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
    <View style={tw`mx-6 mb-4 bg-white rounded-lg border border-gray-200 p-4`}>
      <View style={tw`flex-row justify-between items-start mb-2`}>
        <View style={tw`flex-1`}>
          <Text style={[tw`font-bold text-base`, { color: Colors.text.head }]}>
            {lawyer.name}
          </Text>
          <Text style={[tw`text-sm mt-1`, { color: Colors.text.sub }]}>
            {lawyer.specialization}
          </Text>
          <Text style={[tw`text-sm`, { color: Colors.text.sub }]}>
            {lawyer.location}
          </Text>
        </View>
        
        <View style={tw`flex-row items-center`}>
          <View
            style={[
              tw`w-2 h-2 rounded-full mr-2`,
              { backgroundColor: lawyer.available ? '#10B981' : '#9CA3AF' }
            ]}
          />
          <Text
            style={[
              tw`text-xs font-medium`,
              { color: lawyer.available ? '#10B981' : '#9CA3AF' }
            ]}
          >
            {lawyer.available ? 'Available' : 'Unavailable'}
          </Text>
        </View>
      </View>

      <View style={tw`flex-row items-center mb-4`}>
        <View style={tw`flex-row items-center mr-6`}>
          <Ionicons name="time-outline" size={16} color={Colors.text.sub} />
          <Text style={[tw`text-sm ml-1`, { color: Colors.text.sub }]}>
            {lawyer.hours}
          </Text>
        </View>
        
        <View style={tw`flex-row items-center`}>
          <Ionicons name="calendar-outline" size={16} color={Colors.text.sub} />
          <Text style={[tw`text-sm ml-1`, { color: Colors.text.sub }]}>
            {lawyer.days}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          tw`py-3 rounded-lg items-center justify-center`,
          { 
            backgroundColor: lawyer.available ? Colors.primary.blue : '#E5E7EB',
          }
        ]}
        onPress={() => lawyer.available && onBookConsultation(lawyer)}
        disabled={!lawyer.available}
      >
        <Text
          style={[
            tw`font-semibold`,
            { 
              color: lawyer.available ? 'white' : '#9CA3AF'
            }
          ]}
        >
          Book Consultation
        </Text>
      </TouchableOpacity>
    </View>
  );
}
