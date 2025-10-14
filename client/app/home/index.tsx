import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Navbar from '../../components/Navbar';
import Timeline from '../../components/home/Timeline';
import Header from '../../components/Header';
import { SidebarProvider, SidebarWrapper } from '../../components/AppSidebar';

const HomePage: React.FC = () => {
  const router = useRouter();

  const handleSearchPress = () => {
    console.log('Search functionality to be implemented');
  };

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  return (
    <SidebarProvider>
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
        
        <Navbar activeTab="home" />
        <SidebarWrapper />
      </SafeAreaView>
    </SidebarProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});

export default HomePage;
