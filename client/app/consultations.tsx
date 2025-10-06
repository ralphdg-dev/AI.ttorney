import React, { useState, useMemo, useEffect } from "react";
import { View, ScrollView, RefreshControl, Modal, TouchableOpacity, Animated, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text as UIText } from "@/components/ui/text";
import { Pressable as UIPressable } from "@/components/ui/pressable";
import tw from "tailwind-react-native-classnames";
import Header from "../components/Header";
import Navbar from "../../client/components/Navbar";
import {
  SidebarProvider,
  SidebarWrapper,
} from "../../client/components/AppSidebar";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";

interface Consultation {
  id: string;
  lawyer_name: string;
  specialization: string;
  consultation_date: string;
  consultation_time: string;
  status: "pending" | "approved" | "rejected" | "completed";
  created_at: string;
  message?: string;
  email?: string;
  mobile_number?: string;
  responded_at?: string;
}

const STATUS_CONFIG = {
  pending: {
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    icon: "time-outline" as const,
    label: "Pending",
  },
  approved: {
    color: "#10B981",
    bgColor: "#D1FAE5",
    icon: "checkmark-circle-outline" as const,
    label: "Approved",
  },
  rejected: {
    color: "#EF4444",
    bgColor: "#FEE2E2",
    icon: "close-circle-outline" as const,
    label: "Rejected",
  },
  completed: {
    color: "#6B7280",
    bgColor: "#F3F4F6",
    icon: "checkmark-done-outline" as const,
    label: "Completed",
  },
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Skeleton Loading Component
const SkeletonCard = () => {
  const pulseAnim = useState(new Animated.Value(0.3))[0];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Box className="mx-4 md:mx-6 mb-3 md:mb-4 bg-white rounded-lg border border-gray-200 p-3 md:p-4">
      <HStack className="justify-between items-start mb-3">
        <VStack className="flex-1 mr-2" space="xs">
          {/* Lawyer name skeleton */}
          <Animated.View 
            style={[
              tw`rounded`,
              { 
                height: screenWidth < 768 ? 18 : 20,
                width: '70%',
                backgroundColor: '#E5E7EB',
                opacity: pulseAnim
              }
            ]}
          />
          {/* Specialization skeleton */}
          <Animated.View 
            style={[
              tw`rounded mt-1`,
              { 
                height: screenWidth < 768 ? 14 : 16,
                width: '50%',
                backgroundColor: '#E5E7EB',
                opacity: pulseAnim
              }
            ]}
          />
        </VStack>

        {/* Status badge skeleton */}
        <Animated.View 
          style={[
            tw`rounded-full`,
            { 
              height: screenWidth < 768 ? 24 : 28,
              width: 80,
              backgroundColor: '#E5E7EB',
              opacity: pulseAnim
            }
          ]}
        />
      </HStack>

      {/* Message skeleton */}
      <VStack className="mb-3" space="xs">
        <Animated.View 
          style={[
            tw`rounded`,
            { 
              height: screenWidth < 768 ? 14 : 16,
              width: '90%',
              backgroundColor: '#E5E7EB',
              opacity: pulseAnim
            }
          ]}
        />
        <Animated.View 
          style={[
            tw`rounded`,
            { 
              height: screenWidth < 768 ? 14 : 16,
              width: '60%',
              backgroundColor: '#E5E7EB',
              opacity: pulseAnim
            }
          ]}
        />
      </VStack>

      {/* Date and time skeleton */}
      <VStack className="mb-3" space="sm">
        <HStack className="items-center">
          <Animated.View 
            style={[
              tw`rounded`,
              { 
                height: screenWidth < 768 ? 16 : 18,
                width: 16,
                backgroundColor: '#E5E7EB',
                opacity: pulseAnim
              }
            ]}
          />
          <Animated.View 
            style={[
              tw`rounded ml-2`,
              { 
                height: screenWidth < 768 ? 14 : 16,
                width: 100,
                backgroundColor: '#E5E7EB',
                opacity: pulseAnim
              }
            ]}
          />
        </HStack>

        <HStack className="items-center">
          <Animated.View 
            style={[
              tw`rounded`,
              { 
                height: screenWidth < 768 ? 16 : 18,
                width: 16,
                backgroundColor: '#E5E7EB',
                opacity: pulseAnim
              }
            ]}
          />
          <Animated.View 
            style={[
              tw`rounded ml-2`,
              { 
                height: screenWidth < 768 ? 14 : 16,
                width: 80,
                backgroundColor: '#E5E7EB',
                opacity: pulseAnim
              }
            ]}
          />
        </HStack>
      </VStack>

      {/* Button skeleton */}
      <Animated.View 
        style={[
          tw`rounded-lg`,
          { 
            height: screenWidth < 768 ? 36 : 42,
            width: '100%',
            backgroundColor: '#E5E7EB',
            opacity: pulseAnim
          }
        ]}
      />
    </Box>
  );
};

export default function ConsultationsScreen() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const fetchConsultations = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Fetch consultation requests with lawyer info
      const { data, error } = await supabase
        .from('consultation_requests')
        .select(`
          *,
          lawyer_info:lawyer_id (
            name,
            specialization
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching consultations:', error);
        return;
      }

      // Transform the data to match our interface
      const transformedData: Consultation[] = (data || []).map(item => ({
        id: item.id,
        lawyer_name: item.lawyer_info?.name || 'Unknown Lawyer',
        specialization: item.lawyer_info?.specialization || 'General Law',
        consultation_date: item.consultation_date || '',
        consultation_time: item.consultation_time || '',
        status: item.status || 'pending',
        created_at: item.created_at,
        message: item.message,
        email: item.email,
        mobile_number: item.mobile_number,
        responded_at: item.responded_at
      }));

      setConsultations(transformedData);
    } catch (error) {
      console.error('Error in fetchConsultations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConsultations();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchConsultations();
    }
  }, [isAuthenticated, user?.id]);

  const openDetailsModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setModalVisible(true);
    // Start fade in animation
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
    // Start fade out animation
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

    // Filter by status
    if (activeFilter !== "all") {
      filtered = filtered.filter((c) => c.status === activeFilter);
    }

    // Filter by search query
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not scheduled';
    
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Not available';
    
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const filters = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "completed", label: "Completed" },
    { id: "rejected", label: "Rejected" },
  ];

  return (
    <SidebarProvider>
      <View style={tw`flex-1 bg-gray-50`}>
        <Header title="My Consultations" showMenu={true} />

        {/* Search Bar */}
        <HStack className="items-center px-4 md:px-6 mb-4 mt-4">
          <Box className="flex-1">
            <Box className="relative">
              <View
                style={[
                  tw`flex-row items-center bg-white border border-gray-200 rounded-lg px-3 md:px-4 py-2 md:py-3`,
                ]}
              >
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <input
                  placeholder="Search consultations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    marginLeft: 8,
                    fontSize: screenWidth < 768 ? 14 : 16,
                    color: Colors.text.head,
                    border: "none",
                    outline: "none",
                    backgroundColor: "transparent",
                  }}
                />
              </View>
            </Box>
          </Box>
        </HStack>

        {/* Filter Tabs - Horizontal Scroll for Mobile */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`px-6`}
        >
          <HStack style={{ alignItems: "center" }}>
            {filters.map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <UIPressable
                  key={filter.id}
                  onPress={() => setActiveFilter(filter.id)}
                  className="mr-2 px-3 md:px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: isActive ? Colors.primary.blue : "white",
                    borderColor: isActive ? Colors.primary.blue : "#E5E7EB",
                    alignSelf: "flex-start",
                  }}
                >
                  <UIText
                    className="font-semibold"
                    style={{
                      fontSize: screenWidth < 768 ? 12 : 14,
                      color: isActive ? "white" : Colors.text.sub,
                    }}
                  >
                    {filter.label}
                  </UIText>
                </UIPressable>
              );
            })}
          </HStack>
        </ScrollView>

        {/* Consultations List */}
        <ScrollView
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
          {loading ? (
            // Show skeleton cards while loading
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filteredConsultations.length === 0 ? (
            <VStack className="items-center justify-center py-12 px-4 md:px-6">
              <Ionicons
                name="calendar-outline"
                size={screenWidth < 768 ? 40 : 48}
                color={Colors.text.sub}
                style={{ marginBottom: 12 }}
              />
              <UIText
                className="text-center font-semibold mb-2"
                style={{ 
                  fontSize: screenWidth < 768 ? 16 : 18,
                  color: Colors.text.head 
                }}
              >
                {searchQuery ? "No consultations found" : "No consultations yet"}
              </UIText>
              <UIText
                className="text-center"
                style={{ 
                  fontSize: screenWidth < 768 ? 13 : 14,
                  color: Colors.text.sub 
                }}
              >
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "Your consultation requests will appear here"}
              </UIText>
            </VStack>
          ) : (
            filteredConsultations.map((consultation) => {
              const statusConfig = STATUS_CONFIG[consultation.status];
              return (
                <Box
                  key={consultation.id}
                  className="mx-4 md:mx-6 mb-3 md:mb-4 bg-white rounded-lg border border-gray-200 p-3 md:p-4"
                >
                  <HStack className="justify-between items-start mb-3">
                    <VStack className="flex-1 mr-2">
                      <UIText
                        className="font-bold"
                        style={{ 
                          fontSize: screenWidth < 768 ? 15 : 16,
                          color: Colors.text.head 
                        }}
                      >
                        {consultation.lawyer_name}
                      </UIText>
                      <UIText
                        className="mt-1"
                        style={{ 
                          fontSize: screenWidth < 768 ? 12 : 14,
                          color: Colors.text.sub 
                        }}
                      >
                        {consultation.specialization}
                      </UIText>
                    </VStack>

                    <Box
                      className="px-2 md:px-3 py-1 rounded-full flex-row items-center"
                      style={{ backgroundColor: statusConfig.bgColor }}
                    >
                      <Ionicons
                        name={statusConfig.icon}
                        size={screenWidth < 768 ? 12 : 14}
                        color={statusConfig.color}
                      />
                      <UIText
                        className="font-semibold ml-1"
                        style={{ 
                          fontSize: screenWidth < 768 ? 10 : 12,
                          color: statusConfig.color 
                        }}
                      >
                        {statusConfig.label}
                      </UIText>
                    </Box>
                  </HStack>

                  {consultation.message && (
                    <UIText
                      className="mb-3 italic"
                      style={{ 
                        fontSize: screenWidth < 768 ? 12 : 14,
                        color: Colors.text.sub 
                      }}
                      numberOfLines={2}
                    >
                      "{consultation.message}"
                    </UIText>
                  )}

                  <VStack className="mb-3" space="sm">
                    {consultation.consultation_date && (
                      <HStack className="items-center">
                        <Ionicons
                          name="calendar-outline"
                          size={screenWidth < 768 ? 14 : 16}
                          color={Colors.text.sub}
                        />
                        <UIText
                          className="ml-2"
                          style={{ 
                            fontSize: screenWidth < 768 ? 12 : 14,
                            color: Colors.text.sub 
                          }}
                        >
                          {formatDate(consultation.consultation_date)}
                        </UIText>
                      </HStack>
                    )}

                    {consultation.consultation_time && (
                      <HStack className="items-center">
                        <Ionicons
                          name="time-outline"
                          size={screenWidth < 768 ? 14 : 16}
                          color={Colors.text.sub}
                        />
                        <UIText
                          className="ml-2"
                          style={{ 
                            fontSize: screenWidth < 768 ? 12 : 14,
                            color: Colors.text.sub 
                          }}
                        >
                          {consultation.consultation_time}
                        </UIText>
                      </HStack>
                    )}
                  </VStack>

                  <UIPressable
                    className="py-2 md:py-3 rounded-lg items-center justify-center border"
                    style={{
                      borderColor: Colors.primary.blue,
                      backgroundColor: "white",
                    }}
                    onPress={() => openDetailsModal(consultation)}
                  >
                    <UIText
                      className="font-semibold"
                      style={{ 
                        fontSize: screenWidth < 768 ? 13 : 14,
                        color: Colors.primary.blue 
                      }}
                    >
                      View Details
                    </UIText>
                  </UIPressable>
                </Box>
              );
            })
          )}

          <View style={tw`h-4`} />
        </ScrollView>

        {/* Fade Modal */}
        <Modal
          animationType="none"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeDetailsModal}
        >
          <View style={tw`flex-1 justify-center items-center`}>
            {/* Backdrop */}
            <TouchableOpacity 
              style={tw`absolute inset-0 bg-black bg-opacity-50`}
              activeOpacity={1}
              onPress={closeDetailsModal}
            />
            
            {/* Modal Content */}
            <Animated.View 
              style={[
                tw`bg-white rounded-lg mx-4 w-11/12 max-w-md`,
                { 
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                  maxHeight: screenHeight * 0.8,
                }
              ]}
            >
              {selectedConsultation && (
                <>
                  {/* Header */}
                  <HStack className="justify-between items-center p-4 md:p-6 border-b border-gray-200">
                    <UIText 
                      className="font-bold" 
                      style={{ 
                        fontSize: screenWidth < 768 ? 18 : 20,
                        color: Colors.text.head 
                      }}
                    >
                      Consultation Details
                    </UIText>
                    <TouchableOpacity onPress={closeDetailsModal}>
                      <Ionicons name="close" size={24} color={Colors.text.sub} />
                    </TouchableOpacity>
                  </HStack>

                  {/* Content */}
                  <ScrollView 
                    style={tw`max-h-96`}
                    showsVerticalScrollIndicator={true}
                  >
                    <VStack className="p-4 md:p-6" space="md">
                      {/* Lawyer Info */}
                      <VStack space="sm">
                        <UIText 
                          className="font-semibold text-gray-500"
                          style={{ fontSize: screenWidth < 768 ? 12 : 14 }}
                        >
                          LAWYER INFORMATION
                        </UIText>
                        <HStack className="justify-between items-start">
                          <VStack className="flex-1 mr-2">
                            <UIText 
                              className="font-bold" 
                              style={{ 
                                fontSize: screenWidth < 768 ? 16 : 18,
                                color: Colors.text.head 
                              }}
                            >
                              {selectedConsultation.lawyer_name}
                            </UIText>
                            <UIText 
                              className="text-sm" 
                              style={{ color: Colors.text.sub }}
                            >
                              {selectedConsultation.specialization}
                            </UIText>
                          </VStack>
                          <Box
                            className="px-2 md:px-3 py-1 rounded-full"
                            style={{ 
                              backgroundColor: STATUS_CONFIG[selectedConsultation.status].bgColor 
                            }}
                          >
                            <UIText
                              className="font-semibold"
                              style={{ 
                                fontSize: screenWidth < 768 ? 10 : 12,
                                color: STATUS_CONFIG[selectedConsultation.status].color 
                              }}
                            >
                              {STATUS_CONFIG[selectedConsultation.status].label}
                            </UIText>
                          </Box>
                        </HStack>
                      </VStack>

                      {/* Consultation Details */}
                      <VStack space="sm">
                        <UIText 
                          className="font-semibold text-gray-500"
                          style={{ fontSize: screenWidth < 768 ? 12 : 14 }}
                        >
                          CONSULTATION DETAILS
                        </UIText>
                        
                        <HStack className="justify-between">
                          <UIText 
                            className="font-medium" 
                            style={{ 
                              fontSize: screenWidth < 768 ? 13 : 14,
                              color: Colors.text.head 
                            }}
                          >
                            Request Date:
                          </UIText>
                          <UIText 
                            className="text-right flex-1 ml-2"
                            style={{ 
                              fontSize: screenWidth < 768 ? 13 : 14,
                              color: Colors.text.sub 
                            }}
                          >
                            {formatDateTime(selectedConsultation.created_at)}
                          </UIText>
                        </HStack>

                        {selectedConsultation.consultation_date && (
                          <HStack className="justify-between">
                            <UIText 
                              className="font-medium" 
                              style={{ 
                                fontSize: screenWidth < 768 ? 13 : 14,
                                color: Colors.text.head 
                              }}
                            >
                              Scheduled Date:
                            </UIText>
                            <UIText 
                              className="text-right flex-1 ml-2"
                              style={{ 
                                fontSize: screenWidth < 768 ? 13 : 14,
                                color: Colors.text.sub 
                              }}
                            >
                              {formatDate(selectedConsultation.consultation_date)}
                            </UIText>
                          </HStack>
                        )}

                        {selectedConsultation.consultation_time && (
                          <HStack className="justify-between">
                            <UIText 
                              className="font-medium" 
                              style={{ 
                                fontSize: screenWidth < 768 ? 13 : 14,
                                color: Colors.text.head 
                              }}
                            >
                              Scheduled Time:
                            </UIText>
                            <UIText 
                              className="text-right flex-1 ml-2"
                              style={{ 
                                fontSize: screenWidth < 768 ? 13 : 14,
                                color: Colors.text.sub 
                              }}
                            >
                              {selectedConsultation.consultation_time}
                            </UIText>
                          </HStack>
                        )}

                        {selectedConsultation.responded_at && (
                          <HStack className="justify-between">
                            <UIText 
                              className="font-medium" 
                              style={{ 
                                fontSize: screenWidth < 768 ? 13 : 14,
                                color: Colors.text.head 
                              }}
                            >
                              Responded At:
                            </UIText>
                            <UIText 
                              className="text-right flex-1 ml-2"
                              style={{ 
                                fontSize: screenWidth < 768 ? 13 : 14,
                                color: Colors.text.sub 
                              }}
                            >
                              {formatDateTime(selectedConsultation.responded_at)}
                            </UIText>
                          </HStack>
                        )}
                      </VStack>

                      {/* Contact Information */}
                      {(selectedConsultation.email || selectedConsultation.mobile_number) && (
                        <VStack space="sm">
                          <UIText 
                            className="font-semibold text-gray-500"
                            style={{ fontSize: screenWidth < 768 ? 12 : 14 }}
                          >
                            CONTACT INFORMATION
                          </UIText>
                          
                          {selectedConsultation.email && (
                            <HStack className="items-center">
                              <Ionicons name="mail-outline" size={16} color={Colors.text.sub} />
                              <UIText 
                                className="ml-2 flex-1"
                                style={{ 
                                  fontSize: screenWidth < 768 ? 13 : 14,
                                  color: Colors.text.sub 
                                }}
                              >
                                {selectedConsultation.email}
                              </UIText>
                            </HStack>
                          )}

                          {selectedConsultation.mobile_number && (
                            <HStack className="items-center">
                              <Ionicons name="call-outline" size={16} color={Colors.text.sub} />
                              <UIText 
                                className="ml-2 flex-1"
                                style={{ 
                                  fontSize: screenWidth < 768 ? 13 : 14,
                                  color: Colors.text.sub 
                                }}
                              >
                                {selectedConsultation.mobile_number}
                              </UIText>
                            </HStack>
                          )}
                        </VStack>
                      )}

                      {/* Message */}
                      {selectedConsultation.message && (
                        <VStack space="sm">
                          <UIText 
                            className="font-semibold text-gray-500"
                            style={{ fontSize: screenWidth < 768 ? 12 : 14 }}
                          >
                            YOUR MESSAGE
                          </UIText>
                          <Box className="bg-gray-50 rounded-lg p-3 md:p-4">
                            <UIText 
                              className="italic"
                              style={{ 
                                fontSize: screenWidth < 768 ? 13 : 14,
                                color: Colors.text.sub 
                              }}
                            >
                              "{selectedConsultation.message}"
                            </UIText>
                          </Box>
                        </VStack>
                      )}

                      {/* Status Information */}
                      <VStack space="sm">
                        <UIText 
                          className="font-semibold text-gray-500"
                          style={{ fontSize: screenWidth < 768 ? 12 : 14 }}
                        >
                          STATUS INFORMATION
                        </UIText>
                        <UIText 
                          className="text-sm"
                          style={{ color: Colors.text.sub }}
                        >
                          {selectedConsultation.status === 'completed' && 
                            "This consultation has been completed. Thank you for using our service."}
                        </UIText>
                      </VStack>
                    </VStack>
                  </ScrollView>

                  {/* Footer */}
                  <HStack className="p-4 md:p-6 border-t border-gray-200">
                    <UIPressable
                      className="flex-1 py-3 rounded-lg items-center justify-center"
                      style={{ backgroundColor: Colors.primary.blue }}
                      onPress={closeDetailsModal}
                    >
                      <UIText className="font-semibold text-white">
                        Close
                      </UIText>
                    </UIPressable>
                  </HStack>
                </>
              )}
            </Animated.View>
          </View>
        </Modal>

        <Navbar activeTab="consultations" />
        <SidebarWrapper />
      </View>
    </SidebarProvider>
  );
}