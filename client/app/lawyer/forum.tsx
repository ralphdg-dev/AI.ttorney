import React, { useCallback } from 'react';
import { View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Timeline from '../../components/home/Timeline';
import { LawyerNavbar } from '../../components/lawyer/shared';
import Header from '../../components/Header';
import { SidebarWrapper } from '../../components/AppSidebar';
import Colors from '../../constants/Colors';
import { AuthGuard } from '../../components/AuthGuard';

const LawyerForum: React.FC = () => {
  const router = useRouter();

  const handleNotificationPress = useCallback(() => {
    router.push('/notifications');
  }, [router]);

  return (
    <AuthGuard>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
        <Header 
            variant="home"
            showMenu={true}
            showSearch={true}
            showNotifications={true}
            onNotificationPress={handleNotificationPress}
          />
          
        <View style={{ 
          flex: 1, 
          backgroundColor: Colors.background.secondary 
        }}>
          <Timeline context="lawyer" />
        </View>
        <LawyerNavbar activeTab="forum" />
        <SidebarWrapper />
      </SafeAreaView>
    </AuthGuard>
  );
};

export default LawyerForum;
