import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import tw from 'tailwind-react-native-classnames';
import onboarding2 from '../../assets/images/onboarding2.png'

export default function Onboarding2() {
  return (
    <View style={tw`flex-1 bg-white p-6`}>
      <View style={tw`flex-1 justify-center items-center`}>
        <Image 
          source={onboarding2}
          style={tw`w-72 h-72 mb-8`}
        />
        <Text style={tw`text-3xl font-bold text-center mb-4`}>May Tanong? Chat ka Lang!</Text>
        <Text style={tw`text-lg text-center text-gray-600 mb-8`}>
          Chat with our smart assistant for all users—anything different, in English or English.
        </Text>
      </View>
    </View>
  );
}