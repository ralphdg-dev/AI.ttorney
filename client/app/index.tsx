import { Text, Image, Animated } from "react-native";
import { Redirect } from "expo-router";
import { useEffect, useState, useRef } from "react";
import tw from "tailwind-react-native-classnames";
import logo from ".././assets/images/logo.gif";

export default function SplashScreen() {
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        setShouldRedirect(true);
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  if (shouldRedirect) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Animated.View
      style={[
        tw`flex-1 bg-white justify-center items-center`,
        { opacity: fadeAnim }, 
      ]}
    >
      <Image source={logo} style={tw`w-44 h-44 mr-14`} />
      <Text style={tw`text-2xl font-bold`}>Ai.ttorney</Text>
      <Text style={tw`text-gray-500 italic`}>
        Justice at Your Fingertips
      </Text>{" "}
    </Animated.View>
  );
}
