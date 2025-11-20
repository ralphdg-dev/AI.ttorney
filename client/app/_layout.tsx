import { Stack } from "expo-router";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { useRobustFonts } from "@/utils/fontLoader";
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
import NoInternetModal from "../components/common/NoInternetModal";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { AuthGuard } from "../components/AuthGuard";

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { initialAuthCheck } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const isConnected = useNetworkStatus();
  const [showNoInternet, setShowNoInternet] = useState(false);

  useEffect(() => {
    if (initialAuthCheck) {
      setIsReady(true);
      const t = setTimeout(() => {
        SplashScreen.hideAsync();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [initialAuthCheck]);

  useEffect(() => {
    if (isConnected === false) {
      setShowNoInternet(true);
    } else if (isConnected === true) {
      setShowNoInternet(false);
    }
  }, [isConnected]);

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
                          <SidebarProvider>
                            <AuthGuard>
                              <Stack screenOptions={{ 
                                headerShown: false,
                                animation: 'none'
                              }}>
                                <Stack.Screen name="index" options={{ headerShown: false }} />
                                <Stack.Screen name="login" options={{ headerShown: false }} />
                                <Stack.Screen name="role-selection" options={{ headerShown: false }} />
                                <Stack.Screen name="banned" options={{ headerShown: false }} />
                                <Stack.Screen name="deactivated" options={{ headerShown: false }} />
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
                                <Stack.Screen name="profile" options={{ headerShown: false }} />
                                <Stack.Screen name="guest-onboarding" options={{ headerShown: false }} />
                              </Stack>
                            </AuthGuard>
                          </SidebarProvider>
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
  const { isReady } = useRobustFonts();

  // Wait for fonts to load or timeout before rendering
  if (!isReady) {
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
