import { Stack } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AuthProvider } from "../lib/auth-context";
import DirectoryScreen from "./directory/screens/DirectoryScreen";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="role-selection" options={{ headerShown: false }} />
        <Stack.Screen name="nonlaw-reg" options={{ headerShown: false }} />
        <Stack.Screen name="verifyotp-reg" options={{ headerShown: false }} />
        <Stack.Screen
          name="directory"
          options={{
            headerShown: false,
            title: "Find Legal Help",
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
