import { View, Text, Image } from 'react-native';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import tw from 'tailwind-react-native-classnames';
import logo from '.././assets/images/logo.gif';

export default function SplashScreen() {
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRedirect(true);
    }, 7000);

    return () => clearTimeout(timer); 
  }, []);

  if (shouldRedirect) {
    return <Redirect href="/onboarding/onboarding_1" />;
  }

  return (
    <View style={tw`flex-1 bg-white justify-center items-center`}>
      <Image 
        source={logo}
        style={tw`w-44 h-44 mr-14`}
      />
      <Text style={tw`text-2xl font-bold`}>Ai.ttorney</Text>
      <Text style={tw`text-gray-500 italic`}>Justice at Your Fingertips</Text>
    </View>
  );
}
