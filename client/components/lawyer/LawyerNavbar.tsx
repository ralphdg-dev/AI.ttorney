import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { 
  Home, 
  Briefcase, 
  MessageSquarePlus, 
  User,
  Users
} from 'lucide-react-native';
import Colors from '../../constants/Colors';
import { GlobalStyles } from '../../constants/GlobalStyles';

interface LawyerNavbarProps {
  activeTab?: 'home' | 'forum' | 'consult' | 'chatbot' | 'profile';
  onTabPress?: (tab: string) => void;
}

const LawyerNavbar: React.FC<LawyerNavbarProps> = ({ 
  activeTab, 
  onTabPress 
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  // Auto-detect active tab based on current route if not provided
  const getActiveTab = (): 'home' | 'forum' | 'consult' | 'chatbot' | 'profile' => {
    if (activeTab) return activeTab;
    
    if (pathname.includes('/lawyer') && (pathname === '/lawyer' || pathname.includes('/lawyer/index'))) return 'home';
    if (pathname.includes('/lawyer/forum')) return 'forum';
    if (pathname.includes('/lawyer/consult')) return 'consult';
    if (pathname.includes('/lawyer/chatbot')) return 'chatbot';
    if (pathname.includes('/lawyer/profile')) return 'profile';
    
    return 'home'; // default
  };


  const handleTabPress = (tabId: string) => {
    // Call custom onTabPress if provided
    if (onTabPress) {
      onTabPress(tabId);
      return;
    }

    // Default navigation behavior
    switch (tabId) {
      case 'home':
        router.push('/lawyer');
        break;
      case 'forum':
        router.push('/lawyer/forum' as any);
        break;
      case 'consult':
        router.push('/lawyer/consult');
        break;
      case 'chatbot':
        router.push('/lawyer/chatbot' as any);
        break;
      case 'profile':
        router.push('/lawyer/profile');
        break;
      default:
        console.log(`Unknown tab: ${tabId}`);
    }
  };

  const tabs = [
    { 
      id: 'home', 
      label: 'Dashboard', 
      icon: Home, 
      route: '/lawyer' 
    },
    { 
      id: 'forum', 
      label: 'Forum', 
      icon: Users, 
      route: '/lawyer/forum' 
    },
    { 
      id: 'chatbot', 
      label: 'AI Assistant', 
      icon: MessageSquarePlus, 
      route: '/lawyer/chatbot' 
    },
    { 
      id: 'consult', 
      label: 'Consultations', 
      icon: Briefcase, 
      route: '/lawyer/consult' 
    },
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: User, 
      route: '/lawyer/profile' 
    },
  ];

  const currentTab = getActiveTab();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.navbar}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <IconComponent
                size={22}
                color={isActive ? '#023D7B' : '#6B6B6B'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? [styles.activeLabel, { color: '#023D7B' }] : [styles.inactiveLabel, { color: '#6B6B6B' }]
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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

export default LawyerNavbar;
