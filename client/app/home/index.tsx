import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Navbar from '../../components/Navbar';
import Timeline, { TimelineHandle } from '../../components/home/Timeline';
import Header from '../../components/Header';
import { SidebarWrapper } from '../../components/AppSidebar';
import Colors from '../../constants/Colors';

const HomePage: React.FC = () => {
  const router = useRouter();

  const timelineRef = React.useRef<TimelineHandle>(null);

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
          onNotificationPress={handleNotificationPress}
          onLogoPress={() => timelineRef.current?.scrollToTop()}
        />
        
        <View style={styles.content}>
          <Timeline ref={timelineRef} />
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
