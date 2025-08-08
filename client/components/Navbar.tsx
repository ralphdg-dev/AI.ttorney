import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Home, 
  Scale, 
  MessageSquarePlus, 
  MapPin, 
  User 
} from 'lucide-react-native';
import Colors from '../constants/Colors';
import { GlobalStyles } from '../constants/GlobalStyles';

interface NavbarProps {
  activeTab?: 'home' | 'learn' | 'ask' | 'find' | 'profile';
  onTabPress?: (tab: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  activeTab = 'learn', 
  onTabPress 
}) => {
  const insets = useSafeAreaInsets();

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      active: activeTab === 'home'
    },
    {
      id: 'learn',
      label: 'Learn',
      icon: Scale,
      active: activeTab === 'learn'
    },
    {
      id: 'ask',
      label: 'Ask Ai.ttorney',
      icon: MessageSquarePlus,
      active: activeTab === 'ask'
    },
    {
      id: 'find',
      label: 'Find Legal Help',
      icon: MapPin,
      active: activeTab === 'find'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      active: activeTab === 'profile'
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
              onPress={() => onTabPress?.(tab.id)}
              activeOpacity={0.7}
            >
              <IconComponent
                size={24}
                color={tab.active ? Colors.primary.blue : '#9CA3AF'}
                strokeWidth={1.5}
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
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    ...GlobalStyles.text,
  },
  activeLabel: {
    color: Colors.primary.blue,
  },
  inactiveLabel: {
    color: '#9CA3AF',
  },
});

export default Navbar; 