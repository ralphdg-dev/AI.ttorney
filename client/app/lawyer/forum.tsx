import React, { useCallback } from 'react';
import { View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Timeline from '../../components/home/Timeline';
import { LawyerNavbar } from '../../components/lawyer/shared';
import Header from '../../components/Header';
import { SidebarWrapper } from '../../components/AppSidebar';
import AnimatedSearchBar from '../../components/forum/AnimatedSearchBar';
import Colors from '../../constants/Colors';
import { useForumSearch } from '../../hooks/useForumSearch';

const LawyerForum: React.FC = () => {
  const router = useRouter();
  const {
    query,
    results,
    isSearching,
    isSearchVisible,
    hasSearched,
    setQuery,
    search,
    showSearch,
    hideSearch,
  } = useForumSearch();

  const handleSearchPress = useCallback(() => {
    showSearch();
  }, [showSearch]);

  const handleNotificationPress = useCallback(() => {
    router.push('/notifications');
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header 
          variant="home"
          showMenu={true}
          showSearch={true}
          showNotifications={true}
          onSearchPress={handleSearchPress}
          onNotificationPress={handleNotificationPress}
        />
        
        {/* Animated Search Bar - positioned below header */}
        {isSearchVisible && (
          <AnimatedSearchBar
            visible={isSearchVisible}
            onClose={hideSearch}
            onSearch={search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search forum posts..."
          />
        )}
        
      <View style={{ 
        flex: 1, 
        backgroundColor: isSearchVisible ? Colors.background.primary : Colors.background.secondary 
      }}>
        {/* Show search results or timeline */}
        {hasSearched && isSearchVisible ? (
          <Timeline context="lawyer" searchResults={results} isSearchMode={true} searchQuery={query} />
        ) : (
          <Timeline context="lawyer" />
        )}
      </View>
      <LawyerNavbar activeTab="forum" />
      <SidebarWrapper />
    </SafeAreaView>
  );
};

export default LawyerForum;
