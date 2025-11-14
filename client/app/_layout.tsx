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
import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { GuestProvider } from "../contexts/GuestContext";
import { GuestChatProvider } from "../contexts/GuestChatContext";
import { FavoritesProvider } from "../contexts/FavoritesContext";
import { BookmarksProvider } from "../contexts/BookmarksContext";
import { PostBookmarksProvider } from "../contexts/PostBookmarksContext";
import { ConsultationsProvider } from "../contexts/ConsultationsContext";
import { ForumCacheProvider } from "../contexts/ForumCacheContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ModerationProvider } from "../contexts/ModerationContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import { SidebarProvider } from "../components/AppSidebar";
import { AuthGuard } from "../components/AuthGuard";
import { SuspensionGuard } from "../components/SuspensionGuard";
import { RouteErrorBoundary } from "../components/RouteErrorBoundary";
import NoInternetModal from "../components/common/NoInternetModal";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

// Keep the splash screen visible while we fetch resources
// This prevents flash of unauthenticated UI during auth check
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { initialAuthCheck } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const isConnected = useNetworkStatus();
  const [showNoInternet, setShowNoInternet] = useState(false);

  useEffect(() => {
    // Only hide splash screen when auth check is complete
    if (initialAuthCheck) {
      setIsReady(true);
      const t = setTimeout(() => {
        SplashScreen.hideAsync();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [initialAuthCheck]);

  // Show/hide no internet modal based on connection status
  useEffect(() => {
    if (isConnected === false) {
      setShowNoInternet(true);
    } else if (isConnected === true) {
      setShowNoInternet(false);
    }
  }, [isConnected]);

  // Keep splash screen visible until auth check completes
  if (!isReady) {
    return null;
  }

  return (
    <>
      <NoInternetModal 
        visible={showNoInternet} 
        onDismiss={() => setShowNoInternet(false)}
      />
    <GuestProvider>
      <GuestChatProvider>
        <ModerationProvider>
          <NotificationProvider>
            <FavoritesProvider>
              <BookmarksProvider>
                <PostBookmarksProvider>
                  <ConsultationsProvider>
                    <ErrorBoundary fallbackRoute="/home">
                      <ForumCacheProvider>
                        <AuthGuard>
                        <SuspensionGuard>
                          <RouteErrorBoundary>
                            <SidebarProvider>
                              <Stack screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="index" options={{ headerShown: false }} />
                                <Stack.Screen name="login" options={{ headerShown: false }} />
                                <Stack.Screen name="role-selection" options={{ headerShown: false }} />
                                <Stack.Screen name="lawyer/index" options={{ headerShown: false }} />
                                <Stack.Screen name="lawyer/forum" options={{ headerShown: false }} />
                                <Stack.Screen name="lawyer/consult" options={{ headerShown: false }} />
                                <Stack.Screen name="lawyer/profile" options={{ headerShown: false }} />
                                <Stack.Screen name="directory" options={{ headerShown: false, title: "Find Legal Help" }} />
                                <Stack.Screen name="article" options={{ headerShown: false, title: "Article" }} />
                                <Stack.Screen name="guides" options={{ headerShown: false, title: "Guides" }} />
                                <Stack.Screen name="glossary" options={{ headerShown: false, title: "Glossary" }} />
                                <Stack.Screen name="glossary/[id]" options={{ headerShown: false, title: "Term Details" }} />
                                <Stack.Screen name="consultations" options={{ headerShown: false, title: "User Consultations" }} />
                                <Stack.Screen name="bookmarked-guides" options={{ headerShown: false, title: "Bookmarked Guides" }} />
                                <Stack.Screen name="favorite-terms" options={{ headerShown: false, title: "Favorite Terms" }} />
                                <Stack.Screen name="help" options={{ headerShown: false, title: "Help" }} />
                                <Stack.Screen name="profile" options={{ headerShown: false, title: "Profile" }} />
                              </Stack>
                            </SidebarProvider>
                          </RouteErrorBoundary>
                        </SuspensionGuard>
                        </AuthGuard>
                      </ForumCacheProvider>
                    </ErrorBoundary>
                  </ConsultationsProvider>
                </PostBookmarksProvider>
              </BookmarksProvider>
            </FavoritesProvider>
          </NotificationProvider>
        </ModerationProvider>
      </GuestChatProvider>
    </GuestProvider>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GluestackUIProvider mode="light">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GluestackUIProvider>
  );
}
