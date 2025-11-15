import { Redirect } from "expo-router";
import { useMemo, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useGuest } from "../contexts/GuestContext";
import { getRoleBasedRedirect } from "../config/routes";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SplashScreen() {
  const { user, isLoading, isAuthenticated, initialAuthCheck } = useAuth();
  const { isGuestMode } = useGuest();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("@onboarding_completed")
      .then(seen => setHasSeenOnboarding(seen === "true"))
      .catch(() => setHasSeenOnboarding(false));
  }, []);

  const redirectPath = useMemo(() => {
    console.log('🔍 Index.tsx: Calculating redirect path', { 
      initialAuthCheck, 
      isLoading, 
      hasSeenOnboarding, 
      isAuthenticated, 
      isGuestMode,
      user 
    });
    
    if (!initialAuthCheck || isLoading || hasSeenOnboarding === null) {
      console.log('⏳ Index.tsx: Waiting for auth check or loading');
      return null;
    }
    
    if (isAuthenticated && user) {
      console.log('👤 Index.tsx: Authenticated user redirect');
      return getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer);
    }

    // Guests should go directly to chatbot to see the tutorial
    if (isGuestMode) {
      console.log('🧭 Index.tsx: Redirecting guest to /chatbot');
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
