import { View, Text, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import tw from 'tailwind-react-native-classnames';
import { useState } from 'react';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleContinue = () => {
    // TODO: Implement role selection logic
    console.log('Continue pressed with role:', selectedRole);
  };

  const handleContinueAsGuest = () => {
    // TODO: Implement guest mode
    console.log('Continue as guest pressed');
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Top Navigation */}
      <View style={tw`flex-row items-center px-6 pt-12 pb-4`}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={tw`p-2`}
        >
          <Ionicons name="arrow-back" size={24} color="#A0A0A0" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={tw`flex-1 px-6`}>
                 {/* Heading */}
         <View style={tw`mb-12`}>
           <Text style={[tw`text-center text-2xl font-bold mb-0`, { color: Colors.text.head, lineHeight: 24 }]}>
             Bawat kwento, may
           </Text>
           <Text style={[tw`text-center text-2xl font-bold mb-0`, { color: Colors.text.head, lineHeight: 24 }]}>
            dalawang panig.
           </Text>
           <Text style={[tw`text-center text-2xl font-bold`, { color: Colors.text.head, lineHeight: 24 }]}>
             Nasaan ka?
           </Text>
         </View>

         {/* Role Cards */}
         <View style={tw`flex-1 px-12`}>
           {/* Lawyer Card */}
           <TouchableOpacity
             onPress={() => setSelectedRole('lawyer')}
             style={[
               tw`mb-4 p-6 rounded-lg border`,
               { 
                 borderColor: selectedRole === 'lawyer' ? Colors.primary.blue : '#E5E7EB',
                 backgroundColor: selectedRole === 'lawyer' ? '#F0F8FF' : 'white'
               }
             ]}
           >
            <View style={tw`items-center mb-4`}>
              <View style={tw`w-24 h-24 bg-gray-200 rounded-full items-center justify-center mb-3`}>
                <Ionicons name="school" size={32} color="#6B7280" />
              </View>
            </View>
            <Text style={[tw`text-center text-lg font-bold mb-2`, { color: Colors.text.head }]}>
              Lawyer
            </Text>
            <Text style={[tw`text-center text-sm`, { color: Colors.text.sub, lineHeight: 16 }]}>
              Para sa lisensyadong abogado na nagbibigay ng libreng gabay
            </Text>
          </TouchableOpacity>

          {/* Legal Seeker Card */}
          <TouchableOpacity
            onPress={() => setSelectedRole('seeker')}
            style={[
              tw`mb-4 p-6 rounded-lg border`,
              { 
                borderColor: selectedRole === 'seeker' ? Colors.primary.blue : '#E5E7EB',
                backgroundColor: selectedRole === 'seeker' ? '#F0F8FF' : 'white'
              }
            ]}
          >
            <View style={tw`items-center mb-4`}>
              <View style={tw`w-24 h-24 bg-gray-200 rounded-full items-center justify-center mb-3`}>
                <Ionicons name="search" size={32} color="#6B7280" />
              </View>
            </View>
            <Text style={[tw`text-center text-lg font-bold mb-2`, { color: Colors.text.head }]}>
              Legal Seeker
            </Text>
            <Text style={[tw`text-center text-sm`, { color: Colors.text.sub, lineHeight: 16 }]}>
              Para sa mga naghahanap ng legal na impormasyon o tulong
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Section */}
        <View style={tw`pb-8`}>
          {/* Continue Button */}
          <TouchableOpacity
            style={[
              tw`py-3 rounded-lg items-center justify-center mb-4`,
              { 
                backgroundColor: selectedRole ? Colors.primary.blue : '#D1D5DB'
              }
            ]}
            onPress={handleContinue}
            disabled={!selectedRole}
          >
            <Text style={[
              tw`font-semibold text-lg`,
              { color: selectedRole ? 'white' : '#9CA3AF' }
            ]}>
              Continue
            </Text>
          </TouchableOpacity>

          {/* Continue as Guest */}
          <TouchableOpacity onPress={handleContinueAsGuest}>
            <Text style={[tw`text-center`, { color: Colors.text.sub }]}>
              Continue as{' '}
              <Text style={[tw`font-bold`, { color: Colors.primary.blue }]}>Guest</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
} 