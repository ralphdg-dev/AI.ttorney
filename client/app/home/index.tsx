import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Navbar from '../../components/Navbar';
import Timeline from '../../components/home/Timeline';
import Header from '../../components/Header';
import { SidebarWrapper } from '../../components/AppSidebar';
import AnimatedSearchBar from '../../components/forum/AnimatedSearchBar';
import Colors from '../../constants/Colors';
import { useForumSearch } from '../../hooks/useForumSearch';

const HomePage: React.FC = () => {
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

  const handleSearchPress = () => {
    showSearch();
  };

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header 
          variant="home"
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
        
        <View style={[styles.content, isSearchVisible && styles.contentSearchMode]}>
          {/* Show search results or timeline */}
          {hasSearched && isSearchVisible ? (
            <Timeline searchResults={results} isSearchMode={true} searchQuery={query} />
          ) : (
            <Timeline />
          )}
        </View>
        
        <Navbar activeTab="home" />
      <SidebarWrapper />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary, // Match chatbot exact color
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background.secondary, // Content area gray
  },
  contentSearchMode: {
    backgroundColor: Colors.background.primary, // Slightly different background when searching
  },
});

export default HomePage;
