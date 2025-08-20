import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, Search, Bell, ArrowLeft } from 'lucide-react-native';
import { useSidebar } from './AppSidebar';
import Colors from '../constants/Colors';
import { GlobalStyles } from '../constants/GlobalStyles';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showMenu?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
  variant?: 'default' | 'home' | 'minimal';
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  showMenu = true,
  showSearch = false,
  showNotifications = false,
  onBackPress,
  onMenuPress,
  onSearchPress,
  onNotificationPress,
  variant = 'default',
}) => {
  const { openSidebar } = useSidebar();
  const insets = useSafeAreaInsets();

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
      console.log('Notifications pressed');
    }
  };

  const renderLeftSection = () => {
    if (showBackButton) {
      return (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onBackPress}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.primary.blue} strokeWidth={1.5} />
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
          <Menu size={24} color={Colors.primary.blue} strokeWidth={1.5} />
        </TouchableOpacity>
      );
    }

    return <View style={styles.spacer} />;
  };

  const renderCenterSection = () => {
    if (variant === 'home') {
      return (
        <View style={styles.titleContainer}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      );
    }

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
    if (showSearch || showNotifications) {
      return (
        <View style={styles.rightActions}>
          {showSearch && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSearchPress}
              activeOpacity={0.7}
            >
              <Search size={22} color={Colors.text.sub} strokeWidth={1.5} />
            </TouchableOpacity>
          )}
          
          {showNotifications && (
            <TouchableOpacity
              style={[styles.iconButton, styles.notificationButton]}
              onPress={handleNotificationPress}
              activeOpacity={0.7}
            >
              <Bell size={22} color={Colors.text.sub} strokeWidth={1.5} />
              {/* Notification badge */}
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
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
      { paddingTop: insets.top + 8 },
      variant === 'minimal' && styles.minimalContainer
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  minimalContainer: {
    borderBottomWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  spacer: {
    width: 40,
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  logo: {
    width: 160,
    height: 40,
  },
  title: {
    fontSize: 18,
    color: Colors.primary.blue,
    textAlign: 'center',
    flex: 1,
    ...GlobalStyles.textBold,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    marginLeft: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    ...GlobalStyles.textSemiBold,
  },
});

export default Header;
