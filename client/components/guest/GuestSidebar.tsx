import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  LogOut,
  Shield,
  FileText,
  Info,
  HelpCircle,
  UserCircle,
  X
} from 'lucide-react-native';
import { shouldUseNativeDriver } from '@/utils/animations';
import { createShadowStyle } from '@/utils/shadowUtils';
import { GlobalStyles } from '@/constants/GlobalStyles';
import Colors from '@/constants/Colors';
import { LAYOUT } from '@/constants/LayoutConstants';
import { GuestDisclaimer } from './GuestDisclaimer';

interface GuestSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const SIDEBAR_WIDTH = screenWidth * 0.8;
const ANIMATION_DURATION = 280;

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  onPress: () => void;
  divider?: boolean;
}

/**
 * Guest-specific sidebar matching AppSidebar design
 * Includes: Help, About, Privacy, Terms, Exit Guest Mode
 */
export const GuestSidebar: React.FC<GuestSidebarProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [slideAnim] = useState(() => new Animated.Value(-SIDEBAR_WIDTH));

  // Animation effect
  useEffect(() => {
    const animationConfig = {
      duration: ANIMATION_DURATION,
      useNativeDriver: shouldUseNativeDriver('transform'),
    };

    if (isOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        ...animationConfig,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        ...animationConfig,
      }).start();
    }

    return () => {
      slideAnim.stopAnimation();
    };
  }, [isOpen, slideAnim]);

  const handleNavigation = (path: string) => {
    onClose();
    router.push(path as any);
  };

  const handleExitGuestMode = () => {
    onClose();
    // Clear guest session and redirect to login
    router.replace('/login');
  };

  const menuItems: MenuItem[] = [
    {
      id: 'help',
      label: 'Help & Support',
      icon: HelpCircle,
      onPress: () => handleNavigation('/help'),
    },
    {
      id: 'about',
      label: 'About Ai.ttorney',
      icon: Info,
      onPress: () => handleNavigation('/about'),
    },
    {
      id: 'divider1',
      label: '',
      icon: View,
      onPress: () => {},
      divider: true,
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      icon: Shield,
      onPress: () => handleNavigation('/settings/privacy-policy'),
    },
    {
      id: 'terms',
      label: 'Terms of Service',
      icon: FileText,
      onPress: () => handleNavigation('/settings/terms'),
    },
    {
      id: 'divider2',
      label: '',
      icon: View,
      onPress: () => {},
      divider: true,
    },
    {
      id: 'exit',
      label: 'Exit Guest Mode',
      icon: LogOut,
      onPress: handleExitGuestMode,
    },
  ];

  const renderMenuItem = (item: MenuItem) => {
    if (item.divider) {
      return <View key={item.id} style={styles.divider} />;
    }

    const IconComponent = item.icon;
    const isExit = item.id === 'exit';

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, isExit && styles.exitItem]}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemContent}>
          <IconComponent
            size={22}
            color={isExit ? '#EF4444' : Colors.text.head}
            strokeWidth={1.5}
          />
          <Text style={[styles.menuItemText, isExit && styles.exitText]}>
            {item.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isOpen) return null;

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
        accessible={true}
        accessibilityRole="menu"
        accessibilityLabel="Guest navigation sidebar"
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <UserCircle size={24} color={Colors.primary.blue} strokeWidth={1.5} />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>Guest User</Text>
                <Text style={styles.userEmail}>Sign up for full access</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={24} color={Colors.text.head} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          {/* Guest Disclaimer */}
          <View style={styles.disclaimerContainer}>
            <GuestDisclaimer variant="inline" showCTA={false} />
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
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: LAYOUT.Z_INDEX.drawer,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: LAYOUT.Z_INDEX.overlay,
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
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 16,
    }),
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 8,
    borderRadius: 12,
  },
  exitItem: {
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
  exitText: {
    color: '#EF4444',
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
  disclaimerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
});
