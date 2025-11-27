import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { 
  Home, 
  Briefcase, 
  MessageSquarePlus, 
  User,
  Users
} from 'lucide-react-native';
import Colors from '../../../constants/Colors';
import { GlobalStyles } from '../../../constants/GlobalStyles';
import { LAYOUT } from '../../../constants/LayoutConstants';

interface LawyerNavbarProps {
  activeTab?: 'home' | 'forum' | 'consult' | 'chatbot' | 'profile' | null;
  onTabPress?: (tab: string) => void;
}

const LawyerNavbar: React.FC<LawyerNavbarProps> = ({ 
  activeTab, 
  onTabPress 
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  
  // Navigation guard to prevent spam clicking
  const isNavigatingRef = useRef(false);

  // Auto-detect active tab based on current route if not provided
  const getActiveTab = (): 'home' | 'forum' | 'consult' | 'chatbot' | 'profile' | null => {
    if (activeTab !== undefined) return activeTab;
    
    // Check sidebar routes first - these should NOT highlight any navbar tab
    if (pathname.includes('/notifications')) return null;
    if (pathname.includes('/settings')) return null;
    if (pathname.includes('/help')) return null;
    
    if (pathname.includes('/lawyer') && (pathname === '/lawyer' || pathname.includes('/lawyer/index'))) return 'home';
    if (pathname.includes('/lawyer/forum')) return 'forum';
    if (pathname.includes('/lawyer/consult')) return 'consult';
    if (pathname.includes('/chatbot')) return 'chatbot'; // Shared chatbot route
    if (pathname.includes('/lawyer/profile')) return 'profile';
    
    return 'home'; // default
  };


  const handleTabPress = (tabId: string) => {
    // Call custom onTabPress if provided
    if (onTabPress) {
      onTabPress(tabId);
      return;
    }
    
    // Prevent spam clicking - ignore if already navigating
    if (isNavigatingRef.current) {
      console.log(`[LawyerNavbar] Navigation already in progress, ignoring ${tabId} click`);
      return;
    }

    // Prevent navigation to the same tab
    if (currentTab === tabId) {
      console.log(`[LawyerNavbar] Already on ${tabId} tab, ignoring navigation`);
      return;
    }
    
    isNavigatingRef.current = true;

    // Default navigation behavior
    switch (tabId) {
      case 'home':
        router.push('/lawyer' as any);
        break;
      case 'forum':
        router.push('/lawyer/forum' as any);
        break;
      case 'consult':
        router.push('/lawyer/consult');
        break;
      case 'chatbot':
        router.push('/chatbot' as any); // Use shared chatbot
        break;
      case 'profile':
        router.push('/lawyer/profile');
        break;
      default:
        console.log(`Unknown tab: ${tabId}`);
    }
    
    // Reset navigation guard after a delay to allow next navigation
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500);
  };
  
  const currentTab = getActiveTab();

  const tabs = [
    { 
      id: 'home', 
      label: 'Dashboard', 
      icon: Home, 
      route: '/lawyer',
      active: currentTab === 'home'
    },
    { 
      id: 'forum', 
      label: 'Forum', 
      icon: Users, 
      route: '/lawyer/forum',
      active: currentTab === 'forum'
    },
    { 
      id: 'chatbot', 
      label: 'Ask AI', 
      icon: MessageSquarePlus, 
      route: '/chatbot', // Shared chatbot route
      active: currentTab === 'chatbot'
    },
    { 
      id: 'consult', 
      label: 'Consults', 
      icon: Briefcase, 
      route: '/lawyer/consult',
      active: currentTab === 'consult'
    },
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: User, 
      route: '/lawyer/profile',
      active: currentTab === 'profile'
    },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
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
                size={22}
                color={tab.active ? '#023D7B' : '#6B6B6B'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.tabLabel,
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
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: Platform.select({ ios: -0.1, default: 0 }),
    ...GlobalStyles.text,
  },
  activeLabel: {
    color: Colors.primary.blue,
    ...GlobalStyles.textSemiBold,
  },
  inactiveLabel: {
    color: Colors.primary.blue,
    opacity: 0.6,
    ...GlobalStyles.text,
  },
});

export default LawyerNavbar;
