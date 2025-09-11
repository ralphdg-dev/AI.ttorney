import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LawyerTimeline from '../../components/lawyer/LawyerTimeline';
import LawyerNavbar from '../../components/lawyer/LawyerNavbar';
import Header from '../../components/Header';

const LawyerForum = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Header 
        variant="home"
        showMenu={true}
        showNotifications={true}
      />
      <View style={{ flex: 1 }}>
        <LawyerTimeline />
      </View>
      <LawyerNavbar activeTab="forum" />
    </SafeAreaView>
  );
};

export default LawyerForum;
