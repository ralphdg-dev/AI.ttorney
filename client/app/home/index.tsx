import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Navbar from '../../components/Navbar';
import Timeline from '../../components/home/Timeline';
import Header from '../../components/Header';
import { SidebarWrapper } from '../../components/AppSidebar';
import Colors from '../../constants/Colors';

const HomePage: React.FC = () => {
  const router = useRouter();

  const handleSearchPress = () => {
    console.log('Search functionality to be implemented');
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
        <View style={styles.content}>
          {/* Timeline no longer renders "home/index" */}
          <Timeline />
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
});

export default HomePage;
