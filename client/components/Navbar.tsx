import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { 
  Home, 
  Scale, 
  MessageSquarePlus, 
  Gavel, 
  User 
} from 'lucide-react-native';
import Colors from '../constants/Colors';
import { LAYOUT } from '../constants/LayoutConstants';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  activeTab?: 'home' | 'learn' | 'ask' | 'find' | 'profile';
  onTabPress?: (tab: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  onTabPress 
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  
  // Navigation guard to prevent spam clicking
  const isNavigatingRef = useRef(false);
  
  // Dynamic sizing based on screen width
  const isSmallScreen = width < 375;
  const iconSize = isSmallScreen ? 20 : 22;
  const fontSize = isSmallScreen ? 10 : 11;

  // Auto-detect active tab based on current route if not provided
  const getActiveTab = () => {
    if (activeTab) return activeTab;
    
    // Don't highlight any tab for certain routes
    if (pathname.includes('/article')) return null;
    if (pathname.includes('/bookmarked')) return null;
    
    // Check sidebar routes first - these should NOT highlight any navbar tab
    if (pathname.includes('/consultations')) return null;
    if (pathname.includes('/settings')) return null;
    if (pathname.includes('/help')) return null;
    if (pathname.includes('/favorite-terms')) return null;
    if (pathname.includes('/notifications')) return null;
    
    // Check main navbar routes
    if (pathname === '/' || pathname === '/home') return 'home';
    if (pathname.includes('/glossary') || pathname.includes('/guides')) return 'learn';
    if (pathname.includes('/chatbot')) return 'ask';
    if (pathname.includes('/directory')) return 'find';
    if (pathname.includes('/profile')) return 'profile';
    
    // Don't highlight anything for unknown routes
    return null;
  };

  const currentActiveTab = getActiveTab();

  const handleTabPress = (tabId: string) => {
    // Use custom handler if provided
    if (onTabPress) {
      onTabPress(tabId);
      return;
    }

    // Prevent spam clicking - ignore if already navigating
    if (isNavigatingRef.current) {
      console.log(`[Navbar] Navigation already in progress, ignoring ${tabId} click`);
      return;
    }

    // Prevent navigation to the same tab
    if (currentActiveTab === tabId) {
      console.log(`[Navbar] Already on ${tabId} tab, ignoring navigation`);
      return;
    }

    isNavigatingRef.current = true;

    // Default navigation behavior
    console.log(`[Navbar] Navigating to tab: ${tabId}`);
    switch (tabId) {
      case 'home':
        router.push('/home');
        break;
      case 'learn':
        // Both logged-in users and guests go to /glossary
        // The page shows toggle for logged-in users, no toggle for guests
        console.log('[Navbar] Pushing to /glossary');
        router.push('/glossary');
        break;
      case 'ask':
        router.push('/chatbot');
        break;
      case 'find':
        router.push('/directory');
        break;
      case 'profile':
        // Use role-based routing for profile
        const profileRoute = user?.role === 'verified_lawyer' ? '/lawyer/profile' : '/profile';
        router.push(profileRoute);
        break;
      default:
        console.log(`Unknown tab: ${tabId}`);
    }

    // Reset navigation guard after a delay to allow next navigation
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500);
  };

  // Slightly reduce bottom safe area on Android to avoid an overly tall navbar
  const bottomInset = Platform.OS === 'android'
    ? Math.max(insets.bottom - 8, 0)
    : insets.bottom;

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      active: currentActiveTab === 'home'
    },
    {
      id: 'learn',
      label: 'Learn',
      icon: Scale,
      active: currentActiveTab === 'learn'
    },
    {
      id: 'ask',
      label: 'Ask AI',
      icon: MessageSquarePlus,
      active: currentActiveTab === 'ask'
    },
    {
      id: 'find',
      label: 'Legal Help',
      icon: Gavel,
      active: currentActiveTab === 'find'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      active: currentActiveTab === 'profile'
    }
  ];

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={styles.navbar}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <IconComponent
                size={iconSize}
                color={tab.active ? '#023D7B' : '#6B6B6B'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { fontSize },
                  tab.active ? [styles.activeLabel, { color: '#023D7B' }] : [styles.inactiveLabel, { color: '#6B6B6B' }]
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative', // Changed from absolute
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  navbar: {
    flexDirection: 'row',
    height: LAYOUT.NAVBAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: LAYOUT.SPACING.xs,
    paddingVertical: LAYOUT.SPACING.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: LAYOUT.MIN_TOUCH_TARGET,
    paddingVertical: LAYOUT.SPACING.xs - 2,
    paddingHorizontal: LAYOUT.SPACING.xs,
    borderRadius: LAYOUT.RADIUS.md,
    marginHorizontal: LAYOUT.SPACING.xxs,
  },
  tabLabel: {
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: Platform.select({ ios: -0.1, default: 0 }),
  },
  activeLabel: {
    color: Colors.primary.blue,
    fontWeight: '600',
  },
  inactiveLabel: {
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default Navbar; 