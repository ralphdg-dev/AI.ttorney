import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFavorites } from '@/contexts/FavoritesContext';
import {
  X,
  User,
  Bookmark,
  Settings,
  HelpCircle,
  FileText,
  LogOut,
  Bell,
  MessageSquare,
  Star,
  Calendar,
} from 'lucide-react-native';
import Colors from '../constants/Colors';
import { GlobalStyles } from '../constants/GlobalStyles';

const { width: screenWidth } = Dimensions.get('window');
const SIDEBAR_WIDTH = screenWidth * 0.8;

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
export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);

  const openSidebar = () => setIsVisible(true);
  const closeSidebar = () => setIsVisible(false);
  const toggleSidebar = () => setIsVisible(prev => !prev);

  const value: SidebarContextType = {
    isVisible,
    openSidebar,
    closeSidebar,
    toggleSidebar,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

// Hook
export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

// Main Sidebar Component
const Sidebar: React.FC<SidebarProps> = ({
  isVisible,
  onClose,
  onNavigate,
  userInfo = { name: 'User', email: 'user@example.com' },
}) => {
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (shouldRender) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [isVisible, slideAnim, overlayOpacity, shouldRender]);

  // Get actual favorite count from context
  const { getFavoriteCount } = useFavorites();
  
  const getBadgeCounts = () => ({
    favoriteTerms: getFavoriteCount(), // Count from favorites context
    bookmarkedGuides: 0, // Count from user_forum_bookmarks table  
    pendingConsultations: 0, // Count from consultation_requests where status = 'pending'
    unreadNotifications: 0, // Count from notifications table (when implemented)
  });

  const badgeCounts = getBadgeCounts();

  const menuItems: MenuItem[] = [
    {
      id: 'bookmarks',
      label: 'Favorite Terms',
      icon: Star,
      route: 'bookmarks',
      badge: badgeCounts.favoriteTerms || undefined,
    },
    {
      id: 'favorites',
      label: 'Bookmarked Guides',
      icon: Bookmark,
      route: 'favorites',
      badge: badgeCounts.bookmarkedGuides || undefined,
    },
    {
      id: 'consultations',
      label: 'Consultations',
      icon: Calendar,
      route: 'consultations',
      badge: badgeCounts.pendingConsultations || undefined,
    },
    {
      id: 'divider1',
      label: '',
      icon: View,
      divider: true,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      route: 'notifications',
      badge: badgeCounts.unreadNotifications || undefined,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      route: 'settings',
    },
    {
      id: 'divider2',
      label: '',
      icon: View,
      divider: true,
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: HelpCircle,
      route: 'help',
    },
    {
      id: 'feedback',
      label: 'Send Feedback',
      icon: MessageSquare,
      route: 'feedback',
    },
    {
      id: 'about',
      label: 'About AI.ttorney',
      icon: FileText,
      route: 'about',
    },
    {
      id: 'divider3',
      label: '',
      icon: View,
      divider: true,
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: LogOut,
      action: () => {
        console.log('Logout pressed');
      },
    },
  ];

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
    const isLogout = item.id === 'logout';

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
            color={isLogout ? '#EF4444' : Colors.text.head}
            strokeWidth={1.5}
          />
          <Text
            style={[
              styles.menuItemText,
              isLogout && styles.logoutText,
            ]}
          >
            {item.label}
          </Text>
        </View>
        {item.badge && item.badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.badge > 99 ? '99+' : item.badge.toString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!shouldRender) return null;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
      
      {/* Overlay */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          onPress={onClose}
          activeOpacity={1}
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
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => handleMenuItemPress({ id: 'profile', label: 'My Profile', icon: User, route: 'profile' })}
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

  const handleNavigate = (route: string) => {
    console.log(`Navigate to ${route}`);
    
    switch (route) {
      case 'bookmarks':
        router.push('/favorites');
        break;
      case 'favorites':
        // This could be for bookmarked guides in the future
        console.log('Bookmarked guides not implemented yet');
        break;
      case 'profile':
        console.log('Profile page not implemented yet');
        break;
      default:
        console.log(`Route ${route} not implemented yet`);
    }
  };

  return (
    <Sidebar
      isVisible={isVisible}
      onClose={closeSidebar}
      onNavigate={handleNavigate}
      userInfo={userInfo}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
  },
  overlayTouchable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    color: Colors.text.head,
    ...GlobalStyles.textSemiBold,
  },
  userEmail: {
    fontSize: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 8,
    borderRadius: 12,
  },
  logoutItem: {
    marginTop: 8,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 14,
    color: Colors.text.head,
    marginLeft: 16,
    ...GlobalStyles.text,
  },
  logoutText: {
    color: '#EF4444',
  },
  badge: {
    backgroundColor: Colors.primary.blue,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    ...GlobalStyles.textSemiBold,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: Colors.text.sub,
    ...GlobalStyles.textMedium,
  },
  footerSubtext: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
    fontStyle: 'italic',
    ...GlobalStyles.text,
  },
});

export default SidebarWrapper;
