import { Redirect } from "expo-router";
import { useMemo, useEffect, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
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

  // Show splash screen while loading
  if (redirectPath === null) {
    return (
      <View style={styles.container}>
        <Image 
          source={require("../assets/images/splash-icon.png")} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>AI.ttorney</Text>
        <Text style={styles.subtitle}>Your Legal Assistant</Text>
      </View>
    );
  }

  return <Redirect href={redirectPath as any} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 40,
  },
});
