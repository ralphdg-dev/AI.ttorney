import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, RefreshControl, ScrollView, Animated, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import tw from "tailwind-react-native-classnames";
import Header from "../components/Header";
import Navbar from "../../client/components/Navbar";
import { SidebarWrapper } from "../components/AppSidebar";
import Colors from "../constants/Colors";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import { shouldUseNativeDriver } from "@/utils/animations";

// Import consultation components
import ConsultationCard, { type Consultation } from "@/components/sidebar/consultations/ConsultationCard";
import ConsultationSkeleton from "@/components/sidebar/consultations/ConsultationSkeleton";
import ConsultationEmptyState from "@/components/sidebar/consultations/ConsultationEmptyState";
import ConsultationDetailModal from "@/components/sidebar/consultations/ConsultationDetailModal";
import SearchBarWithFilter from "../components/common/SearchBarWithFilter";
import ConsultationFilterModal from "../components/sidebar/consultations/ConsultationFilterModal";

export default function ConsultationsScreen() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchConsultations = useCallback(async () => {
    if (!user?.id) {
      console.log("❌ No user ID, skipping fetch");
      return;
    }

    try {
      setLoading(true);
      console.log("🔄 Fetching consultations for user:", user.id);

      const { data, error } = await supabase
        .from("consultation_requests")
        .select(
          `
          id,
          status,
          consultation_date,
          consultation_time,
          created_at,
          message,
          email,
          mobile_number,
          responded_at,
          lawyer_id,
          lawyer_info:lawyer_id (
            name,
            specialization
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching consultations:", error);
        setLoading(false);
        return;
      }

      console.log("✅ Fetched consultations raw data:", JSON.stringify(data, null, 2));
      console.log("📊 Total consultations found:", data?.length || 0);

      if (!data || data.length === 0) {
        console.log("⚠️  No consultations found for user");
        setConsultations([]);
        setLoading(false);
        return;
      }

      const transformedData: Consultation[] = data.map((item: any) => {
        const lawyerInfo = item.lawyer_info;
        const transformed = {
          id: item.id,
          lawyer_name: lawyerInfo?.name || "Pending Assignment",
          specialization: lawyerInfo?.specialization || "Awaiting Lawyer",
          consultation_date: item.consultation_date || "",
          consultation_time: item.consultation_time || "",
          status: item.status || "pending",
          created_at: item.created_at,
          message: item.message,
          email: item.email,
          mobile_number: item.mobile_number,
          responded_at: item.responded_at,
        };
        console.log("🔄 Transformed consultation:", transformed);
        return transformed;
      });

      console.log("✅ Setting consultations state with", transformedData.length, "items");
      setConsultations(transformedData);
    } catch (error) {
      console.error("❌ Exception in fetchConsultations:", error);
    } finally {
      setLoading(false);
      console.log("✅ Loading complete");
    }
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConsultations();
    setRefreshing(false);
  };

  // Fetch consultations when auth is ready and user is authenticated
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }
    
    // Check if user is authenticated and has ID
    if (isAuthenticated && user?.id) {
      fetchConsultations();
    } else {
      setLoading(false); // Stop loading if not authenticated
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user?.id]); // fetchConsultations is stable

  // Also fetch when screen comes into focus (for navigation)
  useFocusEffect(
    React.useCallback(() => {
      if (!authLoading && isAuthenticated && user?.id) {
        fetchConsultations();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAuthenticated, user?.id]) // fetchConsultations is stable
  );

  // Real-time subscription for consultation updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('consultation_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultation_requests',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log('Consultation change detected:', payload);
          // Refresh consultations when any change occurs
          fetchConsultations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchConsultations]);

  const openDetailsModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: shouldUseNativeDriver('opacity'),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: shouldUseNativeDriver('transform'),
      }),
    ]).start();
  };

  const closeDetailsModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: shouldUseNativeDriver('opacity'),
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: shouldUseNativeDriver('transform'),
      }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedConsultation(null);
    });
  };

  const filteredConsultations = useMemo(() => {
    let filtered = consultations;

    if (activeFilter !== "all") {
      filtered = filtered.filter((c) => c.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.lawyer_name.toLowerCase().includes(query) ||
          c.specialization.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activeFilter, searchQuery, consultations]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header title="My Consultations" showMenu={true} />
      
      <SearchBarWithFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterPress={() => setFilterModalVisible(true)}
        placeholder="Search consultations..."
        loading={authLoading || loading}
        editable={true}
        maxLength={100}
        hasActiveFilters={activeFilter !== "all"}
      />
      
      <View style={{ flex: 1 }}>
        
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={{ paddingBottom: 96, paddingTop: 16, flexGrow: 0 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary.blue]}
              tintColor={Colors.primary.blue}
            />
          }
        >
          {(authLoading || loading) ? (
            <View>
              <ConsultationSkeleton />
              <ConsultationSkeleton />
              <ConsultationSkeleton />
            </View>
          ) : filteredConsultations.length === 0 ? (
            <ConsultationEmptyState searchQuery={searchQuery} />
          ) : (
            <View>
              {filteredConsultations.map((consultation, index) => (
                <ConsultationCard
                  key={consultation.id}
                  consultation={consultation}
                  index={index}
                  onViewDetails={openDetailsModal}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <ConsultationDetailModal
          visible={modalVisible}
          consultation={selectedConsultation}
          fadeAnim={fadeAnim}
          scaleAnim={scaleAnim}
          onClose={closeDetailsModal}
          onCancel={() => {}} // Add cancel functionality if needed
        />

        <ConsultationFilterModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          selectedStatus={activeFilter}
          setSelectedStatus={setActiveFilter}
        />
      </View>

      <Navbar activeTab="profile" />
      <SidebarWrapper />
    </SafeAreaView>
  );
}
