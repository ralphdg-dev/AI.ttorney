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
                      {/* <ErrorBoundary fallbackRoute="/login"> */}
                        <ForumCacheProvider>
                          <SidebarProvider>
                            <AuthGuard>
                              <Stack screenOptions={{ 
                                headerShown: false,
                                animation: 'none'
                              }}>
                                {/* Auth & Splash Screens */}
                                <Stack.Screen name="index" options={{ headerShown: false }} />
                                <Stack.Screen name="login" options={{ headerShown: false }} />
                                <Stack.Screen name="role-selection" options={{ headerShown: false }} />
                                <Stack.Screen name="banned" options={{ headerShown: false }} />
                                <Stack.Screen name="deactivated" options={{ headerShown: false }} />
                                <Stack.Screen name="suspended" options={{ headerShown: false }} />
                                <Stack.Screen name="suspension-lifted" options={{ headerShown: false }} />
                                <Stack.Screen name="unauthorized" options={{ headerShown: false }} />

                                {/* User Routes */}
                                <Stack.Screen name="home" options={{ headerShown: false }} />
                                <Stack.Screen name="chatbot" options={{ headerShown: false }} />
                                <Stack.Screen name="directory" options={{ headerShown: false }} />
                                <Stack.Screen name="guides" options={{ headerShown: false }} />
                                <Stack.Screen name="glossary" options={{ headerShown: false }} />
                                <Stack.Screen name="glossary/[id]" options={{ headerShown: false }} />
                                <Stack.Screen name="consultations" options={{ headerShown: false }} />
                                <Stack.Screen name="bookmarked-guides" options={{ headerShown: false }} />
                                <Stack.Screen name="bookmarked-posts" options={{ headerShown: false }} />
                                <Stack.Screen name="favorite-terms" options={{ headerShown: false }} />
                                <Stack.Screen name="help" options={{ headerShown: false }} />
                                <Stack.Screen name="about" options={{ headerShown: false }} />
                                <Stack.Screen name="profile" options={{ headerShown: false }} />
                                <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
                                <Stack.Screen name="notifications" options={{ headerShown: false }} />
                                <Stack.Screen name="search" options={{ headerShown: false }} />
                                <Stack.Screen name="my-appeals" options={{ headerShown: false }} />
                                <Stack.Screen name="appeal-submission" options={{ headerShown: false }} />
                                <Stack.Screen name="booklawyer" options={{ headerShown: false }} />
                                <Stack.Screen name="guest-onboarding" options={{ headerShown: false }} />

                                {/* Article Routes */}
                                <Stack.Screen name="article/[id]" options={{ headerShown: false }} />

                                {/* Auth Routes */}
                                <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />

                                {/* Lawyer Routes */}
                                <Stack.Screen name="lawyer/index" options={{ headerShown: false }} />
                                <Stack.Screen name="lawyer/forum" options={{ headerShown: false }} />
                                <Stack.Screen name="lawyer/consult" options={{ headerShown: false }} />
                                <Stack.Screen name="lawyer/profile" options={{ headerShown: false }} />
                                <Stack.Screen name="lawyer/consultation/[id]" options={{ headerShown: false }} />

                                {/* Settings Routes */}
                                <Stack.Screen name="settings" options={{ headerShown: false }} />
                                <Stack.Screen name="settings/about-us" options={{ headerShown: false }} />
                                <Stack.Screen name="settings/privacy-policy" options={{ headerShown: false }} />
                                <Stack.Screen name="settings/terms" options={{ headerShown: false }} />
                                <Stack.Screen name="settings/change-password" options={{ headerShown: false }} />
                                <Stack.Screen name="settings/deactivate-account" options={{ headerShown: false }} />

                                {/* Onboarding Routes */}
                                <Stack.Screen name="onboarding/onboarding" options={{ headerShown: false }} />
                                <Stack.Screen name="onboarding/registration" options={{ headerShown: false }} />
                                <Stack.Screen name="onboarding/verify-otp" options={{ headerShown: false }} />
                                <Stack.Screen name="onboarding/otp-success" options={{ headerShown: false }} />
                                <Stack.Screen name="onboarding/registered-tutorial" options={{ headerShown: false }} />

                                {/* Lawyer Onboarding Routes */}
                                <Stack.Screen name="onboarding/lawyer/verification-instructions" options={{ headerShown: false }} />
                                <Stack.Screen name="onboarding/lawyer/upload-documents" options={{ headerShown: false }} />
                                <Stack.Screen name="onboarding/lawyer/lawyer-face-verification" options={{ headerShown: false }} />
                                <Stack.Screen name="onboarding/lawyer/lawyer-terms" options={{ headerShown: false }} />
                                <Stack.Screen name="onboarding/lawyer/documents-success" options={{ headerShown: false }} />
                                <Stack.Screen name="onboarding/lawyer/lawyer-status/pending" options={{ headerShown: false }} />
                                <Stack.Screen name="onboarding/lawyer/lawyer-status/accepted" options={{ headerShown: false }} />
                                <Stack.Screen name="onboarding/lawyer/lawyer-status/rejected" options={{ headerShown: false }} />
                                <Stack.Screen name="onboarding/lawyer/lawyer-status/rejected-acknowledged" options={{ headerShown: false }} />
                                <Stack.Screen name="onboarding/lawyer/lawyer-status/resubmission" options={{ headerShown: false }} />

                                {/* Apply Lawyer Route */}
                                <Stack.Screen name="apply-lawyer" options={{ headerShown: false }} />
                              </Stack>
                            </AuthGuard>
                          </SidebarProvider>
                        </ForumCacheProvider>
                      {/* </ErrorBoundary> */}
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

  React.useEffect(() => {
    // Log successful initialization
    console.log('✅ [_layout.tsx] RootLayout mounted, fonts ready:', isReady);
  }, [isReady]);

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
