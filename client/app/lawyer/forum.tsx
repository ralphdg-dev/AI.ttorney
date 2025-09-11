import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LawyerTimeline from '../../components/lawyer/LawyerTimeline';
import LawyerNavbar from '../../components/lawyer/LawyerNavbar';

const LawyerForum = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1 }}>
        <LawyerTimeline />
      </View>
      <LawyerNavbar activeTab="forum" />
    </SafeAreaView>
  );
};

export default LawyerForum;
