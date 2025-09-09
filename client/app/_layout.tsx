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
import { FavoritesProvider } from "../contexts/FavoritesContext";
import { SidebarProvider, SidebarWrapper } from "@/components/AppSidebar";

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
        <FavoritesProvider>
          <SidebarProvider>
            <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="role-selection" options={{ headerShown: false }} />
            <Stack.Screen name="nonlaw-reg" options={{ headerShown: false }} />
            <Stack.Screen name="verifyotp-reg" options={{ headerShown: false }} />
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
              {/* Hide parent header for the article segment to avoid 'article' title bar */}
              <Stack.Screen
                name="article"
                options={{
                  headerShown: false,
                  title: "Article",
                }}
              />
              <Stack.Screen
                name="guides"
                options={{
                  headerShown: false,
                  title: "Guides",
                }}
              />
              <Stack.Screen
                name="glossary"
                options={{
                  headerShown: false,
                  title: "Glossary",
                }}
              />
              <Stack.Screen
                name="glossary/[id]"
                options={{
                  headerShown: false,
                  title: "Term Details",
                }}
              />
              <Stack.Screen
                name="favorites"
                options={{
                  headerShown: false,
                  title: "Favorite Terms",
                }}
              />
              <Stack.Screen
                name="bookmarked-guides"
                options={{
                  headerShown: false,
                  title: "Bookmarked Guides",
                }}
              />
              <Stack.Screen name="documents-success" options={{ headerShown: false }} />
            </Stack>
            {/* Mount the sidebar at the root so it can overlay any screen */}
            <SidebarWrapper />
          </SidebarProvider>
        </FavoritesProvider>
      </AuthProvider>
    </GluestackUIProvider>
  );
}
