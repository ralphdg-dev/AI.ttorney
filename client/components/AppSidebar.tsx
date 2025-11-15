import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useFavorites } from "../contexts/FavoritesContext";
import { useBookmarks } from "../contexts/BookmarksContext";
import { usePostBookmarks } from "../contexts/PostBookmarksContext";
import { useConsultations } from "../contexts/ConsultationsContext";
import { shouldUseNativeDriver } from '@/utils/animations';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ConfirmationModal from "./ui/ConfirmationModal";
import {
  Bookmark,
  Settings,
  HelpCircle,
  FileText,
  LogOut,
  MessageSquare,
  Star,
  Calendar,
  User,
  X,
  Bell,
  Briefcase
} from "lucide-react-native";
import Colors from "../constants/Colors";
import { GlobalStyles } from "../constants/GlobalStyles";
import { useAuth } from "../contexts/AuthContext";
import { createShadowStyle } from "../utils/shadowUtils";
import { LAYOUT } from "../constants/LayoutConstants";
import { Image } from "react-native";

const { width: screenWidth } = Dimensions.get("window");
const SIDEBAR_WIDTH = Math.min(screenWidth * 0.75, 320);
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
  const [overlayAnim] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { favoriteTermIds } = useFavorites();
  const { bookmarkedGuideIds } = useBookmarks();
  const { bookmarkedPostIds } = usePostBookmarks();
  const { consultationsCount } = useConsultations();

  const [showSignoutModal, setShowSignoutModal] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') {
      return 'U'; // Default to 'U' for User
    }
    
    const initials = name
      .trim()
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return initials || 'U'; // Fallback to 'U' if no initials
  };

  // Animation effect - SIMPLE and CLEAN with smooth slide-back
  useEffect(() => {
    const slideConfig = {
      duration: ANIMATION_DURATION,
      useNativeDriver: shouldUseNativeDriver('transform'),
    };

    const overlayConfig = {
      duration: ANIMATION_DURATION,
      useNativeDriver: shouldUseNativeDriver('opacity'),
    };

    if (isVisible) {
      // Animate in - slide sidebar and fade in overlay
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          ...slideConfig,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          ...overlayConfig,
        }),
      ]).start();
    } else {
      // Animate out - slide sidebar back and fade out overlay
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          ...slideConfig,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          ...overlayConfig,
        }),
      ]).start();
    }

    // Cleanup
    return () => {
      slideAnim.stopAnimation();
      overlayAnim.stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // FAANG OPTIMIZATION: Direct Set.size and primitive access - O(1) constant time
  // All data pre-loaded from contexts, zero API calls on sidebar open
  // Instant badge updates with no network latency
  const badgeCounts = React.useMemo(() => ({
    favoriteTerms: favoriteTermIds.size,
    bookmarkedPosts: bookmarkedPostIds.size,
    bookmarkedGuides: bookmarkedGuideIds.size,
    acceptedConsultations: consultationsCount,
  }), [favoriteTermIds.size, bookmarkedPostIds.size, bookmarkedGuideIds.size, consultationsCount]);

  const { user } = useAuth();
  const isLawyer = user?.role === 'verified_lawyer';

  // Memoize menu items to prevent recreating on every render
  const menuItems: MenuItem[] = React.useMemo(() => [
    // Bookmarked Posts - Available for both users and lawyers (same page)
    {
      id: "bookmarked-posts",
      label: "Bookmarked Posts",
      icon: MessageSquare,
      route: "bookmarked-posts",
      badge: badgeCounts.bookmarkedPosts || undefined,
    },
    // Favorite Terms - Only for regular users
    ...(!isLawyer ? [{
      id: "bookmarks",
      label: "Favorite Terms",
      icon: Star,
      route: "favorite-terms",
      badge: badgeCounts.favoriteTerms || undefined,
    }] : []),
    // Bookmarked Guides - Only for regular users
    ...(!isLawyer ? [{
      id: "bookmarked-guides",
      label: "Bookmarked Guides",
      icon: Bookmark,
      route: "bookmarked-guides",
      badge: badgeCounts.bookmarkedGuides || undefined,
    }] : []),
    // Consultations - Different routes for users vs lawyers
    {
      id: "consultations",
      label: isLawyer ? "Consultation Requests" : "Consultations",
      icon: Calendar,
      route: isLawyer ? "lawyer/consult" : "consultations",
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
    // Apply to be a Lawyer - Only for regular users
    ...(!isLawyer ? [{
      id: "apply-lawyer",
      label: "Apply to be a Lawyer",
      icon: Briefcase,
      route: "apply-lawyer",
    }] : []),
    {
      id: "help",
      label: "Help & Support",
      icon: HelpCircle,
      route: "help",
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
        setShowSignoutModal(true);
      },
    },
  ], [badgeCounts, isLawyer]);

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.route && onNavigate) {
      onNavigate(item.route);
      onClose();
    }
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

  const confirmLogout = async () => {
    try {
      console.log('🚪 Sidebar logout initiated');
      // Close sidebar immediately to prevent UI conflicts
      onClose();
      // Wait a moment for sidebar animation to start
      await new Promise(resolve => setTimeout(resolve, 100));
      // Then perform logout
      await signOut();
      console.log('✅ Sidebar logout completed');
    } catch (error) {
      console.error("❌ Sidebar logout error:", error);
    }
  };

  return (
    <View style={styles.container} pointerEvents={isVisible ? 'auto' : 'none'}>
      {/* Backdrop - Click to close with fade animation */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: overlayAnim,
          },
        ]}
        pointerEvents={isVisible ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
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
            {userInfo.avatar && !userInfo.avatar.includes('flaticon') && !imageLoadError ? (
              <Image 
                source={{ uri: userInfo.avatar }} 
                style={styles.avatar}
                onError={() => setImageLoadError(true)}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: Colors.primary.blue, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                  {getInitials(userInfo.name || 'User')}
                </Text>
              </View>
            )}
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
      
      <ConfirmationModal
        isOpen={showSignoutModal}
        onClose={() => setShowSignoutModal(false)}
        onConfirm={confirmLogout}
        title="Sign Out"
        message="Are you sure you want to sign out? You will need to login again to access your account."
        confirmText="Sign Out"
        type="warning"
      />
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
  const handleNavigate = useCallback(async (route: string) => {
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
      case "lawyer/consult":
        router.push("/lawyer/consult");
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
      case "apply-lawyer":
        router.push("/apply-lawyer");
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
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

export default SidebarWrapper;