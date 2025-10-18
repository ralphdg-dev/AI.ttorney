import React, { useMemo, useCallback, memo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from "react-native";
import { useRouter } from 'expo-router';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';
import { LawyerNavbar } from '../../components/lawyer/shared';
import Header from '../../components/Header';
import { ConsultationCalendar, QuickStatsCard, DashboardWelcome } from '../../components/lawyer/dashboard';
import { ConsultationCard } from '../../components/lawyer/consultation';
import { SidebarWrapper } from '../../components/AppSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useLawyerDashboard } from '../../hooks/useLawyerDashboard';
import { getClientName } from '../../utils/consultationStyles';
import { QUICK_STATS_CONFIG, DASHBOARD_CONSTANTS } from '../../constants/dashboardConfig';

const LawyerDashboard: React.FC = () => {
  const router = useRouter();
  const { session, user } = useAuth();
  
  // Custom hook handles all data fetching logic
  const { loading, stats, recentConsultations, acceptedConsultations } = useLawyerDashboard(
    session?.access_token
  );

  // Get lawyer's full name from user profile
  const lawyerName = user?.full_name || 'Attorney';

  // Memoized callbacks
  const handleNotificationPress = useCallback(() => {
    router.push('/notifications');
  }, [router]);
  
  const handleDatePress = useCallback((date: string) => {
    router.push(`/lawyer/consult?date=${date}`);
  }, [router]);

  const handleConsultationPress = useCallback((consultationId: string) => {
    router.push(`/lawyer/consultation/${consultationId}`);
  }, [router]);

  const handleViewAllConsultations = useCallback(() => {
    router.push('/lawyer/consult');
  }, [router]);

  const handleTodayConsultationsPress = useCallback(() => {
    // Navigate to consult page filtered by today's date
    const today = new Date().toISOString().split('T')[0];
    router.push(`/lawyer/consult?date=${today}`);
  }, [router]);

  const handleTotalConsultationsPress = useCallback(() => {
    // Navigate to consult page showing all consultations
    router.push('/lawyer/consult');
  }, [router]);

  // Memoized current date (Philippine timezone)
  const currentDate = useMemo(() => {
    const now = new Date();
    const phTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    return phTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // Memoized calendar consultations data
  const calendarConsultations = useMemo(
    () => acceptedConsultations.map(consultation => ({
      id: consultation.id,
      consultation_date: consultation.consultation_date || '',
      status: consultation.status,
      mode: consultation.consultation_mode || 'online',
      client_name: getClientName(consultation),
      consultation_time: consultation.consultation_time || '',
      message: consultation.message
    })),
    [acceptedConsultations]
  );



  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <Header 
          variant="home"
          showMenu={true}
          showNotifications={true}
          onNotificationPress={handleNotificationPress}
        />
        <View style={tw`items-center justify-center flex-1`}>
          <ActivityIndicator size="large" color={Colors.primary.blue} />
          <Text style={tw`mt-4 text-gray-600`}>{DASHBOARD_CONSTANTS.LOADING_MESSAGE}</Text>
        </View>
        <LawyerNavbar activeTab="home" />
        <SidebarWrapper />
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <Header 
          variant="home"
          showMenu={true}
          showNotifications={true}
          onNotificationPress={handleNotificationPress}
        />
      
      <ScrollView 
        style={tw`flex-1 pb-24`} 
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
      >
        {/* Welcome Section - Presentational Component */}
        <DashboardWelcome date={currentDate} lawyerName={lawyerName} />
        
        {/* Quick Stats - Configuration-driven rendering */}
        <View style={tw`px-4 mb-6`}>
          <View style={tw`flex-row -mx-2`}>
            {QUICK_STATS_CONFIG.map((config, index) => (
              <QuickStatsCard
                key={`stat-${config.label}`}
                config={config}
                stats={stats}
                onPress={index === 0 ? handleTodayConsultationsPress : handleTotalConsultationsPress}
              />
            ))}
          </View>
        </View>

        {/* Consultation Calendar - Memoized data */}
        <View style={tw`mx-4 mb-6`}>
          <ConsultationCalendar 
            consultations={calendarConsultations}
            onDatePress={handleDatePress}
            onConsultationPress={handleConsultationPress}
          />
        </View>

        {/* Recent Consultations */}
        <View style={tw`p-6 mx-4 mb-6 bg-white border border-gray-200 rounded-2xl`}>
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <View>
              <Text style={tw`text-lg font-bold text-gray-900`}>Recent Activity</Text>
              <Text style={tw`mt-1 text-sm text-gray-500`}>Latest consultation requests</Text>
            </View>
            <TouchableOpacity 
              style={[tw`px-4 py-2 rounded-lg`, { backgroundColor: '#E8F4FD' }]} 
              activeOpacity={0.7}
              onPress={handleViewAllConsultations}
            >
              <Text style={[tw`text-sm font-semibold`, { color: Colors.primary.blue }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <View>
            {recentConsultations.length === 0 ? (
              <View style={tw`items-center py-8`}>
                <Text style={tw`text-base text-gray-500`}>{DASHBOARD_CONSTANTS.EMPTY_STATE_MESSAGE}</Text>
              </View>
            ) : (
              recentConsultations.map((consultation, index) => (
                <ConsultationCard
                  key={consultation.id}
                  consultation={consultation}
                  onPress={(id) => router.push(`/lawyer/consultation/${id}`)}
                  isLast={index === recentConsultations.length - 1}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <LawyerNavbar activeTab="home" />
      <SidebarWrapper />
    </SafeAreaView>
  );
};

export default memo(LawyerDashboard);
