import React, { useState, useMemo, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl, Animated } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import tw from "tailwind-react-native-classnames";
import Header from "../components/Header";
import Navbar from "../../client/components/Navbar";
import {
  SidebarProvider,
  SidebarWrapper,
} from "../../client/components/AppSidebar";
import Colors from "../constants/Colors";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";

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

  const fetchConsultations = async () => {
    if (!user?.id) {
      return;
    }

    try {
      setLoading(true);

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
          lawyer_info:lawyer_id (
            name,
            specialization
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching consultations:", error);
        return;
      }

      const transformedData: Consultation[] = (data || []).map((item) => ({
        id: item.id,
        lawyer_name: (item.lawyer_info as any)?.name || "Unknown Lawyer",
        specialization: (item.lawyer_info as any)?.specialization || "General Law",
        consultation_date: item.consultation_date || "",
        consultation_time: item.consultation_time || "",
        status: item.status || "pending",
        created_at: item.created_at,
        message: item.message,
        email: item.email,
        mobile_number: item.mobile_number,
        responded_at: item.responded_at,
      }));

      setConsultations(transformedData);
    } catch (error) {
      console.error("Error in fetchConsultations:", error);
    } finally {
      setLoading(false);
    }
  };

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
  }, [authLoading, isAuthenticated, user?.id]);

  // Also fetch when screen comes into focus (for navigation)
  useFocusEffect(
    React.useCallback(() => {
      if (!authLoading && isAuthenticated && user?.id) {
        fetchConsultations();
      }
    }, [authLoading, isAuthenticated, user?.id])
  );

  const openDetailsModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDetailsModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
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
    <SidebarProvider>
      <View style={tw`flex-1 bg-gray-50`}>
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

        <Navbar />
        <SidebarWrapper />
      </View>
    </SidebarProvider>
  );
}
