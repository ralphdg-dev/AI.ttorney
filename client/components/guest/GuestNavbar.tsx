import React from 'react';
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
}

const GuestNavbar: React.FC<GuestNavbarProps> = ({ activeTab }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  // Auto-detect active tab based on current route if not provided
  const getActiveTab = () => {
    if (activeTab) return activeTab;
    
    if (pathname.includes('/guides')) return 'learn';
    if (pathname.includes('/chatbot')) return 'ask';
    
    // Default to 'ask' for guests (chatbot is their index page)
    return 'ask';
  };

  const currentActiveTab = getActiveTab();

  const handleTabPress = (tabId: string) => {
    switch (tabId) {
      case 'learn':
        router.push('/glossary'); // Match registered users' navbar behavior
        break;
      case 'ask':
        router.push('/chatbot');
        break;
      case 'login':
        router.push('/login');
        break;
      case 'register':
        router.push('/onboarding/registration');
        break;
      default:
        console.log(`Unknown tab: ${tabId}`);
    }
  };

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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
