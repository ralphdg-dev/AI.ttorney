import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, useWindowDimensions } from 'react-native';
import { Menu, Search, Bell, ArrowLeft, Settings, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSidebar } from './AppSidebar';
import { useRouter } from 'expo-router';
import Colors from '../constants/Colors';
import { useNotifications } from '../contexts/NotificationContext';
import { LAYOUT } from '../constants/LayoutConstants';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showMenu?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  showSettings?: boolean;
  showChatHistoryToggle?: boolean;
  isChatHistoryOpen?: boolean;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
  onSettingsPress?: () => void;
  onChatHistoryToggle?: () => void;
  variant?: 'home' | 'minimal';
  rightComponent?: React.ReactNode;
  backgroundColor?: string; // Allow custom background color
  onLogoPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  showMenu = true,
  showSearch = false,
  showNotifications = false,
  backgroundColor = Colors.background.primary,
  showSettings = false,
  showChatHistoryToggle = false,
  isChatHistoryOpen = false,
  onBackPress,
  onMenuPress,
  onSearchPress,
  onNotificationPress,
  onSettingsPress,
  onChatHistoryToggle,
  variant = 'default',
  rightComponent,
  onLogoPress,
}) => {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { unreadCount } = useNotifications();
  
  // Dynamic sizing based on screen width (responsive)
  const isSmallScreen = width < 375;
  const iconSize = isSmallScreen ? 22 : 24;
  const logoWidth = isSmallScreen ? 120 : Math.min(width * 0.35, 160);
  const logoHeight = logoWidth * 0.25; // Maintain aspect ratio

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    } else {
      openSidebar();
    }
  };

  const handleSearchPress = () => {
    if (onSearchPress) {
      onSearchPress();
    } else {
      console.log('Search pressed');
    }
  };

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      router.push('/notifications');
    }
  };

  const renderLeftSection = () => {
    if (showBackButton) {
      return (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onBackPress || (() => router.back())}
          activeOpacity={0.7}
        >
          <ArrowLeft size={iconSize} color={Colors.primary.blue} strokeWidth={1.5} />
        </TouchableOpacity>
      );
    }

    if (showMenu) {
      return (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <Menu size={iconSize} color={Colors.primary.blue} strokeWidth={1.5} />
        </TouchableOpacity>
      );
    }

    return <View style={styles.spacer} />;
  };

  const renderCenterSection = () => {
    // Show logo if variant is 'home' and no title provided
    if (variant === 'home' && !title) {
      return (
        <View style={styles.titleContainer}>
          <TouchableOpacity
            onPress={onLogoPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Scroll to top"
          >
            <Image 
              source={require('../assets/images/logo.png')} 
              style={{ width: logoWidth, height: logoHeight }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      );
    }

    // Show title if provided
    if (title) {
      return (
        <Text style={styles.title}>
          {title}
        </Text>
      );
    }

    return null;
  };

  const renderRightSection = () => {
    // If a custom rightComponent is provided, use it
    if (rightComponent) {
      return rightComponent;
    }

    if (showSearch || showNotifications || showSettings || showChatHistoryToggle) {
      return (
        <View style={styles.rightActions}>
          {showSearch && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSearchPress}
              activeOpacity={0.7}
            >
              <Search size={iconSize - 2} color={Colors.text.sub} strokeWidth={1.5} />
            </TouchableOpacity>
          )}
          
          {showNotifications && (
            <TouchableOpacity
              style={[styles.iconButton, styles.notificationButton]}
              onPress={handleNotificationPress}
              activeOpacity={0.7}
            >
              <Bell size={iconSize - 2} color={Colors.text.sub} strokeWidth={1.5} />
              {/* Notification badge */}
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {showChatHistoryToggle && (
            <TouchableOpacity
              style={styles.chatHistoryButton}
              onPress={onChatHistoryToggle}
              activeOpacity={0.7}
              accessibilityLabel={isChatHistoryOpen ? "Close chat history" : "Open chat history"}
              accessibilityRole="button"
            >
              {isChatHistoryOpen ? (
                <ChevronRight size={LAYOUT.SPACING.lg} color={Colors.text.primary} strokeWidth={2.5} />
              ) : (
                <ChevronLeft size={LAYOUT.SPACING.lg} color={Colors.text.primary} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          )}

          {showSettings && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onSettingsPress}
              activeOpacity={0.7}
            >
              <Settings size={iconSize - 2} color={Colors.text.sub} strokeWidth={1.5} />
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return <View style={styles.spacer} />;
  };

  return (
    <View style={[
      styles.container,
      variant === 'minimal' && styles.minimalContainer,
      { backgroundColor } // Apply custom background color
    ]}>
      <View style={styles.content}>
        {renderLeftSection()}
        {renderCenterSection()}
        {renderRightSection()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
      web: { boxShadow: 'none' },
    }),
  },
  minimalContainer: {
    borderBottomWidth: 0,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
      web: { boxShadow: 'none' },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: LAYOUT.HEADER_HEIGHT,
    paddingHorizontal: LAYOUT.SPACING.md,
  },
  iconButton: {
    minWidth: LAYOUT.MIN_TOUCH_TARGET,
    minHeight: LAYOUT.MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LAYOUT.MIN_TOUCH_TARGET / 2,
  },
  spacer: {
    minWidth: LAYOUT.MIN_TOUCH_TARGET,
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    pointerEvents: 'box-none',
  },
  title: {
    fontSize: Platform.select({ ios: 17, android: 18, default: 17 }),
    fontWeight: '600',
    color: Colors.primary.blue,
    textAlign: 'center',
    flex: 1,
    letterSpacing: Platform.select({ ios: -0.2, default: 0 }),
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    marginLeft: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: '15%',
    right: '15%',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  chatHistoryButton: {
    width: LAYOUT.MIN_TOUCH_TARGET,
    height: LAYOUT.MIN_TOUCH_TARGET,
    borderRadius: LAYOUT.MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    marginLeft: LAYOUT.SPACING.sm,
  },
});

export default Header;
