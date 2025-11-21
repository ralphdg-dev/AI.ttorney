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
  const [forceRender, setForceRender] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("@onboarding_completed")
      .then(seen => setHasSeenOnboarding(seen === "true"))
      .catch(() => setHasSeenOnboarding(false));
  }, []);

  // ANDROID FIX: Force render after 8 seconds to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('⚠️ ANDROID: Forcing render after 8s timeout');
      setForceRender(true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, []);

  const redirectPath = useMemo(() => {
    // ANDROID FIX: Allow force render to bypass auth check after timeout
    if ((!initialAuthCheck || isLoading || hasSeenOnboarding === null) && !forceRender) {
      return null;
    }
    
    // If forced render due to timeout, redirect to login as fallback
    if (forceRender && !initialAuthCheck) {
      console.warn('⚠️ ANDROID: Force redirecting to login after timeout');
      return '/login';
    }
    
    if (isAuthenticated && user) {
      return getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer);
    }

    if (isGuestMode) {
      return "/chatbot";
    }

    if (!hasSeenOnboarding) {
      return "/onboarding/onboarding";
    }

    return "/login";
  }, [initialAuthCheck, isLoading, isAuthenticated, isGuestMode, user, hasSeenOnboarding, forceRender]);

  return redirectPath ? <Redirect href={redirectPath as any} /> : null;
}
