import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
import { GlobalStyles } from '../constants/GlobalStyles';

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

  // Auto-detect active tab based on current route if not provided
  const getActiveTab = () => {
    if (activeTab) return activeTab;
    
    // Check consultations and settings first to prevent other routes from matching
    if (pathname.includes('/consultations')) return null; // Don't highlight any tab for consultations
    if (pathname.includes('/settings')) return null; // Don't highlight any tab for settings
    
    if (pathname.includes('/home') || pathname === '/') return 'home';
    if (pathname.includes('/glossary') || pathname.includes('/guides')) return 'learn';
    if (pathname.includes('/chatbot')) return 'ask';
    if (pathname.includes('/directory')) return 'find';
    if (pathname.includes('/profile')) return 'profile';
    
    return 'home'; // default
  };

  const currentActiveTab = getActiveTab();

  const handleTabPress = (tabId: string) => {
    // Call custom onTabPress if provided
    if (onTabPress) {
      onTabPress(tabId);
      return;
    }

    // Default navigation behavior
    switch (tabId) {
      case 'home':
        router.push('/home');
        break;
      case 'learn':
        router.push('/glossary');
        break;
      case 'ask':
        router.push('/chatbot');
        break;
      case 'find':
        router.push('/directory');
        break;
      case 'profile':
        router.push('/profile');
        break;
      default:
        console.log(`Unknown tab: ${tabId}`);
    }
  };

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
                color={tab.active ? '#023D7B' : '#6B6B6B'} // Dark blue for active, darker gray for inactive
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    boxShadow: '0 -2px 3px rgba(0, 0, 0, 0.1)',
    elevation: 8,
  },
  navbar: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 16,
    marginHorizontal: 3,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    ...GlobalStyles.text,
  },
  activeLabel: {
    color: Colors.primary.blue,
    ...GlobalStyles.textSemiBold,
  },
  inactiveLabel: {
    color: Colors.primary.blue,
    opacity: 0.6,
  },
});

export default Navbar; 