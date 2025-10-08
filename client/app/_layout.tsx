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
import { AuthProvider } from "../contexts/AuthContext";
import { FavoritesProvider } from "../contexts/FavoritesContext";
import { SidebarProvider } from "../components/AppSidebar";
import { AuthGuard } from "../components/AuthGuard";
import { RouteErrorBoundary } from "../components/RouteErrorBoundary";

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
            <AuthGuard>
              <RouteErrorBoundary>
                <SidebarProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen
                      name="index"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="onboarding"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="login"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="role-selection"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="nonlaw-reg"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="verifyotp-reg"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="lawyer-starting-page"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="lawyer/index"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="lawyer/forum"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="lawyer/consult"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="lawyer/profile"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="lawyer"
                      options={{
                        headerShown: false,
                        title: "Lawyer Dashboard",
                      }}
                    />
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
                      name="documents-success"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="consultations"
                      options={{
                        headerShown: false,
                        title: "User Consultations",
                      }}
                    />
                    <Stack.Screen
                      name="bookmarked-guides"
                      options={{
                        headerShown: false,
                        title: "Bookmarked Guides",
                      }}
                    />
                    <Stack.Screen
                      name="favorite-terms"
                      options={{
                        headerShown: false,
                        title: "Favorite Terms",
                      }}
                    />
                    <Stack.Screen
                      name="notifications"
                      options={{
                        headerShown: false,
                        title: "Notifications",
                      }}
                    />
                    <Stack.Screen
                      name="help"
                      options={{
                        headerShown: false,
                        title: "Help",
                      }}
                    />
                  </Stack>
                </SidebarProvider>
              </RouteErrorBoundary>
            </AuthGuard>
          </FavoritesProvider>
      </AuthProvider>
    </GluestackUIProvider>
  );
}
