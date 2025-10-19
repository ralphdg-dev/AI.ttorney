import React, { useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Timeline from '../../components/home/Timeline';
import { LawyerNavbar } from '../../components/lawyer/shared';
import Header from '../../components/Header';
import { SidebarWrapper } from '../../components/AppSidebar';

const LawyerForum: React.FC = () => {
  const router = useRouter();

  const handleNotificationPress = useCallback(() => {
    router.push('/notifications');
  }, [router]);

  return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'left', 'right']}>
        <Header 
          variant="home"
          showMenu={true}
          showNotifications={true}
          onNotificationPress={handleNotificationPress}
        />
      <View style={{ flex: 1 }}>
        <Timeline context="lawyer" />
      </View>
      <LawyerNavbar activeTab="forum" />
      <SidebarWrapper />
    </SafeAreaView>
  );
};

export default LawyerForum;
