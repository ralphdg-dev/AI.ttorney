import { Stack } from "expo-router";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
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
import { SidebarProvider, SidebarWrapper } from "../components/AppSidebar";

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
    <GluestackUIProvider mode="light">
      <AuthProvider>
        <SidebarProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="role-selection" options={{ headerShown: false }} />
            <Stack.Screen name="nonlaw-reg" options={{ headerShown: false }} />
            <Stack.Screen name="verifyotp-reg" options={{ headerShown: false }} />
            <Stack.Screen name="home" options={{ headerShown: false, title: "" }} />
            <Stack.Screen name="lawyer-starting-page" options={{ headerShown: false }} />
            <Stack.Screen name="lawyer-reg" options={{ headerShown: false }} />
            <Stack.Screen name="lawyer-face-verification" options={{ headerShown: false }} />
            <Stack.Screen name="lawyer-preface-recog" options={{ headerShown: false }} />
            <Stack.Screen name="lawyer-terms" options={{ headerShown: false }} />
            <Stack.Screen
              name="directory"
              options={{
                headerShown: false,
                title: "Find Legal Help",
              }}
            />
          </Stack>
          <SidebarWrapper />
        </SidebarProvider>
      </AuthProvider>
    </GluestackUIProvider>
  );
}
