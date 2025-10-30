 import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useFavorites } from "../contexts/FavoritesContext";
import { shouldUseNativeDriver } from '@/utils/animations';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bookmark,
  Settings,
  HelpCircle,
  FileText,
  LogOut,
  Bell,
  MessageSquare,
  Star,
  Calendar,
  User,
  X
} from "lucide-react-native";
import Colors from "../constants/Colors";
import { GlobalStyles } from "../constants/GlobalStyles";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import { createShadowStyle } from "../utils/shadowUtils";
import { LAYOUT } from "../constants/LayoutConstants";

const { width: screenWidth } = Dimensions.get("window");
const SIDEBAR_WIDTH = screenWidth * 0.8;
const ANIMATION_DURATION = 280;

// Types
interface SidebarContextType {
  isVisible: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

interface SidebarProviderProps {
  children: ReactNode;
}

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
  userInfo?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  route?: string;
  action?: () => void;
  badge?: number;
  divider?: boolean;
}

// Context
const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// Context Provider
export const SidebarProvider: React.FC<SidebarProviderProps> = ({
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const openSidebar = useCallback(() => setIsVisible(true), []);
  const closeSidebar = useCallback(() => setIsVisible(false), []);
  const toggleSidebar = useCallback(() => setIsVisible((prev) => !prev), []);

  const value: SidebarContextType = React.useMemo(() => ({
    isVisible,
    openSidebar,
    closeSidebar,
    toggleSidebar,
  }), [isVisible, openSidebar, closeSidebar, toggleSidebar]);

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
};

// Hook
export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

// Main Sidebar Component
const Sidebar: React.FC<SidebarProps> = ({
  isVisible,
  onClose,
  onNavigate,
  userInfo = { name: "User", email: "user@example.com" },
}) => {
  // INDUSTRY STANDARD: Lazy initialization with useState
  const [slideAnim] = useState(() => new Animated.Value(-SIDEBAR_WIDTH));
  const [acceptedConsultationsCount, setAcceptedConsultationsCount] = useState(0);
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();
  const { favoriteTermIds } = useFavorites();
  const hasFetchedConsultations = useRef(false);

  // Fetch accepted consultations count ONCE when sidebar becomes visible
  useEffect(() => {
    const fetchAcceptedConsultations = async () => {
      if (!user?.id) return;

      try {
        const { count, error } = await supabase
          .from("consultation_requests")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["accepted", "rejected"]);

        if (error) {
          console.error("Error fetching accepted consultations count:", error);
          return;
        }

        setAcceptedConsultationsCount(count || 0);
      } catch (error) {
        console.error("Error in fetchAcceptedConsultations:", error);
      }
    };

    // Only fetch if the sidebar is visible AND we haven't fetched before
    if (isVisible && user?.id && !hasFetchedConsultations.current) {
      fetchAcceptedConsultations();
      hasFetchedConsultations.current = true; // Mark as fetched
    }

    // Reset fetch status when sidebar closes
    if (!isVisible) {
      hasFetchedConsultations.current = false;
    }
  }, [isVisible, user?.id]);

  // Animation effect - SIMPLE and CLEAN
  useEffect(() => {
    const animationConfig = {
      duration: ANIMATION_DURATION,
      useNativeDriver: shouldUseNativeDriver('transform'),
    };

    if (isVisible) {
      // Animate in
      Animated.timing(slideAnim, {
        toValue: 0,
        ...animationConfig,
      }).start();
    } else {
      // Animate out
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        ...animationConfig,
      }).start();
    }

    // Cleanup
    return () => {
      slideAnim.stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);
  
  // Get favorite count directly from Set size
  const favoriteCount = favoriteTermIds.size;
  
  // Memoize badge counts to prevent recreating on every render
  const badgeCounts = React.useMemo(() => ({
    favoriteTerms: favoriteCount,
    bookmarkedGuides: 0,
    acceptedConsultations: acceptedConsultationsCount,
    unreadNotifications: 0,
  }), [favoriteCount, acceptedConsultationsCount]);

  // Memoize menu items to prevent recreating on every render
  const menuItems: MenuItem[] = React.useMemo(() => [
    {
      id: "bookmarks",
      label: "Favorite Terms",
      icon: Star,
      route: "favorite-terms",
      badge: badgeCounts.favoriteTerms || undefined,
    },
    {
      id: "bookmarked-posts",
      label: "Bookmarked Posts",
      icon: MessageSquare,
      route: "bookmarked-posts",
    },
    {
      id: "bookmarked-guides",
      label: "Bookmarked Guides",
      icon: Bookmark,
      route: "bookmarked-guides",
      badge: badgeCounts.bookmarkedGuides || undefined,
    },
    {
      id: "consultations",
      label: "Consultations",
      icon: Calendar,
      route: "consultations",
      badge: badgeCounts.acceptedConsultations || undefined,
    },
    {
      id: "divider1",
      label: "",
      icon: View,
      divider: true,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      route: "notifications",
      badge: badgeCounts.unreadNotifications || undefined,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      route: "settings",
    },
    {
      id: "divider2",
      label: "",
      icon: View,
      divider: true,
    },
    {
      id: "help",
      label: "Help & Support",
      icon: HelpCircle,
      route: "help",
    },
    {
      id: "feedback",
      label: "Send Feedback",
      icon: MessageSquare,
      route: "feedback",
    },
    {
      id: "about",
      label: "About AI.ttorney",
      icon: FileText,
      route: "about",
    },
    {
      id: "divider3",
      label: "",
      icon: View,
      divider: true,
    },
    {
      id: "logout",
      label: "Sign Out",
      icon: LogOut,
      action: async () => {
        try {
          await signOut();
        } catch (error) {
          console.error("Logout error:", error);
        }
      },
    },
  ], [badgeCounts, signOut]);

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.route && onNavigate) {
      onNavigate(item.route);
    }
    onClose();
  };

  const renderMenuItem = (item: MenuItem) => {
    if (item.divider) {
      return <View key={item.id} style={styles.divider} />;
    }

    const IconComponent = item.icon;
    const isLogout = item.id === "logout";

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, isLogout && styles.logoutItem]}
        onPress={() => handleMenuItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemContent}>
          <IconComponent
            size={22}
            color={isLogout ? "#EF4444" : Colors.text.head}
            strokeWidth={1.5}
          />
          <Text style={[styles.menuItemText, isLogout && styles.logoutText]}>
            {item.label}
          </Text>
        </View>
        {item.badge && item.badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.badge > 99 ? "99+" : item.badge.toString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: slideAnim }],
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
        accessible={true}
        accessibilityRole="menu"
        accessibilityLabel="Main navigation sidebar"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() =>
              handleMenuItemPress({
                id: "profile",
                label: "My Profile",
                icon: User,
                route: "profile",
              })
            }
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <User size={24} color={Colors.primary.blue} strokeWidth={1.5} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userInfo.name}</Text>
              <Text style={styles.userEmail}>{userInfo.email}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <X size={24} color={Colors.text.head} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <ScrollView
          style={styles.menuContainer}
          showsVerticalScrollIndicator={false}
        >
          {menuItems.map(renderMenuItem)}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Ai.ttorney</Text>
          <Text style={styles.footerSubtext}>Justice at Your Fingertips</Text>
        </View>
      </Animated.View>
    </View>
  );
};

// Wrapper Component
export const SidebarWrapper: React.FC<{
  userInfo?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
}> = ({ userInfo }) => {
  const { isVisible, closeSidebar } = useSidebar();
  const router = useRouter();
  const { user } = useAuth();

  // Memoize navigation handler to prevent recreation on every render
  const handleNavigate = useCallback((route: string) => {
    console.log(`Navigate to ${route}`);

    switch (route) {
      case "favorite-terms":
        router.push("/favorite-terms");
        break;
      case "bookmarked-posts":
        router.push("/bookmarked-posts");
        break;
      case "consultations":
        router.push("/consultations");
        break;
      case "bookmarked-guides":
        router.push("/bookmarked-guides");
        break;
      case "notifications":
        router.push("/notifications");
        break;
      case "help":
        router.push("/help");
        break;
      case "settings":
        router.push("/settings");
        break;
      case "about":
        router.push("/about");
        break;
      case "profile":
        console.log("Profile page not implemented yet");
        break;
      default:
        console.log(`Route ${route} not implemented yet`);
    }
  }, [router]);

  // Memoize user info to prevent object recreation on every render
  const actualUserInfo = React.useMemo(() => ({
    name: user?.full_name || "User",
    email: user?.email || "user@example.com",
    avatar: userInfo?.avatar,
  }), [user?.full_name, user?.email, userInfo?.avatar]);

  return (
    <Sidebar
      isVisible={isVisible}
      onClose={closeSidebar}
      onNavigate={handleNavigate}
      userInfo={actualUserInfo}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: LAYOUT.Z_INDEX.drawer,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
    zIndex: LAYOUT.Z_INDEX.overlay,
  },
  overlayTouchable: {
    flex: 1,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "#FFFFFF",
    ...createShadowStyle({
      shadowColor: "#000",
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 16,
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 12,
    color: Colors.text.head,
    ...GlobalStyles.textSemiBold,
  },
  userEmail: {
    fontSize: 10,
    color: Colors.text.sub,
    marginTop: 2,
    ...GlobalStyles.text,
  },
  closeButton: {
    padding: 8,
    marginLeft: 12,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 8,
    borderRadius: 12,
  },
  logoutItem: {
    marginTop: 8,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuItemText: {
    fontSize: 14,
    color: Colors.text.head,
    marginLeft: 16,
    ...GlobalStyles.text,
  },
  logoutText: {
    color: "#EF4444",
  },
  badge: {
    backgroundColor: Colors.primary.blue,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    color: "#FFFFFF",
    ...GlobalStyles.textSemiBold,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 20,
    marginVertical: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: Colors.text.sub,
    ...GlobalStyles.textMedium,
  },
  footerSubtext: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 2,
    fontStyle: "italic",
    ...GlobalStyles.text,
  },
});

export default SidebarWrapper;
