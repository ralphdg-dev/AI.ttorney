import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getRoleBasedRedirect } from "../config/routes";
import { LoadingWithTrivia } from "../components/LoadingWithTrivia";

export default function SplashScreen() {
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const { user, isLoading, isAuthenticated, isGuestMode, initialAuthCheck } = useAuth();

  useEffect(() => {
    // Only redirect when auth check is complete
    if (!isLoading && initialAuthCheck) {
      let targetPath = "/login";
      
      // Check for guest mode first
      if (isGuestMode) {
        console.log('🎯 Redirecting guest to /chatbot');
        targetPath = "/chatbot";
      } else if (isAuthenticated && user) {
        targetPath = getRoleBasedRedirect(user.role, user.is_verified, user.pending_lawyer);
      }
      
      setRedirectPath(targetPath);
    }
  }, [isLoading, isAuthenticated, isGuestMode, user, initialAuthCheck]);

  // Redirect when ready
  if (redirectPath && !isLoading) {
    return <Redirect href={redirectPath as any} />;
  }

  // Show unified loading screen for entire app
  return <LoadingWithTrivia />;
}
