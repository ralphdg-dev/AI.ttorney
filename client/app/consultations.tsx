import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, RefreshControl, ScrollView, Animated, StatusBar, Alert, Platform } from 'react-native';
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

// Import consultation types and utilities
import { ConsultationWithLawyer, ConsultationStatus, canCancelConsultation } from "@/types/consultation.types";

// Import consultation components
import ConsultationCard from "@/components/sidebar/consultations/ConsultationCard";
import ConsultationSkeleton from "@/components/sidebar/consultations/ConsultationSkeleton";
import ConsultationEmptyState from "@/components/sidebar/consultations/ConsultationEmptyState";
import ConsultationDetailModal from "@/components/sidebar/consultations/ConsultationDetailModal";
import UnifiedSearchBar from "@/components/common/UnifiedSearchBar";
import ConsultationFilterModal from "../components/sidebar/consultations/ConsultationFilterModal";

export default function ConsultationsScreen() {
  const [consultations, setConsultations] = useState<ConsultationWithLawyer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationWithLawyer | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchConsultations = useCallback(async () => {
    if (!user?.id) {
      console.log("❌ No user ID, skipping fetch");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("🔄 Fetching consultations for user:", user.id);

      // Optimized query with limit for faster initial load
      const { data, error } = await supabase
        .from("consultation_requests")
        .select(
          `
          *,
          lawyer_info:lawyer_id (
            name,
            specialization,
            location
          )
        `
        )
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50); // Limit to 50 most recent for faster loading

      if (error) {
        console.error("❌ Error fetching consultations:", error);
        setLoading(false);
        return;
      }

      console.log("✅ Fetched consultations raw data:", JSON.stringify(data, null, 2));
      console.log("📊 Total consultations found:", data?.length || 0);

      // Set consultations regardless of whether data is empty or not
      setConsultations(data || []);
      
      if (!data || data.length === 0) {
        console.log("⚠️  No consultations found for user");
      } else {
        console.log("✅ Setting consultations state with", data.length, "items");
      }
    } catch (error) {
      console.error("❌ Exception in fetchConsultations:", error);
      setConsultations([]);
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

  const closeDetailsModal = useCallback(() => {
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
  }, [fadeAnim, scaleAnim]);

  const handleCancelConsultation = useCallback(async (consultationId: string) => {
    console.log("🔴 handleCancelConsultation called with ID:", consultationId);
    console.log("🔴 Current consultations:", consultations.length);
    console.log("🔴 User ID:", user?.id);
    
    const consultation = consultations.find(c => c.id === consultationId);
    console.log("🔴 Found consultation:", consultation);
    
    if (!consultation) {
      console.log("❌ Consultation not found");
      Alert.alert("Error", "Consultation not found");
      return;
    }
    
    if (!canCancelConsultation(consultation)) {
      console.log("❌ Cannot cancel - status:", consultation.status);
      Alert.alert(
        "Cannot Cancel",
        "This consultation cannot be cancelled. Only pending consultations can be cancelled.",
        [{ text: "OK" }]
      );
      return;
    }

    console.log("✅ Showing confirmation dialog");
    
    // Handle web vs native confirmation
    const performCancellation = async () => {
      console.log("🔄 Starting cancellation process...");
      try {
        console.log("📡 Updating database...");
        console.log("📡 Consultation ID:", consultationId);
        console.log("📡 User ID:", user?.id);
        
        const { data, error } = await supabase
          .from("consultation_requests")
          .update({ status: "cancelled" })
          .eq("id", consultationId)
          .single();

        console.log("📡 Database response:", { data, error });

        if (error) {
          console.error("❌ Database error:", error);
          throw error;
        }

        console.log("✅ Database updated successfully");

        // Optimistic update
        setConsultations(prev =>
          prev.map(c =>
            c.id === consultationId
              ? { ...c, status: "cancelled" as ConsultationStatus }
              : c
          )
        );
        console.log("✅ Local state updated");

        // Close the modal
        closeDetailsModal();
        console.log("✅ Modal closed");

        // Show success message
        if (Platform.OS === 'web') {
          alert("Consultation cancelled successfully");
        } else {
          Alert.alert("Success", "Consultation cancelled successfully");
        }
        console.log("✅ Success message shown");
      } catch (error) {
        console.error("❌ Error cancelling consultation:", error);
        if (Platform.OS === 'web') {
          alert("Failed to cancel consultation. Please try again.");
        } else {
          Alert.alert("Error", "Failed to cancel consultation. Please try again.");
        }
      }
    };
    
    // Show confirmation dialog (web vs native)
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Are you sure you want to cancel this consultation? This action cannot be undone.");
      if (confirmed) {
        await performCancellation();
      } else {
        console.log("❌ User cancelled the action");
      }
    } else {
      Alert.alert(
        "Cancel Consultation",
        "Are you sure you want to cancel this consultation? This action cannot be undone.",
        [
          { 
            text: "No", 
            style: "cancel",
            onPress: () => console.log("❌ User cancelled the action")
          },
          {
            text: "Yes, Cancel",
            style: "destructive",
            onPress: performCancellation,
          },
        ]
      );
    }
  }, [consultations, user?.id, closeDetailsModal]);

  const openDetailsModal = (consultation: ConsultationWithLawyer) => {
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

  const filteredConsultations = useMemo(() => {
    let filtered = consultations;

    if (activeFilter !== "all") {
      filtered = filtered.filter((c) => c.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.lawyer_info?.name?.toLowerCase().includes(query) ||
          c.lawyer_info?.specialization?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activeFilter, searchQuery, consultations]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header title="My Consultations" showMenu={true} />
      
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <UnifiedSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search consultations..."
            loading={authLoading || loading}
            showFilterIcon={true}
            onFilterPress={() => setFilterModalVisible(true)}
            containerClassName="pt-6 pb-4"
          />
        </View>
        
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 96, paddingTop: 0, flexGrow: 0 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
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
          onCancel={handleCancelConsultation}
        />

        <ConsultationFilterModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          selectedStatus={activeFilter}
          setSelectedStatus={setActiveFilter}
        />
      </View>

      <Navbar />
      <SidebarWrapper />
    </SafeAreaView>
  );
}
