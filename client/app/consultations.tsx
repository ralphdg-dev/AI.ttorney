import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, RefreshControl, ScrollView, Animated, StatusBar, Alert, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import tw from "tailwind-react-native-classnames";
import Header from "../components/Header";
import Navbar from "../components/Navbar";
import { SidebarWrapper } from "../components/AppSidebar";
import Colors from "../constants/Colors";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldUseNativeDriver } from "@/utils/animations";
import { AuthGuard } from "@/components/AuthGuard";

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
  const insets = useSafeAreaInsets();
  const [consultations, setConsultations] = useState<ConsultationWithLawyer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationWithLawyer | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];
  const { user, session, isAuthenticated, isLoading: authLoading } = useAuth();

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // First try AuthContext session token
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      return headers;
    }
    
    // Fallback to AsyncStorage
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }, [session?.access_token]);

  const fetchConsultations = useCallback(async () => {
    if (!user?.id) {
      console.log("❌ No user ID, skipping fetch");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("🔄 Fetching consultations for user via API:", user.id);

      const { NetworkConfig } = await import('@/utils/networkConfig');
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const headers = await getAuthHeaders();

      const requestUrl = `${apiUrl}/consultation-requests/user/${user.id}?page=1&page_size=50&status_filter=all`;
      console.log("📡 Requesting consultations from:", requestUrl);

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        let errorPayload: any = null;
        try {
          errorPayload = await response.json();
        } catch {
          // Ignore JSON parse errors for non-JSON responses
        }

        console.error("❌ Error fetching consultations from API:", {
          status: response.status,
          error: errorPayload,
        });

        if (!__DEV__) {
          Alert.alert(
            "Error",
            "Failed to load your consultations. Please try again."
          );
        }

        setConsultations([]);
        return;
      }

      const result = await response.json();
      const items = Array.isArray(result?.data) ? result.data : [];

      console.log("✅ Fetched consultations from API:", {
        total: items.length,
      });

      setConsultations(items || []);
    } catch (error) {
      console.error("❌ Exception in fetchConsultations (API):", error);
      setConsultations([]);
    } finally {
      setLoading(false);
      console.log("✅ Loading complete");
    }
  }, [user?.id, getAuthHeaders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConsultations();
    setRefreshing(false);
  };

  // Fetch consultations when screen comes into focus (handles both initial load and navigation)
  useFocusEffect(
    React.useCallback(() => {
      console.log("📱 ConsultationsScreen focused - authLoading:", authLoading, "isAuthenticated:", isAuthenticated, "user?.id:", user?.id, "loading:", loading);
      
      // Wait for auth to finish loading
      if (authLoading) {
        console.log("⏳ Auth still loading, will wait");
        setLoading(true);
        return;
      }
      
      // If not authenticated or no user, show empty state immediately
      if (!isAuthenticated || !user?.id) {
        console.log("⚠️ Not authenticated or no user ID, showing empty state");
        setLoading(false);
        setConsultations([]);
        return;
      }
      
      // User is authenticated, fetch consultations
      console.log("✅ User authenticated, fetching consultations");
      fetchConsultations();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAuthenticated, user?.id])
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
        "This consultation cannot be cancelled. Only pending and accepted consultations can be cancelled.",
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
        
        // Use the backend API that handles ban logic
        const { NetworkConfig } = await import('@/utils/networkConfig');
        const apiUrl = await NetworkConfig.getBestApiUrl();
        const headers = await getAuthHeaders();
        
        const response = await fetch(`${apiUrl}/api/consult-actions/${consultationId}/cancel`, {
          method: 'POST',
          headers,
        });

        const result = await response.json();
        console.log("📡 API response:", { status: response.status, result });

        if (!response.ok) {
          throw new Error(result.detail || result.message || 'Failed to cancel consultation');
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
  }, [consultations, user?.id, closeDetailsModal, getAuthHeaders]);

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

    if (activeFilter === "upcoming") {
      // Show accepted consultations with future dates (matching sidebar logic)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((c) => {
        const consultationDate = new Date(c.consultation_date);
        return c.status === "accepted" && consultationDate >= today;
      });
    } else if (activeFilter !== "all") {
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
    <AuthGuard>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top']}>
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 56 + (insets.bottom || 0) + 20, paddingTop: 0, flexGrow: 1 }}
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
    </AuthGuard>
  );
}
