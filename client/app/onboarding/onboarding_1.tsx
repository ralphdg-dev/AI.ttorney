import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import tw from 'tailwind-react-native-classnames';
import onboarding1 from '../../assets/images/onboarding1.png'


export default function Onboarding1() {
  return (
    <View style={tw`flex-1 bg-white p-6`}>
      <View style={tw`flex-1 justify-center items-center`}>
        <Image 
          source={onboarding1}
          style={tw`w-72 h-72 mb-8`}
        />
        <Text style={tw`text-3xl font-bold text-center mb-4`}>Bates Para sa Lahat</Text>
        <Text style={tw`text-lg text-center text-gray-600 mb-8`}>
          Whether you're seeking advice or giving it, a learning experience is easier to understand.
        </Text>
      </View>
      
    </View>
  );
}