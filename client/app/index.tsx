import { Text, Image, Animated } from "react-native";
import { Redirect } from "expo-router";
import { useEffect, useState, useRef } from "react";
import tw from "tailwind-react-native-classnames";
import logo from ".././assets/images/logo.gif";
import { useAuth } from "../contexts/AuthContext";
import { getRoleBasedRedirect } from "../config/routes";

export default function SplashScreen() {
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { user, isLoading, isAuthenticated, initialAuthCheck } = useAuth();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Wait a minimum time for branding (1.5 seconds instead of 4)
      const minDisplayTime = 1500;
      const startTime = Date.now();
      
      // Wait for auth to be determined
      if (!isLoading && initialAuthCheck) {
        let targetPath = "/onboarding/onboarding"; // Default for unauthenticated users
        
        if (isAuthenticated && user) {
          // User is authenticated, redirect to appropriate dashboard
          targetPath = getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer);
          
          // If user has pending_lawyer, use loading screen to fetch actual status
          if (user.pending_lawyer) {
            targetPath = "/loading-status";
          }
        }
        
        // Ensure minimum display time
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500, // Faster fade
            useNativeDriver: true,
          }).start(() => {
            setRedirectPath(targetPath);
            setShouldRedirect(true);
          });
        }, remainingTime);
      }
    };

    checkAuthAndRedirect();
  }, [isLoading, isAuthenticated, user, initialAuthCheck, fadeAnim]);

  if (shouldRedirect && redirectPath) {
    return <Redirect href={redirectPath as any} />;
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
