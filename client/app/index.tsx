import { Redirect } from "expo-router";
import { useMemo, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getRoleBasedRedirect } from "../config/routes";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SplashScreen() {
  const { user, isLoading, isAuthenticated, isGuestMode, initialAuthCheck } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("@onboarding_completed")
      .then(seen => setHasSeenOnboarding(seen === "true"))
      .catch(() => setHasSeenOnboarding(false));
  }, []);

  const redirectPath = useMemo(() => {
    if (!initialAuthCheck || isLoading || hasSeenOnboarding === null) return null;
    if (isAuthenticated && user) {
      return getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer);
    }

    // Guests should always bypass onboarding and go straight to chatbot
    if (isGuestMode) {
      return "/chatbot";
    }

    // For non-guest unauthenticated users, show onboarding if they haven't seen it yet
    if (!hasSeenOnboarding) {
      return "/onboarding/onboarding";
    }

    // Default unauthenticated entry point
    return "/login";
  }, [initialAuthCheck, isLoading, isAuthenticated, isGuestMode, user, hasSeenOnboarding]);

  return redirectPath ? <Redirect href={redirectPath as any} /> : null;
}
