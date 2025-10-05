import React, { useCallback, useMemo } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, Plus, User, Search, Bookmark } from 'lucide-react-native';
import Colors from '../../constants/Colors';
import FadeInView from '../ui/FadeInView';

interface OptimizedForumNavigationProps {
  activeTab?: 'home' | 'search' | 'create' | 'bookmarks' | 'profile';
  onCreatePress?: () => void;
}

const OptimizedForumNavigation: React.FC<OptimizedForumNavigationProps> = React.memo(({
  activeTab,
  onCreatePress,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab from pathname if not provided
  const currentTab = useMemo(() => {
    if (activeTab) return activeTab;
    
    if (pathname.includes('/home') || pathname === '/') return 'home';
    if (pathname.includes('/search')) return 'search';
    if (pathname.includes('/bookmarks')) return 'bookmarks';
    if (pathname.includes('/profile')) return 'profile';
    return 'home';
  }, [activeTab, pathname]);

  const handleTabPress = useCallback((tab: string, route: string) => {
    if (tab === 'create') {
      onCreatePress?.();
      return;
    }
    
    if (currentTab !== tab) {
      router.push(route as any);
    }
  }, [currentTab, router, onCreatePress]);

  const navigationItems = useMemo(() => [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      route: '/home',
      isActive: currentTab === 'home',
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      route: '/search',
      isActive: currentTab === 'search',
    },
    {
      id: 'create',
      label: 'Create',
      icon: Plus,
      route: '/home/CreatePost',
      isActive: false,
      isSpecial: true,
    },
    {
      id: 'bookmarks',
      label: 'Saved',
      icon: Bookmark,
      route: '/bookmarks',
      isActive: currentTab === 'bookmarks',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      route: '/profile',
      isActive: currentTab === 'profile',
    },
  ], [currentTab]);

  const renderNavItem = useCallback((item: typeof navigationItems[0], index: number) => {
    const Icon = item.icon;
    const isActive = item.isActive;
    const isSpecial = item.isSpecial;

    return (
      <FadeInView key={item.id} delay={index * 30}>
        <TouchableOpacity
          style={[
            styles.navItem,
            isSpecial && styles.createButton,
            isActive && !isSpecial && styles.activeNavItem,
          ]}
          onPress={() => handleTabPress(item.id, item.route)}
          activeOpacity={0.7}
        >
          <Icon
            size={isSpecial ? 20 : 18}
            color={
              isSpecial
                ? Colors.text.white
                : isActive
                ? Colors.primary.blue
                : Colors.text.secondary
            }
          />
          {!isSpecial && (
            <Text
              style={[
                styles.navLabel,
                isActive && styles.activeNavLabel,
              ]}
            >
              {item.label}
            </Text>
          )}
        </TouchableOpacity>
      </FadeInView>
    );
  }, [handleTabPress]);

  return (
    <View style={styles.container}>
      <View style={styles.navigationBar}>
        {navigationItems.map(renderNavItem)}
      </View>
    </View>
  );
});

const styles = {
  container: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    ...Colors.shadow.medium,
  },
  navigationBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 20, // Account for safe area
  },
  navItem: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 60,
  },
  activeNavItem: {
    backgroundColor: Colors.primary.lightBlue + '20',
  },
  createButton: {
    backgroundColor: Colors.primary.blue,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    ...Colors.shadow.light,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  activeNavLabel: {
    color: Colors.primary.blue,
    fontWeight: '600' as const,
  },
};

OptimizedForumNavigation.displayName = 'OptimizedForumNavigation';

export default OptimizedForumNavigation;
