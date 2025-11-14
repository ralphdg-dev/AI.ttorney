import { Redirect } from "expo-router";
import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getRoleBasedRedirect } from "../config/routes";

export default function SplashScreen() {
  const { user, isLoading, isAuthenticated, isGuestMode, initialAuthCheck } = useAuth();
  const redirectPath = useMemo(() => {
    if (!initialAuthCheck || isLoading) return null;
    if (isGuestMode) return "/chatbot";
    if (isAuthenticated && user) return getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer);
    return "/login";
  }, [initialAuthCheck, isLoading, isGuestMode, isAuthenticated, user]);

  if (redirectPath) {
    return <Redirect href={redirectPath as any} />;
  }

  // While waiting for initial auth check, AppContent keeps the splash screen up.
  // Once ready, we immediately redirect without rendering an intermediate loader.
  return null;
}
