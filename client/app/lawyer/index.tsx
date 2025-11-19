import React, { useMemo, useCallback, memo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
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
import RegisteredOnboardingOverlay from '../../components/onboarding/RegisteredOnboardingOverlay';
import AuthGuard from '../../components/auth/AuthGuard';

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

  // Memoized current date
  const currentDate = useMemo(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return now.toLocaleDateString('en-US', options);
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
      <AuthGuard requireAuth={true} allowedRoles={['verified_lawyer']}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
          <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
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
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireAuth={true} allowedRoles={['verified_lawyer']}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
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
          <View style={tw`px-6 mb-6`}>
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
          <View style={tw`mx-6 mb-6`}>
            <ConsultationCalendar 
              consultations={calendarConsultations}
              onDatePress={handleDatePress}
              onConsultationPress={handleConsultationPress}
            />
          </View>

          {/* Recent Consultations */}
          <View style={tw`p-4 mx-6 mb-6 bg-white border border-gray-200 rounded-2xl`}>
            <View style={tw`flex-row items-center justify-between mb-6`}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={tw`text-lg font-bold text-gray-900`} numberOfLines={1}>Recent Activity</Text>
                <Text style={tw`mt-1 text-sm text-gray-500`} numberOfLines={1}>Latest consultation requests</Text>
              </View>
              <TouchableOpacity 
                style={[tw`px-4 py-2 rounded-lg`, { backgroundColor: '#E8F4FD', flexShrink: 0 }]} 
                activeOpacity={0.7}
                onPress={handleViewAllConsultations}
              >
                <Text style={[tw`text-sm font-semibold`, { color: Colors.primary.blue }]} numberOfLines={1}>View All</Text>
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
        <RegisteredOnboardingOverlay />
      </SafeAreaView>
    </AuthGuard>
  );
};

export default memo(LawyerDashboard);
