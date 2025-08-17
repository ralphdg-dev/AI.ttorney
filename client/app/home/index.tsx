import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from '../../components/Navbar';
import Timeline from '../../components/home/Timeline';
import Header from '../../components/Header';

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'learn' | 'ask' | 'find' | 'profile'>('home');

  const handleTabPress = (tab: string) => {
    setActiveTab(tab as any);
    console.log(`Navigating to ${tab} tab`);
  };

  const handleSearchPress = () => {
    console.log('Search functionality to be implemented');
  };

  const handleNotificationPress = () => {
    console.log('Notification functionality to be implemented');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        variant="home"
        showSearch={true}
        showNotifications={true}
        onSearchPress={handleSearchPress}
        onNotificationPress={handleNotificationPress}
      />
      <View style={styles.content}>
        {/* Timeline no longer renders "home/index" */}
        <Timeline />
      </View>
      
      <Navbar 
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
});

export default HomePage;
