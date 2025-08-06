import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from '../../components/Navbar';
import Timeline from '../../components/home/Timeline';

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'learn' | 'ask' | 'find' | 'profile'>('home');

  const handleTabPress = (tab: string) => {
    setActiveTab(tab as any);
    console.log(`Navigating to ${tab} tab`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
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