import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { 
  Scale, 
  MessageSquarePlus
} from 'lucide-react-native';
import Colors from '../../constants/Colors';
import { LAYOUT } from '../../constants/LayoutConstants';

interface GuestNavbarProps {
  activeTab?: 'learn' | 'ask';
  glossaryRef?: React.RefObject<View | null>;
  navbarRef?: React.RefObject<View | null>;
}

const GuestNavbar: React.FC<GuestNavbarProps> = ({ activeTab, glossaryRef, navbarRef }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  
  // Navigation guard to prevent spam clicking
  const isNavigatingRef = useRef(false);

  // Auto-detect active tab based on current route if not provided
  const getActiveTab = () => {
    if (activeTab) return activeTab;
    
    if (pathname.includes('/glossary')) return 'learn';
    if (pathname.includes('/chatbot')) return 'ask';
    
    // Default to 'ask' for guests (chatbot is their index page)
    return 'ask';
  };

  const currentActiveTab = getActiveTab();

  const handleTabPress = (tabId: string) => {
    // Prevent spam clicking - ignore if already navigating
    if (isNavigatingRef.current) {
      console.log(`[GuestNavbar] Navigation already in progress, ignoring ${tabId} click`);
      return;
    }

    // Prevent navigation to the same tab
    if (currentActiveTab === tabId) {
      console.log(`[GuestNavbar] Already on ${tabId} tab, ignoring navigation`);
      return;
    }

    isNavigatingRef.current = true;
    
    switch (tabId) {
      case 'learn':
        router.push('/glossary');
        break;
      case 'ask':
        router.push('/chatbot');
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
      id: 'learn',
      label: 'Learn',
      icon: Scale,
      active: currentActiveTab === 'learn',
      type: 'navigation' as const
    },
    {
      id: 'ask',
      label: 'Ask AI',
      icon: MessageSquarePlus,
      active: currentActiveTab === 'ask',
      type: 'navigation' as const
    }
  ];

  return (
    <View ref={navbarRef} style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={styles.navbar}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          
          return (
            <TouchableOpacity
              key={tab.id}
              ref={tab.id === 'learn' ? glossaryRef : undefined}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <IconComponent
                size={20}
                color={tab.active ? '#023D7B' : '#6B6B6B'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.tabLabel,
                  tab.active ? styles.activeLabel : styles.inactiveLabel
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
  actionButton: {
    backgroundColor: 'transparent',
  },
  tabLabel: {
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 11,
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
  actionLabel: {
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default GuestNavbar;
